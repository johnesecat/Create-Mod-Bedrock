/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Entity} Entity */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */

const FISHING_HOOK_TYPE = "minecraft:fishing_hook";
const GUARD_RADIUS = 1.8;
const SEARCH_RADIUS = 2;
const DEPOT_ITEM_Y = 13 / 16;
const CRAFTER_ITEM_Y = 0.38;

const FIXED_VISUAL_TYPES = new Set([
    "create:brass_funnel_entity",
    "create:deployer_filter",
    "create:chute_smart_filter",
    "create:smart_fluid_pipe_filter"
]);

/** @type {Readonly<Record<string, Vector3 | undefined>>} */
const CRAFTER_FRONT_OFFSET = {
    north: { x: 0, z: -0.6, y: CRAFTER_ITEM_Y },
    south: { x: 0, z: 0.6, y: CRAFTER_ITEM_Y },
    east: { x: 0.6, z: 0, y: CRAFTER_ITEM_Y },
    west: { x: -0.6, z: 0, y: CRAFTER_ITEM_Y }
};

/** @type {Readonly<Record<string, string | undefined>>} */
const INVERT_FACE = { north: "south", south: "north", east: "west", west: "east" };

/** @param {Iterable<import('@minecraft/server').Player> | undefined} players */
export function guardVisualEntitiesFromFishing(players) {
    const dimensions = new Map();
    for (const player of players ?? []) {
        if (!player?.isValid || !player.dimension) continue;
        dimensions.set(player.dimension.id, player.dimension);
    }

    for (const dimension of dimensions.values()) {
        const hooks = dimension.getEntities({ type: FISHING_HOOK_TYPE });
        for (const hook of hooks) {
            if (!hook?.isValid) continue;
            if (guardVisualsNearHook(dimension, hook.location)) {
                try { hook.remove(); } catch {}
            }
        }
    }
}

/** @param {Dimension} dimension @param {Vector3} location */
function guardVisualsNearHook(dimension, location) {
    const entities = dimension.getEntities({ location, maxDistance: GUARD_RADIUS });
    let foundProtectedVisual = false;
    for (const entity of entities) {
        if (!shouldGuardVisualEntity(entity)) continue;
        foundProtectedVisual = true;
        try { entity.clearVelocity(); } catch {}

        const anchor = getVisualAnchor(entity);
        if (!anchor) continue;
        if (distanceSq(entity.location, anchor) <= 0.0009) continue;
        try { entity.teleport(anchor); } catch {}
    }
    return foundProtectedVisual;
}

/** @param {Entity | undefined} entity @returns {entity is Entity} */
function shouldGuardVisualEntity(entity) {
    if (!entity?.isValid) return false;
    if (FIXED_VISUAL_TYPES.has(entity.typeId)) return true;
    if (entity.typeId === "create:mechanical_crafter_item") return true;
    if (entity.typeId !== "create:conveyor_item") return false;

    try {
        if (entity.hasTag("create_depot_visual")
            || entity.hasTag("create_depot_main")
            || entity.hasTag("create_item_drain_bucket_visual")) return true;
    } catch {}

    return nearestDepotOrDrainLocation(entity) !== undefined;
}

/** @param {Entity} entity */
function getVisualAnchor(entity) {
    if (entity.typeId === "create:brass_funnel_entity") return nearestBlockCenter(entity, "create:brass_funnel");
    if (entity.typeId === "create:deployer_filter") return nearestBlockOffset(entity, "create:deployer", { x: 0.5, y: 1.05, z: 0.5 });
    if (entity.typeId === "create:chute_smart_filter") return nearestBlockCenter(entity, "create:chute_smart");
    if (entity.typeId === "create:smart_fluid_pipe_filter") return nearestBlockCenter(entity, "create:smart_fluid_pipe");
    if (entity.typeId === "create:mechanical_crafter_item") {
        if (hasAnyTag(entity, ["create_mechanical_crafter_item_moving"])) return undefined;
        return nearestCrafterItemLocation(entity);
    }
    if (entity.typeId === "create:conveyor_item") return nearestDepotOrDrainLocation(entity);
    return undefined;
}

/** @param {Entity} entity @param {string} typeId */
function nearestBlockCenter(entity, typeId) {
    const block = nearestBlock(entity, typeId, block => block.center());
    return block?.center();
}

/** @param {Entity} entity @param {string} typeId @param {Vector3} offset */
function nearestBlockOffset(entity, typeId, offset) {
    const block = nearestBlock(entity, typeId, block => ({
        x: block.location.x + offset.x,
        y: block.location.y + offset.y,
        z: block.location.z + offset.z
    }));
    if (!block) return undefined;
    return {
        x: block.location.x + offset.x,
        y: block.location.y + offset.y,
        z: block.location.z + offset.z
    };
}

/** @param {Entity} entity */
function nearestCrafterItemLocation(entity) {
    const block = nearestBlock(entity, "create:mechanical_crafter", crafterItemLocation);
    return block ? crafterItemLocation(block) : undefined;
}

/** @param {Entity} entity */
function nearestDepotOrDrainLocation(entity) {
    if (hasAnyTag(entity, ["create_depot_visual", "create_depot_main"])) {
        const depot = nearestBlock(entity, "create:depot", depotItemLocation);
        if (depot) return depotItemLocation(depot);
    }
    if (hasAnyTag(entity, ["create_item_drain_bucket_visual"])) {
        const drain = nearestBlock(entity, "create:item_drain", block => ({
            x: block.location.x + 0.5,
            y: block.location.y + 0.35,
            z: block.location.z + 0.5
        }));
        if (drain) return { x: drain.location.x + 0.5, y: drain.location.y + 0.35, z: drain.location.z + 0.5 };
    }

    const depot = nearestBlock(entity, "create:depot", depotItemLocation, 0.9);
    if (depot) return depotItemLocation(depot);

    const drain = nearestBlock(entity, "create:item_drain", block => ({
        x: block.location.x + 0.5,
        y: block.location.y + 0.35,
        z: block.location.z + 0.5
    }), 0.9);
    if (drain) return { x: drain.location.x + 0.5, y: drain.location.y + 0.35, z: drain.location.z + 0.5 };

    return undefined;
}

/** @param {Entity} entity @param {string} typeId @param {(block: Block) => Vector3} targetLocation @param {number} [maxDistance] */
function nearestBlock(entity, typeId, targetLocation, maxDistance = Infinity) {
    const loc = entity.location;
    let bestBlock;
    let bestDistance = Infinity;
    const maxDistanceSq = maxDistance * maxDistance;

    for (let x = Math.floor(loc.x) - SEARCH_RADIUS; x <= Math.floor(loc.x) + SEARCH_RADIUS; x++) {
        for (let y = Math.floor(loc.y) - SEARCH_RADIUS; y <= Math.floor(loc.y) + SEARCH_RADIUS; y++) {
            for (let z = Math.floor(loc.z) - SEARCH_RADIUS; z <= Math.floor(loc.z) + SEARCH_RADIUS; z++) {
                const block = getBlockAt(entity.dimension, x, y, z);
                if (block?.typeId !== typeId) continue;
                const dist = distanceSq(loc, targetLocation(block));
                if (dist <= maxDistanceSq && dist < bestDistance) {
                    bestDistance = dist;
                    bestBlock = block;
                }
            }
        }
    }

    return bestBlock;
}

/** @param {Block} block */
function crafterItemLocation(block) {
    const rawDirection = block?.permutation?.getState?.("minecraft:cardinal_direction") ?? "south";
    const front = typeof rawDirection === "string" ? (INVERT_FACE[rawDirection] ?? "north") : "north";
    const offset = CRAFTER_FRONT_OFFSET[front] ?? { x: 0, z: -0.6, y: CRAFTER_ITEM_Y };
    return {
        x: block.location.x + 0.5 + offset.x,
        y: block.location.y + offset.y,
        z: block.location.z + 0.5 + offset.z
    };
}

/** @param {Block} block */
function depotItemLocation(block) {
    return {
        x: block.location.x + 0.5,
        y: block.location.y + DEPOT_ITEM_Y,
        z: block.location.z + 0.5
    };
}

/** @param {Entity} entity @param {readonly string[]} tags */
function hasAnyTag(entity, tags) {
    try {
        return tags.some(tag => entity.hasTag(tag));
    } catch {
        return false;
    }
}

/** @param {Vector3} a @param {Vector3} b */
function distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

/** @param {Dimension} dimension @param {number} x @param {number} y @param {number} z */
function getBlockAt(dimension, x, y, z) {
    try { return dimension.getBlock({ x, y, z }); }
    catch { return undefined; }
}
