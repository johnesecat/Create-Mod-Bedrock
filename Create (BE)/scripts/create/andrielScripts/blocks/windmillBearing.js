import { system } from "@minecraft/server";
import { DIRECTION_OFFSETS, INVERT_FACE } from "../rpm/rpmHelpers";
import { recalculateNetwork } from "../rpm/rpmCore";
import { bearingContraptionBreak, bearingContraptionRpmUpdate } from "./mechanicalBearing";
import { isGlueConnected } from "./superGlue";

const WINDMILL_BEARING_BLOCK = "create:windmill_bearing";
const WINDMILL_BEARING_ENTITY = "create:windmill_bearing_entity";
const MIN_WINDMILL_SAILS = 8;
const SAILS_PER_RPM = 8;
const MAX_WINDMILL_RPM = 16;
const WINDMILL_STRESS_CAPACITY = 512;
const WINDMILL_RECHECK_INTERVAL = 100;
const WINDMILL_RPM_SCAN_INTERVAL = 40;
const MAX_WINDMILL_SCAN_BLOCKS = 2048;
const windmillRefreshCache = new Map();
const windmillEntityRpmCache = new Map();
const windmillGeneratedRpmCache = new Map();
const windmillNetworkRpmCache = new Map();
const pendingSailPlacementFaces = new Map();
const pendingWindmillEntityCleanup = new Set();

function normalizeFace(face) {
    if (face === "up") return "above";
    if (face === "down") return "below";
    return face ?? "south";
}

function getBearingFacing(block) {
    try {
        const rawFace = block.permutation.getState("minecraft:cardinal_direction")
            ?? block.permutation.getState("minecraft:facing_direction")
            ?? "south";
        return normalizeFace(INVERT_FACE[rawFace] ?? rawFace);
    } catch {
        return "north";
    }
}

const ATTACHMENT_OFFSETS = [
    DIRECTION_OFFSETS.north,
    DIRECTION_OFFSETS.south,
    DIRECTION_OFFSETS.east,
    DIRECTION_OFFSETS.west,
    DIRECTION_OFFSETS.above,
    DIRECTION_OFFSETS.below
];

function getAttachedBlock(block) {
    const offset = DIRECTION_OFFSETS[getBearingFacing(block)] ?? DIRECTION_OFFSETS.south;
    try { return block.offset(offset); } catch {
        return undefined;
    }
}

function sameBlock(a, b) {
    return !!a && !!b && a.x === b.x && a.y === b.y && a.z === b.z && a.dimension?.id === b.dimension?.id;
}

function blockKey(block) {
    return `${block.dimension.id}:${block.x},${block.y},${block.z}`;
}

function posKey(pos) {
    return `${pos.x},${pos.y},${pos.z}`;
}

export function dedupeWindmillBearingEntity(entity) {
    if (entity?.typeId !== WINDMILL_BEARING_ENTITY || !entity?.isValid) return false;
    const dimension = entity.dimension;
    const location = entity.location;
    const blockPos = {
        x: Math.floor(location.x),
        y: Math.floor(location.y),
        z: Math.floor(location.z)
    };
    const key = `${dimension.id}:${posKey(blockPos)}`;
    if (pendingWindmillEntityCleanup.has(key)) return true;
    pendingWindmillEntityCleanup.add(key);

    system.run(() => {
        pendingWindmillEntityCleanup.delete(key);
        let block;
        try { block = dimension.getBlock(blockPos); } catch {}
        let entities = [];
        try {
            entities = dimension.getEntities({
                type: WINDMILL_BEARING_ENTITY,
                location: { x: blockPos.x + 0.5, y: blockPos.y + 0.5, z: blockPos.z + 0.5 },
                maxDistance: 0.4
            }).filter(candidate => candidate?.isValid);
        } catch {}

        if (block?.typeId !== WINDMILL_BEARING_BLOCK) {
            for (const duplicate of entities) try { duplicate.remove(); } catch {}
            return;
        }
        entities.sort((a, b) => `${a.id}`.localeCompare(`${b.id}`));
        for (let i = 1; i < entities.length; i++) try { entities[i].remove(); } catch {}
    });
    return true;
}

function isWoolBlock(block) {
    return isWindmillSailId(block?.typeId);
}

function isWindmillSailId(blockId) {
    return blockId === "create:windmill_sail"
        || (typeof blockId === "string" && blockId.startsWith("create:") && blockId.endsWith("_windmill_sail"))
        || (typeof blockId === "string" && blockId.startsWith("minecraft:") && blockId.endsWith("_wool"));
}

function isCreateWindmillSail(block) {
    return block?.typeId === "create:windmill_sail"
        || (typeof block?.typeId === "string"
            && block.typeId.startsWith("create:")
            && block.typeId.endsWith("_windmill_sail"));
}

export function rememberWindmillSailPlacement(player, itemStack, blockFace, clickedBlock = undefined) {
    if (!player?.id || !isCreateWindmillSail({ typeId: itemStack?.typeId })) return false;
    let inheritedRotation;
    if (isCreateWindmillSail(clickedBlock)) {
        try { inheritedRotation = Number(clickedBlock.permutation.getState("create:sail_rotation") ?? 0); } catch {}
    }
    pendingSailPlacementFaces.set(player.id, {
        face: `${blockFace ?? ""}`.toLowerCase(),
        inheritedRotation,
        playerYaw: (() => {
            try { return Number(player.getRotation().y ?? 0); } catch { return 0; }
        })(),
        tick: system.currentTick
    });
    return true;
}

export function rotateWindmillSailWithWrench(data) {
    const { block, itemStack, player } = data ?? {};
    if (!isCreateWindmillSail(block) || itemStack?.typeId !== "create:wrench") return false;
    data.cancel = true;
    system.run(() => {
        if (!block?.isValid || !isCreateWindmillSail(block)) return;
        let rotation = 0;
        try { rotation = Number(block.permutation.getState("create:sail_rotation") ?? 0); } catch {}
        const nextRotation = (rotation + 1) % 4;
        try {
            block.setPermutation(block.permutation
                .withState("minecraft:facing_direction", "up")
                .withState("create:sail_rotation", nextRotation));
        } catch {}
        try { player?.playSound("random.click", { location: block.center(), volume: 0.45, pitch: 0.9 + nextRotation * 0.1 }); } catch {}
    });
    return true;
}

function orientSailFromPlacement(block, player) {
    if (!isCreateWindmillSail(block)) return;
    const pending = player?.id ? pendingSailPlacementFaces.get(player.id) : undefined;
    if (player?.id) pendingSailPlacementFaces.delete(player.id);
    const recent = pending && system.currentTick - pending.tick <= 10;
    // Top-face placement lays the sail flat; every other face keeps it upright.
    let rotation = 0;
    if (recent && Number.isFinite(pending.inheritedRotation)) {
        rotation = Math.max(0, Math.min(3, pending.inheritedRotation));
    } else if (recent && Number.isFinite(pending.playerYaw)) {
        // Snap the player's yaw to the four upright sail rotations. Adding 180
        // makes the front of the placed sail face back toward the player.
        const facingYaw = ((pending.playerYaw + 180) % 360 + 360) % 360;
        rotation = Math.round(facingYaw / 90) % 4;
    }
    try {
        block.setPermutation(block.permutation
            .withState("minecraft:facing_direction", "up")
            .withState("create:sail_rotation", rotation));
    } catch {}
}

function sailsConnectAutomatically(a, b) {
    return isCreateWindmillSail(a) && isCreateWindmillSail(b);
}

function isScannableStructureBlock(block) {
    return !!block?.isValid && !block.isAir && !block.isLiquid && block.typeId !== WINDMILL_BEARING_BLOCK;
}

function getBlockAt(dimension, pos) {
    try { return dimension.getBlock(pos); } catch {
        return undefined;
    }
}

function countConnectedWool(block) {
    const start = getAttachedBlock(block);
    if (!isScannableStructureBlock(start)) return 0;

    const dimension = block.dimension;
    const queue = [start.location];
    const queued = new Set([posKey(start.location)]);
    const visited = new Set();
    let woolCount = 0;
    let queueIndex = 0;

    while (queueIndex < queue.length && visited.size < MAX_WINDMILL_SCAN_BLOCKS) {
        const pos = queue[queueIndex++];
        const key = posKey(pos);
        if (visited.has(key)) continue;
        visited.add(key);

        const current = getBlockAt(dimension, pos);
        if (!isScannableStructureBlock(current)) continue;
        if (isWoolBlock(current)) woolCount++;

        for (const offset of ATTACHMENT_OFFSETS) {
            const next = { x: current.x + offset.x, y: current.y + offset.y, z: current.z + offset.z };
            const nextKey = posKey(next);
            if (visited.has(nextKey) || queued.has(nextKey)) continue;
            const nextBlock = getBlockAt(dimension, next);
            if (sailsConnectAutomatically(current, nextBlock)
                || isGlueConnected(dimension, current.location, next)) {
                queue.push(next);
                queued.add(nextKey);
            }
        }
    }

    return woolCount;
}

function countAssembledWool(block) {
    let woolCount = 0;
    let constructs = [];
    try {
        constructs = block.dimension.getEntities({
            tags: ["create_mechanical_bearing_construct"]
        });
    } catch {}

    for (const entity of constructs) {
        const bearingX = Number(entity.getDynamicProperty("create:bearing_x"));
        const bearingY = Number(entity.getDynamicProperty("create:bearing_y"));
        const bearingZ = Number(entity.getDynamicProperty("create:bearing_z"));
        if (bearingX !== block.x || bearingY !== block.y || bearingZ !== block.z) continue;
        if (isWindmillSailId(entity.getDynamicProperty("create:block_id"))) woolCount++;
    }
    return woolCount;
}

function getWindmillStats(block, force = false) {
    const key = blockKey(block);
    const cached = windmillGeneratedRpmCache.get(key);
    if (!force && cached && system.currentTick - cached.tick < WINDMILL_RPM_SCAN_INTERVAL) return cached;

    // Before assembly the sails are blocks; while spinning they are stored as
    // contraption entities. Taking the larger count handles both transition states.
    const connectedWool = countConnectedWool(block);
    const wool = connectedWool > 0 ? connectedWool : countAssembledWool(block);
    // Create Java progression: the windmill needs 8 sail/wool blocks to start,
    // gains 1 RPM per complete group of 8 and caps at 16 RPM (128 blocks).
    const rpm = wool < MIN_WINDMILL_SAILS
        ? 0
        : Math.min(MAX_WINDMILL_RPM, Math.floor(wool / SAILS_PER_RPM));
    // Stress capacity is a base value and rpmCore multiplies it by the RPM.
    const stressCapacity = rpm > 0 ? WINDMILL_STRESS_CAPACITY : 0;
    windmillGeneratedRpmCache.set(key, { rpm, stressCapacity, wool, tick: system.currentTick });
    return { rpm, stressCapacity, wool, tick: system.currentTick };
}

function getWindmillGeneratedRpm(block, force = false) {
    const { rpm } = getWindmillStats(block, force);
    return rpm;
}

function setWindmillBearingRpm(block, rpm, stressCapacity = 0) {
    const key = blockKey(block);
    const cached = windmillEntityRpmCache.get(key);
    if (cached
        && Math.abs(Number(cached.rpm) - rpm) <= 0.001
        && Math.abs(Number(cached.stressCapacity) - stressCapacity) <= 0.001
        && system.currentTick - cached.tick < WINDMILL_RECHECK_INTERVAL) return;

    const location = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
    const entity = block.dimension.getEntities({ type: WINDMILL_BEARING_ENTITY, location, maxDistance: 2 })[0];
    if (!entity?.isValid) return;
    const currentRpm = Number(entity.getProperty("create:rpm") ?? 0);
    windmillEntityRpmCache.set(key, { rpm, stressCapacity, tick: system.currentTick });
    try { entity.setDynamicProperty("create:generator_rpm", rpm); } catch {}
    // Windmill capacity comes from rpmConfigs, like every other generator.
    // Clear legacy per-entity overrides left by older versions of the add-on.
    try { entity.setDynamicProperty("create:stress_capacity", undefined); } catch {}
    if (Math.abs(currentRpm - rpm) <= 0.001) return;
    try { entity.setProperty("create:rpm", rpm); } catch {}
}

function refreshWindmillNetwork(block, dimension, rpm, stressCapacity = 0, eventType = "generator") {
    const key = blockKey(block);
    const cached = windmillNetworkRpmCache.get(key);
    if (cached
        && Math.abs(Number(cached.rpm) - rpm) <= 0.001
        && Math.abs(Number(cached.stressCapacity) - stressCapacity) <= 0.001) return;
    windmillNetworkRpmCache.set(key, { rpm, stressCapacity, tick: system.currentTick });
    system.runJob(recalculateNetwork(block, dimension ?? block.dimension, { eventType }));
}

function shouldRefreshContraption(block, rpm) {
    const key = blockKey(block);
    const cached = windmillRefreshCache.get(key);
    const lastRpm = Number(cached?.rpm ?? Number.NaN);
    const lastTick = Number(cached?.tick ?? -WINDMILL_RECHECK_INTERVAL);
    const rpmChanged = !Number.isFinite(lastRpm) || Math.abs(lastRpm - rpm) > 0.001;
    const periodicRefresh = system.currentTick - lastTick >= WINDMILL_RECHECK_INTERVAL;

    if (!rpmChanged && !periodicRefresh) return false;
    windmillRefreshCache.set(key, { rpm, tick: system.currentTick });
    return true;
}

export function setWindmillBearingEnabled(block, enabled) {
    if (!block?.isValid || block.typeId !== WINDMILL_BEARING_BLOCK) return false;

    const stats = enabled ? getWindmillStats(block, true) : { rpm: 0, stressCapacity: 0 };
    const rpm = stats.rpm;
    const spinning = enabled && rpm > 0;
    try {
        block.setPermutation(block.permutation
            .withState("create:active_generator", enabled)
            .withState("create:powered", !enabled)
            .withState("create:is_spinning", spinning));
    } catch {}

    setWindmillBearingRpm(block, rpm, stats.stressCapacity);
    windmillRefreshCache.set(blockKey(block), { rpm, tick: system.currentTick });
    refreshWindmillNetwork(block, block.dimension, rpm, stats.stressCapacity, "generator");
    bearingContraptionRpmUpdate(block, rpm);
    return true;
}

export function windmillBearingTick(block, dimension) {
    if (!block?.isValid || block.typeId !== WINDMILL_BEARING_BLOCK) return false;

    const powered = block.permutation.getState("create:powered") === true;
    const active = !powered;
    const wasSpinning = block.permutation.getState("create:is_spinning") === true;
    const stats = active ? getWindmillStats(block) : { rpm: 0, stressCapacity: 0 };
    const rpm = stats.rpm;
    const spinning = active && rpm > 0;

    // During world/chunk loading the bearing block can tick before every
    // contraption entity has loaded. A partial entity count briefly reports
    // zero RPM. Passing that transient zero to bearingContraptionRpmUpdate
    // restores only the loaded entities as blocks and splits the glued
    // structure. Keep an already assembled windmill intact until its
    // contraption entities finish loading. Explicit wrench/redstone shutdown
    // still disassembles immediately through setWindmillBearingEnabled.
    const transientLoadZero = active && wasSpinning && rpm <= 0;

    setWindmillBearingRpm(block, rpm, stats.stressCapacity);

    try {
        if (block.permutation.getState("create:active_generator") !== active
            || (!transientLoadZero && block.permutation.getState("create:is_spinning") !== spinning)) {
            block.setPermutation(block.permutation
                .withState("create:active_generator", active)
                .withState("create:is_spinning", transientLoadZero ? true : spinning));
        }
    } catch {}

    if (!transientLoadZero && shouldRefreshContraption(block, rpm)) {
        bearingContraptionRpmUpdate(block, rpm);
    }
    refreshWindmillNetwork(block, dimension, rpm, stats.stressCapacity, "generator");
    return active;
}

export function windmillBearingInteract(player, block, dimension) {
    if (!block?.isValid || block.typeId !== WINDMILL_BEARING_BLOCK) return false;
    const item = player?.getComponent("minecraft:equippable")?.getEquipment("Mainhand");
    if (item?.typeId !== "create:wrench") return false;

    const nextEnabled = block.permutation.getState("create:powered") === true;
    setWindmillBearingEnabled(block, nextEnabled);
    try { player.playSound("random.click", { location: block.center(), volume: 0.45, pitch: nextEnabled ? 1.4 : 0.75 }); } catch {}
    system.runJob(recalculateNetwork(block, dimension, { eventType: "wrench" }));
    return true;
}

export function windmillBearingRedstoneUpdate(block, dimension, powerLevel) {
    if (!block?.isValid || block.typeId !== WINDMILL_BEARING_BLOCK) return false;
    setWindmillBearingEnabled(block, !(powerLevel > 0));
    system.runJob(recalculateNetwork(block, dimension, { eventType: "redstone", protectedPos: block.location }));
    return true;
}

export function windmillBearingBreak(block, dimension) {
    if (!block?.isValid) return;
    windmillRefreshCache.delete(blockKey(block));
    windmillEntityRpmCache.delete(blockKey(block));
    windmillGeneratedRpmCache.delete(blockKey(block));
    windmillNetworkRpmCache.delete(blockKey(block));
    bearingContraptionBreak(block, dimension);
}

export function windmillBearingBlockPlace(block, player = undefined) {
    if (!block?.isValid) return;
    orientSailFromPlacement(block, player);
    for (const offset of ATTACHMENT_OFFSETS) {
        const bearingPos = { x: block.x - offset.x, y: block.y - offset.y, z: block.z - offset.z };
        let bearing;
        try { bearing = block.dimension.getBlock(bearingPos); } catch {}
        if (bearing?.typeId !== WINDMILL_BEARING_BLOCK) continue;
        if (!sameBlock(getAttachedBlock(bearing), block)) continue;
        if (bearing.permutation.getState("create:powered") === true) continue;
        windmillGeneratedRpmCache.delete(blockKey(bearing));
        const stats = getWindmillStats(bearing, true);
        const rpm = stats.rpm;
        setWindmillBearingRpm(bearing, rpm, stats.stressCapacity);
        refreshWindmillNetwork(bearing, bearing.dimension, rpm, stats.stressCapacity, "generator");
        bearingContraptionRpmUpdate(bearing, rpm);
    }
}
