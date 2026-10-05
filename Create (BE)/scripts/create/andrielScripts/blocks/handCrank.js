import { system } from "@minecraft/server";
import { recalculateNetwork } from "../rpm/rpmCore";

export function handCrankInteract(player, block, dimension) {
    const entity = dimension.getEntities({location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity`})[0];
    if (!entity) return;
    
    const isGenerating = block.permutation.getState('create:active_generator');
    const rpm = player.isSneaking ? -32 : 32;
    const currentRpm = entity.getDynamicProperty('create:generator_rpm') ?? 0;
    
    // Aplica exaustão de fome (igual Create original)
    if (player.getGameMode() !== "Creative") {
        const hunger = player.getComponent('minecraft:player.hunger');
        
        if (hunger && hunger.currentValue > 0) hunger.setCurrentValue(Math.max(0, hunger.currentValue - 0.15));
        else if (hunger.currentValue < 0.15) return;
    };
    
    // Renova o timer (bloco tick vai tentar desligar, mas achará keep_alive = true)
    block.setPermutation(block.permutation.withState('create:active_generator', true).withState('create:keep_alive', true));

    // Só recalcula se mudou algo (ligou ou inverteu direção)
    if (!isGenerating || currentRpm !== rpm) {
        entity.setProperty('create:is_reverse', player.isSneaking);
        entity.setProperty('create:is_generating', true);
        entity.setDynamicProperty('create:generator_rpm', rpm);
        system.runJob(recalculateNetwork(block, dimension, { eventType: 'generator' }));
    };
};

export function handCrankTick(block, dimension) {
    const keepAlive = block.permutation.getState('create:keep_alive');
    const isGenerating = block.permutation.getState('create:active_generator');
    if (!isGenerating) return;

    // Jogador interagiu desde o último tick? então mantém ligado
    if (keepAlive) {
        block.setPermutation(block.permutation.withState('create:keep_alive', false));
        return;
    };

    const entity = dimension.getEntities({location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity`})[0];
    if (entity) entity.setProperty('create:is_generating', false);

    // Se não, desliga o bloco e recalcula a rede
    block.setPermutation(block.permutation.withState('create:active_generator', false).withState('create:keep_alive', false));
    system.runJob(recalculateNetwork(block, dimension, { eventType: 'generator' }));
};
