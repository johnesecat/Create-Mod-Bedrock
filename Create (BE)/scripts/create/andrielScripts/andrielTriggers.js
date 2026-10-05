import * as mc from "@minecraft/server";
import { creativeMotorRpmParticleTick, onInteractCreativeMotor, speedControllerRpmParticleTick } from "./blocks/creativeMotor";
import { clutchAndGearshift, extendKineticBlock, sequencedGearshiftRedstone, sequencedGearshiftTick, speedControllerInteract } from "./blocks/rpmConductors";
import { connectableBlockBreak, connectableBlockPlace, connectableBlocks, seatBreak, seatInteract, slabPlacement } from "./blocks/constructionBlocks";
import { handCrankInteract, handCrankTick } from "./blocks/handCrank";
import { mechanicalDrillDeleteData, mechanicalDrillTick } from "./blocks/mechanicalDrill";
import { mechanicalSawDeleteData, mechanicalSawTick } from "./blocks/mehcanicalSaw";
import { clearGogglesPanel, engineersGoggles } from "./armorAndTools/engineersGoggles";
import { potatoProjectileHitBlock, potatoProjectileHitEntity, usePotatoCannon } from "./armorAndTools/potatoCannon";
import { encasedFanDeleteData, encasedFanTick } from "./blocks/encasedFan";
import { waterWheelTick, waterWheelDeleteData } from "./blocks/waterWheel";
import { largeWaterWheelTick, largeWaterWheelDeleteData } from "./blocks/largeWaterWheel";
import { applyWaterWheelWood, isWaterWheelWoodInteraction } from "./blocks/waterWheelWood";
import { basinBreak } from "../racoScripts/blocks/mechanicalMixer";
import { deployerBreak } from "../racoScripts/blocks/deployer";
import { furnaceEngineFrame, furnaceEngineTick } from "./blocks/furnaceEngine";
import { addPulley, conveyorPreviewTick, dyeMechanicalBelt, isMechanicalBeltDye, mechanicalBeltInteract, onBreakConveyor, removePulley } from "./blocks/conveyorBelt";
import { mechanicalBeltTick } from "./blocks/conveyorMovement";
import { bearingDoorInteract, bearingSeatInteract, deployPackedCartContraption, isPackedCartPlacementBlock, mechanicalBearingBlockPlace, mechanicalBearingBreak, mechanicalBearingTick, mechanicalBearingWrenchInteract, mechanicalHarvesterTick, packCartContraptionWithWrench } from "./blocks/mechanicalBearing";
import { dedupeWindmillBearingEntity, rememberWindmillSailPlacement, rotateWindmillSailWithWrench, windmillBearingBlockPlace, windmillBearingBreak, windmillBearingInteract, windmillBearingRedstoneUpdate, windmillBearingTick } from "./blocks/windmillBearing";
import { applyRadialChassisGlue, clearAllGlueSelectionVisuals, removeLoadedGlueSelectionVisual, superGlueBlockBreak, superGlueBlockPlace, superGlueInteract, superGlueParticleTick } from "./blocks/superGlue";
import { cartAssemblerRedstoneUpdate, cartAssemblerTick, placeCartAssemblerOnRail } from "./blocks/cartAssembler";
import { DIRECTION_OFFSETS, INVERT_FACE } from "./rpm/rpmHelpers";
import { rotationToFace } from "./xZ-Utils";
import { applyCopycatMaterial, isCopycatMaterial } from "./blocks/copycatPanel.js";
import { metalGirderBreak, metalGirderPlace } from "./blocks/metalGirder.js";
import { connectedBarsBreak, connectedBarsPlace, connectedBarsTick } from "./blocks/connectedBars.js";
import { whistleBreak, whistlePlace, whistleRedstoneUpdate, whistleTick } from "./blocks/whistle.js";
import { redstoneLinkBreak, redstoneLinkInteract, redstoneLinkPlace, redstoneLinkRedstoneUpdate, redstoneLinkTick } from "./blocks/redstoneLink.js";
import { ladderBrassHasSupport, ladderBrassPlayerTick, ladderBrassTick } from "./blocks/ladderBrass.js";
import { darkOakWindowTick, isConnectedWindowId } from "./blocks/darkOakWindow.js";

const SHADOWLESS_CONSTRUCTS = new Set([
    "create:mechanical_bearing_construct",
    "create:mechanical_saw_construct",
    "create:mechanical_drill_construct",
    "create:door_construct",
    "create:ladder_construct",
    "create:mechanical_harvester_construct",
    "create:deployer_construct",
    "create:portable_storage_interface_construct",
    "create:windmill_sail_construct",
    "create:seat_construct",
    "create:slab_construct",
    "create:carpet_construct",
    "create:radial_chassis_construct"
    ,"create:sticker_construct"
    ,"create:stair_construct"
]);

function hideConstructShadow(entity) {
    if (!entity?.isValid) return;
    if (SHADOWLESS_CONSTRUCTS.has(entity.typeId)) {
        try { entity.addEffect("invisibility", 20000000, { amplifier: 0, showParticles: false }); } catch {}
    }
}


/** @param {mc.Player} player */
export function playerTick(player, currentTick) {
    ladderBrassPlayerTick(player);
    const playerEquipment = player.getComponent('minecraft:equippable');
    const headItem = playerEquipment.getEquipment('Head');
    if (headItem?.typeId === 'create:goggles') engineersGoggles(player, currentTick);
    else clearGogglesPanel(player);
    conveyorPreviewTick(player, player.dimension, currentTick);
    superGlueParticleTick(player, currentTick);
    creativeMotorRpmParticleTick(player, currentTick);
    speedControllerRpmParticleTick(player, currentTick);
};


// BLOCK CUSTOM COMPONENTS

/** @param {mc.BlockComponentTickEvent} */
export function blockTick({block, dimension}) {
    if (isConnectedWindowId(block.typeId)) {
        darkOakWindowTick(block);
        return;
    }
    if (block.typeId === "create:ladder_brass" || block.typeId === "create:ladder_copper" || block.typeId === "create:ladder_andesite") {
        ladderBrassTick(block);
        return;
    }
    if (block.typeId === "create:redstone_link" || block.typeId === "create:redstone_link_receiver") {
        redstoneLinkTick(block);
        return;
    }
    if (block.typeId === "create:sequenced_gearshift") {
        sequencedGearshiftTick(block, dimension);
        return;
    }
    if (block.typeId === "create:whistle") {
        whistleTick(block);
        return;
    }
    if (block.typeId === "create:andesite_bars" || block.typeId === "create:brass_bars" || block.typeId === "create:copper_bars") {
        connectedBarsTick(block);
        return;
    }
    switch (block.typeId) {
        case 'create:hand_crank': handCrankTick(block, dimension); break;
        case 'create:mechanical_drill': mechanicalDrillTick(block, dimension); break;
        case 'create:mechanical_saw': mechanicalSawTick(block, dimension); break;
        case 'create:mechanical_harvester': mechanicalHarvesterTick(block, dimension); break;
        case 'create:encased_fan': encasedFanTick(block, dimension); break;
        case 'create:water_wheel': waterWheelTick(block, dimension); break;
        case 'create:large_water_wheel': largeWaterWheelTick(block, dimension); break;
        // case 'create:flywheel': furnaceEngineTick(block, dimension); break;
        case 'create:furnace_engine': furnaceEngineTick(block, dimension); break;
        case 'create:mechanical_belt': mechanicalBeltTick(block, dimension); break;
        case 'create:mechanical_bearing': mechanicalBearingTick(block, dimension); break;
        case 'create:windmill_bearing': windmillBearingTick(block, dimension); break;
        case 'create:cart_assembler': cartAssemblerTick(block, dimension); break;
    }
};

/** @param {mc.BlockComponentBlockBreakEvent} */
export function blockBreak({block, dimension, blockDestructionSource, brokenBlockPermutation, entitySource}) {
    const blockId = brokenBlockPermutation.type.id;
    metalGirderBreak(block, brokenBlockPermutation);
    connectedBarsBreak(block, brokenBlockPermutation);
    whistleBreak(block, brokenBlockPermutation);
    redstoneLinkBreak(block, brokenBlockPermutation);
    superGlueBlockBreak(block, dimension);
    
    if (blockId.includes('create:') && blockId.includes('seat')) seatBreak(block, dimension);
    if (connectableBlocks.includes(blockId)) connectableBlockBreak(block, brokenBlockPermutation);
    if (blockId === 'create:mechanical_drill') mechanicalDrillDeleteData(block);
    if (blockId === 'create:mechanical_saw') mechanicalSawDeleteData(block);
    if (blockId === 'create:basin') basinBreak(block);
    if (blockId === 'create:deployer') deployerBreak(block);
    if (blockId === 'create:encased_fan') encasedFanDeleteData(block);
    if (blockId === 'create:water_wheel') waterWheelDeleteData(block);
    if (blockId === 'create:large_water_wheel') largeWaterWheelDeleteData(block);
    if (blockId === 'create:mechanical_belt') onBreakConveyor(block, dimension, brokenBlockPermutation);
    if (blockId === 'create:mechanical_bearing') mechanicalBearingBreak(block, dimension);
    if (blockId === 'create:windmill_bearing') windmillBearingBreak(block, dimension);
};

/** @param {mc.BlockComponentPlayerBreakEvent} */
export function blockPlayerBreak({block, player, dimension, brokenBlockPermutation}) {
};

/** @param {mc.BlockComponentOnPlaceEvent} */
export function blockPlace({block, dimension, previousBlock}) {
    metalGirderPlace(block);
    connectedBarsPlace(block);
    whistlePlace(block);
    redstoneLinkPlace(block);
};

/** @param {mc.BlockComponentPlayerInteractEvent} */
export function blockInteract({ player, block, dimension, faceLocation, face, itemStack }) {
    let heldItem = itemStack;
    if (!heldItem) {
        try { heldItem = player.getComponent("minecraft:equippable")?.getEquipment("Mainhand"); } catch {}
    }
    if (applyRadialChassisGlue({ player, block, itemStack: heldItem })) return;
    if ((block.typeId === "create:redstone_link" || block.typeId === "create:redstone_link_receiver") && redstoneLinkInteract(player, block, heldItem)) return;
    if ((block.typeId === "create:copycat_panel" || block.typeId === "create:copycat_step") && applyCopycatMaterial(block, heldItem)) return;
    if (block.typeId === "create:mechanical_belt" && dyeMechanicalBelt(player, block, dimension, heldItem)) return;
    if (block.typeId === "create:desk_bell") {
        let pressed = false;
        try { pressed = block.permutation.getState("create:pressed") === true; } catch {}
        if (pressed) return;

        const bellLocation = { x: block.location.x, y: block.location.y, z: block.location.z };
        try {
            block.setPermutation(block.permutation.withState("create:pressed", true));
            dimension.spawnEntity("create:desk_bell_entity", {
                x: bellLocation.x + 0.5,
                y: bellLocation.y,
                z: bellLocation.z + 0.5
            });
            dimension.playSound("create:desk_bell", {
                x: bellLocation.x + 0.5,
                y: bellLocation.y + 0.5,
                z: bellLocation.z + 0.5
            }, { volume: 1.0, pitch: 1.0 });
        } catch {}

        mc.system.runTimeout(() => {
            try {
                const currentBell = dimension.getBlock(bellLocation);
                if (currentBell?.typeId !== "create:desk_bell") return;
                currentBell.setPermutation(currentBell.permutation.withState("create:pressed", false));
            } catch {}
        }, 16);
        return;
    }
    if (block.typeId === "create:cart_assembler" && heldItem?.typeId === "create:minecart_contraption") {
        mc.system.run(() => deployPackedCartContraption(player, block, heldItem));
        return;
    }
    if (block.typeId === "create:creative_motor") onInteractCreativeMotor(player, block, dimension);
    if (block.typeId === "create:windmill_bearing" && windmillBearingInteract(player, block, dimension)) return;
    if (block.typeId === 'create:rotation_speed_controller') speedControllerInteract(player, block, dimension);
    if (block.typeId.includes('create:') && block.typeId.includes('seat')) seatInteract(player, block, dimension);
    if (block.typeId === 'create:hand_crank') handCrankInteract(player, block, dimension);
};

/** @param {mc.BlockComponentPlayerPlaceBeforeEvent} data */
export function beforePlaceBlock(data) {
    const { block, dimension, permutationToPlace } = data;
    const blockId = permutationToPlace.type.id;

    if ((blockId === "create:ladder_brass" || blockId === "create:ladder_copper" || blockId === "create:ladder_andesite")
        && !ladderBrassHasSupport(block, permutationToPlace)) {
        data.cancel = true;
        return;
    }

    if (blockId === "create:whistle") {
        let support;
        try {
            support = dimension.getBlock({ x: block.x, y: block.y - 1, z: block.z });
        } catch {}
        if (support?.typeId !== "create:fluid_tank"
            && support?.typeId !== "create:creative_fluid_tank"
            && support?.typeId !== "create:whistle"
            && support?.typeId !== "create:whistle_tubo") {
            data.cancel = true;
            return;
        }
    }

    if (blockId === "create:nozzle") {
        const stateByFace = {
            north: "north", south: "south", east: "east", west: "west",
            above: "up", below: "down"
        };
        let fanFace;

        for (const offset of Object.values(DIRECTION_OFFSETS).slice(0, 6)) {
            const fan = dimension.getBlock({
                x: block.x - offset.x,
                y: block.y - offset.y,
                z: block.z - offset.z
            });
            if (fan?.typeId !== "create:encased_fan") continue;
            const facing = fan.permutation.getState("minecraft:facing_direction");
            const outputFace = rotationToFace[INVERT_FACE[facing]];
            const output = DIRECTION_OFFSETS[outputFace];
            if (output?.x === offset.x && output?.y === offset.y && output?.z === offset.z) {
                fanFace = outputFace;
                break;
            }
        }

        if (!fanFace) {
            data.cancel = true;
            return;
        }
        data.permutationToPlace = permutationToPlace.withState(
            "minecraft:facing_direction",
            stateByFace[fanFace]
        );
    }

    if (connectableBlocks.includes(blockId)) connectableBlockPlace(data);
};

/** @param {mc.BlockComponentRedstoneUpdateEvent} */
export function redstoneUpdate({block, dimension, powerLevel}) {
    if (block.typeId === 'create:redstone_link') redstoneLinkRedstoneUpdate(block, dimension, powerLevel);
    if (['create:clutch', 'create:gearshift'].includes(block.typeId)) clutchAndGearshift(block, dimension, powerLevel);
    if (block.typeId === 'create:sequenced_gearshift') sequencedGearshiftRedstone(block, dimension, powerLevel);
    if (block.typeId === 'create:windmill_bearing') windmillBearingRedstoneUpdate(block, dimension, powerLevel);
    if (block.typeId === 'create:cart_assembler') cartAssemblerRedstoneUpdate(block, dimension, powerLevel);
    if (block.typeId === 'create:sticker') {
        const powered = powerLevel > 0;
        if (block.permutation.getState('create:powered') !== powered) {
            block.setPermutation(block.permutation.withState('create:powered', powered));
            try {
                dimension.playSound(powered ? 'piston.in' : 'piston.out', block.center(), { volume: 0.8, pitch: 1.0 });
            } catch {}
        }
    }
    if (block.typeId === 'create:whistle') whistleRedstoneUpdate(block, dimension, powerLevel);
    if (block.typeId === 'create:rose_quartz_lamp') {
        const powered = powerLevel > 0;
        if (block.permutation.getState('create:powered') !== powered) {
            block.setPermutation(block.permutation.withState('create:powered', powered));
            try {
                dimension.playSound(
                    powered ? 'copper_bulb.turn_on' : 'copper_bulb.turn_off',
                    block.center(),
                    { volume: 1.0, pitch: 1.0 }
                );
            } catch {}
        }
    }
};



// ITEM CUSTOM COMPONENTS

/** @param {mc.ItemComponentUseOnEvent} */
export function itemUseOn({source, itemStack, block, blockFace, faceLocation, usedOnBlockPermutation}) {
    if (usePotatoCannon({ source, itemStack })) return;
    if (itemStack?.typeId === "create:minecart_contraption" && isPackedCartPlacementBlock(block)) {
        deployPackedCartContraption(source, block, itemStack);
        return;
    }
    if (applyRadialChassisGlue({ source, itemStack, block })) return;
    if (superGlueInteract({ source, itemStack, block, blockFace })) return;
    mechanicalBeltInteract(source, block, source.dimension, itemStack);
};

/** @param {mc.ItemComponentUseEvent} */
export function itemOnUse({source, itemStack}) {
};


/** @param {mc.ItemComponentMineBlockEvent} */
export function itemMineBlock({source, itemStack, block, minedBlockPermutation}) {
};

// WORLD EVENTS

export function onWorldLoad() {
    mc.system.run(() => clearAllGlueSelectionVisuals());
};

/** @param {mc.PlayerPlaceBlockAfterEvent} data */
export function playerBlockPlace({player, block, dimension}) {
    connectedBarsPlace(block);
    superGlueBlockPlace(block, player);
    // Orient sails before the bearing can convert the placed block to an entity.
    windmillBearingBlockPlace(block, player);
    mechanicalBearingBlockPlace(block);
};


/** @param {mc.PlayerBreakBlockBeforeEvent} data */
export function beforeBlockBreak(data) {
};


/** @param {mc.ItemUseAfterEvent} data */
export function itemUse(data) {
    if (usePotatoCannon(data)) return;
    superGlueInteract(data);
};


/** @param {mc.ItemStartUseAfterEvent} */
export function itemStartUse({source, itemStack}) {
};


/** @param {mc.ItemStopUseAfterEvent} data */
export function itemStopUse({source, itemStack, useDuration}) {
};


/** @param {mc.PlayerInteractWithBlockBeforeEvent} data */
export function beforeBlockInteract(data) {
    const { block, blockFace, itemStack } = data;

    if (placeCartAssemblerOnRail(data)) return;

    // Handle this in the block interaction event as well as the item's custom
    // component. Custom blocks can consume the click before onUseOn is emitted.
    let heldItem = itemStack;
    try { heldItem ??= data.player.getComponent("minecraft:equippable")?.getEquipment("Mainhand"); } catch {}
    if (block?.typeId === "create:radial_chassis" && heldItem?.typeId === "create:super_glue") {
        data.cancel = true;
        const location = { ...block.location };
        const dimension = block.dimension;
        const player = data.player;
        mc.system.run(() => applyRadialChassisGlue({
            player,
            block: dimension.getBlock(location),
            itemStack: heldItem
        }));
        return;
    }
    if ((block?.typeId === "create:copycat_panel" || block?.typeId === "create:copycat_step") && isCopycatMaterial(heldItem)) {
        data.cancel = true;
        const location = { ...block.location };
        const dimension = block.dimension;
        mc.system.run(() => {
            const currentBlock = dimension.getBlock(location);
            if (currentBlock?.typeId === "create:copycat_panel" || currentBlock?.typeId === "create:copycat_step") {
                applyCopycatMaterial(currentBlock, heldItem);
            }
        });
        return;
    }
    if (isWaterWheelWoodInteraction(block, heldItem)) {
        data.cancel = true;
        mc.system.run(() => applyWaterWheelWood(data.player, block, heldItem));
        return;
    }
    if (block?.typeId === "create:mechanical_belt" && isMechanicalBeltDye(heldItem)) {
        data.cancel = true;
        mc.system.run(() => dyeMechanicalBelt(data.player, block, data.player.dimension, heldItem));
        return;
    }
    if (heldItem?.typeId === "create:minecart_contraption" && isPackedCartPlacementBlock(block)) {
        data.cancel = true;
        mc.system.run(() => deployPackedCartContraption(data.player, block, heldItem));
        return;
    }

    if (mechanicalBearingWrenchInteract(data)) return;

    if (rotateWindmillSailWithWrench(data)) return;
    rememberWindmillSailPlacement(data.player, itemStack, blockFace, block);
    if (extendKineticBlock(data)) return;
    if (itemStack?.typeId.startsWith("create:") && itemStack?.typeId.includes("slab")) slabPlacement(data);
    if (itemStack?.typeId === 'create:shaft' && block.typeId === 'create:mechanical_belt') addPulley(data);
    if (itemStack?.typeId === 'create:wrench' && block.typeId === 'create:mechanical_belt') removePulley(data);
};

/** @param {mc.PlayerInteractWithEntityBeforeEvent} data */
export function beforeEntityInteract(data) {
    const { player, target, itemStack } = data;
    let heldItem = itemStack;
    try { heldItem ??= player.getComponent("minecraft:equippable")?.getEquipment("Mainhand"); } catch {}
    if (heldItem?.typeId !== "create:wrench") return;
    try { if (!target?.hasTag?.("create_cart_assembler_carrier")) return; } catch { return; }
    data.cancel = true;
    mc.system.run(() => packCartContraptionWithWrench(player, target, heldItem));
};

/** @param {mc.PlayerInteractWithBlockAfterEvent} data */
export function afterBlockInteract(data) {
    if (applyRadialChassisGlue(data)) return;
    superGlueInteract(data);
};

/** @param {mc.PlayerInteractWithEntityAfterEvent} data */
export function entityInteract({player, target, itemStack, beforeItemStack}) {
    if (bearingDoorInteract(player, target)) return;
    bearingSeatInteract(player, target);
};

/** @param {mc.EntitySpawnAfterEvent} data */
export function entitySpawn(data) {
    hideConstructShadow(data.entity);
    dedupeWindmillBearingEntity(data.entity);
};


/** @param {mc.EntityLoadAfterEvent} */
export function entityLoad({entity}) {
    if (removeLoadedGlueSelectionVisual(entity)) return;
    hideConstructShadow(entity);
    dedupeWindmillBearingEntity(entity);
};


/** @param {mc.DataDrivenEntityTriggerAfterEvent} */
export function entityJsonEvent({entity, eventId, getModifiers}) {
};

/** @param {mc.BlockExplodeAfterEvent} */
export function blockExplode({block, dimension, source, explodedBlockPermutation}) {
};


/** @param {mc.PlayerHotbarSelectedSlotChangeAfterEvent} */
export function playerHotbarSelectedSlotChange({player, itemStack, newSlotSelected, previousSlotSelected}) {
};


/** @param {mc.PlayerSpawnAfterEvent} */
export function playerSpawn({player, initialSpawn}) {
};

export function playerLeave() {
    mc.system.run(() => {
        if (mc.world.getAllPlayers().length === 0) clearAllGlueSelectionVisuals();
    });
};

/** @param {mc.EntityDieAfterEvent} */
export function entityDie({deadEntity, damageSource}) {
};

/** @param {mc.EntityHurtAfterEvent} */
export function entityHurt({damage, damageSource, hurtEntity}) {
};

/** @param {mc.PlayerSwingStartAfterEvent} */
export function playerSwingStart({player, heldItemStack, swingSource}) { 
};

/** @param {mc.EntityHitEntityAfterEvent} */
export function entityHitEntity({hitEntity: target, damagingEntity: entity}) {
};

/** @param {mc.EntityHitBlockAfterEvent} */
export function entityHitBlock({damagingEntity: entity, hitBlock, blockFace, hitBlockPermutation}) {
};

/** @param {mc.ProjectileHitBlockAfterEvent} data */
export function projectileHitBlock(data) {
    if (potatoProjectileHitBlock(data)) return;
    const { dimension, projectile, source, hitVector, location } = data;
};

/** @param {mc.ProjectileHitEntityAfterEvent} data */
export function projectileHitEntity(data) {
    potatoProjectileHitEntity(data);
};




