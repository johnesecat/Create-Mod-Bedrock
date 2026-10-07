import { BlockPermutation, GameMode, system } from "@minecraft/server";
import { recalculateNetwork } from "../rpm/rpmCore";

/** @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').Block} block
 * @param {import('@minecraft/server').Dimension} dimension
 */
export function handCrankInteract(player, block, dimension) {
    const entity = dimension.getEntities({location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity`})[0];
    if (!entity) return;
    
    const isGenerating = block.permutation.getAllStates()['create:active_generator'];
    const rpm = player.isSneaking ? -32 : 32;
    const currentRpm = entity.getDynamicProperty('create:generator_rpm') ?? 0;
    
    // Aplica exaustão de fome (igual Create original)
    if (player.getGameMode() !== GameMode.Creative) {
        const hunger = player.getComponent('minecraft:player.hunger');
        if (!hunger || hunger.currentValue < 0.15) return;
        hunger.setCurrentValue(hunger.currentValue - 0.15);
    };
    
    // Renova o timer (bloco tick vai tentar desligar, mas achará keep_alive = true)
    block.setPermutation(BlockPermutation.resolve(block.typeId, { ...block.permutation.getAllStates(), 'create:active_generator': true, 'create:keep_alive': true }));

    // Só recalcula se mudou algo (ligou ou inverteu direção)
    if (!isGenerating || currentRpm !== rpm) {
        entity.setProperty('create:is_reverse', player.isSneaking);
        entity.setProperty('create:is_generating', true);
        entity.setDynamicProperty('create:generator_rpm', rpm);
        system.runJob(recalculateNetwork(block, dimension, { eventType: 'generator' }));
    };
};

/** @param {import('@minecraft/server').Block} block
 * @param {import('@minecraft/server').Dimension} dimension
 */
export function handCrankTick(block, dimension) {
    const keepAlive = block.permutation.getAllStates()['create:keep_alive'];
    const isGenerating = block.permutation.getAllStates()['create:active_generator'];
    if (!isGenerating) return;

    // Jogador interagiu desde o último tick? então mantém ligado
    if (keepAlive) {
        block.setPermutation(BlockPermutation.resolve(block.typeId, { ...block.permutation.getAllStates(), 'create:keep_alive': false }));
        return;
    };

    const entity = dimension.getEntities({location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity`})[0];
    if (entity) entity.setProperty('create:is_generating', false);

    // Se não, desliga o bloco e recalcula a rede
    block.setPermutation(BlockPermutation.resolve(block.typeId, { ...block.permutation.getAllStates(), 'create:active_generator': false, 'create:keep_alive': false }));
    system.runJob(recalculateNetwork(block, dimension, { eventType: 'generator' }));
};
