import { system, MolangVariableMap } from "@minecraft/server";
import { DIRECTION_OFFSETS, INVERT_FACE, posToKey } from "../rpm/rpmHelpers";
import { getBlockHardness } from "../xZDefinitions";
/** @typedef {import("@minecraft/server").Block} Block */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */
/** @typedef {(item: import("@minecraft/server").ItemStack) => boolean} ItemCollector */
/** @typedef {{destroyProgress: number, ticksUntilNext: number, breakingBlockId: string | null, breakingBlockKey?: string | null}} DrillProgress */

/** @param {unknown} rotation @returns {Vector3 | undefined} */
function getDrillForward(rotation) {
    if (typeof rotation !== "string") return undefined;
    const facing = INVERT_FACE[rotation];
    switch (facing) {
        case "north": return DIRECTION_OFFSETS.north;
        case "south": return DIRECTION_OFFSETS.south;
        case "east": return DIRECTION_OFFSETS.east;
        case "west": return DIRECTION_OFFSETS.west;
        case "up": return DIRECTION_OFFSETS.above;
        case "down": return DIRECTION_OFFSETS.below;
        default: return undefined;
    }
}

/** @type {Map<string, DrillProgress>} */
const drillData = new Map();

/**
 * Verifica se o bloco pode ser quebrado pela drill.
 * No Create: nÃ£o quebra lÃ­quidos, ar, ou blocos com hardness -1
 */
/** @param {Block | undefined} targetBlock */
function canBreak(targetBlock) {
    if (!targetBlock?.isValid) return false;
    if (targetBlock.isLiquid || targetBlock.isAir) return false;

    const hardness = getBlockHardness(targetBlock);
    if (hardness === undefined) return true; // Bloco custom, assume quebrÃ¡vel
    if (hardness < 0) return false; // IndestrutÃ­vel

    return true;
};


/** @param {Block} block @param {Dimension} dimension */
export function mechanicalDrillTick(block, dimension) {
    const entity = dimension.getEntities({location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity`})[0];
    if (!entity) return;

    const rpm = Number(entity.getProperty('create:rpm') ?? 0);
    if (!Number.isFinite(rpm) || rpm === 0) {
        mechanicalDrillDeleteData(block);
        return;
    };
    
    const blockKey = posToKey(block.x, block.y, block.z);
    let breakingData = drillData.get(blockKey);
    if (!breakingData) {
        breakingData = { destroyProgress: 0, ticksUntilNext: 0, breakingBlockId: null };
        drillData.set(blockKey, breakingData);
    };

    const forward = getDrillForward(block.permutation.getAllStates()['minecraft:facing_direction']);
    if (!forward) return;
    let targetBlock;
    try { targetBlock = block.offset(forward); } catch { return; }
    if (!targetBlock?.isValid) return;

    if (breakingData.breakingBlockId !== targetBlock.typeId) {
        breakingData.ticksUntilNext = 0;
        breakingData.destroyProgress = 0;
        breakingData.breakingBlockId = targetBlock.typeId;
    };

    if (!canBreak(targetBlock)) {
        if (breakingData.destroyProgress !== 0) {
            breakingData.ticksUntilNext = 0;
            breakingData.destroyProgress = 0;
            breakingData.breakingBlockId = null;
        };
        return;
    };

    if (breakingData.ticksUntilNext > 0) {
        breakingData.ticksUntilNext--;
        return;
    };

    const blockHardness = Math.max(0.1, Number(getBlockHardness(targetBlock) ?? 2));
    const breakSpeed = Math.abs(rpm) / 100;
    const nextInterval = Math.max(0, Math.floor(blockHardness / breakSpeed));

    const progressIncrement = Math.max(1, Math.min(Math.floor(breakSpeed / blockHardness), 10 - breakingData.destroyProgress));
    breakingData.destroyProgress += progressIncrement;

    if (breakingData.destroyProgress < 10) {
        spawnCrackParticles(dimension, targetBlock, breakingData.destroyProgress, nextInterval);
        dimension.playSound('hit.stone', targetBlock.center(), { volume: 1 });
    };

    if (breakingData.destroyProgress >= 10) {
        try {
            dimension.runCommand(`setblock ${targetBlock.x} ${targetBlock.y} ${targetBlock.z} air destroy`);
        } catch { return; }

        breakingData.destroyProgress = 0;
        breakingData.ticksUntilNext = 0;
        breakingData.breakingBlockId = null;
        return;
    };

    breakingData.ticksUntilNext = Math.max(0, Math.floor(blockHardness / breakSpeed));
};

const ENTITY_DRILL_DROP_COLLECT_RADIUS = 1.4;

/** @param {Entity} entity */
function getEntityDrillKey(entity) {
    const loc = entity.location;
    return `entity:${entity.id ?? `${Math.floor(loc.x)},${Math.floor(loc.y)},${Math.floor(loc.z)}`}`;
}

/** @param {Entity} entity */
function getEntityHorizontalFacing(entity) {
    let yaw = 0;
    try { yaw = (entity.getRotation().y % 360 + 360) % 360; } catch {}
    if (yaw >= 45 && yaw < 135) return "west";
    if (yaw >= 135 && yaw < 225) return "north";
    if (yaw >= 225 && yaw < 315) return "east";
    return "south";
}

/** @param {Entity} entity @param {Vector3 | undefined} [rotatedForward] */
function getEntityDrillTarget(entity, rotatedForward) {
    const storedDirection = entity.getDynamicProperty("create:cardinal_rotation");
    const facing = getEntityHorizontalFacing(entity);
    const forward = rotatedForward ?? (storedDirection === "up"
        ? DIRECTION_OFFSETS.above
        : storedDirection === "down" ? DIRECTION_OFFSETS.below : DIRECTION_OFFSETS[facing]);
    const location = entity.location;
    // Contraptions can be stopped between block centers. Probe along the drill
    // head so the same obstacle remains selected while the cart is held back.
    for (const distance of [0.55, 0.8, 1.05, 1.3, 1.55, 1.8, 2.0]) {
        try {
            const block = entity.dimension.getBlock({
                x: Math.floor(location.x + forward.x * distance),
                y: Math.floor(location.y + 0.5 + forward.y * distance),
                z: Math.floor(location.z + forward.z * distance)
            });
            if (block?.isValid && !block.isAir && !block.isLiquid) return block;
        } catch {}
    }
    return undefined;
}

/** @param {Dimension} dimension @param {Vector3} pos @param {ItemCollector | undefined} itemCollector */
function collectEntityDrillDrops(dimension, pos, itemCollector) {
    if (typeof itemCollector !== "function") return;
    const location = { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 };
    let items = [];
    try { items = dimension.getEntities({ type: "minecraft:item", location, maxDistance: ENTITY_DRILL_DROP_COLLECT_RADIUS }); } catch { return; }
    for (const itemEntity of items) {
        const stack = itemEntity.getComponent("minecraft:item")?.itemStack.clone();
        if (!stack || !itemCollector(stack)) continue;
        try { itemEntity.remove(); } catch {}
    }
}

/** @param {Dimension} dimension @param {Vector3} pos @param {ItemCollector | undefined} itemCollector */
function scheduleEntityDrillDropCollection(dimension, pos, itemCollector) {
    if (typeof itemCollector !== "function") return;
    // Command-generated block drops may appear a few ticks later. Keep sweeping
    // the break location so every drop reaches the contraption storage.
    /** @param {number} remaining @returns {number} */
    const collectLater = remaining => system.run(() => {
        collectEntityDrillDrops(dimension, pos, itemCollector);
        if (remaining > 0) collectLater(remaining - 1);
    });
    collectLater(8);
}

/** @param {Entity} entity @param {ItemCollector | undefined} [itemCollector] @param {Vector3 | undefined} [rotatedForward] */
export function mechanicalDrillEntityTick(entity, itemCollector, rotatedForward) {
    if (!entity?.isValid) return false;
    const rpm = Number(entity.getProperty("create:rpm") ?? 0);
    const key = getEntityDrillKey(entity);
    if (!Number.isFinite(rpm) || rpm === 0) {
        drillData.delete(key);
        return false;
    }

    const target = getEntityDrillTarget(entity, rotatedForward);
    if (!target?.isValid || target.isAir || target.isLiquid) {
        drillData.delete(key);
        return false;
    }

    let data = drillData.get(key);
    if (!data) {
        data = { destroyProgress: 0, ticksUntilNext: 0, breakingBlockId: null };
        drillData.set(key, data);
    }
    if (!canBreak(target)) return true;

    const targetKey = `${target.x},${target.y},${target.z}`;
    if (data.breakingBlockId !== target.typeId || data.breakingBlockKey !== targetKey) {
        data.destroyProgress = 0;
        data.ticksUntilNext = 0;
        data.breakingBlockId = target.typeId;
        data.breakingBlockKey = targetKey;
    }
    if (data.ticksUntilNext > 0) {
        data.ticksUntilNext--;
        return true;
    }

    const hardness = Math.max(0.1, Number(getBlockHardness(target) ?? 2));
    // Contraption drills must clear the path quickly while the whole vehicle is stopped.
    const breakSpeed = Math.max(0.04, Math.abs(rpm) / 25);
    const nextInterval = Math.max(0, Math.floor(hardness / breakSpeed));
    const increment = Math.max(1, Math.min(Math.floor(breakSpeed / hardness), 10 - data.destroyProgress));
    data.destroyProgress += increment;

    if (data.destroyProgress < 10) {
        spawnCrackParticles(entity.dimension, target, data.destroyProgress, nextInterval);
        try { entity.dimension.playSound("hit.stone", target.center(), { volume: 1 }); } catch {}
        data.ticksUntilNext = nextInterval;
        return true;
    }

    const breakPos = { x: target.x, y: target.y, z: target.z };
    try { entity.dimension.runCommand(`setblock ${breakPos.x} ${breakPos.y} ${breakPos.z} air destroy`); } catch { return true; }
    scheduleEntityDrillDropCollection(entity.dimension, breakPos, itemCollector);
    data.destroyProgress = 0;
    data.ticksUntilNext = 0;
    data.breakingBlockId = null;
    data.breakingBlockKey = null;
    return true;
}
/** @param {Block} block */
export function mechanicalDrillDeleteData(block) {
    const blockKey = posToKey(block.x, block.y, block.z);
    drillData.delete(blockKey);
};

/** @param {Dimension} dimension @param {Block} targetBlock @param {number} stage @param {number} ticksUntilNext */
export function spawnCrackParticles(dimension, targetBlock, stage, ticksUntilNext) {
    const molang = new MolangVariableMap();
    molang.setFloat('cracks_stage', stage * 16);
    molang.setFloat('cracks_lifetime', (ticksUntilNext + 1) / 20); // ticks â†’ segundos + margem

    for (const face of ['north', 'south', 'east', 'west', 'up', 'down']) {
        dimension.spawnParticle(`create:cracks_${face}`, targetBlock.center(), molang);
    };
};
