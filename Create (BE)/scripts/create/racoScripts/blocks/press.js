import * as mc from "@minecraft/server";
import * as racoAPI from "../raco-API.js";
import { resetDepotVisualsForBlock, syncDepotVisualsForBlock } from "./depot.js";
import { peekItemDrainFluid, takeItemDrainFluid } from "./itemDrain.js";
import { compatibilityRecipes } from "../../compatibility/registries.js";

function snapToPowerOf2(rpm) {
    const steps = [1, 2, 4, 8, 16, 32, 64, 128, 256];
    let nearest = steps[0];
    let minDiff = Math.abs(rpm - nearest);
    for (let i = 1; i < steps.length; i++) {
        const diff = Math.abs(rpm - steps[i]);
        if (diff < minDiff) { nearest = steps[i]; minDiff = diff; }
    }
    return nearest;
}

// Full cycle duration in ticks — same table as deployer.
const TIME_CONFIG = {
    1: 800, 2: 400, 4: 200, 8: 100,
    16: 50, 32: 25, 64: 12.5, 128: 6.25, 256: 3.125
};
const MIN_PRESS_CYCLE_TICKS = 20;
const PRESS_INTERACT_PROGRESS = 0.6;
const BASIN_CHOCOLATE_FLUID = "create:chocolate_bucket";
const BASIN_CHOCOLATE_RESULT = "create:bar_of_chocolate";
const BASIN_ANDESITE_FLUID = "minecraft:lava_bucket";
const BASIN_ANDESITE_RESULT = "minecraft:andesite";
const BASIN_ANDESITE_INPUT = {
    "minecraft:flint": 1,
    "minecraft:gravel": 1
};

// ── Press recipes ────────────────────────────────────────────────────────────
// { input: typeId, result: typeId }
// The press processes items on a belt/depot 1 block below it.
const PRESS_RECIPES = [
    // Sheets (ingot → sheet)
    { input: "minecraft:iron_ingot",   result: "create:iron_sheet"   },
    { input: "minecraft:copper_ingot", result: "create:copper_sheet" },
    { input: "minecraft:gold_ingot",   result: "create:golden_sheet" },
    { input: "create:brass_ingot",     result: "create:brass_sheet"  },
    { input: "minecraft:sugar_cane",     result: "minecraft:paper"  },

    // Crushed ores (raw ore → crushed)
    { input: "minecraft:raw_iron",   result: "create:crushed_raw_iron"   },
    { input: "minecraft:raw_copper", result: "create:crushed_raw_copper" },
    { input: "minecraft:raw_gold",   result: "create:crushed_raw_gold"   },
    { input: "create:raw_zinc",      result: "create:crushed_raw_zinc"   },
];

/**
 * Main tick for the mechanical press — called every ~10 ticks while spinning.
 * @param {mc.Block} block
 */
export function pressTick(block) {
    const entity = block?.dimension?.getEntities({
        type: "create:mechanical_press_entity",
        location: block.center(),
        maxDistance: 0.5
    })[0];
    if (!entity) return;

    const rpm = entity.getProperty("create:rpm") ?? 0;
    if (rpm === 0) return;

    // The press acts on the block directly below it.
    let belowBlock;
    try { belowBlock = block.below(2); } catch { return; }
    if (!belowBlock) return;

    const bruteSpeed = snapToPowerOf2(Math.abs(rpm));
    const now = mc.system.currentTick;
    const interactPos = getPressInteractPos(belowBlock);
    const movementInfo = entity.getDynamicProperty("create:movement_info");
    const activeTargetId = getMovementTargetId(movementInfo);

    cleanupStalePressTargets(belowBlock, activeTargetId, now);

    // ── Belt-item locking ──────────────────────────────────────────────────
    // Stop any conveyor_item sitting on the block below, using the same
    // Math.floor-based coordinate check the deployer uses.
    if (!movementInfo) {
        if (canPressChocolateBasin(belowBlock)) {
            startBasinChocolatePressCycle(entity, bruteSpeed, now, belowBlock);
            return;
        }
        if (canPressAndesiteBasin(belowBlock)) {
            startBasinAndesitePressCycle(entity, bruteSpeed, now, belowBlock);
            return;
        }

        const item = getPressableConveyorTarget(belowBlock, false, now, true);
        if (item) item.addTag('create:conveyor_stop');
    }

    // ── Press cycle ────────────────────────────────────────────────────────
    if (!movementInfo) {
        const target = getPressableConveyorTarget(belowBlock, true);
        if (!target) {
            entity.setProperty('create:press_progress', 0.0);
            return;
        }

        startPressCycle(entity, bruteSpeed, now, target);
    } else {
        const data = JSON.parse(movementInfo);

        const elapsed = now - data.startTick;
        const total   = data.endTick - data.startTick;
        entity.setProperty('create:press_progress', Math.min(elapsed / total, 1.0));

        if (data.type === "basin_chocolate") {
            processBasinChocolatePress(block, entity, belowBlock, data, now, interactPos);
            return;
        }
        if (data.type === "basin_andesite") {
            processBasinAndesitePress(block, entity, belowBlock, data, now, interactPos);
            return;
        }

        if (now >= data.interactTick && !data.interacted) {
            // Find the stopped item physically inside the block below.
            const conveyorTarget = getPressTargetById(data.targetId, belowBlock, true);

            if (conveyorTarget) {
                const recipe = getPressRecipeForConveyorItem(conveyorTarget);

                if (recipe) {
                    const resultItem = new mc.ItemStack(recipe.result, 1);
                    const willFinishStack = getPressTargetItemAmount(conveyorTarget) <= 1;
                    racoAPI.processOneConveyorItem(conveyorTarget, resultItem, interactPos);
                    if (belowBlock.typeId === "create:depot") {
                        if (willFinishStack) resetDepotVisualsForBlock(belowBlock);
                        else syncDepotVisualsForBlock(belowBlock);
                    }
                    block.dimension.playSound("create:mechanical_press.impact", interactPos, { volume: 1.0, pitch: 1.0 });
                    block.dimension.playSound("create:mechanical_press.crushing", interactPos, { volume: 0.6, pitch: 1.0 });
                    try { block.dimension.spawnParticle("create:deploy_impact", interactPos); } catch {}
                } else {
                    block.dimension.playSound("create:mechanical_press.impact", interactPos, { volume: 0.5, pitch: 0.9 });
                }

                if (!getPressRecipeForConveyorItem(conveyorTarget)) {
                    releasePressTarget(conveyorTarget, belowBlock, now);
                }
            }

            data.interacted = true;
            entity.setDynamicProperty("create:movement_info", JSON.stringify(data));
        }

        if (now >= data.endTick) {
            entity.setProperty('create:press_progress', 0.0);
            const nextTarget = getPressTargetById(data.targetId, belowBlock, true)
                ?? getPressableConveyorTarget(belowBlock, false, now, true);
            if (nextTarget) {
                nextTarget.addTag('create:conveyor_stop');
                startPressCycle(entity, bruteSpeed, now, nextTarget);
            } else {
                entity.setDynamicProperty("create:movement_info", undefined);
            }
        }
    }
}

function canPressChocolateBasin(block) {
    return block?.typeId === "create:basin" && peekItemDrainFluid(block) === BASIN_CHOCOLATE_FLUID;
}

function canPressAndesiteBasin(block) {
    return block?.typeId === "create:basin"
        && peekItemDrainFluid(block) === BASIN_ANDESITE_FLUID
        && hasBasinIngredients(block, BASIN_ANDESITE_INPUT);
}

function startBasinChocolatePressCycle(entity, bruteSpeed, now, basinBlock) {
    startBasinPressCycle(entity, bruteSpeed, now, basinBlock, "basin_chocolate");
}

function startBasinAndesitePressCycle(entity, bruteSpeed, now, basinBlock) {
    startBasinPressCycle(entity, bruteSpeed, now, basinBlock, "basin_andesite");
}

function startBasinPressCycle(entity, bruteSpeed, now, basinBlock, type) {
    const animTicks = getPressCycleTicks(bruteSpeed);
    entity.setDynamicProperty("create:movement_info", JSON.stringify({
        type,
        x: basinBlock.x,
        y: basinBlock.y,
        z: basinBlock.z,
        startTick: now,
        interactTick: now + Math.ceil(animTicks * PRESS_INTERACT_PROGRESS),
        endTick: now + Math.ceil(animTicks)
    }));
}

function isSameBasinTarget(basinBlock, data) {
    return basinBlock?.typeId === "create:basin" && basinBlock.x === data.x && basinBlock.y === data.y && basinBlock.z === data.z;
}

function processBasinChocolatePress(pressBlock, entity, basinBlock, data, now, interactPos) {
    if (!isSameBasinTarget(basinBlock, data)) {
        entity.setDynamicProperty("create:movement_info", undefined);
        entity.setProperty('create:press_progress', 0.0);
        return;
    }

    if (now >= data.interactTick && !data.interacted) {
        if (takeItemDrainFluid(basinBlock, BASIN_CHOCOLATE_FLUID)) {
            try {
                const dropped = basinBlock.dimension.spawnItem(new mc.ItemStack(BASIN_CHOCOLATE_RESULT, 1), {
                    x: basinBlock.x + 0.5,
                    y: basinBlock.y + 1.05,
                    z: basinBlock.z + 0.5
                });
                dropped?.clearVelocity?.();
            } catch {}
            pressBlock.dimension.playSound("create:mechanical_press.impact", interactPos, { volume: 1.0, pitch: 1.0 });
            pressBlock.dimension.playSound("create:mechanical_press.crushing", interactPos, { volume: 0.45, pitch: 1.15 });
            try { pressBlock.dimension.spawnParticle("create:deploy_impact", interactPos); } catch {}
        } else {
            pressBlock.dimension.playSound("create:mechanical_press.impact", interactPos, { volume: 0.45, pitch: 0.9 });
        }

        data.interacted = true;
        entity.setDynamicProperty("create:movement_info", JSON.stringify(data));
    }

    if (now >= data.endTick) {
        entity.setProperty('create:press_progress', 0.0);
        if (canPressChocolateBasin(basinBlock)) {
            startBasinChocolatePressCycle(entity, snapToPowerOf2(Math.abs(entity.getProperty("create:rpm") ?? 0)), now, basinBlock);
        } else {
            entity.setDynamicProperty("create:movement_info", undefined);
        }
    }
}

function processBasinAndesitePress(pressBlock, entity, basinBlock, data, now, interactPos) {
    if (!isSameBasinTarget(basinBlock, data)) {
        entity.setDynamicProperty("create:movement_info", undefined);
        entity.setProperty('create:press_progress', 0.0);
        return;
    }

    if (now >= data.interactTick && !data.interacted) {
        if (canPressAndesiteBasin(basinBlock)
            && consumeBasinIngredients(basinBlock, BASIN_ANDESITE_INPUT)
            && takeItemDrainFluid(basinBlock, BASIN_ANDESITE_FLUID)) {
            try {
                const dropped = basinBlock.dimension.spawnItem(new mc.ItemStack(BASIN_ANDESITE_RESULT, 1), {
                    x: basinBlock.x + 0.5,
                    y: basinBlock.y + 1.05,
                    z: basinBlock.z + 0.5
                });
                dropped?.clearVelocity?.();
            } catch {}
            pressBlock.dimension.playSound("create:mechanical_press.impact", interactPos, { volume: 1.0, pitch: 1.0 });
            pressBlock.dimension.playSound("create:mechanical_press.crushing", interactPos, { volume: 0.45, pitch: 1.15 });
            try { pressBlock.dimension.spawnParticle("create:deploy_impact", interactPos); } catch {}
        } else {
            pressBlock.dimension.playSound("create:mechanical_press.impact", interactPos, { volume: 0.45, pitch: 0.9 });
        }

        data.interacted = true;
        entity.setDynamicProperty("create:movement_info", JSON.stringify(data));
    }

    if (now >= data.endTick) {
        entity.setProperty('create:press_progress', 0.0);
        if (canPressAndesiteBasin(basinBlock)) {
            startBasinAndesitePressCycle(entity, snapToPowerOf2(Math.abs(entity.getProperty("create:rpm") ?? 0)), now, basinBlock);
        } else {
            entity.setDynamicProperty("create:movement_info", undefined);
        }
    }
}

function getBasinConveyorItems(basinBlock) {
    return basinBlock.dimension?.getEntities({
        type: "create:conveyor_item",
        location: { x: basinBlock.x + 0.5, y: basinBlock.y + 0.75, z: basinBlock.z + 0.5 },
        maxDistance: 1.0
    }) ?? [];
}

function getConveyorStack(conveyorItem) {
    return conveyorItem?.getComponent("minecraft:inventory")?.container?.getItem(0) ?? null;
}

function hasBasinIngredients(basinBlock, needed) {
    const counts = {};
    for (const item of getBasinConveyorItems(basinBlock)) {
        const stack = getConveyorStack(item);
        if (!stack) continue;
        counts[stack.typeId] = (counts[stack.typeId] ?? 0) + stack.amount;
    }
    return Object.entries(needed).every(([id, amount]) => (counts[id] ?? 0) >= amount);
}

function consumeBasinIngredients(basinBlock, needed) {
    if (!hasBasinIngredients(basinBlock, needed)) return false;

    const remaining = { ...needed };
    for (const item of getBasinConveyorItems(basinBlock)) {
        const stack = getConveyorStack(item);
        if (!stack) continue;

        const need = remaining[stack.typeId] ?? 0;
        if (need <= 0) continue;

        const take = Math.min(stack.amount, need);
        remaining[stack.typeId] -= take;

        if (stack.amount <= take) {
            try { item.remove(); } catch {}
        } else {
            const updated = stack.clone();
            updated.amount = stack.amount - take;
            racoAPI.setItemInHand(updated, item, "Mainhand", 0, "create:item_visual");
        }
    }

    return Object.values(remaining).every(amount => amount <= 0);
}

function getPressInteractPos(belowBlock) {
    return {
        x: belowBlock.x + 0.5,
        y: belowBlock.y + 13 / 16,
        z: belowBlock.z + 0.5
    };
}

function startPressCycle(entity, bruteSpeed, now, target) {
    const animTicks = getPressCycleTicks(bruteSpeed);
    entity.setDynamicProperty("create:movement_info", JSON.stringify({
        targetId: target.id,
        startTick: now,
        interactTick: now + Math.ceil(animTicks * PRESS_INTERACT_PROGRESS),
        endTick: now + Math.ceil(animTicks)
    }));
}

function getPressCycleTicks(bruteSpeed) {
    return Math.max(Math.ceil(TIME_CONFIG[bruteSpeed] ?? MIN_PRESS_CYCLE_TICKS), MIN_PRESS_CYCLE_TICKS);
}

function getMovementTargetId(movementInfo) {
    if (!movementInfo) return undefined;
    try {
        return JSON.parse(movementInfo).targetId;
    } catch {
        return undefined;
    }
}

function cleanupStalePressTargets(belowBlock, activeTargetId, now) {
    const targets = belowBlock.dimension?.getEntities({
        type: "create:conveyor_item",
        location: getPressInteractPos(belowBlock),
        maxDistance: 0.1
    });

    let keptWaitingTarget = false;
    for (const target of (targets ?? [])) {
        if (!target.hasTag('create:conveyor_stop')) continue;
        if (activeTargetId && target.id === activeTargetId) continue;

        if (!activeTargetId && getPressRecipeForConveyorItem(target) && !keptWaitingTarget) {
            keptWaitingTarget = true;
            continue;
        }

        releasePressTarget(target, belowBlock, now);
    }
}

function releasePressTarget(target, belowBlock, now) {
    const releaseStamp = JSON.stringify({
        x: belowBlock.x, y: belowBlock.y, z: belowBlock.z, tick: now
    });
    target.setDynamicProperty("create:release_from", releaseStamp);
    try { target.removeTag('create:conveyor_stop'); } catch {}
}

function getPressTargetById(targetId, belowBlock, requireStopped) {
    if (!targetId) return null;
    let target;
    try { target = mc.world.getEntity(targetId); } catch { return null; }
    if (!target?.isValid) return null;
    if (requireStopped && !target.hasTag('create:conveyor_stop')) return null;
    if (!isConveyorItemInPress(target, belowBlock)) return null;
    return getPressRecipeForConveyorItem(target) ? target : null;
}

function getPressableConveyorTarget(belowBlock, requireStopped, now = undefined, skipRecentlyReleased = false) {
    const targets = belowBlock.dimension?.getEntities({
        type: "create:conveyor_item",
        location: getPressInteractPos(belowBlock),
        maxDistance: 0.1
    });

    return (targets ?? []).find(target => {
        if (requireStopped && !target.hasTag('create:conveyor_stop')) return false;
        if (!requireStopped && target.hasTag('create:conveyor_stop')) return false;
        if (!isConveyorItemInPress(target, belowBlock)) return false;
        if (skipRecentlyReleased && wasRecentlyReleasedFromPress(target, belowBlock, now)) return false;
        return !!getPressRecipeForConveyorItem(target);
    }) ?? null;
}

function isConveyorItemInPress(target, belowBlock) {
    if (target.typeId !== "create:conveyor_item") return false;
    if (Math.floor(target.location.x) !== belowBlock.x) return false;
    if (Math.floor(target.location.z) !== belowBlock.z) return false;
    return true;
}

function wasRecentlyReleasedFromPress(target, belowBlock, now) {
    if (now === undefined) return false;
    const releaseRaw = target.getDynamicProperty("create:release_from");
    if (!releaseRaw) return false;
    try {
        const r = JSON.parse(releaseRaw);
        return r.x === belowBlock.x && r.y === belowBlock.y && r.z === belowBlock.z && (now - r.tick) < 60;
    } catch {
        return false;
    }
}

function getPressRecipeForConveyorItem(conveyorItem) {
    const container = conveyorItem.getComponent("minecraft:inventory")?.container;
    const surfaceItem = container?.getItem(0);
    if (!surfaceItem) return null;
    return compatibilityRecipes.pressing.get(surfaceItem.typeId) ?? PRESS_RECIPES.find(r => r.input === surfaceItem.typeId) ?? null;
}

function getPressTargetItemAmount(conveyorItem) {
    const container = conveyorItem.getComponent("minecraft:inventory")?.container;
    return container?.getItem(0)?.amount ?? 0;
}
