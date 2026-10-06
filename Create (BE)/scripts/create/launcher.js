import * as mc from "@minecraft/server";
import * as rc from "./racoScripts/racoTriggers";
import * as xz from "./andrielScripts/andrielTriggers";
import { initRpmBlock, onBreakRpmBlock, repairRpmAfterPiston, restoreLoadedSpeedControllers } from "./andrielScripts/rpm/rpmCore.js";
import { initVaultModule } from "../vault/init.js";
import { smartChuteComponent } from "./racoScripts/blocks/chute.js";
import { guardVisualEntitiesFromFishing } from "./racoScripts/visualEntityGuard.js";
import { cartAssemblerCarrierRemoved, cartAssemblerConstructSync, mechanicalBearingConstructSync } from "./andrielScripts/blocks/mechanicalBearing.js";
import { fluidTankBroken, rebuildLoadedFluidTanks } from "./tank/fluidTank.js";
import { updatePipeConnectionsAround } from "./racoScripts/blocks/pipe.js";
import {
    removeSteamEngineConnection,
    refreshBoilersNear,
    steamEnginePistonRemoved,
    steamEngineShaftBroken
} from "./racoScripts/blocks/steamEngine.js";
import { andesiteDoorComponent } from "./racoScripts/blocks/andesiteDoor.js";
import { copperDoorComponent } from "./racoScripts/blocks/copperDoor.js";
import { brassDoorComponent } from "./racoScripts/blocks/brassDoor.js";
import { glassDoorComponent } from "./racoScripts/blocks/glassDoor.js";
import { initCompatibilityBridge } from "./compatibility/index.js";

initCompatibilityBridge();

const XZ_TICK_BLOCKS = new Set([
    "create:dark_oak_window_connected",
    "create:ladder_brass",
    "create:ladder_copper",
    "create:ladder_andesite",
    "create:hand_crank",
    "create:mechanical_drill",
    "create:mechanical_saw",
    "create:mechanical_harvester",
    "create:encased_fan",
    "create:water_wheel",
    "create:large_water_wheel",
    "create:furnace_engine",
    "create:mechanical_belt",
    "create:windmill_bearing",
    "create:cart_assembler",
    "create:andesite_bars",
    "create:brass_bars",
    "create:copper_bars"
    ,"create:whistle"
    ,"create:sequenced_gearshift"
    ,"create:redstone_link"
    ,"create:redstone_link_receiver"
]);

function runBlockTick(event) {
    if (event.block?.typeId?.endsWith("_window_connected") || XZ_TICK_BLOCKS.has(event.block?.typeId)) xz.blockTick(event);
    else rc.blockTick(event);
}

mc.world.afterEvents.worldLoad.subscribe(data => {
    mc.system.run(() => rebuildLoadedFluidTanks());
    mc.system.run(() => restoreLoadedSpeedControllers());
    xz.onWorldLoad();
    initVaultModule();
});

mc.system.beforeEvents.startup.subscribe(data => {
    data.blockComponentRegistry.registerCustomComponent('create:ticking', {
        onTick: event => {
            runBlockTick(event);
        }
    });
    data.blockComponentRegistry.registerCustomComponent('create:on_place', {
        onPlace: event => {
            rc.blockPlace(event);
            xz.blockPlace(event);
        }
    });
    data.blockComponentRegistry.registerCustomComponent('create:on_interact', {
        onPlayerInteract: event => {
            rc.blockInteract(event);
            xz.blockInteract(event);
        }
    });
    data.blockComponentRegistry.registerCustomComponent('create:player_break', {
        onPlayerBreak: event => {
            rc.blockPlayerBreak(event);
            xz.blockPlayerBreak(event);
        },
    });
    data.blockComponentRegistry.registerCustomComponent('create:on_break', {
        onBreak: event => {
            xz.blockBreak(event);
            rc.blockBreak(event);
        },
    });
    data.blockComponentRegistry.registerCustomComponent('create:before_place', {
        beforeOnPlayerPlace: event => {
            xz.beforePlaceBlock(event);
            rc.beforePlaceBlock(event);
        }
    });
    data.blockComponentRegistry.registerCustomComponent('create:on_tick', {
        onTick: event => {
            runBlockTick(event);
        }
    });
    data.blockComponentRegistry.registerCustomComponent('create:step_on', {
        onStepOn: event => {
            rc.onStepOn(event);
        }
    });
    data.itemComponentRegistry.registerCustomComponent('create:use_on', {
        onUseOn: event => {
            xz.itemUseOn(event);
            rc.itemUseOn(event);
        }
    });
    data.blockComponentRegistry.registerCustomComponent('create:redstone_update', {
        onRedstoneUpdate: event => {
            rc.redstoneUpdate(event);
            xz.redstoneUpdate(event);
        }
    });
    data.blockComponentRegistry.registerCustomComponent('create:chute_smart_logic', smartChuteComponent);
    data.blockComponentRegistry.registerCustomComponent('create:andesite_door', andesiteDoorComponent);
    data.blockComponentRegistry.registerCustomComponent('create:copper_door', copperDoorComponent);
    data.blockComponentRegistry.registerCustomComponent('create:brass_door', brassDoorComponent);
    data.blockComponentRegistry.registerCustomComponent('create:glass_door', glassDoorComponent);
    data.blockComponentRegistry.registerCustomComponent('create:rpm_system', {
        onPlace: ExZ => { initRpmBlock(ExZ); },
        onBreak: ExZ => { onBreakRpmBlock(ExZ); },
    });
});

mc.world.afterEvents.playerPlaceBlock.subscribe(data => {
    rc.playerBlockPlace(data);
    xz.playerBlockPlace(data);
});

mc.world.afterEvents.itemUse.subscribe(data => {
    rc.itemUse(data);
    xz.itemUse(data);
});

mc.world.afterEvents.itemStartUse.subscribe(data => {
    rc.itemStartUse(data);
    xz.itemStartUse(data);
});

mc.world.afterEvents.itemStopUse.subscribe(data => {
    rc.itemStopUse(data);
    xz.itemStopUse(data);
});

mc.world.beforeEvents.playerBreakBlock.subscribe(data => {
    rc.beforeBlockBreak(data);
    xz.beforeBlockBreak(data);
});

mc.world.afterEvents.playerBreakBlock.subscribe(data => {
    if (data.brokenBlockPermutation?.type?.id === "create:shaft.steam_engine") {
        const location = { ...data.block.location };
        mc.system.run(() => steamEngineShaftBroken(data.dimension, location));
    }
    if (data.brokenBlockPermutation?.type?.id === "create:steam_engine") {
        const location = { ...data.block.location };
        mc.system.run(() => {
            removeSteamEngineConnection(data.dimension, location, data.brokenBlockPermutation);
        });
    }
    if (data.brokenBlockPermutation?.type?.id === "create:fluid_tank" || data.brokenBlockPermutation?.type?.id === "create:creative_fluid_tank") {
        const brokenType = data.brokenBlockPermutation.type.id;
        const location = { ...data.block.location };
        mc.system.run(() => {
            fluidTankBroken(data.dimension, location, brokenType);
            if (brokenType === "create:fluid_tank") refreshBoilersNear(data.dimension, location);
            const block = data.dimension.getBlock(location);
            updatePipeConnectionsAround(block);
        });
    }
    xz.blockBreak(data);
});

mc.world.beforeEvents.playerInteractWithBlock.subscribe(data => {
    rc.beforeBlockInteract(data);
    xz.beforeBlockInteract(data);
});

mc.world.afterEvents.playerInteractWithBlock.subscribe(data => {
    xz.afterBlockInteract(data);
});

mc.world.beforeEvents.playerInteractWithEntity.subscribe(data => {
    xz.beforeEntityInteract(data);
});

mc.world.afterEvents.playerInteractWithEntity.subscribe(data => {
    xz.entityInteract(data);
    rc.entityInteract(data);
});

mc.world.afterEvents.entitySpawn.subscribe(data => {
    rc.entitySpawn(data);
    xz.entitySpawn(data);
});

mc.world.afterEvents.entityHitEntity.subscribe(data => {
    xz.entityHitEntity(data);
    rc.entityHit(data);
});

mc.world.afterEvents.entityHitBlock.subscribe(data => {
    rc.entityHitBlock(data);
    xz.entityHitBlock(data);
});

mc.world.afterEvents.entityHurt.subscribe(data => {
    xz.entityHurt(data);
});

mc.world.afterEvents.projectileHitEntity.subscribe(data => {
    xz.projectileHitEntity(data);
});

mc.world.afterEvents.projectileHitBlock.subscribe(data => {
    xz.projectileHitBlock(data);
});
mc.world.afterEvents.entityLoad.subscribe(data => {
    rc.entityLoad(data);
    xz.entityLoad(data);
});

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(data => {
    if (!data.eventId.startsWith('create')) return;
    xz.entityJsonEvent(data);
    rc.entityJsonEvent(data);
});

mc.world.afterEvents.blockExplode.subscribe(data => {
    const brokenType = data.explodedBlockPermutation?.type?.id;
    if (brokenType === "create:fluid_tank" || brokenType === "create:creative_fluid_tank") {
        // blockExplode is emitted after the block has already been removed. Run
        // on the next tick so every block destroyed by the same explosion is
        // gone before the surviving tank structure is assembled again.
        const location = { ...data.block.location };
        mc.system.run(() => {
            fluidTankBroken(data.dimension, location, brokenType);
            if (brokenType === "create:fluid_tank") refreshBoilersNear(data.dimension, location);
            updatePipeConnectionsAround(data.dimension.getBlock(location));
        });
    }
    xz.blockExplode(data);
});

mc.world.afterEvents.pistonActivate?.subscribe(data => {
    repairRpmAfterPiston(data);
});

mc.world.beforeEvents.explosion.subscribe(data => {
});

mc.world.beforeEvents.entityRemove.subscribe(({ removedEntity: entity }) => {
    if (entity?.typeId === "create:steam_engine_piston") {
        const dimension = entity.dimension;
        const location = { ...entity.location };
        mc.system.run(() => steamEnginePistonRemoved(dimension, location));
    }
    cartAssemblerCarrierRemoved(entity);
});

mc.world.afterEvents.playerButtonInput.subscribe(data => {
    const { button, newButtonState, player } = data;
    if (!player) return;

    rc.playerInputButton(button, newButtonState, player);
});

export let currentTick = mc.system.currentTick;

mc.system.runInterval(() => {
    currentTick = mc.system.currentTick;
    const allPlayers = mc.world.getAllPlayers();
    const activeDimensions = new Set();

    for (const player of allPlayers) {
        if (!player?.isValid) continue;
        activeDimensions.add(player.dimension);

        rc.playerTick(player, currentTick);
        xz.playerTick(player, currentTick);
    };
    mechanicalBearingConstructSync(activeDimensions);
    cartAssemblerConstructSync(activeDimensions);
    guardVisualEntitiesFromFishing(allPlayers);
}, 1);

mc.world.afterEvents.playerHotbarSelectedSlotChange.subscribe(data => {
    xz.playerHotbarSelectedSlotChange(data);
});

mc.world.afterEvents.playerSpawn.subscribe(data => {
    xz.playerSpawn(data);
});

mc.world.afterEvents.playerLeave.subscribe(() => {
    xz.playerLeave();
});

mc.world.afterEvents.entityDie.subscribe(data => {
    xz.entityDie(data);
});


mc.system.afterEvents.scriptEventReceive.subscribe((data) => {
    rc.scriptEventReceive(data);
});



mc.world.afterEvents.playerSwingStart.subscribe(data => {
    rc.swingStart(data);
    xz.playerSwingStart(data);
});

mc.world.afterEvents.playerInventoryItemChange.subscribe((data) => {
    rc.playerInventoryItemChange(data);
});

mc.world.beforeEvents.entityHurt.subscribe(data => {
    rc.beforeEntityHurt(data);
});

