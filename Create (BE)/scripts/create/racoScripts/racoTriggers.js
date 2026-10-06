import * as mc from "@minecraft/server";
import * as racoAPI from "./raco-API.js";


import * as chute from "./blocks/chute.js"
import * as smartObserver from "./blocks/smart_observer.js"
import * as millstone from "./blocks/millstone.js"
import * as depot from "./blocks/depot.js"
import { creativeCrateBreak, creativeCrateInteract, creativeCrateTick } from "./blocks/creativeCrate.js"
import * as mechanicalCrafter from "./blocks/mechanicalCrafter.js"
import { basinTick, basinPlace, basinInteract, basinBreak, BASIN_APPROVED_ITEMS } from "./blocks/mechanicalMixer.js"
import { deployerTick, deployerPlace, deployerInteract, deployerBreak } from "./blocks/deployer.js"
import { pressTick } from "./blocks/press.js"
import { crushingWheelTick } from "./blocks/crushingWheel.js"
import { mechanicalArmTick, mechanicalArmInteract, mechanicalArmBeforeInteract, mechanicalArmBlockPlaced, mechanicalArmDespawn } from "./blocks/mechanicalArm.js"
import { brassFunnelTick, brassFunnelInteract, brassFunnelPlace, brassFunnelRedstone, brassFunnelBreak } from "./blocks/brassFunnel.js"
import { brassTunnelTick, brassTunnelInteract, brassTunnelPlace } from "./blocks/brassTunnel.js"
import { onInteractSpout, spoutBreak, spoutTick } from "./blocks/spout.js"
import { beforeCasingCraftInteract } from "./blocks/casingCrafting.js"
import { blazeBurnerBeforeBlockInteract, blazeBurnerBreak, blazeBurnerEntityInteract, blazeBurnerHitEntity, blazeBurnerInteract, blazeBurnerTick } from "./blocks/blazeBurner.js"
import { pipeBreak, pipePlace, pipeWrenchInteract, updatePipeConnectionsAround } from "./blocks/pipe.js"
import { mechanicalPumpBreak, mechanicalPumpTick, mechanicalPumpWrenchInteract } from "./blocks/mechanicalPump.js"
import { handleFluidBucketBlockInteract, pickupFakeFluid, placeFakeFluidBucket } from "./blocks/fluidBuckets.js"
import { isItemDrainVisual, itemDrainBreak, itemDrainStepOn, itemDrainTick } from "./blocks/itemDrain.js"
import { smartFluidPipeBreak, smartFluidPipeCanHandle, smartFluidPipeInteract, smartFluidPipePlace, smartFluidPipeTick } from "./blocks/smartFluidPipe.js"
import { initRpmBlock } from "../andrielScripts/rpm/rpmCore.js"
import { whistleWrenchRemoved } from "../andrielScripts/blocks/whistle.js"
import { hatchInteract } from "./blocks/hatch.js"
import { vaultVisualStructure } from "../../vault/visual_structure.js"
import { weightedEjectorBeforeInteract, weightedEjectorBlockPlaced, weightedEjectorBreak, weightedEjectorInteract, weightedEjectorPlacementTick, weightedEjectorStepOn, weightedEjectorTick } from "./blocks/weightedEjector.js"
import { shaftPreviewTick, tryExtendShaft } from "./blocks/shaftPreview.js"
import { canExtendFluidTank, extendFluidTank, fluidTankBroken, fluidTankInteract, fluidTankPlaced, refreshFluidTankVisual, toggleFluidTankTexture } from "../tank/fluidTank.js"
import { isCompatibilityFluidContainer, resolveCompatibilityFluidId } from "../compatibility/registries.js"
import {
    removeSteamEngineConnection,
    steamEngineInteract,
    steamEnginePlaced,
    refreshBoilersNear,
    refreshFluidTankBoiler,
    syncSteamEngine,
    syncSteamEngineNearShaft,
    steamEngineShaftBroken
} from "./blocks/steamEngine.js"

const pendingSmartFluidPipeClicks = new Set();
const TOP_MACHINE_TARGETS = new Set(["create:depot", "create:basin"]);
const TOP_MACHINE_ITEMS = new Set(["create:mechanical_mixer", "create:mechanical_press", "create:deployer"]);
const HORIZONTAL_ROTATION = ["north", "east", "south", "west"];
const FACING_ROTATION = ["north", "east", "south", "west", "up", "down"];
const FACING_NUMBER_ROTATION = [2, 5, 3, 4, 0, 1];
const MACHINE_INTERACTION_LORE = new Map([
    ["create:basin", "Clique com um item para colocar ou retirar."],
    ["create:depot", "Clique com um item para colocar ou retirar."],
    ["create:mechanical_crafter", "Clique com um item para montar a receita."],
    ["create:deployer", "Clique para configurar o item usado."],
    ["create:mechanical_arm", "Clique para configurar entrada e saída."],
    ["create:brass_funnel", "Clique com um item para definir o filtro."],
    ["create:brass_tunnel", "Clique com um item para definir o filtro."],
    ["create:andesite_funnel", "Move itens para dentro ou para fora de inventários."],
    ["create:andesite_tunnel", "Move itens entre esteiras conectadas."],
    ["create:spout", "Despeja fluido para fazer novas receitas."],
    ["create:blaze_burner", "Clique com combustível para acender."],
    ["create:weighted_ejector", "Clique para configurar o peso de ejeção."],
    ["create:steam_engine", "Fornece rotação quando recebe vapor."],
    ["create:fluid_tank", "Clique com recipiente para mover fluidos."],
    ["create:creative_fluid_tank", "Fornece fluidos sem acabar."],
    ["create:item_drain", "Clique com recipiente para drenar fluidos."],
    ["create:smart_fluid_pipe", "Clique com um item para definir o filtro."],
    ["create:chute", "Clique com Chute para alterar o tipo."],
    ["create:chute_smart", "Clique com Chute para alterar o tipo."],
    ["create:hatch", "Guarda seus itens no Vault mais rápido."],
    ["create:crate_creative", "Clique com um item para definir a saída."],
    ["create:desk_bell", "Clique para tocar a campainha."],
    ["create:gearbox", "Divide a rotação em múltiplas direções."],
    ["create:vertical_gearbox", "Divide a rotação em múltiplas direções."],
    ["create:clutch", "Sinal de redstone liga ou desliga a rotação."],
    ["create:gearshift", "Sinal de redstone inverte a direção da rotação."],
    ["create:sequenced_gearshift", "Controla sequências de rotação com redstone."],
    ["create:hand_crank", "Clique para gerar rotação manualmente."],
    ["create:creative_motor", "Fornece rotação infinita."],
    ["create:rotation_speed_controller", "Clique para ajustar a velocidade de rotação."],
    ["create:speedometer", "Mostra a velocidade da rotação."],
    ["create:stressometer", "Mostra o estresse da rede de rotação."],
    ["create:water_wheel", "A água em movimento gera rotação."],
    ["create:large_water_wheel", "A água em movimento gera mais rotação."],
    ["create:windmill_bearing", "Conecte velas para gerar rotação pelo vento."],
    ["create:mechanical_bearing", "Gira estruturas conectadas."],
    ["create:mechanical_pump", "Move fluidos através de tubos."],
    ["create:portable_storage_interface", "Move itens de uma estrutura com Bearing para fora."],
    ["create:hose_pulley", "Move fluidos verticalmente."],
    ["create:encased_fan", "Move ar e processa itens com rotação."],
    ["create:nozzle", "Amplia o alcance e a força do Encased Fan."],
    ["create:millstone", "Mói itens quando recebe rotação."],
    ["create:crushing_wheel", "Tritura itens entre duas rodas girando."],
    ["create:mechanical_mixer", "Mistura itens na Bacia com rotação."],
    ["create:mechanical_press", "Prensa itens na Bacia ou no Depot."],
    ["create:mechanical_drill", "Perfura blocos quando recebe rotação."],
    ["create:mechanical_saw", "Corta blocos quando recebe rotação."],
    ["create:mechanical_harvester", "Colhe plantações quando recebe rotação."],
    ["create:furnace_engine", "Gera rotação usando combustível."],
    ["create:cart_assembler", "Monta contraptions em vagonetes."],
    ["create:pipe", "Transporta fluidos entre máquinas."],
    ["create:mechanical_belt", "Transporta itens usando rotação."],
    ["create:redstone_link", "Envia sinais de redstone sem fios."],
    ["create:redstone_link_receiver", "Recebe sinais de redstone sem fios."],
    ["create:smart_observer", "Emite redstone ao detectar mudanças."],
    ["create:copycat_panel", "Clique com um bloco para copiar a aparência."],
    ["create:copycat_step", "Clique com um bloco para copiar a aparência."],
    ["create:black_seat", "Clique para sentar."],
    ["create:blue_seat", "Clique para sentar."],
    ["create:brown_seat", "Clique para sentar."],
    ["create:cyan_seat", "Clique para sentar."],
    ["create:gray_seat", "Clique para sentar."],
    ["create:green_seat", "Clique para sentar."],
    ["create:light_blue_seat", "Clique para sentar."],
    ["create:light_gray_seat", "Clique para sentar."],
    ["create:lime_seat", "Clique para sentar."],
    ["create:magenta_seat", "Clique para sentar."],
    ["create:orange_seat", "Clique para sentar."],
    ["create:pink_seat", "Clique para sentar."],
    ["create:purple_seat", "Clique para sentar."],
    ["create:red_seat", "Clique para sentar."],
    ["create:white_seat", "Clique para sentar."],
    ["create:yellow_seat", "Clique para sentar."]
]);
const MACHINE_WRENCH_LORE = new Map([
    ["create:pipe", "Use a Wrench para configurar as conexões."],
    ["create:fluid_tank", "Use a Wrench para trocar a aparência."],
    ["create:creative_fluid_tank", "Use a Wrench para trocar a aparência."],
    ["create:brass_funnel", "Use uma Wrench para inverter entrada e saída."],
    ["create:andesite_funnel", "Use uma Wrench para inverter entrada e saída."],
    ["create:deployer", "Use uma Wrench para alternar o modo de mão."],
    ["create:mechanical_bearing", "Use uma Wrench para montar ou desmontar."],
    ["create:windmill_bearing", "Use uma Wrench para ligar ou desligar."],
    ["create:weighted_ejector", "Use uma Wrench para escolher o alvo."],
    ["create:redstone_link", "Use uma Wrench para ajustar a direção."],
    ["create:redstone_link_receiver", "Use uma Wrench para ajustar a direção."],
    ["create:mechanical_belt", "Use uma Wrench para remover polias."]
]);
const MACHINE_EXTRA_ACTION_LORE = new Map([
    ["create:water_wheel", ["Use madeira para mudar a aparência."]],
    ["create:large_water_wheel", ["Use madeira para mudar a aparência."]],
    ["create:mechanical_belt", ["Use corantes para mudar a cor."]],
    ["create:hatch", ["Fique agachado para guardar todo o seu inventário."]]
]);
const CREATE_LORE_HEADER = "§r§5Create";
const DESCRIPTION_DISABLED_IDS = new Set(["create:shaft", "create:cogwheel", "create:large_cogwheel"]);
const LOCALIZED_TOOLTIP_IDS = new Set(["create:basin", "create:depot", "create:mechanical_crafter", "create:deployer", "create:mechanical_arm", "create:brass_funnel", "create:brass_tunnel", "create:andesite_funnel", "create:andesite_tunnel", "create:spout", "create:blaze_burner", "create:weighted_ejector", "create:fluid_tank", "create:creative_fluid_tank", "create:item_drain", "create:smart_fluid_pipe", "create:chute", "create:chute_smart", "create:crate_creative", "create:desk_bell", "create:shaft", "create:cogwheel", "create:large_cogwheel", "create:gearbox", "create:vertical_gearbox", "create:clutch", "create:gearshift", "create:sequenced_gearshift", "create:hand_crank", "create:creative_motor", "create:rotation_speed_controller", "create:speedometer", "create:stressometer", "create:windmill_bearing", "create:mechanical_pump", "create:encased_fan", "create:millstone", "create:crushing_wheel", "create:mechanical_mixer", "create:mechanical_press", "create:mechanical_drill", "create:mechanical_saw", "create:mechanical_harvester", "create:furnace_engine", "create:cart_assembler", "create:pipe", "create:redstone_link", "create:redstone_link_receiver", "create:smart_observer", "create:copycat_panel", "create:copycat_step", "create:mechanical_belt", "create:water_wheel", "create:large_water_wheel", "create:steam_engine", "create:hatch", "create:portable_storage_interface", "create:nozzle", "create:mechanical_bearing", "create:hose_pulley"]);
const BLOCK_FACE_OFFSETS = {
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    west: { x: -1, y: 0, z: 0 },
    east: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    down: { x: 0, y: -1, z: 0 }
};

function smartFluidPipeClickKey(block, player, item) {
    const location = block?.location;
    return `${player?.id ?? "player"}:${location?.x},${location?.y},${location?.z}:${item?.typeId ?? "empty"}`;
}

function getSelectedSlot(player) {
    const slot = player?.selectedSlotIndex ?? player?.selectedSlot;
    return Number.isInteger(slot) ? slot : undefined;
}

function consumeOneHeldItem(player, itemId) {
    if (player?.getGameMode?.() === "Creative") return true;

    const inventory = player?.getComponent("inventory")?.container;
    const slot = getSelectedSlot(player);
    if (!inventory || slot === undefined) return false;

    const selected = inventory.getItem(slot);
    if (selected?.typeId !== itemId) return false;

    if (selected.amount <= 1) inventory.setItem(slot, undefined);
    else {
        const next = selected.clone();
        next.amount--;
        inventory.setItem(slot, next);
    }
    return true;
}

function placePipeOnPipeFace(player, clickedBlock, item, face) {
    if ((clickedBlock?.typeId !== "create:pipe" && clickedBlock?.typeId !== "create:glass_pipe")
        || item?.typeId !== "create:pipe") return false;

    const direction = racoAPI.blockFaceToTraits(face);
    const vector = BLOCK_FACE_OFFSETS[direction];
    if (!vector) return false;

    const location = {
        x: clickedBlock.x + vector.x,
        y: clickedBlock.y + vector.y,
        z: clickedBlock.z + vector.z
    };
    let target;
    try { target = clickedBlock.dimension.getBlock(location); } catch {}
    if (!target || (target.typeId !== "minecraft:air" && !target.isLiquid)) return false;

    mc.system.run(() => {
        let current;
        try { current = clickedBlock.dimension.getBlock(location); } catch {}
        if (!current || (current.typeId !== "minecraft:air" && !current.isLiquid)) return;
        try {
            current.setType("create:pipe");
            consumeOneHeldItem(player, "create:pipe");
            pipePlace(current);
        } catch {}
    });
    return true;
}

function giveItemToPlayerOrDrop(player, itemStack, location) {
    if (!player || !itemStack) return false;
    try {
        const leftover = player.getComponent("inventory")?.container?.addItem(itemStack);
        if (!leftover) return true;
        const dropped = player.dimension.spawnItem(leftover, location ?? player.location);
        dropped?.clearVelocity?.();
        return true;
    } catch {
        try {
            const dropped = player.dimension.spawnItem(itemStack, location ?? player.location);
            dropped?.clearVelocity?.();
            return true;
        } catch {
            return false;
        }
    }
}

function cleanupCreateBlockBeforeWrenchBreak(block) {
    if (!block) return;
    try {
        if (block.typeId === "create:chute" || block.typeId === "create:chute_smart") {
            const permutation = block.permutation;
            const brokenPermutation = {
                type: { id: block.typeId },
                typeId: block.typeId,
                getState: (state) => permutation.getState(state)
            };
            chute.onBreak(block, brokenPermutation, block.dimension);
        }
    } catch {}
    try { if (block.typeId === "create:depot") depot.depotBreak(block, block.dimension); } catch {}
    try { if (block.typeId === "create:crate_creative") creativeCrateBreak(block); } catch {}
    try { if (block.typeId === "create:basin") basinBreak(block); } catch {}
    try { if (block.typeId === "create:deployer") deployerBreak(block); } catch {}
    try { if (block.typeId === "create:mechanical_crafter") mechanicalCrafter.mechanicalCrafterBreak(block, block.dimension); } catch {}
    try { if (block.typeId === "create:blaze_burner") blazeBurnerBreak(block, block.dimension); } catch {}
    try { if (block.typeId === "create:pipe" || block.typeId === "create:glass_pipe") pipeBreak(block, block.dimension); } catch {}
    try { if (block.typeId === "create:smart_fluid_pipe") smartFluidPipeBreak(block, block.dimension); } catch {}
    try { if (block.typeId === "create:mechanical_pump") mechanicalPumpBreak(block); } catch {}
    try { if (block.typeId === "create:item_drain") itemDrainBreak(block, block.dimension); } catch {}
    try { if (block.typeId === "create:weighted_ejector") weightedEjectorBreak(block, block.dimension); } catch {}
    try { if (block.typeId === "create:brass_funnel") brassFunnelBreak(block, block.dimension); } catch {}
    try {
        if (block.typeId === "create:mechanical_pump" || block.typeId === "create:spout" || block.typeId === "create:smart_fluid_pipe") {
            updatePipeConnectionsAround(block);
        }
    } catch {}
}

function wrenchBreakCreateBlock(player, block, item) {
    if (!player?.isSneaking || item?.typeId !== "create:wrench" || !block?.typeId?.startsWith("create:")) return false;
    const dimension = block.dimension;
    const location = { x: block.location.x, y: block.location.y, z: block.location.z };
    const center = block.center();
    const blockTypeId = block.typeId;
    const blockPermutation = block.permutation;

    mc.system.run(() => {
        const target = dimension.getBlock(location);
        if (target?.typeId !== blockTypeId) return;
        cleanupCreateBlockBeforeWrenchBreak(target);
        // shaft.steam_engine é somente a variante interna conectada ao motor.
        // Ao desmontá-la, o jogador sempre recebe o Shaft normal.
        const returnedItemId = blockTypeId === "create:glass_pipe"
            ? "create:pipe"
            : blockTypeId === "create:shaft.steam_engine"
            ? "create:shaft"
            : blockTypeId === "create:whistle_tubo"
                ? "create:whistle"
                : blockTypeId;
        try { giveItemToPlayerOrDrop(player, new mc.ItemStack(returnedItemId, 1), center); } catch {}
        try { target.setType("minecraft:air"); } catch {}
        if (blockTypeId === "create:steam_engine") {
            try { removeSteamEngineConnection(dimension, location, blockPermutation); } catch {}
        }
        if (blockTypeId === "create:shaft.steam_engine") {
            try { steamEngineShaftBroken(dimension, location); } catch {}
        }
        if (blockTypeId === "create:whistle" || blockTypeId === "create:whistle_tubo") {
            try { whistleWrenchRemoved(dimension, location, blockTypeId); } catch {}
        }
        if (blockTypeId === "create:fluid_tank" || blockTypeId === "create:creative_fluid_tank") {
            try { fluidTankBroken(dimension, location, blockTypeId); } catch {}
            if (blockTypeId === "create:fluid_tank") try { refreshBoilersNear(dimension, location); } catch {}
            try { updatePipeConnectionsAround(dimension.getBlock(location)); } catch {}
        }
        try {
            if (blockTypeId === "create:vault") vaultVisualStructure.breakAndReassemble(dimension, location);
        } catch {}
        try { dimension.playSound("dig.stone", center, { volume: 0.8, pitch: 1.25 }); } catch {}
    });
    return true;
}

function rotateCreateBlockWithWrench(player, block, item, face) {
    if (player?.isSneaking || item?.typeId !== "create:wrench" || !block?.typeId?.startsWith("create:")) return false;
    if (block.typeId === "create:mechanical_bearing") return false;

    const states = block.permutation?.getAllStates?.() ?? {};
    const nextStates = { ...states };
    let changed = false;

    if (Object.prototype.hasOwnProperty.call(states, "minecraft:cardinal_direction")) {
        const current = states["minecraft:cardinal_direction"];
        const index = HORIZONTAL_ROTATION.indexOf(current);
        if (index >= 0) {
            nextStates["minecraft:cardinal_direction"] = HORIZONTAL_ROTATION[(index + 1) % HORIZONTAL_ROTATION.length];
            changed = true;
        }
    } else if (Object.prototype.hasOwnProperty.call(states, "minecraft:facing_direction")) {
        const current = states["minecraft:facing_direction"];
        const faceDirection = racoAPI.blockFaceToTraits(face);
        const next = FACING_ROTATION.includes(faceDirection)
            ? faceDirection
            : FACING_ROTATION[(FACING_ROTATION.indexOf(current) + 1) % FACING_ROTATION.length];
        if (FACING_ROTATION.includes(next) && next !== current) {
            nextStates["minecraft:facing_direction"] = next;
            changed = true;
        }
    } else if (Object.prototype.hasOwnProperty.call(states, "facing_direction")) {
        const current = states["facing_direction"];
        const faceDirection = racoAPI.blockFaceToTraits(face);
        const next = typeof current === "number"
            ? FACING_NUMBER_ROTATION[(FACING_NUMBER_ROTATION.indexOf(current) + 1) % FACING_NUMBER_ROTATION.length]
            : FACING_ROTATION.includes(faceDirection)
                ? faceDirection
                : FACING_ROTATION[(FACING_ROTATION.indexOf(current) + 1) % FACING_ROTATION.length];
        if (next !== current && (typeof next === "number" || FACING_ROTATION.includes(next))) {
            nextStates["facing_direction"] = next;
            changed = true;
        }
    }

    if (!changed) return false;

    try {
        block.setPermutation(mc.BlockPermutation.resolve(block.typeId, nextStates));
        block.dimension.playSound("random.click", block.center(), { volume: 0.65, pitch: 1.25 });
    } catch {
        return false;
    }

    try { initRpmBlock({ block, dimension: block.dimension }); } catch {}
    try {
        if (block.typeId === "create:pipe" || block.typeId === "create:mechanical_pump" || block.typeId === "create:spout" || block.typeId === "create:smart_fluid_pipe") {
            updatePipeConnectionsAround(block);
        }
    } catch {}

    return true;
}

function placeTopMachineOnWorkBlock(block, player, item) {
    if (!player?.isSneaking) return false;
    if (!TOP_MACHINE_TARGETS.has(block?.typeId) || !TOP_MACHINE_ITEMS.has(item?.typeId)) return false;

    const target = block.dimension.getBlock({
        x: block.location.x,
        y: block.location.y + 2,
        z: block.location.z
    });
    if (!target || target.typeId !== "minecraft:air") return false;

    try {
        let permutation = mc.BlockPermutation.resolve(item.typeId);
        if (item.typeId === "create:deployer") {
            permutation = permutation.withState("minecraft:facing_direction", "down");
        } else if (item.typeId === "create:mechanical_press") {
            const dir = player.getViewDirection?.();
            const cardinal = Math.abs(dir?.x ?? 0) > Math.abs(dir?.z ?? 0) ? "east" : "south";
            permutation = permutation.withState("minecraft:cardinal_direction", cardinal);
        }

        target.setPermutation(permutation);
    } catch {
        return false;
    }

    consumeOneHeldItem(player, item.typeId);
    try { block.dimension.playSound("use.stone", target.center(), { volume: 0.8, pitch: 1.0 }); } catch {}
    try { initRpmBlock({ block: target, dimension: block.dimension }); } catch {}
    if (target.typeId === "create:deployer") deployerPlace(target);
    return true;
}

/** @param {mc.Player} player */
export function playerTick(player, currentTick) {
    replacePickedSteamEngineShaft(player);
    sandPaperTick(player, currentTick);
    weightedEjectorPlacementTick(player, currentTick);
    shaftPreviewTick(player, currentTick);
    machineInteractionLoreTick(player, currentTick);
}

function replacePickedSteamEngineShaft(player) {
    let equippable;
    let held;
    try {
        equippable = player?.getComponent("equippable");
        held = equippable?.getEquipment("Mainhand");
    } catch {}
    if (held?.typeId !== "create:shaft.steam_engine") return;

    try {
        const shaft = new mc.ItemStack("create:shaft", held.amount);
        equippable.setEquipment("Mainhand", shaft);
    } catch {}
}

// A interface Bedrock não aceita descrição estática em JSON para itens de bloco.
// Inserimos o lore uma única vez no item do inventário, sem atualizá-lo todo tick.
function machineInteractionLoreTick(player, currentTick) {
    // Atualiza rapidamente após coletar um bloco para ele não permanecer em uma
    // pilha separada enquanto ainda está sem a descrição aplicada pelo script.
    if (currentTick % 5 !== 0) return;
    let inventory;
    try { inventory = player?.getComponent("inventory")?.container; } catch {}
    if (!inventory) return;

    for (let slot = 0; slot < inventory.size; slot++) {
        let stack;
        try { stack = inventory.getItem(slot); } catch { continue; }
        if (DESCRIPTION_DISABLED_IDS.has(stack?.typeId)) {
            clearMachineDescriptionLore(stack, inventory, slot);
            continue;
        }
        const description = MACHINE_INTERACTION_LORE.get(stack?.typeId);
        if (!description) continue;

        const descriptionLine = `§r§7${description}`;
        const wrenchDescription = MACHINE_WRENCH_LORE.get(stack.typeId);
        const actionDescriptions = [
            wrenchDescription,
            ...(MACHINE_EXTRA_ACTION_LORE.get(stack.typeId) ?? [])
        ].filter(Boolean);
        const actionLines = actionDescriptions.map(text => `§r§e${text}`);
        if (LOCALIZED_TOOLTIP_IDS.has(stack.typeId)) {
            const keyBase = `create.tooltip.${stack.typeId.replace(":", ".")}`;
            const localizedLore = [
                { translate: "create.tooltip.header" },
                { translate: `${keyBase}.description` },
                ...actionDescriptions.map((_, index) => ({ translate: `${keyBase}.action.${index}` }))
            ];
            let rawLore = [];
            try { rawLore = stack.getRawLore?.() ?? []; } catch {}
            const alreadyLocalized = rawLore.length === localizedLore.length
                && rawLore.every((line, index) => line?.translate === localizedLore[index].translate);
            if (alreadyLocalized) continue;
            try { stack.setLore(localizedLore); inventory.setItem(slot, stack); } catch {}
            continue;
        }
        let lore = [];
        try { lore = stack.getLore?.() ?? []; } catch {}
        const baseLore = [];
        for (let index = 0; index < lore.length; index++) {
            if (lore[index] !== CREATE_LORE_HEADER) {
                baseLore.push(lore[index]);
                continue;
            }
            // Remove somente as linhas que este sistema adicionou após o cabeçalho.
            while (index + 1 < lore.length && /§r§[7e]/.test(lore[index + 1])) index++;
        }
        const nextLore = [CREATE_LORE_HEADER, descriptionLine, ...actionLines];
        const finalLore = [...baseLore, ...nextLore];
        if (finalLore.length === lore.length && finalLore.every((line, index) => line === lore[index])) continue;

        try {
            stack.setLore(finalLore);
            inventory.setItem(slot, stack);
        } catch {}
    }

    mergeMachineDescriptionStacks(inventory);
}

function clearMachineDescriptionLore(stack, inventory, slot) {
    let rawLore = [];
    try { rawLore = stack.getRawLore?.() ?? []; } catch {}
    if (rawLore.some(line => line?.translate === "create.tooltip.header")) {
        try { stack.setLore([]); inventory.setItem(slot, stack); } catch {}
        return;
    }

    let lore = [];
    try { lore = stack.getLore?.() ?? []; } catch {}
    const cleaned = [];
    for (let index = 0; index < lore.length; index++) {
        if (lore[index] !== CREATE_LORE_HEADER) {
            cleaned.push(lore[index]);
            continue;
        }
        while (index + 1 < lore.length && /§r§[7e]/.test(lore[index + 1])) index++;
    }
    if (cleaned.length === lore.length) return;
    try { stack.setLore(cleaned); inventory.setItem(slot, stack); } catch {}
}

function mergeMachineDescriptionStacks(inventory) {
    for (let targetSlot = 0; targetSlot < inventory.size; targetSlot++) {
        let target;
        try { target = inventory.getItem(targetSlot); } catch { continue; }
        if (!target || !MACHINE_INTERACTION_LORE.has(target.typeId)) continue;

        for (let sourceSlot = targetSlot + 1; sourceSlot < inventory.size; sourceSlot++) {
            let source;
            try { source = inventory.getItem(sourceSlot); } catch { continue; }
            if (!source || source.typeId !== target.typeId) continue;

            let canStack = false;
            try { canStack = target.isStackableWith(source); } catch {}
            if (!canStack) continue;

            const space = Math.max(0, (target.maxAmount ?? 64) - target.amount);
            if (space <= 0) break;
            const moved = Math.min(space, source.amount);
            if (moved <= 0) continue;

            try {
                target.amount += moved;
                inventory.setItem(targetSlot, target);
                if (source.amount === moved) inventory.setItem(sourceSlot, undefined);
                else {
                    source.amount -= moved;
                    inventory.setItem(sourceSlot, source);
                }
            } catch {}
        }
    }
}



/** @param {mc.BlockComponentPlayerPlaceBeforeEvent} data */
export function beforePlaceBlock(data) {
    const block = data.block
    const player = data.player
    const item = player?.getComponent('equippable')?.getEquipment("Mainhand");
}

/** @param {mc.BlockComponentOnPlaceEvent} data */
export function blockPlace(data){
    const block = data.block
    if (block?.typeId === "create:basin") basinPlace(block)
    if (block?.typeId === "create:deployer") deployerPlace(block)
    if (["create:brass_funnel", "create:andesite_funnel"].includes(block?.typeId)) brassFunnelPlace(block)
    if (["create:brass_tunnel", "create:andesite_tunnel"].includes(block?.typeId)) brassTunnelPlace(block)
    if (block?.typeId === "create:pipe") pipePlace(block)
    if (block?.typeId === "create:smart_fluid_pipe") smartFluidPipePlace(block)
    if (block?.typeId === "create:mechanical_pump" || block?.typeId === "create:spout" || block?.typeId === "create:smart_fluid_pipe") updatePipeConnectionsAround(block)
}

/** @param {mc.BlockComponentPlayerBreakEvent} data */
export function blockPlayerBreak(data){
    const block = data.block
    chute.onBreak(block, data.brokenBlockPermutation, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:millstone") millstone.millstoneBreak(data)
    if (data.brokenBlockPermutation?.type?.id === "create:depot") depot.depotBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:crate_creative") creativeCrateBreak(block)
    if (data.brokenBlockPermutation?.type?.id === "create:basin") basinBreak(block)
    if (data.brokenBlockPermutation?.type?.id === "create:deployer") deployerBreak(block)
    if (data.brokenBlockPermutation?.type?.id === "create:mechanical_crafter") mechanicalCrafter.mechanicalCrafterBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:blaze_burner") blazeBurnerBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:pipe" || data.brokenBlockPermutation?.type?.id === "create:glass_pipe") pipeBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:smart_fluid_pipe") smartFluidPipeBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:mechanical_pump") mechanicalPumpBreak(block)
    if (data.brokenBlockPermutation?.type?.id === "create:spout") spoutBreak(block)
    if (data.brokenBlockPermutation?.type?.id === "create:item_drain") itemDrainBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:weighted_ejector") weightedEjectorBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:mechanical_pump" || data.brokenBlockPermutation?.type?.id === "create:spout" || data.brokenBlockPermutation?.type?.id === "create:smart_fluid_pipe") updatePipeConnectionsAround(block)
}


/** @param {mc.BlockComponentBlockBreakEvent} data */
export function blockBreak(data){
    const block = data.block
    if (data.brokenBlockPermutation?.type?.id === "create:depot") depot.depotBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:crate_creative") creativeCrateBreak(block)
    if (data.brokenBlockPermutation?.type?.id === "create:basin") basinBreak(block)
    if (data.brokenBlockPermutation?.type?.id === "create:deployer") deployerBreak(block)
    if (["create:brass_funnel", "create:andesite_funnel"].includes(data.brokenBlockPermutation?.type?.id)) brassFunnelBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:mechanical_crafter") mechanicalCrafter.mechanicalCrafterBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:blaze_burner") blazeBurnerBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:pipe" || data.brokenBlockPermutation?.type?.id === "create:glass_pipe") pipeBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:smart_fluid_pipe") smartFluidPipeBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:mechanical_pump") mechanicalPumpBreak(block)
    if (data.brokenBlockPermutation?.type?.id === "create:spout") spoutBreak(block)
    if (data.brokenBlockPermutation?.type?.id === "create:item_drain") itemDrainBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:weighted_ejector") weightedEjectorBreak(block, data.dimension)
    if (data.brokenBlockPermutation?.type?.id === "create:mechanical_pump" || data.brokenBlockPermutation?.type?.id === "create:spout" || data.brokenBlockPermutation?.type?.id === "create:smart_fluid_pipe") updatePipeConnectionsAround(block)
}



/** @param {mc.BlockComponentTickEvent} data */
export function blockTick(data){
    const block = data.block
    switch (block?.typeId) {
        case "create:chute": chute.onTick(block); break;
        case "create:smart_observer": smartObserver.onTick(block); break;
        case "create:millstone": millstone.millstoneTick(block); break;
        case "create:depot": depot.depotTicking(block); break;
        case "create:crate_creative": creativeCrateTick(block); break;
        case "create:mechanical_crafter": mechanicalCrafter.mechanicalCrafterTick(block); break;
        case "create:basin": basinTick(block); break;
        case "create:deployer": deployerTick(block); break;
        case "create:mechanical_press": pressTick(block); break;
        case "create:crushing_wheel": crushingWheelTick(block); break;
        case "create:mechanical_arm": mechanicalArmTick(block); break;
        case "create:brass_funnel": case "create:andesite_funnel": brassFunnelTick(block); break;
        case "create:brass_tunnel": case "create:andesite_tunnel": brassTunnelTick(block); break;
        case "create:spout": spoutTick(block); break;
        case "create:blaze_burner": blazeBurnerTick(block); break;
        case "create:mechanical_pump": mechanicalPumpTick(block); break;
        case "create:item_drain": itemDrainTick(block); break;
        case "create:smart_fluid_pipe": smartFluidPipeTick(block); break;
        case "create:weighted_ejector": weightedEjectorTick(block); break;
    }
}

/** @param {mc.BlockComponentPlayerInteractEvent} data */
export function blockInteract(data){
    const block = data.block
    const player = data.player
    const item = player?.getComponent('equippable')?.getEquipment("Mainhand")
    const dimension = data.dimension
    const faceLocation = data.faceLocation
    const face = data.face

    if (placePipeOnPipeFace(player, block, item, face)) return
    if ((block?.typeId === "create:pipe" || block?.typeId === "create:glass_pipe") && pipeWrenchInteract(block, player, item)) return
    if (block?.typeId === "create:mechanical_pump" && mechanicalPumpWrenchInteract(block, player, item)) {
        updatePipeConnectionsAround(block)
        return
    }
    if (block?.typeId === "create:chute" && (item?.typeId === "create:chute" || item?.typeId === "create:chute_smart")) chute.onInteract(block, player, item, face)
    if (block?.typeId === "create:smart_observer") smartObserver.onInteract(block, player, item)
    if (block?.typeId === "create:basin") basinInteract(block, player, item, face)
    if (block?.typeId === "create:depot") depot.depotInteract(block, player, item)
    if (block?.typeId === "create:crate_creative") creativeCrateInteract(block, player, item)
    if (block?.typeId === "create:mechanical_crafter") mechanicalCrafter.mechanicalCrafterInteract(block, player, item)
    if (block?.typeId === "create:deployer") deployerInteract(player, block)
    if (block?.typeId === "create:mechanical_arm") mechanicalArmInteract(block, player, item)
    if (["create:brass_funnel", "create:andesite_funnel"].includes(block?.typeId)) brassFunnelInteract(block, player, item)
    if (block?.typeId === "create:brass_tunnel") brassTunnelInteract(block, player, face, item)
    if (block?.typeId === "create:spout") onInteractSpout(block, player, item)
    if (block?.typeId === "create:blaze_burner") blazeBurnerInteract(block, player, item)
    if (block?.typeId === "create:weighted_ejector") weightedEjectorInteract(block, player, item)
    if (block?.typeId === "create:steam_engine" && steamEngineInteract(block, player, item)) return
    if (block?.typeId === "create:hatch") return
    if (block?.typeId === "create:smart_fluid_pipe" && smartFluidPipeInteract(block, player, item)) return
    if (pickupFakeFluid(block, player, item)) return
}

/** @param {mc.BlockComponentRedstoneUpdateEvent} data */
export function redstoneUpdate(data) {
    const block = data.block
    const powerLevel = data.powerLevel
    if (["create:brass_funnel", "create:andesite_funnel"].includes(block?.typeId)) brassFunnelRedstone(block, powerLevel)
}

/** @param {mc.BlockComponentStepOnEvent} data */
export function onStepOn(data) {
    const block = data.block
    const entity = data.entity
    if (block?.typeId === "create:depot") depot.depotStepOn(block, entity)
    if (block?.typeId === "create:item_drain") itemDrainStepOn(block, entity)
    if (block?.typeId === "create:weighted_ejector") weightedEjectorStepOn(block, entity)
}

/** @param {mc.BlockComponentStepOffEvent} data */
export function onStepOff(data) {
    const block = data.block
    const entity = data.entity
}

export function blockRandomTick(data){
    const block = data.block
}

/** @param {mc.ItemComponentUseOnEvent} data */
export function itemUseOn(data) {
    const block = data.block
    const player = data.source
    const item = data.itemStack
    const blockFace = data.blockFace
    const faceLocation = data.faceLocation
    if (placePipeOnPipeFace(player, block, item, blockFace)) return;
    if (item?.typeId === "create:wrench" && block?.typeId === "create:pipe") {
        pipeWrenchInteract(block, player, item);
        return;
    }
    if (item?.typeId === "create:wrench" && block?.typeId === "create:mechanical_pump") {
        if (mechanicalPumpWrenchInteract(block, player, item)) updatePipeConnectionsAround(block);
        return;
    }
    if (item?.typeId === "create:experience_nugget") useExperienceNugget(player);
    placeFakeFluidBucket(data);
}








/** @param {mc.ItemUseAfterEvent} data */
export function itemUse(data = mc.ItemUseAfterEvent) {
    const player = data.source
    const item = data.itemStack;
    if (item?.typeId === "create:experience_nugget") useExperienceNugget(player);
    if (isSandPaper(item)) useSandPaper(player, item);
}

/** @param {mc.ItemStartUseAfterEvent} data */
export function itemStartUse(data) {
    const item = data.itemStack
    const player = data.source
    if (item?.typeId === "create:wrench") {
        try {
            const hit = player.getBlockFromViewDirection({ maxDistance: 7 });
            if (hit?.block?.typeId === "create:pipe") {
                pipeWrenchInteract(hit.block, player, item);
                return;
            }
            if (hit?.block?.typeId === "create:mechanical_pump") {
                if (mechanicalPumpWrenchInteract(hit.block, player, item)) updatePipeConnectionsAround(hit.block);
                return;
            }
        } catch {}
    }
    startSandPaperUse(player, item);
};

/** @param {mc.ItemStopUseAfterEvent} data */
export function itemStopUse(data = mc.ItemStopUseAfterEvent) {
    const item = data.itemStack
    const player = data.source
    stopSandPaperUse(player, item);
}

/** @param {mc.PlayerPlaceBlockAfterEvent} data */
export function playerBlockPlace(data = mc.PlayerPlaceBlockAfterEvent) {
    const player = data.player
    const block = data.block;
    mechanicalArmBlockPlaced(data)
    weightedEjectorBlockPlaced(data)
    steamEnginePlaced(block)
    if (block?.typeId === "create:steam_engine") {
        mc.system.run(() => {
            try {
                if (block.typeId === "create:steam_engine") {
                    steamEnginePlaced(block)
                    syncSteamEngine(block)
                }
            } catch {}
        })
    }
    if (block?.typeId === "create:shaft") {
        mc.system.run(() => {
            try {
                if (block.typeId === "create:shaft") syncSteamEngineNearShaft(block)
            } catch {}
        })
    }
    if (block?.typeId === "create:fluid_tank" || block?.typeId === "create:creative_fluid_tank") {
        mc.system.run(() => {
            fluidTankPlaced(block)
            if (block.typeId === "create:fluid_tank") refreshFluidTankBoiler(block)
            updatePipeConnectionsAround(block)
        })
    }
}

/** @param {mc.PlayerBreakBlockBeforeEvent} data */
export function beforeBlockBreak(data) {
    const player = data.player
    const item = data.itemStack
    const block = data.block
    if (block?.typeId === "create:honey_fluid" || block?.typeId === "create:chocolate_fluid" || block?.typeId === "create:milk_fluid") {
        data.cancel = true
        return
    }
    if (block?.typeId === "create:item_drain") itemDrainBreak(block, block.dimension)
    if (block?.typeId === "create:depot") depot.scheduleDepotBreak(block, block.dimension)
    if (block?.typeId === "create:crate_creative") creativeCrateBreak(block)
    if (block?.typeId === "create:basin") mc.system.run(() => basinBreak(block))
    if (block?.typeId === "create:mechanical_crafter") mechanicalCrafter.mechanicalCrafterBreak(block, block.dimension)
    if (block?.typeId === "create:blaze_burner") blazeBurnerBreak(block, block.dimension)
    if (block?.typeId === "create:pipe" || block?.typeId === "create:glass_pipe") pipeBreak(block, block.dimension)
    if (block?.typeId === "create:mechanical_pump") mechanicalPumpBreak(block)
    if (block?.typeId === "create:steam_engine") {
        const dimension = block.dimension
        const location = { ...block.location }
        const permutation = block.permutation
        mc.system.run(() => removeSteamEngineConnection(dimension, location, permutation))
    }
    if (block?.typeId === "create:fluid_tank" || block?.typeId === "create:creative_fluid_tank") {
        const dimension = block.dimension
        const location = { ...block.location }
        if (block.typeId === "create:fluid_tank") mc.system.run(() => refreshBoilersNear(dimension, location))
    }
    if (block?.typeId === "create:mechanical_pump" || block?.typeId === "create:spout") updatePipeConnectionsAround(block)
}

/** @param {mc.EntitySpawnAfterEvent} data */
export function entitySpawn(data = mc.EntitySpawnAfterEvent) {
    const entity = data.entity;
}

/** @param {mc.EntityLoadAfterEvent} data */
export function entityLoad(data = mc.EntityLoadAfterEvent) {
    const entity = data.entity;
    if (["create:shaft_hologram", "create:cogwheel_hologram", "create:large_cogwheel_hologram"].includes(entity?.typeId)) {
        try { entity.remove(); } catch {}
    }
    if (entity?.typeId === "create:fluid_tank_fluid") {
        const dimension = entity.dimension;
        const location = { ...entity.location };
        mc.system.runTimeout(() => {
            const x = Math.floor(location.x);
            const z = Math.floor(location.z);
            const y = Math.floor(location.y) - 1;
            for (let offsetY = 0; offsetY < 12; offsetY++) {
                let tank;
                try { tank = dimension.getBlock({ x, y: y - offsetY, z }); } catch {}
                if (tank?.typeId === "create:fluid_tank" || tank?.typeId === "create:creative_fluid_tank") {
                    refreshFluidTankVisual(tank);
                    break;
                }
            }
        }, 5);
    }

}

/** @param {mc.PlayerInteractWithBlockBeforeEvent} data */
export function beforeBlockInteract(data = mc.PlayerInteractWithBlockBeforeEvent) {
    const player = data.player
    const block = data.block
    const item = data.itemStack
    const blockId = block?.typeId
    // Algumas versões da API não fornecem isFirstEvent. Nesse caso, o
    // primeiro evento recebido já deve contar como clique, sem exigir segurar.
    const isFirstEvent = data.isFirstEvent !== false
    const interactedFace = racoAPI.blockFaceToTraits(data.blockFace)
    if (isFirstEvent && (block?.typeId === "create:shaft" || block?.typeId === "create:shaft.steam_engine" || block?.typeId === "create:cogwheel" || block?.typeId === "create:large_cogwheel") && ["create:shaft", "create:cogwheel", "create:large_cogwheel"].includes(item?.typeId)) {
        if (tryExtendShaft(player, block, interactedFace)) {
            data.cancel = true
            return
        }
    }
    if (isFirstEvent && block?.typeId === "create:steam_engine" && item?.typeId === "create:shaft") {
        data.cancel = true
        const dimension = block.dimension
        const location = { x: block.x, y: block.y, z: block.z }
        const itemCopy = item.clone?.() ?? item
        mc.system.run(() => {
            let engine
            try { engine = dimension.getBlock(location) } catch {}
            if (engine?.typeId === "create:steam_engine") {
                steamEngineInteract(engine, player, itemCopy)
            }
        })
        return
    }
    if (
        isFirstEvent
        && (block?.typeId === "create:fluid_tank" || block?.typeId === "create:creative_fluid_tank")
        && item?.typeId === block.typeId
        && (interactedFace === "up" || interactedFace === "down")
        && canExtendFluidTank(block, player, interactedFace)
    ) {
        data.cancel = true
        const dimension = block.dimension
        const location = { x: block.x, y: block.y, z: block.z }
        mc.system.run(() => {
            const target = dimension.getBlock(location)
            if (target?.typeId === blockId) extendFluidTank(target, player, interactedFace)
        })
        return
    }
    if (
        isFirstEvent
        && (block?.typeId === "create:fluid_tank" || block?.typeId === "create:creative_fluid_tank")
        && item
        && (item.typeId === "minecraft:bucket" || item.typeId.includes("bucket") || resolveCompatibilityFluidId(item.typeId) || isCompatibilityFluidContainer(item.typeId))
    ) {
        data.cancel = true
        const itemCopy = item.clone?.() ?? item
        mc.system.run(() => fluidTankInteract(block, player, itemCopy))
        return
    }
    if (isFirstEvent && (block?.typeId === "create:fluid_tank" || block?.typeId === "create:creative_fluid_tank") && item?.typeId === "create:wrench" && !player?.isSneaking) {
        data.cancel = true
        const dimension = block.dimension
        const location = { x: block.x, y: block.y, z: block.z }
        mc.system.run(() => {
            const target = dimension.getBlock(location)
            if (target?.typeId === "create:fluid_tank" || target?.typeId === "create:creative_fluid_tank") toggleFluidTankTexture(target)
        })
        return
    }
    if (isFirstEvent && placePipeOnPipeFace(player, block, item, data.blockFace)) {
        data.cancel = true
        return
    }
    if (isFirstEvent && wrenchBreakCreateBlock(player, block, item)) {
        data.cancel = true
        return
    }
    if (isFirstEvent && pipeWrenchInteract(block, player, item)) {
        data.cancel = true
        return
    }
    if (isFirstEvent && mechanicalPumpWrenchInteract(block, player, item)) {
        data.cancel = true
        updatePipeConnectionsAround(block)
        return
    }
    if (isFirstEvent && rotateCreateBlockWithWrench(player, block, item, data.blockFace)) {
        data.cancel = true
        return
    }
    if (isFirstEvent && block?.typeId === "create:hatch") {
        data.cancel = true
        const itemCopy = item?.clone?.() ?? item
        mc.system.run(() => {
            hatchInteract(block, player, itemCopy)
        })
        return
    }
    if (isFirstEvent && placeTopMachineOnWorkBlock(block, player, item)) {
        data.cancel = true
        return
    }
    if (isFirstEvent && smartFluidPipeCanHandle(block, player, item)) {
        data.cancel = true
        const clickKey = smartFluidPipeClickKey(block, player, item);
        if (pendingSmartFluidPipeClicks.has(clickKey)) return;
        pendingSmartFluidPipeClicks.add(clickKey);
        const itemTypeId = item?.typeId
        mc.system.runTimeout(() => {
            pendingSmartFluidPipeClicks.delete(clickKey);
            smartFluidPipeInteract(block, player, itemTypeId ? { typeId: itemTypeId } : undefined);
        }, 1);
        return
    }
    if (isFirstEvent && handleFluidBucketBlockInteract(data)) {
        data.cancel = true
        return
    }
    if (blazeBurnerBeforeBlockInteract(data)) return
    if (isFirstEvent && beforeCasingCraftInteract(player, block, item)) {
        data.cancel = true
        return
    }
    if (isFirstEvent && weightedEjectorBeforeInteract(player, block, item)) {
        data.cancel = true
        return
    }
    if (isFirstEvent && mechanicalArmBeforeInteract(player, block, item)) data.cancel = true
}

/** @param {mc.ScriptEventCommandMessageAfterEvent} data */
export function scriptEventReceive(data) {
    const message = data.message
    const sourceEntity = data.sourceEntity
    const sourceBlock = data.sourceBlock
    const id = data.id
}


/** @param {mc.DataDrivenEntityTriggerAfterEvent} data */
export function entityJsonEvent(data){
    const entity = data.entity
    const eventId = data.eventId
    if (entity?.typeId === "create:mechanical_arm_entity" && eventId === "create:despawn_entity") {
        mechanicalArmDespawn(entity)
    }
}

/** @param {mc.PlayerInteractWithEntityAfterEvent} data */
export function entityInteract(data){
    const player = data.player
    const entity = data.target
    const item = data.itemStack
    if (blazeBurnerEntityInteract(player, entity, item)) return
    if (entity?.typeId === "create:mechanical_crafter_item") {
        try {
            if (entity.hasTag("create_mechanical_crafter_item_moving")) return
        } catch {}
        depot.claimConveyorItem(player, entity)
        return
    }
    if (entity?.typeId === "create:conveyor_item") {
        if (isItemDrainVisual(entity)) return
        depot.claimConveyorItem(player, entity)
    }
}

/** @param {mc.PlayerSwingStartAfterEvent} data */
export function swingStart(data){
    const player = data.player;
    const item = data.heldItemStack;
    const source = data.swingSource; //Attack, Mine, DropItem

    if (source !== "DropItem" || !player?.isValid) return;

    // Verifica se o jogador estÃ¡ olhando para um basin
    const rayResult = player.getBlockFromViewDirection({ maxDistance: 5 });
    const block = rayResult?.block;
    if (block?.typeId !== "create:basin") return;

    // Marca os itens soltos que aparecerem perto do jogador no prÃ³ximo tick
    mc.system.runTimeout(() => {
        const dim   = player.dimension;
        const head  = player.getHeadLocation();
        const items = dim.getEntities({
            type: "minecraft:item",
            location: head,
            maxDistance: 2
        });
        for (const ent of items) {
            if (ent?.isValid) BASIN_APPROVED_ITEMS.add(ent.id);
        }
        // Limpa aprovaÃ§Ãµes antigas apÃ³s 5 s para nÃ£o vazar memÃ³ria
        mc.system.runTimeout(() => {
            for (const ent of items) BASIN_APPROVED_ITEMS.delete(ent.id);
        }, 100);
    }, 1);
}

/** @param {mc.EntityHitBlockAfterEvent} data */
export function entityHitBlock(data){
    const player = data.damagingEntity
    const block = data.hitBlock
}

/** @param {mc.EntityHitEntityAfterEvent} data */
export function entityHit(data){
    const player = data.damagingEntity
    const entity = data.hitEntity
    blazeBurnerHitEntity(player, entity)
}

/** @param {mc.EntityHurtBeforeEvent} data */
export function beforeEntityHurt(data) {
    const entity = data.hurtEntity
    if (entity?.typeId === "create:brass_funnel_entity") {
        data.cancel = true
    }
}


/** @param {mc.PlayerInventoryItemChangeAfterEvent} */
export function playerInventoryItemChange({player, beforeItemStack, itemStack, slot}) {
};

export function playerInputButton(button, newButtonState, player){
}

function useExperienceNugget(player) {
    if (!player) return;
    const now = mc.system.currentTick;
    const lastUse = player.getDynamicProperty("create:experience_nugget_last_use") ?? -100;
    if (now - lastUse < 2) return;

    const equippable = player.getComponent("equippable");
    const hand = equippable?.getEquipment("Mainhand");
    if (!hand || hand.typeId !== "create:experience_nugget") return;
    try { player.setDynamicProperty("create:experience_nugget_last_use", now); } catch {}

    const consumed = Math.max(1, hand.amount ?? 1);
    const xpAmount = consumed * (3 + Math.floor(Math.random() * 3));
    try {
        player.addExperience(xpAmount);
    } catch {
        try { player.runCommand(`xp ${xpAmount} @s`); } catch {}
    }

    try { player.dimension.playSound("random.orb", player.location, { volume: 0.8, pitch: 1.2 }); } catch {}

    equippable.setEquipment("Mainhand");
}

const SAND_PAPER_IDS = new Set(["create:sand_paper", "create:red_sand_paper"]);
const SAND_PAPER_TICKS = 18;

function getEquippable(player) {
    return player?.getComponent?.("equippable");
}

function isSandPaper(item) {
    return SAND_PAPER_IDS.has(item?.typeId);
}

function canSandRoseQuartz(player, mainhandItem) {
    if (!player || !isSandPaper(mainhandItem)) return false;
    const offhand = getEquippable(player)?.getEquipment("Offhand");
    return offhand?.typeId === "create:rose_quartz";
}

function startSandPaperUse(player, item) {
    if (!canSandRoseQuartz(player, item)) return;
    try { player.setDynamicProperty("create:sand_paper_start", mc.system.currentTick); } catch {}
}

function useSandPaper(player, item) {
    if (!canSandRoseQuartz(player, item)) return;
    const startTick = player.getDynamicProperty("create:sand_paper_start");
    if (typeof startTick === "number" && mc.system.currentTick - startTick >= SAND_PAPER_TICKS) {
        completeSandPaperUse(player);
        return;
    }
    if (typeof startTick !== "number") startSandPaperUse(player, item);
}

function stopSandPaperUse(player, item) {
    if (!player) return;
    const startTick = player.getDynamicProperty("create:sand_paper_start");
    if (typeof startTick === "number" && mc.system.currentTick - startTick >= SAND_PAPER_TICKS) {
        completeSandPaperUse(player);
        return;
    }
    clearSandPaperUse(player);
}

function clearSandPaperUse(player) {
    try { player.setDynamicProperty("create:sand_paper_start", undefined); } catch {}
}

function completeSandPaperUse(player) {
    if (!player) return;
    const startTick = player.getDynamicProperty("create:sand_paper_start");
    clearSandPaperUse(player);
    if (typeof startTick !== "number") return;
    if (mc.system.currentTick - startTick < SAND_PAPER_TICKS) return;

    const equippable = getEquippable(player);
    const mainhand = equippable?.getEquipment("Mainhand");
    const offhand = equippable?.getEquipment("Offhand");
    if (!canSandRoseQuartz(player, mainhand) || offhand?.typeId !== "create:rose_quartz") return;

    const polished = new mc.ItemStack("create:polished_rose_quartz", 1);
    if (offhand.amount > 1) {
        offhand.amount -= 1;
        equippable.setEquipment("Offhand", offhand);
    } else {
        equippable.setEquipment("Offhand");
    }
    addItemToPlayerInventory(player, polished);

    damageSandPaper(player, mainhand);
    playSandPaperEffects(player, true);
}

function sandPaperTick(player, currentTick) {
    const startTick = player?.getDynamicProperty?.("create:sand_paper_start");
    if (typeof startTick !== "number") return;

    const mainhand = getEquippable(player)?.getEquipment("Mainhand");
    if (!canSandRoseQuartz(player, mainhand)) {
        clearSandPaperUse(player);
        return;
    }

    if (currentTick - startTick >= SAND_PAPER_TICKS) {
        completeSandPaperUse(player);
        return;
    }

    if (currentTick % 2 === 0) playSandPaperSound(player, false);
    if (currentTick % 4 === 0) spawnSandPaperParticles(player, false);
}

function damageSandPaper(player, item) {
    const equippable = getEquippable(player);
    const damaged = racoAPI.applyDurability(item, 1);
    if (!damaged || damaged.typeId === "minecraft:air") {
        try { player.dimension.playSound("random.break", player.location, { volume: 0.8, pitch: 1.0 }); } catch {}
        equippable?.setEquipment("Mainhand");
    } else {
        equippable?.setEquipment("Mainhand", damaged);
    }
}

function addItemToPlayerInventory(player, itemStack) {
    const inventory = player?.getComponent("minecraft:inventory")?.container;
    try {
        const leftover = inventory?.addItem(itemStack);
        if (leftover) player.dimension.spawnItem(leftover, player.location);
    } catch {
        try { player.dimension.spawnItem(itemStack, player.location); } catch {}
    }
}

function playSandPaperEffects(player, done) {
    playSandPaperSound(player, done);
    spawnSandPaperParticles(player, done);
}

function getSandPaperEffectPos(player) {
    const loc = player.location;
    const head = { x: loc.x, y: loc.y + 1.25, z: loc.z };
    const view = player.getViewDirection?.() ?? { x: 0, y: 0, z: 1 };
    return {
        x: head.x + view.x * 0.55,
        y: head.y + view.y * 0.25,
        z: head.z + view.z * 0.55
    };
}

function playSandPaperSound(player, done) {
    const pos = getSandPaperEffectPos(player);

    const sound = done ? "brush.generic" : "brush.sand";
    try { player.dimension.playSound(sound, pos, { volume: done ? 0.8 : 0.32, pitch: done ? 1.15 : 1.05 }); }
    catch { try { player.dimension.playSound("dig.sand", pos, { volume: done ? 0.45 : 0.28, pitch: done ? 1.25 : 1.45 }); } catch {} }
}

function spawnSandPaperParticles(player, done) {
    const pos = getSandPaperEffectPos(player);

    for (let i = 0; i < (done ? 8 : 3); i++) {
        const particlePos = {
            x: pos.x + (Math.random() - 0.5) * 0.25,
            y: pos.y + (Math.random() - 0.5) * 0.18,
            z: pos.z + (Math.random() - 0.5) * 0.25
        };
        try { player.dimension.spawnParticle("create:sand_paper_item_bits", particlePos); }
        catch { try { player.dimension.spawnParticle("minecraft:crop_growth_emitter", particlePos); } catch {} }
    }
}


