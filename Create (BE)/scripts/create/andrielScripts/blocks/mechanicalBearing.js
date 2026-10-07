import { BlockPermutation, EnchantmentTypes, EntityDamageCause, EquipmentSlot, ItemStack, StructureSaveMode, system, world } from "@minecraft/server";
import * as mc from "@minecraft/server";
import { itemIsBlock, itemStackIs, setItemInHand } from "../../racoScripts/raco-API.js";
import { DIRECTION_OFFSETS, INVERT_FACE } from "../rpm/rpmHelpers";
import { rotationToFace } from "../xZ-Utils";
import { mechanicalSawEntityTick } from "./mehcanicalSaw.js";
import { mechanicalDrillEntityTick } from "./mechanicalDrill.js";
import { consumeGlueForBlock, getGlueRegionPositions, isGlueConnected, restoreGlueFacesForBlock } from "./superGlue.js";
import { getStorageAt, insertItem as insertVaultItem } from "../../../storage/storage_registry.js";
import { rebuildVaultAt } from "../../../vault/rebuild.js";
import { vaultVisualStructure } from "../../../vault/visual_structure.js";

/** @typedef {import("@minecraft/server").Block} Block */
/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */
/** @typedef {import("@minecraft/server").Container} Container */
/** @typedef {import("@minecraft/server").ItemStack} McItemStack */
/** @typedef {Record<string, string | number | boolean>} BlockStates */
/** @typedef {{typeId: string, x: number, y: number, z: number, face?: string}} BearingLocation */
/** @typedef {{block: Block, blockId: string, relX: number, relY: number, relZ: number, states?: BlockStates}} BearingBlockData */
/** @typedef {{x: number, y: number, z: number}} RelativeVector */
/** @typedef {string | number | boolean | Vector3} PackedPropertyValue */
/** @typedef {{typeId: string, amount: number, nameTag?: string, lore?: string[], damage?: number, enchantments?: {typeId: string, level: number}[], properties?: Record<string, PackedPropertyValue>}} PackedItemData */
/** @typedef {{blockId: string, states: BlockStates, rel: RelativeVector, cartRel: RelativeVector, spawnerStructure?: string, glueFaces: string[], inventory: {slot: number, item: PackedItemData}[]}} PackedBlockData */
/** @typedef {{version: number, minecartType: string, cartYaw: number, minecartInventory: {slot: number, item: PackedItemData}[], blocks: PackedBlockData[]}} PackedCartData */

/** @type {Readonly<Record<string, Vector3>>} */
const cardinalOffsets = DIRECTION_OFFSETS;
/** @type {Readonly<Record<string, string>>} */
const invertFace = INVERT_FACE;

const BEARING_ENTITY = "create:mechanical_bearing_entity";
const WINDMILL_BEARING_ENTITY = "create:windmill_bearing_entity";
const MECHANICAL_BEARING_BLOCK = "create:mechanical_bearing";
const WINDMILL_BEARING_BLOCK = "create:windmill_bearing";
const CONTRAPTION_ENTITY = "create:mechanical_bearing_construct";
const SAW_CONTRAPTION_ENTITY = "create:mechanical_saw_construct";
const DRILL_CONTRAPTION_ENTITY = "create:mechanical_drill_construct";
const HARVESTER_CONTRAPTION_ENTITY = "create:mechanical_harvester_construct";
const DEPLOYER_CONTRAPTION_ENTITY = "create:deployer_construct";
const STORAGE_INTERFACE_CONTRAPTION_ENTITY = "create:portable_storage_interface_construct";
const WINDMILL_SAIL_CONTRAPTION_ENTITY = "create:windmill_sail_construct";
const SEAT_CONTRAPTION_ENTITY = "create:seat_construct";
const DOOR_CONTRAPTION_ENTITY = "create:door_construct";
const LADDER_CONTRAPTION_ENTITY = "create:ladder_construct";
const RADIAL_CHASSIS_CONTRAPTION_ENTITY = "create:radial_chassis_construct";
const STICKER_CONTRAPTION_ENTITY = "create:sticker_construct";
const SLAB_CONTRAPTION_ENTITY = "create:slab_construct";
const CARPET_CONTRAPTION_ENTITY = "create:carpet_construct";
const STAIR_CONTRAPTION_ENTITY = "create:stair_construct";
const BEARING_CONSTRUCT_TAG = "create_mechanical_bearing_construct";
const CART_CONSTRUCT_TAG = "create_cart_assembler_construct";
const CART_CARRIER_TAG = "create_cart_assembler_carrier";
const CART_POWERED_SPEED = 0.5;
const CART_SPEED_EPSILON = 0.005;
const PACKED_CART_ITEM = "create:minecart_contraption";
const PACKED_CART_DATA_PREFIX = "create:packed_cart_contraption:";
const PACKED_CART_DATA_CHUNK_SIZE = 12000;
const PACKED_CART_ITEM_DATA_PREFIX = "create:contraption_data_";
const PACKED_CART_ITEM_DATA_CHUNK_SIZE = 8000;
const MINECART_RAIL_BLOCKS = new Set([
    "minecraft:rail",
    "minecraft:powered_rail",
    "minecraft:detector_rail",
    "minecraft:activator_rail"
]);
const CART_ASSEMBLER_BLOCK = "create:cart_assembler";
const STORAGE_INTERFACE_STATIC_ENTITY = "create:portable_storage_interface_static";
const RPM_EPSILON = 0.001;
const MAX_BEARING_RPM = 40;
const WINDMILL_VISUAL_RPM = 16;
const MAX_CONTRAPTION_BLOCKS = 512;
const CONTRAPTION_SEARCH_RADIUS = 12;
const BEARING_ROTATION_SPEED = -1 / (3.33 * 20);
const CONSTRUCT_VISUAL_SPACING = 1;
const CONSTRUCT_ATTACH_Y_OFFSET = 0;
// A laje inferior ocupa metade do bloco; abaixe o visual do centro do cubo
// para que a base continue apoiada no mesmo nível da estrutura.
const SLAB_CONSTRUCT_Y_OFFSET = -1 / 4;
// Carpetes ocupam somente 1/16 do bloco. A entidade visual genérica usa o
// centro do bloco, então sem esta correção eles ficam suspensos.
const CARPET_CONSTRUCT_Y_OFFSET = -27 / 32;
const CARPET_CONSTRUCT_X_OFFSET = -1 / 16;
const CARPET_CONSTRUCT_Z_OFFSET = 2 / 16;
const SAW_CONSTRUCT_ATTACH_Y_OFFSET = -0.48;
const CONSTRUCT_VISUAL_SLOT = 0;
const CONSTRUCT_INVENTORY_SLOT_OFFSET = 1;
const HARVESTER_TICK_INTERVAL = 5;
const DEPLOYER_TICK_INTERVAL = 8;
const STORAGE_INTERFACE_TRANSFER_INTERVAL = 4;
const STORAGE_INTERFACE_HOLD_TICKS = 24;
const STORAGE_INTERFACE_STACKS_PER_TICK = 3;
const STORAGE_INTERFACE_STATIC_VISUAL_TAG = "create_portable_storage_interface_static_visual";
const STATIC_INTERFACE_CLEANUP_INTERVAL = 20;
const staticInterfaceCleanupTicks = new Map();
const STORAGE_INTERFACE_STATIC_VISUAL_FORWARD_OFFSET = 0;
const BEARING_SAW_DAMAGE = 4;
const BEARING_SAW_DAMAGE_INTERVAL = 8;
const BEARING_SAW_DAMAGE_DISTANCE = 0.9;
const BEARING_SAW_DAMAGE_RADIUS = 0.75;
const bearingSawDamageTicks = new Map();
const DEPLOYER_ENTITY = "create:deployer_entity";
const DEPLOYER_FILTER_ENTITY = "create:deployer_filter";
const DEPLOYER_CONSTRUCT_ATTACH_Y_OFFSET = SAW_CONSTRUCT_ATTACH_Y_OFFSET;
const SEAT_CONSTRUCT_ATTACH_Y_OFFSET = 0;
const DEPLOYER_CONSTRUCT_FORWARD_OFFSET = 0;
const DEPLOYER_CONSTRUCT_REACH = 2;
const SAPLING_ITEMS = new Set([
    "minecraft:oak_sapling", "minecraft:spruce_sapling", "minecraft:birch_sapling",
    "minecraft:jungle_sapling", "minecraft:acacia_sapling", "minecraft:dark_oak_sapling",
    "minecraft:mangrove_propagule", "minecraft:cherry_sapling", "minecraft:pale_oak_sapling"
]);
const SAPLING_SOIL = new Set([
    "minecraft:grass_block", "minecraft:dirt", "minecraft:coarse_dirt", "minecraft:podzol",
    "minecraft:mycelium", "minecraft:moss_block", "minecraft:mud", "minecraft:muddy_mangrove_roots",
    "minecraft:rooted_dirt", "minecraft:farmland"
]);
const GROWTH_STATE_MAX = new Map([
    ["growth", 7],
    ["growth_stage", 7],
    ["age", 7],
    ["crop_age", 7],
    ["height", 7]
]);
const TREE_BLOCKS = new Map([
    ["minecraft:oak_sapling", { log: "minecraft:oak_log", leaves: "minecraft:oak_leaves" }],
    ["minecraft:spruce_sapling", { log: "minecraft:spruce_log", leaves: "minecraft:spruce_leaves" }],
    ["minecraft:birch_sapling", { log: "minecraft:birch_log", leaves: "minecraft:birch_leaves" }],
    ["minecraft:jungle_sapling", { log: "minecraft:jungle_log", leaves: "minecraft:jungle_leaves" }],
    ["minecraft:acacia_sapling", { log: "minecraft:acacia_log", leaves: "minecraft:acacia_leaves" }],
    ["minecraft:dark_oak_sapling", { log: "minecraft:dark_oak_log", leaves: "minecraft:dark_oak_leaves" }],
    ["minecraft:mangrove_propagule", { log: "minecraft:mangrove_log", leaves: "minecraft:mangrove_leaves" }],
    ["minecraft:cherry_sapling", { log: "minecraft:cherry_log", leaves: "minecraft:cherry_leaves" }],
    ["minecraft:pale_oak_sapling", { log: "minecraft:pale_oak_log", leaves: "minecraft:pale_oak_leaves" }]
]);
const NEIGHBOR_OFFSETS = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 }
];

/** @param {unknown} rpm */
function hasRpm(rpm) {
    return Math.abs(Number(rpm) || 0) > RPM_EPSILON;
}

/** @param {unknown} rpm */
function clampBearingRpm(rpm) {
    const value = Number(rpm) || 0;
    return Math.max(-MAX_BEARING_RPM, Math.min(MAX_BEARING_RPM, value));
}

/** @param {Block | BearingLocation | undefined} bearing @param {number} rpm */
function getVisualRpmForBearing(bearing, rpm) {
    if (bearing?.typeId !== WINDMILL_BEARING_BLOCK) return rpm;
    return hasRpm(rpm) ? Math.sign(Number(rpm) || 0) * WINDMILL_VISUAL_RPM : 0;
}

/** @param {Block | undefined} block */
function getTopBlock(block) {
    try { return block?.above(); } catch { return undefined; }
}

/** @param {Block | undefined} block */
function isBearingBlock(block) {
    return block?.typeId === MECHANICAL_BEARING_BLOCK || block?.typeId === WINDMILL_BEARING_BLOCK;
}

/** @param {Block | BearingLocation | string | undefined} blockOrId */
function isWindmillBearingBlock(blockOrId) {
    if (typeof blockOrId === "string") return blockOrId === WINDMILL_BEARING_BLOCK;
    return blockOrId?.typeId === WINDMILL_BEARING_BLOCK;
}

/** @param {Block | BearingLocation | undefined} block */
function getBearingFacing(block) {
    if (!block) return "south";
    if (!("permutation" in block)) return typeof block.face === "string" ? block.face : "south";
    try {
        const states = block.permutation.getAllStates();
        const rawFace = isWindmillBearingBlock(block)
            ? (states["minecraft:cardinal_direction"] ?? states["minecraft:facing_direction"] ?? "south")
            : (states["minecraft:facing_direction"] ?? "south");
        const face = isWindmillBearingBlock(block) && typeof rawFace === "string" ? (invertFace[rawFace] ?? rawFace) : rawFace;
        if (typeof face !== "string") return "south";
        if (face === "up") return "above";
        if (face === "down") return "below";
        return face;
    } catch {
        return "south";
    }
}

/** @param {Block | BearingLocation | string} blockOrId @param {BearingLocation | undefined} [bearing] */
/** @param {Block | BearingLocation | string} blockOrId @param {BearingLocation | undefined} [bearing] */
function getBearingAxis(blockOrId, bearing = undefined) {
    const id = typeof blockOrId === "string" ? blockOrId : blockOrId?.typeId;
    if (id !== WINDMILL_BEARING_BLOCK) return { x: 0, y: 1, z: 0 };
    const face = bearing?.face ?? getBearingFacing(typeof blockOrId === "string" ? undefined : blockOrId);
    return cardinalOffsets[face] ?? cardinalOffsets.south;
}

/** @param {BearingLocation | undefined} bearing */
function getWindmillVisualSign(bearing) {
    const face = bearing?.face ?? "south";
    return face === "north" || face === "west" ? -1 : 1;
}

/** @param {BearingLocation | undefined} bearing */
function getWindmillVisualAxis(bearing) {
    const axis = getBearingAxis(WINDMILL_BEARING_BLOCK, bearing);
    return {
        x: Math.abs(axis.x),
        y: Math.abs(axis.y),
        z: Math.abs(axis.z)
    };
}

/** @param {BearingLocation | undefined} bearing */
function getWindmillBasis(bearing) {
    switch (bearing?.face ?? "south") {
        case "north":
            return {
                front: { x: 0, y: 0, z: -1 },
                right: { x: -1, y: 0, z: 0 },
                up: { x: 0, y: 1, z: 0 }
            };
        case "east":
            return {
                front: { x: 1, y: 0, z: 0 },
                right: { x: 0, y: 0, z: -1 },
                up: { x: 0, y: 1, z: 0 }
            };
        case "west":
            return {
                front: { x: -1, y: 0, z: 0 },
                right: { x: 0, y: 0, z: 1 },
                up: { x: 0, y: 1, z: 0 }
            };
        case "south":
        default:
            return {
                front: { x: 0, y: 0, z: 1 },
                right: { x: 1, y: 0, z: 0 },
                up: { x: 0, y: 1, z: 0 }
            };
    }
}

/** @param {Vector3} a @param {Vector3} b */
function dotVector(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** @param {Vector3} vector @param {number} scale */
function scaleVector(vector, scale) {
    return { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale };
}

/** @param {...Vector3} vectors */
function addVectors(...vectors) {
    return vectors.reduce((sum, vector) => ({
        x: sum.x + vector.x,
        y: sum.y + vector.y,
        z: sum.z + vector.z
    }), { x: 0, y: 0, z: 0 });
}

/** @param {Vector3} vector @param {BearingLocation} bearing @param {number} angle */
function rotateWindmillRel(vector, bearing, angle) {
    const basis = getWindmillBasis(bearing);
    const radians = angle * getWindmillVisualSign(bearing) * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const right = dotVector(vector, basis.right);
    const up = dotVector(vector, basis.up);
    const front = dotVector(vector, basis.front);
    const rotatedRight = right * cos - up * sin;
    const rotatedUp = right * sin + up * cos;
    return addVectors(
        scaleVector(basis.right, rotatedRight),
        scaleVector(basis.up, rotatedUp),
        scaleVector(basis.front, front)
    );
}

/** @param {BearingLocation} bearing */
/** @param {BearingLocation | undefined} bearing */
/** @param {BearingLocation | undefined} bearing */
function getWindmillPivotOffset(bearing) {
    const faceOffset = cardinalOffsets[bearing?.face ?? "south"] ?? DIRECTION_OFFSETS.south;
    return {
        x: faceOffset.x * 0.5,
        y: faceOffset.y * 0.5,
        z: faceOffset.z * 0.5
    };
}

/** @param {BearingLocation | undefined} bearing @param {number} angle */
function getConstructRotationForBearing(bearing, angle) {
    if (bearing?.typeId !== WINDMILL_BEARING_BLOCK) {
        return { x: 0, y: angle, z: 0 };
    }

    const face = bearing?.face ?? "south";
    if (face === "south") {
        return {
            x: 0,
            y: 0,
            z: -angle
        };
    }
    if (face === "north" || face === "south") {
        return {
            x: 0,
            y: 0,
            z: angle * getWindmillVisualSign(bearing)
        };
    }

    const axis = getBearingAxis(WINDMILL_BEARING_BLOCK, bearing);
    const visualAngle = angle * getWindmillVisualSign(bearing);
    return {
        x: axis.x * visualAngle,
        y: 0,
        z: axis.z * visualAngle
    };
}

/** @param {BearingLocation | undefined} bearing */
function getWindmillSailBaseDirection(bearing) {
    switch (bearing?.face ?? "south") {
        case "north": return "north";
        case "east": return "east";
        case "west": return "west";
        case "south":
        default: return "south";
    }
}

/** @param {Block} block */
/** @param {Block} block */
function getAttachedBlock(block) {
    if (!isWindmillBearingBlock(block)) return getTopBlock(block);
    const offset = cardinalOffsets[getBearingFacing(block)] ?? DIRECTION_OFFSETS.south;
    try { return block.offset(offset); } catch {
        return undefined;
    }
}

/** @param {Block} block */
/** @param {Block} block */
function getConstructLocation(block) {
    const attached = getAttachedBlock(block);
    return attached?.center?.() ?? { x: block.x + 0.5, y: block.y + 1.5, z: block.z + 0.5 };
}

/** @param {Block | BearingLocation} bearing */
/** @param {Block | BearingLocation} bearing */
function getBearingCenter(bearing) {
    const windmillOffset = bearing.typeId === WINDMILL_BEARING_BLOCK
        ? getWindmillPivotOffset(bearing)
        : { x: 0, y: 0, z: 0 };
    return {
        x: bearing.x + 0.5 + windmillOffset.x,
        y: bearing.y + (bearing.typeId === WINDMILL_BEARING_BLOCK ? 0.5 : 1.5),
        z: bearing.z + 0.5 + windmillOffset.z
    };
}

/** @param {Block} block */
/** @param {Block} block */
function getBearingRpm(block) {
    const location = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
    const entity = block.dimension.getEntities({ type: getBearingEntityType(block), location, maxDistance: 2 })[0];
    return clampBearingRpm(entity?.getProperty("create:rpm") ?? 0);
}

/** @param {Dimension} dimension @param {BearingLocation} bearing @param {number} [fallbackRpm] @param {Entity | undefined} [cachedEntity] */
/** @param {Dimension} dimension @param {BearingLocation} bearing @param {number} [fallbackRpm] @param {Entity | undefined} [cachedEntity] */
function getSyncedBearingRpm(dimension, bearing, fallbackRpm = 0, cachedEntity = undefined) {
    if (bearing?.typeId !== WINDMILL_BEARING_BLOCK) return fallbackRpm;

    try {
        const block = dimension.getBlock({ x: bearing.x, y: bearing.y, z: bearing.z });
        if (block?.typeId !== WINDMILL_BEARING_BLOCK) return 0;
        const states = block.permutation.getAllStates();
        const powered = states["create:powered"] === true;
        const active = states["create:active_generator"] !== false;
        if (powered || !active) return 0;
        const entity = cachedEntity ?? getBearingEntityAt(dimension, bearing);
        return Number(entity?.getProperty("create:rpm") ?? fallbackRpm ?? 0);
    } catch {
        return fallbackRpm;
    }
}

/** @param {Block | BearingLocation | string} blockOrBearing */
function getBearingEntityType(blockOrBearing) {
    const typeId = typeof blockOrBearing === "string" ? blockOrBearing : blockOrBearing?.typeId;
    return typeId === WINDMILL_BEARING_BLOCK ? WINDMILL_BEARING_ENTITY : BEARING_ENTITY;
}

/** @param {Dimension} dimension @param {BearingLocation} bearing */
function getBearingEntityAt(dimension, bearing) {
    const location = { x: bearing.x + 0.5, y: bearing.y + 0.5, z: bearing.z + 0.5 };
    return dimension.getEntities({ type: getBearingEntityType(bearing), location, maxDistance: 2 })[0]
        ?? dimension.getEntities({ type: BEARING_ENTITY, location, maxDistance: 2 })[0];
}

/** @param {Dimension} dimension @param {Block | BearingLocation} bearing @param {number} angle @param {Entity | undefined} [cachedEntity] */
function setBearingEntityAngle(dimension, bearing, angle, cachedEntity = undefined) {
    const entity = cachedEntity ?? getBearingEntityAt(dimension, bearing);
    try { entity?.setProperty("create:rotation_y", angle); } catch {}
}

/** @param {Block} block */
function getConstruct(block) {
    return getConstructs(block)[0];
}

/** @param {Block} block @returns {Entity[]} */
function getConstructs(block) {
    const visualConstructs = block.dimension.getEntities({
        tags: [BEARING_CONSTRUCT_TAG]
    }).filter((entity) => {
        const bearing = getStoredBearingLocation(entity);
        return bearing?.x === block.x && bearing?.y === block.y && bearing?.z === block.z;
    });
    if (visualConstructs.length > 0) return visualConstructs;

    return [];
}

/** @param {Block | undefined} block */
function isMovableBlock(block) {
    if (!block?.isValid || block.isAir || block.isLiquid) return false;
    if (isBearingBlock(block)) return false;
    // Tanks store a multi-block fluid state and their own visual entity. Moving
    // them as ordinary contraption blocks corrupts that state, so keep both
    // normal and creative tanks fixed in the world.
    if (block.typeId === "create:fluid_tank" || block.typeId === "create:creative_fluid_tank") return false;
    // Doors têm duas metades e estado próprio de abertura. Elas não podem
    // entrar em contraptions, senão a estrutura captura somente uma metade e
    // deixa a porta quebrada ao desmontar.
    if (isDoorBlockId(block.typeId)) return false;
    const stack = createBlockStack(block.typeId);
    if (!stack) return false;
    if (hasDedicatedConstructVisual(block.typeId)) return true;
    // The shared renderer knows which placeable blocks fall back to their item
    // transform. Do not capture those blocks because they become oversized or
    // flat inside a Bearing construct.
    try { return itemStackIs(stack) === "block"; } catch { return false; }
}

/** @param {string} blockId */
function hasDedicatedConstructVisual(blockId) {
    return blockId === "create:radial_chassis"
        || blockId === "create:sticker"
        || blockId === "create:mechanical_saw"
        || blockId === "create:mechanical_drill"
        || blockId === "create:mechanical_harvester"
        || blockId === "create:deployer"
        || blockId === "create:portable_storage_interface"
        || isSeatBlockId(blockId)
        || isWindmillSailBlockId(blockId)
        || isDoorBlockId(blockId)
        || isLadderBlockId(blockId)
        || isSlabBlockId(blockId)
        || isCarpetBlockId(blockId)
        || isStairBlockId(blockId);
}

/** @param {string} blockId @returns {ItemStack | undefined} */
function createBlockStack(blockId) {
    try { return new ItemStack(blockId, 1); } catch { return undefined; }
}

// Entity.teleport() is interpolated by the client immediately after spawning.
// A /tp issued by the entity itself sends a snapped transform instead, which
// keeps newly-built Cart Assembler contraptions from visibly turning in place.
/** @param {Entity | undefined} entity @param {Vector3 | undefined} location @param {number} yaw */
function snapEntityRotation(entity, location, yaw) {
    if (!entity?.isValid || !location) return false;
    const x = Number(location.x);
    const y = Number(location.y);
    const z = Number(location.z);
    const angle = Number(yaw ?? 0);
    if (![x, y, z, angle].every(Number.isFinite)) return false;
    try {
        entity.runCommand(`tp @s ${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)} ${angle.toFixed(2)} 0`);
        return true;
    } catch {}
    try {
        entity.teleport(location, { checkForBlocks: false, rotation: { x: 0, y: angle } });
        return true;
    } catch {}
    return false;
}

/** @param {Entity} entity @param {string} blockId */
function setConstructVisual(entity, blockId) {
    const stack = createBlockStack(blockId);
    if (!stack) return false;
    const equipVisual = () => {
        if (!entity?.isValid) return;
        try { setItemInHand(stack, entity, EquipmentSlot.Mainhand, CONSTRUCT_VISUAL_SLOT, "create:item_visual"); } catch {}
        try { entity.setProperty("create:item_visual", "block"); } catch {}
    };

    // Cart construct entities are created with their visual hand empty.  Their
    // first cart frame sets the final yaw/position, then the next tick equips
    // the block. This prevents the client ever drawing a south-facing frame.
    let isCartConstruct = false;
    try { isCartConstruct = entity.hasTag(CART_CONSTRUCT_TAG); } catch {}
    if (isCartConstruct) {
        system.run(equipVisual);
    } else {
        equipVisual();
        // Some placeable blocks are classified as items by the shared filter
        // renderer. Reapply after the equipment update for Bearing constructs.
        system.run(equipVisual);
    }
    return true;
}

/** @param {BlockStates | undefined} states */
function getGenericBlockDirection(states) {
    const raw = states?.["minecraft:cardinal_direction"]
        ?? states?.cardinal_direction
        ?? states?.["minecraft:facing_direction"]
        ?? states?.facing_direction
        ?? "south";
    if (typeof raw === "string") return { south: 0, east: 1, north: 2, west: 3 }[raw] ?? 0;
    return { 2: 2, 3: 0, 4: 3, 5: 1 }[Number(raw)] ?? 0;
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setGenericConstructVisual(entity, data) {
    if (entity?.typeId !== CONTRAPTION_ENTITY
        && entity?.typeId !== SLAB_CONTRAPTION_ENTITY
        && entity?.typeId !== CARPET_CONTRAPTION_ENTITY) return false;
    const states = data.states ?? getBlockStates(data.block) ?? {};
    const direction = getGenericBlockDirection(states);
    try { entity.setProperty("create:block_direction", direction); } catch {}
    try { entity.setDynamicProperty("create:block_direction", direction); } catch {}
    let isCartConstruct = false;
    try { isCartConstruct = entity.hasTag(CART_CONSTRUCT_TAG); } catch {}
    if (isCartConstruct) snapEntityRotation(entity, entity.location, direction * 90);
    else {
        try {
            entity.teleport(entity.location, {
                checkForBlocks: false,
                rotation: { x: 0, y: direction * 90 }
            });
        } catch {}
    }
    return setConstructVisual(entity, data.blockId);
}

function getConstructEntityTypes() {
    return [CONTRAPTION_ENTITY, SAW_CONTRAPTION_ENTITY, DRILL_CONTRAPTION_ENTITY, HARVESTER_CONTRAPTION_ENTITY, DEPLOYER_CONTRAPTION_ENTITY, STORAGE_INTERFACE_CONTRAPTION_ENTITY, WINDMILL_SAIL_CONTRAPTION_ENTITY, SEAT_CONTRAPTION_ENTITY, DOOR_CONTRAPTION_ENTITY, LADDER_CONTRAPTION_ENTITY, RADIAL_CHASSIS_CONTRAPTION_ENTITY, STICKER_CONTRAPTION_ENTITY, SLAB_CONTRAPTION_ENTITY, CARPET_CONTRAPTION_ENTITY, STAIR_CONTRAPTION_ENTITY];
}

/** @param {Entity | undefined} entity */
function isSawConstruct(entity) {
    return entity?.typeId === SAW_CONTRAPTION_ENTITY;
}

/** @param {Entity | undefined} entity */
function isDrillConstruct(entity) {
    return entity?.typeId === DRILL_CONTRAPTION_ENTITY;
}

/** @param {Entity | undefined} entity */
function isHarvesterConstruct(entity) {
    return entity?.typeId === HARVESTER_CONTRAPTION_ENTITY;
}

/** @param {Entity | undefined} entity */
function isDeployerConstruct(entity) {
    return entity?.typeId === DEPLOYER_CONTRAPTION_ENTITY;
}

/** @param {Entity | undefined} entity */
function isStorageInterfaceConstruct(entity) {
    return entity?.typeId === STORAGE_INTERFACE_CONTRAPTION_ENTITY;
}

/** @param {string | undefined} blockId */
function isWindmillSailBlockId(blockId) {
    return blockId === "create:windmill_sail"
        || (typeof blockId === "string" && blockId.startsWith("create:") && blockId.endsWith("_windmill_sail"));
}

/** @param {string | undefined} blockId */
function isSeatBlockId(blockId) {
    return typeof blockId === "string" && blockId.startsWith("create:") && blockId.endsWith("_seat");
}

/** @param {string | undefined} blockId */
function isCarpetBlockId(blockId) {
    return typeof blockId === "string" && (blockId === "minecraft:carpet" || blockId.endsWith("_carpet"));
}

/** @param {string | undefined} blockId */
function isSlabBlockId(blockId) {
    return typeof blockId === "string" && (blockId.endsWith("_slab") || blockId.endsWith("_double_slab"));
}

/** @param {string | undefined} blockId */
function isStairBlockId(blockId) {
    return typeof blockId === "string" && blockId.endsWith("_stairs");
}

/** @param {Entity | undefined} entity */
function isStairConstruct(entity) {
    return entity?.typeId === STAIR_CONTRAPTION_ENTITY;
}

/** @param {BlockStates} states */
function getStairDirectionIndex(states) {
    const cardinal = states["minecraft:cardinal_direction"] ?? states.cardinal_direction;
    if (typeof cardinal === "string") return { south: 0, east: 1, north: 2, west: 3 }[cardinal] ?? 0;
    const direction = Number(states.weirdo_direction ?? states["minecraft:weirdo_direction"] ?? 2);
    // Vanilla stairs rendered from an ItemStack start facing east, not south.
    // Convert Bedrock's 0=east, 1=west, 2=south, 3=north into quarter-turns
    // relative to that east-facing item model.
    return { 0: 0, 1: 2, 2: 1, 3: 3 }[direction] ?? 0;
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setStairVisual(entity, data) {
    if (!isStairConstruct(entity)) return false;
    const states = data.states ?? getBlockStates(data.block) ?? {};
    const verticalHalf = states["minecraft:vertical_half"] ?? states.vertical_half;
    const upsideDown = states.upside_down_bit === true
        || states["minecraft:upside_down_bit"] === true
        || verticalHalf === "top";
    const direction = getStairDirectionIndex(states);
    try { entity.setProperty("create:block_direction", direction); } catch {}
    try { entity.setProperty("create:stair_upside_down", upsideDown); } catch {}
    try { entity.setDynamicProperty("create:stair_upside_down", upsideDown); } catch {}
    try {
        entity.teleport(entity.location, {
            checkForBlocks: false,
            rotation: { x: 0, y: direction * 90 }
        });
    } catch {}
    return setConstructVisual(entity, data.blockId);
}

/** @param {string | undefined} blockId */
function isDoorBlockId(blockId) {
    return typeof blockId === "string"
        && blockId.endsWith("_door")
        && !blockId.endsWith("_trapdoor");
}

/** @param {Entity | undefined} entity */
function isDoorConstruct(entity) {
    return entity?.typeId === DOOR_CONTRAPTION_ENTITY;
}

/** @param {string | undefined} blockId */
function isLadderBlockId(blockId) {
    return blockId === "minecraft:ladder";
}

/** @param {Entity | undefined} entity */
function isLadderConstruct(entity) {
    return entity?.typeId === LADDER_CONTRAPTION_ENTITY;
}

/** @param {Entity | undefined} entity */
function isRadialChassisConstruct(entity) {
    return entity?.typeId === RADIAL_CHASSIS_CONTRAPTION_ENTITY;
}

/** @param {Entity | undefined} entity */
function isStickerConstruct(entity) {
    return entity?.typeId === STICKER_CONTRAPTION_ENTITY;
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setStickerVisual(entity, data) {
    if (!isStickerConstruct(entity)) return false;
    const states = data.states ?? getBlockStates(data.block) ?? {};
    const direction = normalizeSailFacing(states["minecraft:facing_direction"] ?? "up");
    const powered = states["create:powered"] === true;
    try { entity.setProperty("create:sticker_direction", direction); } catch {}
    try { entity.setProperty("create:sticker_powered", powered); } catch {}
    try { entity.setDynamicProperty("create:sticker_direction", direction); } catch {}
    try { entity.setDynamicProperty("create:sticker_powered", powered); } catch {}
    return true;
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setRadialChassisVisual(entity, data) {
    if (!isRadialChassisConstruct(entity)) return false;
    const states = data.states ?? getBlockStates(data.block) ?? {};
    const direction = normalizeSailFacing(states["minecraft:facing_direction"] ?? "up");
    const sticky = states["create:sticky"] === true;
    try { entity.setProperty("create:chassis_direction", direction); } catch {}
    try { entity.setProperty("create:chassis_sticky", sticky); } catch {}
    try { entity.setDynamicProperty("create:chassis_direction", direction); } catch {}
    try { entity.setDynamicProperty("create:chassis_sticky", sticky); } catch {}
    return true;
}

/** @param {Block | undefined} block @param {RelativeVector} offset */
function isStickyRadialSide(block, offset) {
    if (block?.typeId !== "create:radial_chassis") return false;
    try {
        const states = block.permutation.getAllStates();
        if (states["create:sticky"] !== true) return false;
        const facing = states["minecraft:facing_direction"] ?? "up";
        if (facing === "up" || facing === "down") return offset.y === 0;
        if (facing === "north" || facing === "south") return offset.z === 0;
        return offset.x === 0;
    } catch {
        return false;
    }
}

/** @param {Block | undefined} block @param {Block | undefined} nextBlock @param {RelativeVector} offset */
function radialChassisConnectAutomatically(block, nextBlock, offset) {
    if (block?.typeId === "create:radial_chassis" && nextBlock?.typeId === "create:radial_chassis") return true;
    if (isStickyRadialSide(block, offset)) return true;
    return isStickyRadialSide(nextBlock, { x: -offset.x, y: -offset.y, z: -offset.z });
}

/** @param {Block | undefined} block @param {Block | undefined} nextBlock @param {RelativeVector} offset */
function stickerCutsConnection(block, nextBlock, offset) {
    /** @type {Record<string, Vector3>} */
    const directionOffsets = {
        north: { x: 0, y: 0, z: -1 },
        south: { x: 0, y: 0, z: 1 },
        west: { x: -1, y: 0, z: 0 },
        east: { x: 1, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        down: { x: 0, y: -1, z: 0 }
    };
    /** @param {Block | undefined} sticker @param {RelativeVector} edge */
    const cutsFront = (sticker, edge) => {
        if (sticker?.typeId !== "create:sticker") return false;
        try {
            const states = sticker.permutation.getAllStates();
            if (states["create:powered"] !== true) return false;
            const facing = normalizeSailFacing(states["minecraft:facing_direction"]);
            const front = directionOffsets[facing];
            return front && front.x === edge.x && front.y === edge.y && front.z === edge.z;
        } catch { return false; }
    };
    return cutsFront(block, offset)
        || cutsFront(nextBlock, { x: -offset.x, y: -offset.y, z: -offset.z });
}

/** @param {BlockStates} states */
function getLadderDirectionIndex(states) {
    const raw = states["minecraft:facing_direction"] ?? states.facing_direction ?? "south";
    if (typeof raw === "string") return { south: 0, east: 1, north: 2, west: 3 }[raw] ?? 0;
    return { 2: 2, 3: 0, 4: 3, 5: 1 }[Number(raw)] ?? 0;
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setLadderVisual(entity, data) {
    if (!isLadderConstruct(entity)) return false;
    const states = data.states ?? getBlockStates(data.block) ?? {};
    const direction = getLadderDirectionIndex(states);
    try { entity.setProperty("create:ladder_direction", direction); } catch {}
    try { entity.setProperty("create:ladder_ready", true); } catch {}
    return true;
}

const VANILLA_DOOR_TYPES = [
    "wooden", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "cherry",
    "bamboo", "crimson", "warped", "iron", "copper", "exposed_copper", "weathered_copper", "oxidized_copper"
];

/** @param {string} blockId */
function getDoorTypeIndex(blockId) {
    let name = String(blockId ?? "").replace("minecraft:", "").replace(/_door$/, "");
    name = name.replace(/^waxed_/, "");
    if (name === "oak") name = "wooden";
    const index = VANILLA_DOOR_TYPES.indexOf(name);
    return index >= 0 ? index : 0;
}

/** @param {BlockStates} states */
function getDoorDirectionIndex(states) {
    const raw = states["minecraft:cardinal_direction"]
        ?? states.cardinal_direction
        ?? states["minecraft:direction"]
        ?? states.direction
        ?? 0;
    if (typeof raw === "string") {
        // The model's unrotated panel faces south.
        return { south: 0, east: 1, north: 2, west: 3 }[raw] ?? 0;
    }
    // Vanilla Bedrock door direction: 0=east, 1=south, 2=west, 3=north.
    // Convert that order to clockwise quarter turns from the model's south face.
    const vanillaDirection = Math.max(0, Math.min(3, Number(raw) || 0));
    return (1 - vanillaDirection + 4) % 4;
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setDoorVisual(entity, data) {
    if (!isDoorConstruct(entity)) return false;
    const states = data.states ?? getBlockStates(data.block) ?? {};
    const open = states.open_bit === true || states["minecraft:open_bit"] === true;
    const upper = states.upper_block_bit === true || states["minecraft:upper_block_bit"] === true;
    const hingeRight = states.door_hinge_bit === true || states["minecraft:door_hinge_bit"] === true;
    const direction = getDoorDirectionIndex(states);
    try { entity.setProperty("create:door_open", open); } catch {}
    try { entity.setProperty("create:door_upper", upper); } catch {}
    try { entity.setProperty("create:door_hinge_right", hingeRight); } catch {}
    try { entity.setProperty("create:door_direction", direction); } catch {}
    try { entity.setProperty("create:door_type", getDoorTypeIndex(data.blockId)); } catch {}
    try { entity.setDynamicProperty("create:door_open", open); } catch {}
    try { entity.teleport(entity.location, { checkForBlocks: false, rotation: { x: 0, y: direction * 90 } }); } catch {}
    try { entity.setProperty("create:door_ready", true); } catch {}
    return true;
}

/** @param {Player | undefined} player @param {Entity | undefined} target */
export function bearingDoorInteract(player, target) {
    if (!player?.isValid || !target?.isValid || !isDoorConstruct(target)) return false;
    const open = !(target.getProperty("create:door_open") === true);
    let doors = [target];
    try { doors = target.dimension.getEntities({ type: DOOR_CONTRAPTION_ENTITY, location: target.location, maxDistance: 1.6 }); } catch {}
    const cartId = target.getDynamicProperty("create:cart_id");
    const bearingX = target.getDynamicProperty("create:bearing_x");
    const bearingY = target.getDynamicProperty("create:bearing_y");
    const bearingZ = target.getDynamicProperty("create:bearing_z");
    const blockX = target.getDynamicProperty("create:block_x");
    const blockZ = target.getDynamicProperty("create:block_z");
    for (const door of doors) {
        const sameOwner = typeof cartId === "string"
            ? door.getDynamicProperty("create:cart_id") === cartId
            : door.getDynamicProperty("create:bearing_x") === bearingX
                && door.getDynamicProperty("create:bearing_y") === bearingY
                && door.getDynamicProperty("create:bearing_z") === bearingZ;
        if (!sameOwner || door.getDynamicProperty("create:block_x") !== blockX || door.getDynamicProperty("create:block_z") !== blockZ) continue;
        try { door.setProperty("create:door_open", open); } catch {}
        try { door.setDynamicProperty("create:door_open", open); } catch {}
    }
    try { target.dimension.playSound(open ? "open.wooden_door" : "close.wooden_door", target.location); } catch {}
    return true;
}

/** @param {string} blockId */
function getSeatColor(blockId) {
    return isSeatBlockId(blockId) ? blockId.slice("create:".length, -"_seat".length) : "white";
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setSeatVisual(entity, data) {
    if (!isSeatConstruct(entity)) return false;
    const color = getSeatColor(data.blockId);
    const colorIndex = ["white", "light_gray", "gray", "black", "brown", "red", "orange", "yellow", "lime", "green", "cyan", "light_blue", "blue", "purple", "magenta", "pink"].indexOf(color);
    try { entity.setProperty("create:seat_color", color); } catch {}
    try { entity.setProperty("create:seat_color_index", Math.max(0, colorIndex)); } catch {}
    try { entity.setDynamicProperty("create:seat_color", color); } catch {}
    return true;
}

/** @param {Player | undefined} player @param {Entity | undefined} target */
export function bearingSeatInteract(player, target) {
    if (!player?.isValid || target?.typeId !== SEAT_CONTRAPTION_ENTITY) return false;
    try {
        const rideable = target.getComponent("minecraft:rideable") ?? target.getComponent("rideable");
        if (!rideable) return false;
        const riders = rideable.getRiders();
        if (riders.length === 0) rideable.addRider(player);
        else if (!riders.some(rider => rider.id === player.id)) player.sendMessage({ translate: "create.text.seat_occupied" });
        return true;
    } catch {
        return false;
    }
}

/** @param {Block | undefined} a @param {Block | undefined} b */
function windmillSailsConnectAutomatically(a, b) {
    return isWindmillSailBlockId(a?.typeId) && isWindmillSailBlockId(b?.typeId);
}

/** @param {Entity | undefined} entity */
function isWindmillSailConstruct(entity) {
    return entity?.typeId === WINDMILL_SAIL_CONTRAPTION_ENTITY;
}

/** @param {Entity | undefined} entity */
function isSeatConstruct(entity) {
    return entity?.typeId === SEAT_CONTRAPTION_ENTITY;
}

/** @param {Entity | undefined} entity */
function isMachineConstruct(entity) {
    return entity?.typeId === SAW_CONTRAPTION_ENTITY
        || entity?.typeId === DRILL_CONTRAPTION_ENTITY
        || entity?.typeId === HARVESTER_CONTRAPTION_ENTITY
        || entity?.typeId === DEPLOYER_CONTRAPTION_ENTITY
        || entity?.typeId === STORAGE_INTERFACE_CONTRAPTION_ENTITY;
}

/** @param {Entity | undefined} entity */
function usesMachineTransform(entity) {
    return isMachineConstruct(entity)
        || isDoorConstruct(entity)
        || entity?.typeId === CONTRAPTION_ENTITY
        || entity?.typeId === SLAB_CONTRAPTION_ENTITY
        || entity?.typeId === CARPET_CONTRAPTION_ENTITY
        || entity?.typeId === STAIR_CONTRAPTION_ENTITY;
}

/** @param {Entity} entity */
function getMachineConstructYOffset(entity) {
    return isDeployerConstruct(entity) ? DEPLOYER_CONSTRUCT_ATTACH_Y_OFFSET : SAW_CONSTRUCT_ATTACH_Y_OFFSET;
}

/** @param {Entity} entity */
function getConstructAttachYOffset(entity) {
    if (isMachineConstruct(entity)) return getMachineConstructYOffset(entity);
    return 0;
}

/** @param {Entity} entity */
function getCartConstructAttachYOffset(entity) {
    if (isSeatConstruct(entity)) return SEAT_CONSTRUCT_ATTACH_Y_OFFSET;
    return getConstructAttachYOffset(entity);
}

/** @param {Entity} entity @param {number} constructAngle */
function getMachineConstructYaw(entity, constructAngle) {
    if (entity?.typeId === CONTRAPTION_ENTITY
        || entity?.typeId === SLAB_CONTRAPTION_ENTITY
        || entity?.typeId === CARPET_CONTRAPTION_ENTITY
        || entity?.typeId === STAIR_CONTRAPTION_ENTITY) {
        return Number(entity.getProperty("create:block_direction") ?? 0) * 90;
    }
    if (isDoorConstruct(entity)) {
        return Number(entity.getProperty("create:door_direction") ?? 0) * 90;
    }
    if (isDeployerConstruct(entity)) return constructAngle;
    return getSawConstructYaw(entity, constructAngle);
}

/** @param {Entity} entity */
function getCartConstructYaw(entity) {
    return getMachineConstructYaw(entity, 0);
}

/** @param {number} yaw */
function getCartPlacementQuarterTurns(yaw) {
    return ((Math.round(Number(yaw ?? 0) / 90) % 4) + 4) % 4;
}

/** @param {number} targetYaw @param {number} sourceYaw */
function getCartRotationDeltaQuarterTurns(targetYaw, sourceYaw) {
    return ((Math.round((Number(targetYaw ?? 0) - Number(sourceYaw ?? 0)) / 90) % 4) + 4) % 4;
}

/** @param {Entity} entity @returns {RelativeVector} */
function getConstructVisualOffset(entity) {
    if (isDeployerConstruct(entity)) return { x: 0, y: 0, z: DEPLOYER_CONSTRUCT_FORWARD_OFFSET };
    if (isSeatConstruct(entity)) return { x: 0, y: SEAT_CONSTRUCT_ATTACH_Y_OFFSET, z: 0 };
    if (entity?.typeId === SLAB_CONTRAPTION_ENTITY) {
        return { x: 0, y: SLAB_CONSTRUCT_Y_OFFSET, z: 0 };
    }
    if (entity?.typeId === CARPET_CONTRAPTION_ENTITY
        || (entity?.typeId === CONTRAPTION_ENTITY && isCarpetBlockId(getConstructBlockId(entity)))) {
        return {
            x: CARPET_CONSTRUCT_X_OFFSET,
            y: CARPET_CONSTRUCT_Y_OFFSET,
            z: CARPET_CONSTRUCT_Z_OFFSET
        };
    }
    return { x: 0, y: 0, z: 0 };
}

/** @param {RelativeVector} offset */
function getNeighborFace(offset) {
    if (offset.x === 1 && offset.y === 0 && offset.z === 0) return "east";
    if (offset.x === -1 && offset.y === 0 && offset.z === 0) return "west";
    if (offset.x === 0 && offset.y === 0 && offset.z === 1) return "south";
    if (offset.x === 0 && offset.y === 0 && offset.z === -1) return "north";
    if (offset.x === 0 && offset.y === 1 && offset.z === 0) return "above";
    if (offset.x === 0 && offset.y === -1 && offset.z === 0) return "below";
    return undefined;
}

/** @param {Block | undefined} block @returns {BlockStates | undefined} */
/** @param {Block | undefined} block @returns {BlockStates | undefined} */
function getBlockStates(block) {
    try { return block?.permutation.getAllStates(); } catch { return undefined; }
}

/** @param {Block | Entity | undefined} holder @returns {Container | undefined} */
function getContainer(holder) {
    try { return holder?.getComponent?.("minecraft:inventory")?.container ?? holder?.getComponent?.("inventory")?.container; } catch {}
    return undefined;
}

/** @param {Vector3 | undefined} a @param {Vector3 | undefined} b */
function distanceSquared(a, b) {
    const dx = (a?.x ?? 0) - (b?.x ?? 0);
    const dy = (a?.y ?? 0) - (b?.y ?? 0);
    const dz = (a?.z ?? 0) - (b?.z ?? 0);
    return dx * dx + dy * dy + dz * dz;
}

/** @param {Entity | undefined} entity @param {Vector3} location @param {number} [maxDistance] */
function isEntityAtLocation(entity, location, maxDistance = 0.35) {
    return entity?.isValid && distanceSquared(entity.location, location) <= maxDistance * maxDistance;
}

/** @param {Entity | undefined} entity @param {Block} block */
function setDeployerEntityOwner(entity, block) {
    try { entity?.setDynamicProperty("create:deployer_block_x", block.x); } catch {}
    try { entity?.setDynamicProperty("create:deployer_block_y", block.y); } catch {}
    try { entity?.setDynamicProperty("create:deployer_block_z", block.z); } catch {}
}

/** @param {Entity | undefined} entity @param {Block} block */
function isDeployerEntityOwnedByBlock(entity, block) {
    const x = entity?.getDynamicProperty?.("create:deployer_block_x");
    const y = entity?.getDynamicProperty?.("create:deployer_block_y");
    const z = entity?.getDynamicProperty?.("create:deployer_block_z");
    const hasOwner = typeof x === "number" || typeof y === "number" || typeof z === "number";
    if (!hasOwner) return true;
    return x === block.x && y === block.y && z === block.z;
}

/** @param {Block} block */
function getDeployerFilterLocation(block) {
    const center = block.center();
    return {
        x: center.x,
        y: block.location.y + 1.05,
        z: center.z
    };
}

/** @param {Block} block @returns {Entity | undefined} */
function getNearbyDeployerEntity(block) {
    if (!block?.dimension || block.typeId !== "create:deployer") return undefined;
    const center = block.center();
    try {
        const entities = block.dimension.getEntities({
            type: DEPLOYER_ENTITY,
            location: center,
            maxDistance: 0.45
        }).filter(entity => isEntityAtLocation(entity, center, 0.35) && isDeployerEntityOwnedByBlock(entity, block));
        return entities.find(entity => getContainer(entity)?.getItem(0)) ?? entities[0];
    } catch {
        return undefined;
    }
}

/** @param {Block} block */
function removeNearbyDeployerSupportEntities(block) {
    if (!block?.dimension || block.typeId !== "create:deployer") return;
    const center = block.center();
    const filterLocation = getDeployerFilterLocation(block);
    try {
        for (const entity of block.dimension.getEntities({ type: DEPLOYER_ENTITY, location: center, maxDistance: 0.45 })) {
            if (isEntityAtLocation(entity, center, 0.35) && isDeployerEntityOwnedByBlock(entity, block)) try { entity.remove(); } catch {}
        }
        for (const entity of block.dimension.getEntities({ type: DEPLOYER_FILTER_ENTITY, location: filterLocation, maxDistance: 0.45 })) {
            if (isEntityAtLocation(entity, filterLocation, 0.35) && isDeployerEntityOwnedByBlock(entity, block)) try { entity.remove(); } catch {}
        }
    } catch {}
}

/** @param {Entity} entity @param {Block | undefined} block */
function syncDeployerConstructHeldItem(entity, block) {
    if (!isDeployerConstruct(entity) || block?.typeId !== "create:deployer") return false;
    const sourceEntity = getNearbyDeployerEntity(block);
    const sourceContainer = getContainer(sourceEntity);
    const targetContainer = getContainer(entity);
    const held = sourceContainer?.getItem(0);
    if (!sourceContainer || !targetContainer || !held) {
        removeNearbyDeployerSupportEntities(block);
        return false;
    }

    const item = cloneItemStack(held);
    if (!item) return false;
    try { targetContainer.setItem(0, item.clone()); } catch {}
    try { setItemInHand(item.clone(), entity, EquipmentSlot.Mainhand, 0, "create:item_visual"); } catch {}
    try { entity.setProperty("create:item_visual", "item"); } catch {}
    try { entity.setDynamicProperty("create:deployer_sample_item", item.typeId); } catch {}
    try { entity.setProperty("create:hand_mode", getBlockStateValue(block, "create:hand_mode") === true); } catch {}
    try { sourceContainer.setItem(0, undefined); } catch {}
    try { sourceEntity?.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air"); } catch {}
    removeNearbyDeployerSupportEntities(block);
    return true;
}

/** @param {Entity} entity @param {Block} block */
function restoreDeployerHeldItem(entity, block) {
    if (!isDeployerConstruct(entity) || block?.typeId !== "create:deployer") return false;
    const sourceContainer = getContainer(entity);
    const held = sourceContainer?.getItem(0);

    try {
        const deployerEntity = block.dimension.spawnEntity(DEPLOYER_ENTITY, block.center());
        setDeployerEntityOwner(deployerEntity, block);
        if (held) {
            const item = cloneItemStack(held);
            if (!item) return false;
            try { getContainer(deployerEntity)?.setItem(0, item.clone()); } catch {}
            try { setItemInHand(item.clone(), deployerEntity, EquipmentSlot.Mainhand, 0, "create:item_visual"); } catch {}
        }
        try {
            const facing = getBlockStateValue(block, "minecraft:facing_direction");
            const safeFacing = typeof facing === "string" ? facing : "south";
            deployerEntity.setProperty("create:cardinal_rotation", invertFace[safeFacing] ?? safeFacing);
        } catch {}
        try {
            const handMode = getBlockStateValue(block, "create:hand_mode") === true;
            deployerEntity.setProperty("create:hand_mode", handMode);
        } catch {}
        return true;
    } catch {
        if (held) try { block.dimension.spawnItem(held.clone(), block.center()); } catch {}
        return false;
    }
}

/** @param {McItemStack | undefined} item @returns {McItemStack | undefined} */
function cloneItemStack(item) {
    try { return item?.clone?.(); } catch {
        return undefined;
    }
}

/** @param {Entity} entity @param {Block} block */
function storeBlockInventory(entity, block) {
    const source = getContainer(block);
    const target = getContainer(entity);
    if (!source || !target || target.size <= CONSTRUCT_INVENTORY_SLOT_OFFSET) return false;

    const slotCount = Math.min(source.size ?? 0, target.size - CONSTRUCT_INVENTORY_SLOT_OFFSET);
    let hasItems = false;
    for (let slot = 0; slot < slotCount; slot++) {
        const item = source.getItem(slot);
        try { target.setItem(slot + CONSTRUCT_INVENTORY_SLOT_OFFSET, cloneItemStack(item)); } catch {}
        if (item) hasItems = true;
    }

    try { entity.setDynamicProperty("create:inventory_size", hasItems ? slotCount : 0); } catch {}
    if (hasItems) {
        for (let slot = 0; slot < slotCount; slot++) {
            try { source.setItem(slot, undefined); } catch {}
        }
    }
    return hasItems;
}

/** @param {Entity} entity @param {Block} block */
function restoreStoredInventory(entity, block) {
    if (isDeployerConstruct(entity)) return restoreDeployerHeldItem(entity, block);

    const storedSize = Number(entity?.getDynamicProperty?.("create:inventory_size") ?? 0);
    if (storedSize <= 0) return false;

    const source = getContainer(entity);
    const target = getContainer(block);
    if (!source || !target) return false;

    const slotCount = Math.min(storedSize, target.size ?? 0, source.size - CONSTRUCT_INVENTORY_SLOT_OFFSET);
    for (let slot = 0; slot < slotCount; slot++) {
        try { target.setItem(slot, undefined); } catch {}
        const item = source.getItem(slot + CONSTRUCT_INVENTORY_SLOT_OFFSET);
        try { target.setItem(slot, cloneItemStack(item)); } catch {}
    }
    return true;
}

/** @param {Entity} entity */
function hasStoredInventory(entity) {
    if (isDeployerConstruct(entity)) return true;
    return Number(entity?.getDynamicProperty?.("create:inventory_size") ?? 0) > 0;
}

/** @param {Entity} entity @param {Block} block */
function removeConstructAfterInventoryRestore(entity, block) {
    if (!hasStoredInventory(entity) || restoreStoredInventory(entity, block)) {
        try { entity.remove(); } catch {}
        return;
    }

    system.run(() => {
        if (!restoreStoredInventory(entity, block)) dropStoredInventory(entity);
        try { entity.remove(); } catch {}
    });
}

/** @param {Entity} entity */
function dropStoredInventory(entity) {
    const storedSize = Number(entity?.getDynamicProperty?.("create:inventory_size") ?? 0);
    if (storedSize <= 0) return;

    const source = getContainer(entity);
    if (!source) return;

    const slotCount = Math.min(storedSize, source.size - CONSTRUCT_INVENTORY_SLOT_OFFSET);
    for (let slot = 0; slot < slotCount; slot++) {
        const item = source.getItem(slot + CONSTRUCT_INVENTORY_SLOT_OFFSET);
        if (!item) continue;
        try { entity.dimension.spawnItem(item.clone(), entity.location); } catch {}
        try { source.setItem(slot + CONSTRUCT_INVENTORY_SLOT_OFFSET, undefined); } catch {}
    }
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setStoredBlock(entity, data) {
    try { entity.setDynamicProperty("create:block_id", data.blockId); } catch {}
    try { entity.setDynamicProperty("create:block_x", data.block.x); } catch {}
    try { entity.setDynamicProperty("create:block_y", data.block.y); } catch {}
    try { entity.setDynamicProperty("create:block_z", data.block.z); } catch {}
    try { entity.setDynamicProperty("create:block_states", JSON.stringify(getBlockStates(data.block) ?? {})); } catch {}
    saveMobSpawnerData(entity, data.block);
}

/** @param {Entity} entity @param {Block} block */
function saveMobSpawnerData(entity, block) {
    if (!entity?.isValid || block?.typeId !== "minecraft:mob_spawner") return;
    const safeId = String(entity.id ?? `${block.x}_${block.y}_${block.z}`).replace(/[^a-zA-Z0-9_]/g, "_");
    const structureId = `create:cart_spawner_${safeId}`;
    try { world.structureManager.delete(structureId); } catch {}
    try {
        world.structureManager.createFromWorld(
            structureId,
            block.dimension,
            block.location,
            block.location,
            { includeBlocks: true, includeEntities: false, saveMode: StructureSaveMode.World }
        );
        entity.setDynamicProperty("create:spawner_structure", structureId);
    } catch {}
}

/** @param {Block | undefined} target @param {Entity} entity */
function restoreStoredSpawner(target, entity) {
    if (!target?.isValid || !target.isAir || !entity?.isValid) return false;
    const structureId = entity.getDynamicProperty("create:spawner_structure");
    if (typeof structureId !== "string" || structureId.length === 0) return false;
    try {
        world.structureManager.place(structureId, target.dimension, target.location, {
            includeBlocks: true,
            includeEntities: false
        });
        if (target.typeId !== "minecraft:mob_spawner") return false;
        try { world.structureManager.delete(structureId); } catch {}
        return true;
    } catch {
        return false;
    }
}

/** @param {Block | undefined} target @param {Entity} entity @param {string} blockId @param {BlockStates | undefined} states */
function restoreStoredConstructBlock(target, entity, blockId, states) {
    if (!blockId || !target?.isValid) return false;
    if (blockId === "minecraft:mob_spawner" && restoreStoredSpawner(target, entity)) return true;
    return restoreBlockPermutation(target, blockId, states);
}

/** @param {Entity} entity @param {BearingBlockData} data @param {Set<string>} structureKeys */
function setStoredGlueFaces(entity, data, structureKeys) {
    const faces = [];
    for (const offset of NEIGHBOR_OFFSETS) {
        const face = getNeighborFace(offset);
        if (!face) continue;
        const next = { x: data.block.x + offset.x, y: data.block.y + offset.y, z: data.block.z + offset.z };
        if (!structureKeys.has(posKey(next))) continue;
        if (isGlueConnected(data.block.dimension, data.block.location, next)) faces.push(face);
    }
    try { entity.setDynamicProperty("create:glue_faces", JSON.stringify(faces)); } catch {}
}

/** @param {string} direction @param {number} quarterTurns */
function rotateHorizontalDirection(direction, quarterTurns) {
    const directions = ["north", "east", "south", "west"];
    const index = directions.indexOf(direction);
    if (index < 0) return direction;
    return directions[(index + quarterTurns + 4) % 4];
}

/** @param {BlockStates | undefined} states @param {number} quarterTurns @returns {BlockStates | undefined} */
function rotateStoredBlockStates(states, quarterTurns) {
    if (!states || quarterTurns % 4 === 0) return states;
    const rotated = { ...states };
    for (const [state, value] of Object.entries(rotated)) {
        if (typeof value === "string" && ["north", "east", "south", "west"].includes(value)) {
            rotated[state] = rotateHorizontalDirection(value, quarterTurns);
            continue;
        }
        if ((state === "minecraft:facing_direction" || state.endsWith(":facing_direction")) && typeof value === "number") {
            const numericDirection = { 2: "north", 3: "south", 4: "west", 5: "east" }[value];
            if (numericDirection) {
                const rotatedDirection = rotateHorizontalDirection(numericDirection, quarterTurns);
                const numericRotatedDirection = { north: 2, south: 3, west: 4, east: 5 }[rotatedDirection];
                if (numericRotatedDirection !== undefined) rotated[state] = numericRotatedDirection;
            }
            continue;
        }
        if (state.includes("axis") && (value === "x" || value === "z") && quarterTurns % 2 !== 0) {
            rotated[state] = value === "x" ? "z" : "x";
        }
    }
    if (typeof rotated["create:sail_rotation"] === "number") {
        rotated["create:sail_rotation"] = (rotated["create:sail_rotation"] + quarterTurns + 4) % 4;
    }
    return rotated;
}

/** @param {Entity | undefined} entity @param {Block} block @param {number} [quarterTurns] */
function restoreStoredGlueFaces(entity, block, quarterTurns = 0) {
    const raw = entity?.getDynamicProperty?.("create:glue_faces");
    if (typeof raw !== "string" || raw.length === 0) return;
    try {
        const parsedFaces = JSON.parse(raw);
        if (!Array.isArray(parsedFaces)) return;
        const faces = parsedFaces.filter((face) => typeof face === "string").map((face) => rotateHorizontalDirection(/** @type {string} */ (face), quarterTurns));
        restoreGlueFacesForBlock(block, faces);
    } catch {}
}

/** @param {Block} block */
/** @param {Block} block */
function getBlockCardinalDirection(block) {
    try {
        const value = block.permutation.getAllStates()["minecraft:cardinal_direction"];
        return typeof value === "string" ? value : undefined;
    } catch { return undefined; }
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setSawVisual(entity, data) {
    const rawDirection = data.states?.["minecraft:cardinal_direction"] ?? getBlockCardinalDirection(data.block) ?? "south";
    const direction = typeof rawDirection === "string" ? rawDirection : "south";
    try { entity.setProperty("create:cardinal_rotation", direction); } catch {}
    try { entity.setDynamicProperty("create:cardinal_rotation", direction); } catch {}
    try {
        entity.teleport(entity.location, {
            checkForBlocks: false,
            rotation: { x: 0, y: getSawDirectionYaw(direction) }
        });
    } catch {}
    return true;
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setMachineVisual(entity, data) {
    if (isDeployerConstruct(entity)) {
        try { entity.setProperty("create:cardinal_rotation", "down"); } catch {}
        try { entity.setDynamicProperty("create:cardinal_rotation", "down"); } catch {}
        try { entity.setProperty("create:item_visual", "item"); } catch {}
        return true;
    }
    if (isDrillConstruct(entity)) {
        // Unlike the saw, the drill uses facing_direction and supports all six faces.
        const rawDirection = data.states?.["minecraft:facing_direction"]
            ?? getBlockStateValue(data.block, "minecraft:facing_direction")
            ?? "south";
        const direction = normalizeSailFacing(rawDirection);
        try { entity.setProperty("create:cardinal_rotation", direction); } catch {}
        try { entity.setDynamicProperty("create:cardinal_rotation", direction); } catch {}
        try {
            entity.teleport(entity.location, {
                checkForBlocks: false,
                rotation: { x: 0, y: getSawDirectionYaw(direction) }
            });
        } catch {}
        return true;
    }
    return setSawVisual(entity, data);
}

/** @param {string} blockId */
function getWindmillSailColor(blockId) {
    if (blockId === "create:windmill_sail") return "white";
    if (typeof blockId !== "string" || !blockId.startsWith("create:") || !blockId.endsWith("_windmill_sail")) return "white";
    return blockId.slice("create:".length, -"_windmill_sail".length);
}

/** @param {unknown} value @returns {string} */
function normalizeSailFacing(value) {
    if (typeof value === "string" && ["north", "south", "east", "west", "up", "down"].includes(value)) return value;
    // Numeric facing_direction values used by some Bedrock API versions.
    switch (Number(value)) {
        case 0: return "down";
        case 1: return "up";
        case 2: return "north";
        case 3: return "south";
        case 4: return "west";
        case 5: return "east";
        default: return "up";
    }
}

/** @param {Entity} entity @param {BearingBlockData} data */
function setWindmillSailVisual(entity, data) {
    if (!isWindmillSailConstruct(entity)) return false;
    try { entity.setProperty("create:sail_color", getWindmillSailColor(data.blockId)); } catch {}
    try {
        const states = data.states ?? getBlockStates(data.block) ?? {};
        const sailRotation = Math.max(0, Math.min(3, Number(states["create:sail_rotation"] ?? 0)));
        // Encode the block's four upright Y rotations as synced cardinal values.
        // This follows the exact positive-Y order used by block transformations.
        const direction = ["south", "west", "north", "east"][sailRotation] ?? "south";
        entity.setProperty("create:cardinal_rotation", direction);
        entity.setDynamicProperty("create:cardinal_rotation", direction);
        entity.setProperty("create:sail_rotation", sailRotation);
        entity.setDynamicProperty("create:sail_rotation", sailRotation);
    } catch {}
    return true;
}

/** @param {string} direction */
function getSawDirectionYaw(direction) {
    switch (direction) {
        case "north": return 0;
        case "east": return 90;
        case "west": return -90;
        case "south":
        default: return 180;
    }
}

/** @param {string} direction */
function getBlockModelYaw(direction) {
    switch (direction) {
        case "north": return 180;
        case "east": return 90;
        case "west": return -90;
        case "south":
        default: return 0;
    }
}

/** @param {Entity} entity @param {number} constructAngle */
function getSawConstructYaw(entity, constructAngle) {
    let direction = entity.getDynamicProperty("create:cardinal_rotation");
    if (isDrillConstruct(entity)) {
        const storedDirection = getStoredBlockStates(entity)?.["minecraft:facing_direction"];
        if (storedDirection !== undefined) {
            direction = normalizeSailFacing(storedDirection);
            try { entity.setProperty("create:cardinal_rotation", direction); } catch {}
            try { entity.setDynamicProperty("create:cardinal_rotation", direction); } catch {}
        }
    }
    return constructAngle + getSawDirectionYaw(typeof direction === "string" ? direction : "south");
}

/** @param {Entity | undefined} entity @returns {Vector3 | undefined} */
function getStoredBlockLocation(entity) {
    const x = entity?.getDynamicProperty?.("create:block_x");
    const y = entity?.getDynamicProperty?.("create:block_y");
    const z = entity?.getDynamicProperty?.("create:block_z");
    if (typeof x === "number" && typeof y === "number" && typeof z === "number") return { x, y, z };
    return undefined;
}

/** @param {Entity | undefined} entity @returns {BlockStates | undefined} */
/** @param {Entity | undefined} entity @returns {BlockStates | undefined} */
function getStoredBlockStates(entity) {
    const stored = entity?.getDynamicProperty?.("create:block_states");
    if (typeof stored !== "string" || stored.length === 0) return undefined;
    try {
        const states = JSON.parse(stored);
        if (!states || typeof states !== "object") return undefined;
        if (entity && isDoorConstruct(entity)) {
            const open = entity.getDynamicProperty("create:door_open") === true;
            if (Object.prototype.hasOwnProperty.call(states, "open_bit")) states.open_bit = open;
            if (Object.prototype.hasOwnProperty.call(states, "minecraft:open_bit")) states["minecraft:open_bit"] = open;
        }
        return states;
    } catch {
        return undefined;
    }
}

/** @param {Block | undefined} target @param {string} blockId @param {BlockStates | undefined} states */
function restoreBlockPermutation(target, blockId, states) {
    if (!blockId || !target?.isValid || !target.isAir) return false;

    try {
        target.setPermutation(BlockPermutation.resolve(blockId, states ?? {}));
        return true;
    } catch {}

    try {
        target.setType(blockId);
        return true;
    } catch {
        return false;
    }
}

/** @param {Vector3} pos */
function posKey(pos) {
    return `${pos.x},${pos.y},${pos.z}`;
}

/** @param {Vector3} bearing */
function bearingAngleKey(bearing) {
    return `create:mechanical_bearing_angle:${bearing.x},${bearing.y},${bearing.z}`;
}

/** @param {Vector3} bearing */
function getBearingAngle(bearing) {
    return Number(world.getDynamicProperty(bearingAngleKey(bearing)) ?? 0);
}

/** @param {Vector3} bearing @param {number} angle */
function setBearingAngle(bearing, angle) {
    try { world.setDynamicProperty(bearingAngleKey(bearing), angle); } catch {}
}

/** @param {Vector3} bearing */
function getNearestBearingQuarterTurn(bearing) {
    const angle = Number(getBearingAngle(bearing) || 0);
    return ((Math.round(angle / 90) % 4) + 4) % 4;
}

/** @param {RelativeVector} rel @param {number} quarterTurns @returns {RelativeVector} */
function rotateMechanicalBearingRel(rel, quarterTurns) {
    switch ((quarterTurns % 4 + 4) % 4) {
        case 1: return { x: -rel.z, y: rel.y, z: rel.x };
        case 2: return { x: -rel.x, y: rel.y, z: -rel.z };
        case 3: return { x: rel.z, y: rel.y, z: -rel.x };
        default: return { x: rel.x, y: rel.y, z: rel.z };
    }
}

/** @param {BearingLocation} bearing @param {Entity | undefined} entity @param {number} quarterTurns */
/** @param {Block | BearingLocation} bearing @param {Entity | undefined} entity @param {number} quarterTurns */
function getSnappedRestoreBlock(bearing, entity, quarterTurns) {
    // During a block-break component event the bearing position already contains
    // air. Use the bearing id stored on the construct so restoration still uses
    // the rotated, snapped coordinates.
    const storedBearingId = entity?.getDynamicProperty?.("create:bearing_block_id");
    if (bearing.typeId !== MECHANICAL_BEARING_BLOCK && storedBearingId !== MECHANICAL_BEARING_BLOCK) return undefined;
    if (!entity) return undefined;
    const rel = rotateMechanicalBearingRel(getStoredRel(entity), quarterTurns);
    try {
        return entity.dimension.getBlock({
            x: bearing.x + rel.x,
            y: bearing.y + 1 + rel.y,
            z: bearing.z + rel.z
        });
    } catch {
        return undefined;
    }
}

/** @param {Vector3} bearing */
function bearingLastTickKey(bearing) {
    return `create:mechanical_bearing_last_tick:${bearing.x},${bearing.y},${bearing.z}`;
}

/** @param {Vector3} bearing */
function bearingLastRpmKey(bearing) {
    return `create:mechanical_bearing_last_rpm:${bearing.x},${bearing.y},${bearing.z}`;
}

/** @param {Vector3} bearing @param {number} [angle] */
function resetBearingRotationState(bearing, angle = 0) {
    setBearingAngle(bearing, angle);
    try { world.setDynamicProperty(bearingLastTickKey(bearing), system.currentTick); } catch {}
    try { world.setDynamicProperty(bearingLastRpmKey(bearing), 0); } catch {}
}

/** @param {Block | BearingLocation} bearing @param {number} rpm */
function getBearingVisualAngle(bearing, rpm) {
    const tick = system.currentTick;
    const lastTick = Number(world.getDynamicProperty(bearingLastTickKey(bearing)) ?? tick);
    const lastRpm = getVisualRpmForBearing(
        bearing,
        Number(world.getDynamicProperty(bearingLastRpmKey(bearing)) ?? rpm ?? 0)
    );
    const lastAngle = Number(world.getDynamicProperty(bearingAngleKey(bearing)) ?? 0);
    const deltaTicks = Math.max(0, tick - lastTick);
    const angle = (lastAngle + deltaTicks * BEARING_ROTATION_SPEED * lastRpm) % 360;

    setBearingAngle(bearing, angle);
    try { world.setDynamicProperty(bearingLastTickKey(bearing), tick); } catch {}
    try { world.setDynamicProperty(bearingLastRpmKey(bearing), Number(rpm || 0)); } catch {}
    return angle;
}

/** @param {Vector3} bearing @param {number} rpm @param {number} angle */
function holdBearingVisualAngle(bearing, rpm, angle) {
    setBearingAngle(bearing, angle);
    try { world.setDynamicProperty(bearingLastTickKey(bearing), system.currentTick); } catch {}
    try { world.setDynamicProperty(bearingLastRpmKey(bearing), Number(rpm || 0)); } catch {}
}

// Finaliza um passo do sequenced gearshift exatamente no quarto de volta.
// O RPM define apenas quanto tempo o movimento leva, nunca o angulo final.
/** @param {Block | undefined} bearing */
export function snapMechanicalBearingToQuarterTurn(bearing) {
    if (!bearing?.isValid || bearing.typeId !== MECHANICAL_BEARING_BLOCK) return false;
    const currentAngle = Number(getBearingAngle(bearing) || 0);
    const lastRpm = Number(world.getDynamicProperty(bearingLastRpmKey(bearing)) ?? 0);
    const direction = Math.sign(currentAngle)
        || Math.sign(BEARING_ROTATION_SPEED * lastRpm)
        || 1;
    const targetAngle = direction * 90;
    setBearingAngle(bearing, targetAngle);
    try { world.setDynamicProperty(bearingLastTickKey(bearing), system.currentTick); } catch {}
    setBearingEntityAngle(bearing.dimension, bearing, targetAngle);
    for (const construct of getConstructs(bearing)) {
        try { updateConstructEntity(construct, lastRpm, targetAngle); } catch {}
    }
    return true;
}

/** @param {Dimension} dimension @param {Vector3} pos @returns {Block | undefined} */
/** @param {Dimension} dimension @param {Vector3} pos @returns {Block | undefined} */
function getBlockAt(dimension, pos) {
    try { return dimension.getBlock(pos); } catch { return undefined; }
}

/** @param {Block} bearing @returns {BearingBlockData[]} */
/** @param {Block} bearing @returns {BearingBlockData[]} */
function discoverContraptionBlocks(bearing) {
    const start = getAttachedBlock(bearing);
    if (!start || !isMovableBlock(start)) return [];

    const dimension = bearing.dimension;
    const queue = /** @type {Vector3[]} */ ([start.location]);
    const visited = new Set();
    const blocks = [];

    while (queue.length > 0 && blocks.length < MAX_CONTRAPTION_BLOCKS) {
        const pos = queue.shift();
        if (!pos) continue;
        const key = posKey(pos);
        if (visited.has(key)) continue;
        visited.add(key);

        const block = getBlockAt(dimension, pos);
        if (!block || !isMovableBlock(block)) continue;
        // Windmill sails belong exclusively to windmill bearings. Even when a
        // sail has Super Glue on one of its faces, a mechanical bearing must
        // not absorb it into its rotating contraption.
        if (!isWindmillBearingBlock(bearing) && isWindmillSailBlockId(block.typeId)) continue;

        blocks.push({
            block,
            blockId: block.typeId,
            relX: block.x - bearing.x,
            relY: block.y - (isWindmillBearingBlock(bearing) ? bearing.y : bearing.y + 1),
            relZ: block.z - bearing.z
        });

        // A bearing may only capture a continuous contraption. Do not enqueue
        // an entire glue selection region here because it can contain separate
        // islands; expand strictly through glued neighbouring faces instead.
        for (const offset of NEIGHBOR_OFFSETS) {
            const next = { x: block.x + offset.x, y: block.y + offset.y, z: block.z + offset.z };
            const nextBlock = getBlockAt(dimension, next);
            const automaticSailConnection = isWindmillBearingBlock(bearing)
                && windmillSailsConnectAutomatically(block, nextBlock);
            const automaticChassisConnection = radialChassisConnectAutomatically(block, nextBlock, offset);
            if (!visited.has(posKey(next))
                && !stickerCutsConnection(block, nextBlock, offset)
                && (automaticSailConnection || automaticChassisConnection
                    || isGlueConnected(dimension, block.location, next))) queue.push(next);
        }
    }

    return blocks;
}

/** @param {Block} block @returns {Entity | undefined} */
export function assembleMechanicalBearing(block) {
    const blocks = discoverContraptionBlocks(block);
    if (blocks.length === 0) return undefined;

    const entities = [];
    const structureKeys = new Set(blocks.map(data => posKey(data.block.location)));
    for (const data of blocks) {
        let entity;
        const entityType = data.blockId === "create:mechanical_saw"
            ? SAW_CONTRAPTION_ENTITY
            : data.blockId === "create:mechanical_drill"
                ? DRILL_CONTRAPTION_ENTITY
                : data.blockId === "create:mechanical_harvester"
                ? HARVESTER_CONTRAPTION_ENTITY
                : data.blockId === "create:deployer"
                    ? DEPLOYER_CONTRAPTION_ENTITY
                    : data.blockId === "create:portable_storage_interface"
                        ? STORAGE_INTERFACE_CONTRAPTION_ENTITY
                        : isSeatBlockId(data.blockId)
                            ? SEAT_CONTRAPTION_ENTITY
                            : isWindmillSailBlockId(data.blockId)
                                ? WINDMILL_SAIL_CONTRAPTION_ENTITY
                                : isDoorBlockId(data.blockId)
                                    ? DOOR_CONTRAPTION_ENTITY
                                    : isLadderBlockId(data.blockId)
                                        ? LADDER_CONTRAPTION_ENTITY
                                    : data.blockId === "create:radial_chassis"
                                        ? RADIAL_CHASSIS_CONTRAPTION_ENTITY
                                    : data.blockId === "create:sticker"
                                        ? STICKER_CONTRAPTION_ENTITY
                                    : isSlabBlockId(data.blockId)
                                        ? SLAB_CONTRAPTION_ENTITY
                                    : isCarpetBlockId(data.blockId)
                                        ? CARPET_CONTRAPTION_ENTITY
                                    : isStairBlockId(data.blockId)
                                        ? STAIR_CONTRAPTION_ENTITY
                                : CONTRAPTION_ENTITY;
        try { entity = block.dimension.spawnEntity(entityType, data.block.center()); } catch { continue; }

        try { entity.addTag(BEARING_CONSTRUCT_TAG); } catch {}
        setStoredBlock(entity, data);
        try { entity.setDynamicProperty("create:bearing_x", block.x); } catch {}
        try { entity.setDynamicProperty("create:bearing_y", block.y); } catch {}
        try { entity.setDynamicProperty("create:bearing_z", block.z); } catch {}
        try { entity.setDynamicProperty("create:bearing_block_id", block.typeId); } catch {}
        try { entity.setDynamicProperty("create:bearing_face", getBearingFacing(block)); } catch {}
        try { entity.setDynamicProperty("create:rel_x", data.relX); } catch {}
        try { entity.setDynamicProperty("create:rel_y", data.relY); } catch {}
        try { entity.setDynamicProperty("create:rel_z", data.relZ); } catch {}
        setStoredGlueFaces(entity, data, structureKeys);

        const visualSet = isStairConstruct(entity)
            ? setStairVisual(entity, data)
            : isStickerConstruct(entity)
            ? setStickerVisual(entity, data)
            : isRadialChassisConstruct(entity)
            ? setRadialChassisVisual(entity, data)
            : isLadderConstruct(entity)
            ? setLadderVisual(entity, data)
            : isDoorConstruct(entity)
            ? setDoorVisual(entity, data)
            : isSeatConstruct(entity)
            ? setSeatVisual(entity, data)
            : isWindmillSailConstruct(entity)
                ? setWindmillSailVisual(entity, data)
                : isMachineConstruct(entity)
                    ? setMachineVisual(entity, data)
                    : setGenericConstructVisual(entity, data);

        if (!visualSet) {
            try { entity.remove(); } catch {}
            continue;
        }
        storeBlockInventory(entity, data.block);
        syncDeployerConstructHeldItem(entity, data.block);
        entities.push({ entity, source: data.block });
    }

    if (entities.length === 0) return undefined;

    // A entidade nasce no centro do bloco, com os valores de rotação padrão.
    // Sincronize a estrutura inteira antes de remover os blocos de origem para
    // ela já aparecer fixa na posição/direção atual do Bearing, sem um frame
    // atrasado tentando se alinhar no tick seguinte.
    const initialAngle = getBearingAngle(block);
    const initialRpm = getBearingRpm(block);
    setBearingEntityAngle(block.dimension, block, initialAngle);
    for (const { entity } of entities) {
        updateConstructEntity(entity, initialRpm, initialAngle);
    }

    // Capture every glue face before clearing any connection. Clearing inside
    // the spawn loop made later blocks lose their saved neighbours.
    for (const { source } of entities) consumeGlueForBlock(source);
    for (const { source } of entities) {
        try { source.setType("minecraft:air"); } catch {}
    }

    return entities[0].entity;
}

/** @param {Entity | undefined} entity */
/** @param {Entity | undefined} entity @returns {entity is Entity} */
function isMinecartEntity(entity) {
    const typeId = entity?.typeId;
    return !!entity?.isValid && typeof typeId === "string"
        && (typeId === "minecraft:minecart" || typeId.endsWith("_minecart"));
}

/** @param {Block} block @returns {Entity | undefined} */
export function findMinecartOnCartAssembler(block) {
    if (!block?.isValid || block.typeId !== "create:cart_assembler") return undefined;
    const center = { x: block.x + 0.5, y: block.y + 0.55, z: block.z + 0.5 };
    try {
        return block.dimension.getEntities({ location: center, maxDistance: 1.15 })
            .filter(isMinecartEntity)
            .sort((a, b) => distanceSquared(a.location, center) - distanceSquared(b.location, center))[0];
    } catch {
        return undefined;
    }
}

/** @param {Block} assembler @returns {BearingBlockData[]} */
function discoverCartContraptionBlocks(assembler) {
    const start = getTopBlock(assembler);
    if (!start || !isMovableBlock(start)) return [];

    const dimension = assembler.dimension;
    const queue = /** @type {Vector3[]} */ ([start.location]);
    const visited = new Set();
    const queuedGlueRegionBlocks = new Set();
    const blocks = [];

    while (queue.length > 0 && blocks.length < MAX_CONTRAPTION_BLOCKS) {
        const pos = queue.shift();
        if (!pos) continue;
        const key = posKey(pos);
        if (visited.has(key)) continue;
        visited.add(key);

        const block = getBlockAt(dimension, pos);
        if (!block || !isMovableBlock(block)) continue;
        blocks.push({
            block,
            blockId: block.typeId,
            relX: block.x - assembler.x,
            relY: block.y - (assembler.y + 1),
            relZ: block.z - assembler.z
        });

        for (const regionPos of getGlueRegionPositions(dimension, block.location)) {
            const regionKey = posKey(regionPos);
            if (queuedGlueRegionBlocks.has(regionKey)) continue;
            queuedGlueRegionBlocks.add(regionKey);
            if (!visited.has(regionKey)) queue.push(regionPos);
        }

        for (const offset of NEIGHBOR_OFFSETS) {
            const next = { x: block.x + offset.x, y: block.y + offset.y, z: block.z + offset.z };
            const nextBlock = getBlockAt(dimension, next);
            if (!visited.has(posKey(next))
                && (radialChassisConnectAutomatically(block, nextBlock, offset)
                    || isGlueConnected(dimension, block.location, next))) queue.push(next);
        }
    }
    return blocks;
}

/** @param {string} blockId */
function getConstructEntityType(blockId) {
    return blockId === "create:radial_chassis"
        ? RADIAL_CHASSIS_CONTRAPTION_ENTITY
        : blockId === "create:sticker"
        ? STICKER_CONTRAPTION_ENTITY
        : isStairBlockId(blockId)
        ? STAIR_CONTRAPTION_ENTITY
        : isSlabBlockId(blockId)
        ? SLAB_CONTRAPTION_ENTITY
        : isCarpetBlockId(blockId)
        ? CARPET_CONTRAPTION_ENTITY
        : isLadderBlockId(blockId)
        ? LADDER_CONTRAPTION_ENTITY
        : isDoorBlockId(blockId)
        ? DOOR_CONTRAPTION_ENTITY
        : blockId === "create:mechanical_saw"
        ? SAW_CONTRAPTION_ENTITY
        : blockId === "create:mechanical_drill"
            ? DRILL_CONTRAPTION_ENTITY
            : blockId === "create:mechanical_harvester"
            ? HARVESTER_CONTRAPTION_ENTITY
            : blockId === "create:deployer"
                ? DEPLOYER_CONTRAPTION_ENTITY
                : blockId === "create:portable_storage_interface"
                    ? STORAGE_INTERFACE_CONTRAPTION_ENTITY
                    : isSeatBlockId(blockId)
                        ? SEAT_CONTRAPTION_ENTITY
                        : isWindmillSailBlockId(blockId)
                            ? WINDMILL_SAIL_CONTRAPTION_ENTITY
                            : CONTRAPTION_ENTITY;
}

/** @param {Entity} entity */
function getEntityYaw(entity) {
    try { return Number(entity.getRotation()?.y ?? 0); } catch { return 0; }
}

/** @param {Entity} minecart @param {number} [fallbackYaw] @returns {{x: number, z: number}} */
function rememberMinecartTravelDirection(minecart, fallbackYaw = getEntityYaw(minecart)) {
    let direction;
    try {
        const velocity = minecart.getVelocity();
        const speed = Math.hypot(velocity.x ?? 0, velocity.z ?? 0);
        if (speed > CART_SPEED_EPSILON) direction = { x: velocity.x / speed, z: velocity.z / speed };
    } catch {}
    if (!direction) {
        const radians = fallbackYaw * Math.PI / 180;
        direction = { x: -Math.sin(radians), z: Math.cos(radians) };
    }
    try { minecart.setDynamicProperty("create:cart_travel_x", direction.x); } catch {}
    try { minecart.setDynamicProperty("create:cart_travel_z", direction.z); } catch {}
    return direction;
}

/** @param {Block} assembler */
function getCartAssemblerYaw(assembler) {
    let direction = "south";
    try { direction = String(getBlockStateValue(assembler, "minecraft:cardinal_direction") ?? "south"); } catch {}
    // Match the rotations used by cart_assembler.b.json so the contraption's
    // front follows the arrow drawn on the top of the block.
    return { north: 0, west: 90, south: 180, east: -90 }[direction] ?? 180;
}

/** @param {number} x @param {number} z @param {number} angle */
function rotateCartVector(x, z, angle) {
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
        x: x * cos - z * sin,
        z: x * sin + z * cos
    };
}

/** @param {Entity} entity @param {Vector3} cartLocation @param {RelativeVector} localRel @param {number} yaw */
function placeNewCartConstruct(entity, cartLocation, localRel, yaw) {
    if (!entity?.isValid) return;
    const radians = yaw * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const location = {
        x: cartLocation.x + localRel.x * cos - localRel.z * sin,
        y: cartLocation.y + localRel.y + getCartConstructAttachYOffset(entity),
        z: cartLocation.z + localRel.x * sin + localRel.z * cos
    };
    try { entity.setProperty("create:rotation_x", 0); } catch {}
    try { entity.setProperty("create:rotation_y", 0); } catch {}
    try { entity.setProperty("create:rotation_z", 0); } catch {}
    try { entity.setProperty("create:rpm", 0); } catch {}
    if (usesMachineTransform(entity)) snapEntityRotation(entity, location, getCartConstructYaw(entity));
    else {
        try { entity.teleport(location, { checkForBlocks: false }); } catch {}
    }
    try { entity.clearVelocity(); } catch {}
}

/** @param {Entity} entity @param {BearingBlockData} data */
function getCartSpawnYaw(entity, data) {
    const states = data?.states ?? getBlockStates(data?.block) ?? {};
    if (entity?.typeId === CONTRAPTION_ENTITY
        || entity?.typeId === SLAB_CONTRAPTION_ENTITY
        || entity?.typeId === CARPET_CONTRAPTION_ENTITY) {
        return getGenericBlockDirection(states) * 90;
    }
    if (isStairConstruct(entity)) return getStairDirectionIndex(states) * 90;
    if (isDrillConstruct(entity)) {
        return getSawDirectionYaw(normalizeSailFacing(states["minecraft:facing_direction"] ?? "south"));
    }
    if (isSawConstruct(entity) || isHarvesterConstruct(entity)) {
        const rawDirection = states["minecraft:cardinal_direction"];
        return getSawDirectionYaw(typeof rawDirection === "string" ? rawDirection : "south");
    }
    return getCartConstructYaw(entity);
}

// The first transform must happen before the entity's client model/equipment
// is configured. Teleports done only by the following cart sync are visibly
// interpolated by Bedrock, which is why a new structure briefly faced south.
/** @param {Entity} entity @param {BearingBlockData} data */
function primeCartConstructSpawn(entity, data) {
    if (!entity?.isValid) return;
    snapEntityRotation(entity, entity.location, getCartSpawnYaw(entity, data));
    try { entity.clearVelocity(); } catch {}
}

/** @param {Block} assembler @param {Entity | undefined} [minecart] */
export function assembleCartAssemblerContraption(assembler, minecart = findMinecartOnCartAssembler(assembler)) {
    if (!assembler?.isValid || assembler.typeId !== "create:cart_assembler" || !isMinecartEntity(minecart)) return false;
    /** @type {Entity} */
    const cart = minecart;
    try { if (minecart.hasTag(CART_CARRIER_TAG)) return false; } catch {}

    const blocks = discoverCartContraptionBlocks(assembler);
    if (blocks.length === 0) return false;

    const cartLocation = minecart.location;
    const initialYaw = getCartAssemblerYaw(assembler);
    try {
        minecart.teleport(cartLocation, {
            checkForBlocks: false,
            rotation: { x: 0, y: initialYaw }
        });
    } catch {}
    const structureKeys = new Set(blocks.map(data => posKey(data.block.location)));
    const entities = [];

    for (const data of blocks) {
        const worldRelX = data.block.x + 0.5 - cartLocation.x;
        const worldRelZ = data.block.z + 0.5 - cartLocation.z;
        const localRel = rotateCartVector(worldRelX, worldRelZ, -initialYaw);
        // Spawn already at the cart's final coordinates.  Spawning at the
        // source block and moving it afterwards exposed one default-orientation
        // frame to clients before the first cart sync.
        const spawnRadians = initialYaw * Math.PI / 180;
        const spawnCos = Math.cos(spawnRadians);
        const spawnSin = Math.sin(spawnRadians);
        const spawnLocation = {
            x: cartLocation.x + localRel.x * spawnCos - localRel.z * spawnSin,
            y: cartLocation.y + (data.block.y + 0.5 - cartLocation.y),
            z: cartLocation.z + localRel.x * spawnSin + localRel.z * spawnCos
        };
        let entity;
        try { entity = assembler.dimension.spawnEntity(getConstructEntityType(data.blockId), spawnLocation); } catch { continue; }

        try { entity.addTag(CART_CONSTRUCT_TAG); } catch {}
        setStoredBlock(entity, data);
        setStoredGlueFaces(entity, data, structureKeys);
        try { entity.setDynamicProperty("create:cart_id", minecart.id); } catch {}
        try { entity.setDynamicProperty("create:cart_initial_yaw", initialYaw); } catch {}
        try { entity.setDynamicProperty("create:cart_rel_x", localRel.x); } catch {}
        try { entity.setDynamicProperty("create:cart_rel_y", data.block.y + 0.5 - cartLocation.y); } catch {}
        try { entity.setDynamicProperty("create:cart_rel_z", localRel.z); } catch {}
        try { entity.setDynamicProperty("create:cart_local_coordinates", true); } catch {}
        try { entity.setDynamicProperty("create:rel_x", data.relX); } catch {}
        try { entity.setDynamicProperty("create:rel_y", data.relY); } catch {}
        try { entity.setDynamicProperty("create:rel_z", data.relZ); } catch {}

        // Do this before any model, held block or equipment is assigned.
        primeCartConstructSpawn(entity, data);

        const visualSet = isStairConstruct(entity)
            ? setStairVisual(entity, data)
            : isStickerConstruct(entity)
            ? setStickerVisual(entity, data)
            : isRadialChassisConstruct(entity)
            ? setRadialChassisVisual(entity, data)
            : isLadderConstruct(entity)
            ? setLadderVisual(entity, data)
            : isDoorConstruct(entity)
            ? setDoorVisual(entity, data)
            : isSeatConstruct(entity)
            ? setSeatVisual(entity, data)
            : isWindmillSailConstruct(entity)
                ? setWindmillSailVisual(entity, data)
                : isMachineConstruct(entity)
                    ? setMachineVisual(entity, data)
                    : setGenericConstructVisual(entity, data);
        if (!visualSet) {
            try { entity.remove(); } catch {}
            continue;
        }

        // Não espere o sincronizador global: a entity já nasce na posição e
        // direção final do carrinho, evitando que a contraption apareça torta
        // por alguns ticks antes de se alinhar.
        placeNewCartConstruct(entity, cartLocation, {
            x: localRel.x,
            y: data.block.y + 0.5 - cartLocation.y,
            z: localRel.z
        }, initialYaw);
        storeBlockInventory(entity, data.block);
        syncDeployerConstructHeldItem(entity, data.block);
        entities.push({ entity, source: data.block });
    }

    if (entities.length === 0) return false;
    try { minecart.addTag(CART_CARRIER_TAG); } catch {}
    rememberMinecartTravelDirection(minecart, initialYaw);
    for (const { source } of entities) consumeGlueForBlock(source);
    for (const { source } of entities) {
        try { source.setType("minecraft:air"); } catch {}
    }
    try { minecart.setDynamicProperty("create:cart_spawn_lock_x", cartLocation.x); } catch {}
    try { minecart.setDynamicProperty("create:cart_spawn_lock_y", cartLocation.y); } catch {}
    try { minecart.setDynamicProperty("create:cart_spawn_lock_z", cartLocation.z); } catch {}
    try { minecart.setDynamicProperty("create:cart_spawn_lock_until", system.currentTick + 6); } catch {}
    try { minecart.setDynamicProperty("create:cart_motion_enabled", false); } catch {}
    try { minecart.teleport(cartLocation, { checkForBlocks: false }); } catch {}
    try { minecart.clearVelocity(); } catch {}
    // Posiciona e orienta a estrutura no mesmo tick da montagem. Sem isso as
    // entidades aparecem por um instante na rotacao padrao antes do sync global.
    const spawnedConstructs = entities.map(entry => entry.entity).filter(entity => entity?.isValid);
    const initialFrame = getCartConstructFrame(minecart, spawnedConstructs);
    for (const construct of spawnedConstructs) {
        updateCartConstructEntity(construct, minecart, 0, initialFrame, true);
    }
    return true;
}

/** @param {Entity} entity */
function getConstructBlockId(entity) {
    const stored = entity?.getDynamicProperty?.("create:block_id");
    if (typeof stored === "string" && stored.length > 0) return stored;

    const item = entity?.getComponent("minecraft:inventory")?.container?.getItem(0);
    return item?.typeId;
}

/** @param {McItemStack | undefined} item @returns {PackedItemData | undefined} */
function serializeContraptionItem(item) {
    if (!item) return undefined;
    /** @type {PackedItemData} */
    const data = { typeId: item.typeId, amount: Number(item.amount ?? 1) };
    try { if (item.nameTag) data.nameTag = item.nameTag; } catch {}
    try {
        const lore = item.getLore();
        if (lore?.length) data.lore = lore;
    } catch {}
    try {
        const durability = item.getComponent("minecraft:durability");
        if (durability) data.damage = Number(durability.damage ?? 0);
    } catch {}
    try {
        const enchantable = item.getComponent("minecraft:enchantable");
        const enchantments = enchantable?.getEnchantments?.();
        if (enchantments?.length) data.enchantments = enchantments.map(value => ({ typeId: value.type.id, level: value.level }));
    } catch {}
    try {
        const properties = /** @type {Record<string, PackedPropertyValue>} */ ({});
        for (const id of item.getDynamicPropertyIds?.() ?? []) {
            const value = item.getDynamicProperty(id);
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                || (value !== undefined && typeof value === "object" && "x" in value && "y" in value && "z" in value)) {
                properties[id] = value;
            }
        }
        if (Object.keys(properties).length > 0) data.properties = properties;
    } catch {}
    return data;
}

/** @param {Entity} entity */
function serializeConstructInventory(entity) {
    const container = getContainer(entity);
    if (!container) return [];
    const items = [];
    const startSlot = isDeployerConstruct(entity) ? 0 : CONSTRUCT_INVENTORY_SLOT_OFFSET;
    for (let slot = startSlot; slot < container.size; slot++) {
        const item = serializeContraptionItem(container.getItem(slot));
        if (item) items.push({ slot: slot - startSlot, item });
    }
    return items;
}

/** @param {Entity} minecart */
function serializeMinecartInventory(minecart) {
    const container = getContainer(minecart);
    if (!container) return [];
    const items = [];
    for (let slot = 0; slot < container.size; slot++) {
        const item = serializeContraptionItem(container.getItem(slot));
        if (item) items.push({ slot, item });
    }
    return items;
}

/** @param {string} id @param {unknown} data */
function writePackedCartData(id, data) {
    const json = JSON.stringify(data);
    const chunkCount = Math.max(1, Math.ceil(json.length / PACKED_CART_DATA_CHUNK_SIZE));
    try {
        world.setDynamicProperty(`${PACKED_CART_DATA_PREFIX}${id}:chunks`, chunkCount);
        for (let index = 0; index < chunkCount; index++) {
            world.setDynamicProperty(
                `${PACKED_CART_DATA_PREFIX}${id}:${index}`,
                json.slice(index * PACKED_CART_DATA_CHUNK_SIZE, (index + 1) * PACKED_CART_DATA_CHUNK_SIZE)
            );
        }
        return true;
    } catch {
        for (let index = 0; index < chunkCount; index++) {
            try { world.setDynamicProperty(`${PACKED_CART_DATA_PREFIX}${id}:${index}`, undefined); } catch {}
        }
        try { world.setDynamicProperty(`${PACKED_CART_DATA_PREFIX}${id}:chunks`, undefined); } catch {}
        return false;
    }
}

/** @param {string} id */
function readPackedCartData(id) {
    if (typeof id !== "string" || id.length === 0) return undefined;
    try {
        const chunkCount = Number(world.getDynamicProperty(`${PACKED_CART_DATA_PREFIX}${id}:chunks`) ?? 0);
        if (chunkCount <= 0 || chunkCount > 256) return undefined;
        let json = "";
        for (let index = 0; index < chunkCount; index++) {
            const chunk = world.getDynamicProperty(`${PACKED_CART_DATA_PREFIX}${id}:${index}`);
            if (typeof chunk !== "string") return undefined;
            json += chunk;
        }
        return JSON.parse(json);
    } catch {
        return undefined;
    }
}

/** @param {string} id */
function deletePackedCartData(id) {
    try {
        const chunkCount = Number(world.getDynamicProperty(`${PACKED_CART_DATA_PREFIX}${id}:chunks`) ?? 0);
        for (let index = 0; index < chunkCount; index++) {
            world.setDynamicProperty(`${PACKED_CART_DATA_PREFIX}${id}:${index}`, undefined);
        }
        world.setDynamicProperty(`${PACKED_CART_DATA_PREFIX}${id}:chunks`, undefined);
    } catch {}
}

/** @param {McItemStack} item @param {unknown} data */
function writePackedCartItemData(item, data) {
    if (!item || !data) return false;
    const json = JSON.stringify(data);
    const chunkCount = Math.max(1, Math.ceil(json.length / PACKED_CART_ITEM_DATA_CHUNK_SIZE));
    if (chunkCount > 256) return false;
    try {
        item.setDynamicProperty("create:contraption_data_chunks", chunkCount);
        for (let index = 0; index < chunkCount; index++) {
            item.setDynamicProperty(
                `${PACKED_CART_ITEM_DATA_PREFIX}${index}`,
                json.slice(index * PACKED_CART_ITEM_DATA_CHUNK_SIZE, (index + 1) * PACKED_CART_ITEM_DATA_CHUNK_SIZE)
            );
        }
        return true;
    } catch {
        try { item.setDynamicProperty("create:contraption_data_chunks", undefined); } catch {}
        for (let index = 0; index < chunkCount; index++) {
            try { item.setDynamicProperty(`${PACKED_CART_ITEM_DATA_PREFIX}${index}`, undefined); } catch {}
        }
        return false;
    }
}

/** @param {McItemStack} item */
function readPackedCartItemData(item) {
    if (item?.typeId !== PACKED_CART_ITEM) return undefined;
    try {
        const chunkCount = Number(item.getDynamicProperty("create:contraption_data_chunks") ?? 0);
        if (chunkCount <= 0 || chunkCount > 256) return undefined;
        let json = "";
        for (let index = 0; index < chunkCount; index++) {
            const chunk = item.getDynamicProperty(`${PACKED_CART_ITEM_DATA_PREFIX}${index}`);
            if (typeof chunk !== "string") return undefined;
            json += chunk;
        }
        return JSON.parse(json);
    } catch {
        return undefined;
    }
}

/** @param {PackedItemData | undefined} data @returns {McItemStack | undefined} */
/** @param {PackedItemData | undefined} data @returns {McItemStack | undefined} */
function deserializeContraptionItem(data) {
    if (!data?.typeId) return undefined;
    try {
        const item = new ItemStack(data.typeId, Math.max(1, Number(data.amount ?? 1)));
        if (typeof data.nameTag === "string") item.nameTag = data.nameTag;
        if (Array.isArray(data.lore)) item.setLore(data.lore);
        try {
            const durability = item.getComponent("minecraft:durability");
            if (durability && Number.isFinite(data.damage)) durability.damage = Number(data.damage);
        } catch {}
        try {
            const enchantable = item.getComponent("minecraft:enchantable");
            for (const value of data.enchantments ?? []) {
                const type = typeof value.typeId === "string" ? EnchantmentTypes.get(value.typeId) : undefined;
                if (type) enchantable?.addEnchantment({ type, level: Number(value.level ?? 1) });
            }
        } catch {}
        try {
            for (const [id, value] of Object.entries(data.properties ?? {})) {
                if (typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                    || (typeof value === "object" && value !== null && "x" in value && "y" in value && "z" in value)) {
                    item.setDynamicProperty(id, value);
                }
            }
        } catch {}
        return item;
    } catch {
        return undefined;
    }
}

/** @param {Entity} entity @param {{inventory?: {slot: number, item: PackedItemData}[]}} blockData */
function restorePackedConstructInventory(entity, blockData) {
    const container = getContainer(entity);
    if (!container || !Array.isArray(blockData?.inventory)) return;
    const startSlot = isDeployerConstruct(entity) ? 0 : CONSTRUCT_INVENTORY_SLOT_OFFSET;
    let inventorySize = 0;
    for (const entry of blockData.inventory) {
        const slot = startSlot + Math.max(0, Number(entry?.slot ?? 0));
        if (slot >= container.size) continue;
        const item = deserializeContraptionItem(entry.item);
        if (!item) continue;
        try { container.setItem(slot, item); } catch {}
        inventorySize = Math.max(inventorySize, Number(entry.slot ?? 0) + 1);
    }
    if (!isDeployerConstruct(entity)) {
        try { entity.setDynamicProperty("create:inventory_size", inventorySize); } catch {}
    } else {
        const held = container.getItem(0);
        if (held) {
            try { setItemInHand(held.clone(), entity, EquipmentSlot.Mainhand, 0, "create:item_visual"); } catch {}
            try { entity.setProperty("create:item_visual", "item"); } catch {}
        }
    }
}

/** @param {Entity} minecart @param {{slot: number, item: PackedItemData}[] | undefined} entries */
function restorePackedMinecartInventory(minecart, entries) {
    const container = getContainer(minecart);
    if (!container || !Array.isArray(entries)) return;
    for (const entry of entries) {
        const slot = Math.max(0, Number(entry?.slot ?? 0));
        if (slot >= container.size) continue;
        const item = deserializeContraptionItem(entry.item);
        if (item) try { container.setItem(slot, item); } catch {}
    }
}

/** @param {Block | string} blockOrId */
export function isPackedCartPlacementBlock(blockOrId) {
    const typeId = typeof blockOrId === "string" ? blockOrId : blockOrId?.typeId;
    return typeId === "create:cart_assembler" || (typeof typeId === "string" && MINECART_RAIL_BLOCKS.has(typeId));
}

/** @param {number} first @param {number} second */
function angleDistance(first, second) {
    return Math.abs(((Number(first) - Number(second) + 540) % 360) - 180);
}

/** @param {Block} block @param {Player | undefined} player */
/** @param {Block} block @param {Player | undefined} player */
function getPackedCartPlacementYaw(block, player) {
    if (block?.typeId === "create:cart_assembler") {
        return getCartAssemblerYaw(block);
    }

    let railDirection = 0;
    try {
        railDirection = Number(getBlockStateValue(block, "rail_direction")
            ?? getBlockStateValue(block, "minecraft:rail_direction") ?? 0);
    } catch {}

    let candidates;
    switch (railDirection) {
        case 1:
        case 2:
        case 3: candidates = [-90, 90]; break;
        case 6: candidates = [0, -90]; break;
        case 7: candidates = [0, 90]; break;
        case 8: candidates = [180, 90]; break;
        case 9: candidates = [180, -90]; break;
        default: candidates = [0, 180]; break;
    }

    let playerYaw = candidates[0];
    try { if (player) playerYaw = Number(player.getRotation().y); } catch {}
    return angleDistance(candidates[0], playerYaw) <= angleDistance(candidates[1], playerYaw)
        ? candidates[0]
        : candidates[1];
}

/** @param {Block} block @returns {Entity | undefined} */
function findMinecartAtPackedPlacement(block) {
    if (block?.typeId === "create:cart_assembler") return findMinecartOnCartAssembler(block);
    try {
        return block.dimension.getEntities({ location: block.center(), maxDistance: 0.9 })
            .find(isMinecartEntity);
    } catch { return undefined; }
}

/** @param {Player} player @param {string} id */
function consumePackedCartItem(player, id) {
    try {
        const equippable = player.getComponent("minecraft:equippable");
        for (const slot of [EquipmentSlot.Mainhand, EquipmentSlot.Offhand]) {
            const held = equippable?.getEquipment(slot);
            if (held?.typeId === PACKED_CART_ITEM && held.getDynamicProperty("create:contraption_id") === id) {
                equippable?.setEquipment(slot, undefined);
                return true;
            }
        }
        const container = player.getComponent("minecraft:inventory")?.container;
        for (let slot = 0; slot < (container?.size ?? 0); slot++) {
            const item = container?.getItem(slot);
            if (item?.typeId === PACKED_CART_ITEM && item.getDynamicProperty("create:contraption_id") === id) {
                container?.setItem(slot, undefined);
                return true;
            }
        }
    } catch {}
    try { player.runCommand(`clear @s ${PACKED_CART_ITEM} 0 1`); return true; } catch {}
    return false;
}

/** @param {Player} player @param {Block} placementBlock @param {McItemStack} packedItem */
/** @param {Player} player @param {Block} placementBlock @param {McItemStack} packedItem */
export function deployPackedCartContraption(player, placementBlock, packedItem) {
    if (!player?.isValid || !isPackedCartPlacementBlock(placementBlock) || packedItem?.typeId !== PACKED_CART_ITEM) return false;
    const id = packedItem.getDynamicProperty("create:contraption_id");
    // New items carry the complete structure themselves. The world entry remains
    // as a fallback so contraptions packed by older addon versions still work.
    const packed = readPackedCartItemData(packedItem) ?? (typeof id === "string" ? readPackedCartData(id) : undefined);
    if (!packed || typeof packed !== "object" || !Array.isArray(packed.blocks) || packed.blocks.length === 0) {
        try { player.sendMessage("Â§cEste item nÃ£o possui uma estrutura salva vÃ¡lida."); } catch {}
        return false;
    }
    if (findMinecartAtPackedPlacement(placementBlock)) {
        return false;
    }

    const cartLocation = { x: placementBlock.x + 0.5, y: placementBlock.y + 0.55, z: placementBlock.z + 0.5 };
    const placementYaw = getPackedCartPlacementYaw(placementBlock, player);
    let minecart;
    try { minecart = placementBlock.dimension.spawnEntity(packed.minecartType ?? "minecraft:minecart", cartLocation); } catch { return false; }
    try { minecart.teleport(cartLocation, { rotation: { x: 0, y: placementYaw } }); } catch {}
    const initialYaw = getEntityYaw(minecart);
    restorePackedMinecartInventory(minecart, packed.minecartInventory);
    const spawned = [];
    const packedYaw = typeof packed.cartYaw === "number" ? packed.cartYaw : 180;
    const placementQuarterTurns = getCartRotationDeltaQuarterTurns(placementYaw, packedYaw);

    for (const blockData of packed.blocks) {
        const rel = blockData.rel ?? { x: 0, y: 0, z: 0 };
        const cartRel = blockData.cartRel ?? { x: Number(rel.x ?? 0), y: Number(rel.y ?? 0) + 0.95, z: Number(rel.z ?? 0) };
        const rotatedRel = rotateCartVector(Number(cartRel.x ?? 0), Number(cartRel.z ?? 0), placementYaw);
        const rotatedStoredRel = rotateMechanicalBearingRel({
            x: Number(rel.x ?? 0),
            y: Number(rel.y ?? 0),
            z: Number(rel.z ?? 0)
        }, placementQuarterTurns);
        const rotatedStates = rotateStoredBlockStates(blockData.states ?? {}, placementQuarterTurns);
        const rotatedGlueFaces = /** @type {string[]} */ (blockData.glueFaces).map(face => rotateHorizontalDirection(face, placementQuarterTurns));
        let entity;
        try {
            entity = placementBlock.dimension.spawnEntity(getConstructEntityType(blockData.blockId), {
                x: cartLocation.x + rotatedRel.x,
                y: cartLocation.y + Number(cartRel.y ?? 0),
                z: cartLocation.z + rotatedRel.z
            });
        } catch { entity = undefined; }
        if (!entity) {
            for (const value of spawned) try { value.remove(); } catch {}
            try { minecart.remove(); } catch {}
            return false;
        }

        try { entity.addTag(CART_CONSTRUCT_TAG); } catch {}
        try { entity.setDynamicProperty("create:block_id", blockData.blockId); } catch {}
        try { entity.setDynamicProperty("create:block_x", placementBlock.x + rotatedStoredRel.x); } catch {}
        try { entity.setDynamicProperty("create:block_y", placementBlock.y + 1 + rotatedStoredRel.y); } catch {}
        try { entity.setDynamicProperty("create:block_z", placementBlock.z + rotatedStoredRel.z); } catch {}
        try { entity.setDynamicProperty("create:block_states", JSON.stringify(rotatedStates)); } catch {}
        try {
            if (typeof blockData.spawnerStructure === "string") {
                entity.setDynamicProperty("create:spawner_structure", blockData.spawnerStructure);
            }
        } catch {}
        try { entity.setDynamicProperty("create:glue_faces", JSON.stringify(rotatedGlueFaces)); } catch {}
        try { entity.setDynamicProperty("create:cart_id", minecart.id); } catch {}
        try { entity.setDynamicProperty("create:cart_initial_yaw", initialYaw); } catch {}
        try { entity.setDynamicProperty("create:cart_rel_x", Number(cartRel.x ?? 0)); } catch {}
        try { entity.setDynamicProperty("create:cart_rel_y", Number(cartRel.y ?? 0)); } catch {}
        try { entity.setDynamicProperty("create:cart_rel_z", Number(cartRel.z ?? 0)); } catch {}
        try { entity.setDynamicProperty("create:cart_local_coordinates", true); } catch {}
        try { entity.setDynamicProperty("create:rel_x", rotatedStoredRel.x); } catch {}
        try { entity.setDynamicProperty("create:rel_y", rotatedStoredRel.y); } catch {}
        try { entity.setDynamicProperty("create:rel_z", rotatedStoredRel.z); } catch {}

        const visualData = { block: /** @type {Block} */ ({}), blockId: blockData.blockId, relX: 0, relY: 0, relZ: 0, states: rotatedStates };
        const visualSet = isStairConstruct(entity)
            ? setStairVisual(entity, visualData)
            : isRadialChassisConstruct(entity)
            ? setRadialChassisVisual(entity, visualData)
            : isLadderConstruct(entity)
            ? setLadderVisual(entity, visualData)
            : isDoorConstruct(entity)
            ? setDoorVisual(entity, visualData)
            : isSeatConstruct(entity)
            ? setSeatVisual(entity, visualData)
            : isWindmillSailConstruct(entity)
                ? setWindmillSailVisual(entity, visualData)
                : isMachineConstruct(entity)
                    ? setMachineVisual(entity, visualData)
                    : setGenericConstructVisual(entity, visualData);
        if (!visualSet) {
            try { entity.remove(); } catch {}
            for (const value of spawned) try { value.remove(); } catch {}
            try { minecart.remove(); } catch {}
            return false;
        }
        restorePackedConstructInventory(entity, blockData);
        if (isDeployerConstruct(entity)) {
            try { entity.setProperty("create:hand_mode", blockData.states["create:hand_mode"] === true); } catch {}
        }
        spawned.push(entity);
    }

    try { minecart.addTag(CART_CARRIER_TAG); } catch {}
    rememberMinecartTravelDirection(minecart, initialYaw);
    if (typeof id !== "string" || !consumePackedCartItem(player, id)) {
        for (const entity of spawned) try { entity.remove(); } catch {}
        try { minecart.removeTag(CART_CARRIER_TAG); } catch {}
        try { minecart.remove(); } catch {}
        return false;
    }
    deletePackedCartData(id);
    return true;
}

/** @param {Entity} minecart */
function createPackedCartId(minecart) {
    const random = Math.floor(Math.random() * 0xFFFFFF).toString(36);
    return `${system.currentTick.toString(36)}-${random}-${minecart.id.slice(-8)}`;
}

/** @param {Player} player @param {McItemStack} packedItem */
function givePackedCartItem(player, packedItem) {
    try {
        const container = player.getComponent("minecraft:inventory")?.container;
        const remainder = container?.addItem(packedItem);
        if (!container || remainder) player.dimension.spawnItem(remainder ?? packedItem, player.location);
        return true;
    } catch {
        try { player.dimension.spawnItem(packedItem, player.location); return true; } catch { return false; }
    }
}

/** @param {Player} player @param {Entity} minecart @param {McItemStack} heldItem */
export function packCartContraptionWithWrench(player, minecart, heldItem) {
    if (!player?.isValid || !isMinecartEntity(minecart) || heldItem?.typeId !== "create:wrench") return false;
    try { if (!minecart.hasTag(CART_CARRIER_TAG)) return false; } catch { return false; }

    let constructs = [];
    try {
        constructs = minecart.dimension.getEntities({ tags: [CART_CONSTRUCT_TAG] })
            .filter(entity => entity.getDynamicProperty("create:cart_id") === minecart.id);
    } catch { return false; }
    if (constructs.length === 0) return false;

    const id = createPackedCartId(minecart);
    const packedYaw = constructs.find(entity => typeof entity.getDynamicProperty("create:cart_initial_yaw") === "number")
        ?.getDynamicProperty("create:cart_initial_yaw") ?? getEntityYaw(minecart);
    /** @type {Record<string, unknown>} */
    const data = /** @type {PackedCartData} */ ({
        version: 1,
        minecartType: minecart.typeId,
        cartYaw: typeof packedYaw === "number" ? packedYaw : getEntityYaw(minecart),
        minecartInventory: serializeMinecartInventory(minecart),
        blocks: constructs.map(entity => {
            const rawSpawner = entity.getDynamicProperty("create:spawner_structure");
            const rawGlueFaces = entity.getDynamicProperty("create:glue_faces");
            /** @type {string[]} */
            /** @type {string[]} */
            let glueFaces = [];
            try {
                const parsed = typeof rawGlueFaces === "string" ? JSON.parse(rawGlueFaces) : [];
                if (Array.isArray(parsed)) glueFaces = parsed.filter((face) => typeof face === "string");
            } catch {}
            return {
                blockId: getConstructBlockId(entity) ?? "minecraft:air",
                states: getStoredBlockStates(entity) ?? {},
                rel: getStoredRel(entity),
                cartRel: getCartConstructRel(entity),
                ...(typeof rawSpawner === "string" ? { spawnerStructure: rawSpawner } : {}),
                glueFaces,
                inventory: serializeConstructInventory(entity)
            };
        })
    });
    let packedItem;
    try {
        packedItem = new ItemStack(PACKED_CART_ITEM, 1);
        packedItem.setDynamicProperty("create:contraption_id", id);
        packedItem.setDynamicProperty("create:block_count", constructs.length);
        packedItem.setLore([`Â§7Estrutura com ${constructs.length} blocos`]);
    } catch { return false; }
    if (!writePackedCartItemData(packedItem, data)) {
        try { player.sendMessage("Â§cA estrutura Ã© grande demais para ser salva no item."); } catch {}
        return false;
    }
    // Optional compatibility backup. Deployment no longer depends on this entry.
    writePackedCartData(id, data);

    // Remove the carrier tag first so entityRemove does not restore the blocks.
    try { minecart.removeTag(CART_CARRIER_TAG); } catch {}
    for (const construct of constructs) {
        try { construct.remove(); } catch {}
    }
    try { minecart.remove(); } catch {}
    givePackedCartItem(player, packedItem);
    return true;
}

/** @param {Entity} entity */
function isContraptionStorage(entity) {
    const blockId = getConstructBlockId(entity);
    return typeof blockId === "string" && (blockId.includes("chest") || blockId.includes("barrel") || blockId.includes("vault"));
}

/** @param {McItemStack} a @param {McItemStack} b */
function canStackItems(a, b) {
    if (!a || !b || a.typeId !== b.typeId) return false;
    try { return a.isStackableWith?.(b) ?? true; } catch {
        return true;
    }
}

/** @param {McItemStack} item */
function getItemMaxAmount(item) {
    return Math.max(1, Number(item?.maxAmount ?? 64));
}

/** @param {McItemStack} item */
function getItemAmount(item) {
    return Math.max(1, Number(item?.amount ?? 1));
}

/** @param {McItemStack} item @param {number} amount */
function setItemAmount(item, amount) {
    try { item.amount = amount; } catch {}
    return item;
}

/** @param {Container} container @param {McItemStack} item @param {number} startSlot */
function canInsertWholeStack(container, item, startSlot) {
    let space = 0;
    const amount = getItemAmount(item);
    const maxAmount = getItemMaxAmount(item);

    for (let slot = startSlot; slot < container.size; slot++) {
        const existing = container.getItem(slot);
        if (!existing) {
            space += maxAmount;
        } else if (canStackItems(existing, item)) {
            space += Math.max(0, getItemMaxAmount(existing) - getItemAmount(existing));
        }
        if (space >= amount) return true;
    }

    return false;
}

/** @param {Container} container @param {McItemStack} item @param {number} startSlot */
function insertWholeStack(container, item, startSlot) {
    if (!item || !canInsertWholeStack(container, item, startSlot)) return false;

    let remaining = getItemAmount(item);
    for (let slot = startSlot; slot < container.size && remaining > 0; slot++) {
        const existing = container.getItem(slot);
        if (!existing || !canStackItems(existing, item)) continue;

        const maxAmount = getItemMaxAmount(existing);
        const space = Math.max(0, maxAmount - getItemAmount(existing));
        if (space <= 0) continue;

        const moved = Math.min(space, remaining);
        const updated = cloneItemStack(existing);
        if (!updated) continue;
        setItemAmount(updated, getItemAmount(existing) + moved);
        try { container.setItem(slot, updated); } catch {}
        remaining -= moved;
    }

    for (let slot = startSlot; slot < container.size && remaining > 0; slot++) {
        if (container.getItem(slot)) continue;

        const moved = Math.min(getItemMaxAmount(item), remaining);
        const placed = cloneItemStack(item);
        if (!placed) continue;
        setItemAmount(placed, moved);
        try { container.setItem(slot, placed); } catch {}
        remaining -= moved;
    }

    return remaining <= 0;
}

/** @param {Container} container @param {McItemStack} item @param {number} startSlot */
function getContainerItemSpace(container, item, startSlot) {
    let space = 0;
    for (let slot = startSlot; slot < container.size; slot++) {
        const existing = container.getItem(slot);
        if (!existing) space += getItemMaxAmount(item);
        else if (canStackItems(existing, item)) {
            space += Math.max(0, getItemMaxAmount(existing) - getItemAmount(existing));
        }
    }
    return space;
}

/** @param {Container} container @param {McItemStack} item @param {number} amount @param {number} startSlot */
function insertStackPartially(container, item, amount, startSlot) {
    let remaining = amount;
    for (let slot = startSlot; slot < container.size && remaining > 0; slot++) {
        const existing = container.getItem(slot);
        if (!existing || !canStackItems(existing, item)) continue;
        const space = Math.max(0, getItemMaxAmount(existing) - getItemAmount(existing));
        if (space <= 0) continue;
        const moved = Math.min(space, remaining);
        const updated = cloneItemStack(existing);
        if (!updated) continue;
        setItemAmount(updated, getItemAmount(existing) + moved);
        try { container.setItem(slot, updated); } catch { continue; }
        remaining -= moved;
    }
    for (let slot = startSlot; slot < container.size && remaining > 0; slot++) {
        if (container.getItem(slot)) continue;
        const moved = Math.min(getItemMaxAmount(item), remaining);
        const placed = cloneItemStack(item);
        if (!placed) continue;
        setItemAmount(placed, moved);
        try { container.setItem(slot, placed); } catch { continue; }
        remaining -= moved;
    }
    return remaining;
}

/** @param {Entity[]} constructs @param {McItemStack} itemStack */
function insertItemIntoContraptionStorage(constructs, itemStack) {
    if (!itemStack) return false;
    const storages = [];
    for (const construct of constructs) {
        if (!construct?.isValid || !isContraptionStorage(construct)) continue;
        const container = getContainer(construct);
        if (!container || container.size <= CONSTRUCT_INVENTORY_SLOT_OFFSET) continue;
        storages.push({ construct, container });
    }
    const required = getItemAmount(itemStack);
    const totalSpace = storages.reduce((sum, storage) =>
        sum + getContainerItemSpace(storage.container, itemStack, CONSTRUCT_INVENTORY_SLOT_OFFSET), 0);
    if (totalSpace < required) return false;

    let remaining = required;
    for (const { construct, container } of storages) {
        remaining = insertStackPartially(container, itemStack, remaining, CONSTRUCT_INVENTORY_SLOT_OFFSET);
        const storedSize = Math.max(
            Number(construct.getDynamicProperty("create:inventory_size") ?? 0),
            container.size - CONSTRUCT_INVENTORY_SLOT_OFFSET
        );
        try { construct.setDynamicProperty("create:inventory_size", storedSize); } catch {}
        if (remaining <= 0) return true;
    }
    return remaining <= 0;
}

/** @param {Entity[]} constructs @returns {McItemStack[]} */
function getDeployerHeldReserveItems(constructs) {
    const reserve = [];
    for (const construct of constructs) {
        if (!isDeployerConstruct(construct)) continue;
        const held = getContainer(construct)?.getItem(0);
        if (held) reserve.push(held);
    }
    return reserve;
}

/** @param {McItemStack} item @param {McItemStack[]} reserveItems */
function isReservedForDeployer(item, reserveItems) {
    return reserveItems.some(reserved => canStackItems(item, reserved));
}

/** @param {Entity[]} constructs @param {McItemStack} sampleItem @param {Entity | undefined} [skipEntity] @returns {McItemStack | undefined} */
function takeOneMatchingItemFromContraptionStorage(constructs, sampleItem, skipEntity = undefined) {
    if (!sampleItem) return undefined;

    for (const construct of constructs) {
        if (!construct?.isValid || construct === skipEntity || !isContraptionStorage(construct)) continue;
        const container = getContainer(construct);
        if (!container || container.size <= CONSTRUCT_INVENTORY_SLOT_OFFSET) continue;

        for (let slot = CONSTRUCT_INVENTORY_SLOT_OFFSET; slot < container.size; slot++) {
            const item = container.getItem(slot);
            if (!item || !canStackItems(item, sampleItem)) continue;

            const taken = cloneItemStack(item);
            if (!taken) continue;
            setItemAmount(taken, 1);
            if (getItemAmount(item) > 1) {
                const remaining = cloneItemStack(item);
                if (remaining) {
                    setItemAmount(remaining, getItemAmount(item) - 1);
                    try { container.setItem(slot, remaining); } catch {}
                }
            } else {
                try { container.setItem(slot, undefined); } catch {}
            }
            return taken;
        }
    }

    return undefined;
}

/** @param {Entity} entity @param {Entity[]} constructs @param {McItemStack | undefined} sampleItem */
function refillDeployerConstructHand(entity, constructs, sampleItem) {
    const container = getContainer(entity);
    if (!container || container.getItem(0) || !sampleItem) return false;

    const refill = takeOneMatchingItemFromContraptionStorage(constructs, sampleItem, entity);
    if (!refill) return false;
    try { container.setItem(0, refill.clone()); } catch {}
    try { setItemInHand(refill.clone(), entity, EquipmentSlot.Mainhand, 0, "create:item_visual"); } catch {}
    try { entity.setProperty("create:item_visual", "item"); } catch {}
    return true;
}

/** @param {Block | undefined} block @param {string} state */
/** @param {Block | undefined} block @param {string} state */
/** @param {Block | undefined} block @param {string} state */
/** @param {Block | undefined} block @param {string} state */
function getBlockStateValue(block, state) {
    try { return block?.permutation.getAllStates()[state]; } catch {
        return undefined;
    }
}

/** @param {Block} block @param {string} state @param {string | number | boolean} value */
/** @param {Block} block @param {string} state @param {string | number | boolean} value */
/** @param {Block} block @param {string} state @param {string | number | boolean} value */
function setCustomBlockState(block, state, value) {
    try {
        block.setPermutation(BlockPermutation.resolve(block.typeId, {
            ...block.permutation.getAllStates(),
            [state]: value
        }));
        return true;
    } catch {
        return false;
    }
}

/** @param {import("@minecraft/server").BlockPermutation} permutation @param {number} value */
/** @param {import("@minecraft/server").BlockPermutation} permutation @param {number} value */
function withFirstSupportedCropAge(permutation, value) {
    const states = permutation.getAllStates();
    for (const state of ["growth", "growth_stage", "age", "crop_age"]) {
        if (typeof states[state] !== "number") continue;
        try { return BlockPermutation.resolve(permutation.type.id, { ...states, [state]: value }); } catch {}
    }
    return permutation;
}

/** @param {string} typeId @param {number} [amount] @returns {ItemStack | undefined} */
function itemStack(typeId, amount = 1) {
    try { return new ItemStack(typeId, Math.max(1, amount)); } catch {
        return undefined;
    }
}

/** @param {string} typeId */
function isSugarCane(typeId) {
    return typeId === "minecraft:sugar_cane" || typeId === "minecraft:reeds";
}

/** @param {string} typeId */
function isKelp(typeId) {
    return typeId === "minecraft:kelp" || typeId === "minecraft:kelp_plant";
}

/** @param {string} typeId @param {string} cropTypeId */
function isSameVerticalCrop(typeId, cropTypeId) {
    if (isSugarCane(cropTypeId)) return isSugarCane(typeId);
    if (isKelp(cropTypeId)) return isKelp(typeId);
    return typeId === cropTypeId;
}

/** @param {Block} block @returns {Block | undefined} */
function getVerticalHarvestStart(block) {
    if (!block?.isValid) return undefined;

    let below;
    try { below = block.dimension.getBlock({ x: block.x, y: block.y - 1, z: block.z }); } catch {}
    if (below?.isValid && isSameVerticalCrop(below.typeId, block.typeId)) return block;

    let above;
    try { above = block.dimension.getBlock({ x: block.x, y: block.y + 1, z: block.z }); } catch {}
    return above?.isValid && isSameVerticalCrop(above.typeId, block.typeId) ? above : undefined;
}

/** @param {Block | undefined} block @returns {(ItemStack | undefined)[] | undefined} */
function getMatureCropDrops(block) {
    const typeId = block?.typeId;
    if (!typeId) return undefined;

    if (isSugarCane(typeId)) return getVerticalHarvestStart(block) ? [itemStack("minecraft:sugar_cane", 1)] : undefined;
    if (isKelp(typeId)) return getVerticalHarvestStart(block) ? [itemStack("minecraft:kelp", 1)] : undefined;

    const growth = Number(
        getBlockStateValue(block, "growth")
        ?? getBlockStateValue(block, "growth_stage")
        ?? getBlockStateValue(block, "age")
        ?? getBlockStateValue(block, "crop_age")
        ?? -1
    );

    switch (typeId) {
        case "minecraft:wheat":
            if (growth < 7) return undefined;
            return [
                itemStack("minecraft:wheat", 1),
                itemStack("minecraft:wheat_seeds", 1 + Math.floor(Math.random() * 3))
            ];
        case "minecraft:carrots":
            if (growth < 7) return undefined;
            return [itemStack("minecraft:carrot", 2 + Math.floor(Math.random() * 3))];
        case "minecraft:potatoes":
            if (growth < 7) return undefined;
            return [itemStack("minecraft:potato", 2 + Math.floor(Math.random() * 3))];
        case "minecraft:beetroot":
            if (growth < 7) return undefined;
            return [
                itemStack("minecraft:beetroot", 1),
                itemStack("minecraft:beetroot_seeds", 1 + Math.floor(Math.random() * 3))
            ];
        case "minecraft:nether_wart":
            if (growth < 3) return undefined;
            return [itemStack("minecraft:nether_wart", 2 + Math.floor(Math.random() * 3))];
        case "minecraft:sweet_berry_bush":
            if (growth < 2) return undefined;
            return [itemStack("minecraft:sweet_berries", growth >= 3 ? 3 : 2)];
        case "minecraft:cocoa":
            if (growth < 2) return undefined;
            return [itemStack("minecraft:cocoa_beans", 3)];
        default:
            return undefined;
    }
}

/** @param {Block} block */
function resetHarvestedCrop(block) {
    try {
        block.setPermutation(withFirstSupportedCropAge(block.permutation, 0));
        return true;
    } catch {
        return false;
    }
}

/** @param {Dimension} dimension @param {Block} block */
function emitHarvestEffects(dimension, block) {
    try { dimension.playSound("dig.grass", block.center(), { volume: 0.5, pitch: 1.1 }); } catch {}
    try { dimension.spawnParticle("minecraft:crop_growth_emitter", block.center()); } catch {}
}

/** @param {Dimension} dimension @param {Block} block @param {(ItemStack | undefined)[]} drops @param {(item: ItemStack) => unknown} [itemCollector] */
function collectOrDrop(dimension, block, drops, itemCollector) {
    for (const drop of drops) {
        if (!drop) continue;
        if (!itemCollector?.(drop)) {
            try { dimension.spawnItem(drop, block.center()); } catch {}
        }
    }
}

/** @param {Block} block @param {(item: ItemStack) => unknown} [itemCollector] */
function harvestVerticalCrop(block, itemCollector) {
    const startBlock = getVerticalHarvestStart(block);
    if (!startBlock?.isValid) return false;

    const cropTypeId = startBlock.typeId;
    const dropId = isKelp(cropTypeId) ? "minecraft:kelp" : "minecraft:sugar_cane";
    const fillBlock = isKelp(cropTypeId) ? "water" : "air";
    const harvested = [];

    for (let y = startBlock.y; y < startBlock.y + 256; y++) {
        let crop;
        try { crop = startBlock.dimension.getBlock({ x: startBlock.x, y, z: startBlock.z }); } catch { break; }
        if (!crop?.isValid || !isSameVerticalCrop(crop.typeId, cropTypeId)) break;
        harvested.push({ x: crop.x, y: crop.y, z: crop.z });
    }

    if (harvested.length === 0) return false;

    for (const pos of harvested.reverse()) {
        try { startBlock.dimension.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} ${fillBlock}`); } catch {}
        collectOrDrop(startBlock.dimension, startBlock, [itemStack(dropId, 1)], itemCollector);
    }

    emitHarvestEffects(startBlock.dimension, startBlock);
    return true;
}

/** @param {Block} block @param {(item: ItemStack) => unknown} [itemCollector] */
function harvestMatureCrop(block, itemCollector) {
    if (!block?.isValid) return false;

    if (isSugarCane(block.typeId) || isKelp(block.typeId)) {
        return harvestVerticalCrop(block, itemCollector);
    }

    const drops = getMatureCropDrops(block);
    if (!drops) return false;
    if (!resetHarvestedCrop(block)) return false;

    emitHarvestEffects(block.dimension, block);
    collectOrDrop(block.dimension, block, drops, itemCollector);
    return true;
}

/** @param {number} yaw */
function getYawFace(yaw) {
    const normalized = ((yaw % 360) + 360) % 360;
    if (normalized >= 45 && normalized < 135) return "west";
    if (normalized >= 135 && normalized < 225) return "north";
    if (normalized >= 225 && normalized < 315) return "east";
    return "south";
}

/** @param {string} face */
function getFaceOffset(face) {
    switch (face) {
        case "north": return { x: 0, y: 0, z: -1 };
        case "south": return { x: 0, y: 0, z: 1 };
        case "east": return { x: 1, y: 0, z: 0 };
        case "west": return { x: -1, y: 0, z: 0 };
        default: return { x: 0, y: 0, z: 1 };
    }
}

/** @param {Entity} saw @param {Entity[]} constructs @param {number} angle */
function damageEntitiesInFrontOfBearingSaw(saw, constructs, angle) {
    if (!saw?.isValid) return false;
    let rpm = 0;
    try { rpm = Number(saw.getProperty("create:rpm") ?? saw.getDynamicProperty("create:last_rpm") ?? 0); } catch { return false; }
    if (!hasRpm(rpm)) return false;

    const yaw = getSawConstructYaw(saw, angle ?? Number(saw.getDynamicProperty("create:last_angle") ?? 0));
    const forward = getFaceOffset(getYawFace(yaw));
    const center = {
        x: saw.location.x + forward.x * BEARING_SAW_DAMAGE_DISTANCE,
        y: saw.location.y + 0.25,
        z: saw.location.z + forward.z * BEARING_SAW_DAMAGE_DISTANCE
    };
    const constructIds = new Set(constructs.map(entity => entity?.id).filter(Boolean));
    let damaged = false;
    let targets = [];
    try { targets = saw.dimension.getEntities({ location: center, maxDistance: BEARING_SAW_DAMAGE_RADIUS }); } catch { return false; }
    try {
        const nearbyPlayers = saw.dimension.getPlayers({ location: center, maxDistance: BEARING_SAW_DAMAGE_RADIUS });
        const knownIds = new Set(targets.map(target => target?.id));
        for (const player of nearbyPlayers) {
            if (!knownIds.has(player.id)) targets.push(player);
        }
    } catch {}

    for (const target of targets) {
        if (!target?.isValid || target.id === saw.id || constructIds.has(target.id)) continue;
        if (target.typeId === "minecraft:item" || target.typeId === "minecraft:xp_orb") continue;
        try { if (!target.getComponent("minecraft:health")) continue; } catch { continue; }

        const cooldownKey = `${saw.id}:${target.id}`;
        const lastDamageTick = Number(bearingSawDamageTicks.get(cooldownKey) ?? -BEARING_SAW_DAMAGE_INTERVAL);
        if (system.currentTick - lastDamageTick < BEARING_SAW_DAMAGE_INTERVAL) continue;

        try {
            try {
                target.applyDamage(BEARING_SAW_DAMAGE, { cause: EntityDamageCause.entityAttack, damagingEntity: saw });
            } catch {
                target.applyDamage(BEARING_SAW_DAMAGE, { cause: EntityDamageCause.contact });
            }
            bearingSawDamageTicks.set(cooldownKey, system.currentTick);
            damaged = true;
        } catch {}
    }
    if (bearingSawDamageTicks.size > 512) {
        for (const [key, tick] of bearingSawDamageTicks) {
            if (system.currentTick - tick > BEARING_SAW_DAMAGE_INTERVAL * 4) bearingSawDamageTicks.delete(key);
        }
    }
    return damaged;
}

/** @param {Entity} entity @returns {Block | undefined} */
function getHarvesterTargetBlock(entity) {
    const angle = Number(entity.getDynamicProperty("create:last_angle") ?? 0);
    const yaw = getSawConstructYaw(entity, angle);
    const offset = getFaceOffset(getYawFace(yaw));
    const location = entity.location;
    const pos = {
        x: Math.floor(location.x + offset.x * 0.9),
        y: Math.floor(location.y),
        z: Math.floor(location.z + offset.z * 0.9)
    };

    try {
        let block = entity.dimension.getBlock(pos);
        if (getMatureCropDrops(block)) return block;
        block = entity.dimension.getBlock({ x: pos.x, y: pos.y - 1, z: pos.z });
        return getMatureCropDrops(block) ? block : undefined;
    } catch {
        return undefined;
    }
}

/** @param {Entity} entity @param {(item: ItemStack) => unknown} [itemCollector] */
function mechanicalHarvesterEntityTick(entity, itemCollector) {
    if (!entity?.isValid) return false;
    const rpm = Number(entity.getDynamicProperty("create:last_rpm") ?? 0);
    if (!hasRpm(rpm)) return false;

    const lastTick = Number(entity.getDynamicProperty("create:last_harvest_tick") ?? 0);
    if (system.currentTick - lastTick < HARVESTER_TICK_INTERVAL) return false;

    const crop = getHarvesterTargetBlock(entity);
    if (!crop || !getMatureCropDrops(crop)) return false;

    if (!harvestMatureCrop(crop, itemCollector)) return false;
    try { entity.setDynamicProperty("create:last_harvest_tick", system.currentTick); } catch {}
    return true;
}

/** @param {Entity} entity @returns {Block | undefined} */
function getDeployerConstructTargetBlock(entity) {
    const location = entity.location;
    const pos = {
        x: Math.floor(location.x),
        y: Math.floor(location.y) - DEPLOYER_CONSTRUCT_REACH,
        z: Math.floor(location.z)
    };
    try { return entity.dimension.getBlock(pos); } catch {
        return undefined;
    }
}

/** @param {Entity} entity @param {McItemStack} held @param {Block} targetBlock */
function tryPlantDeployerConstructSapling(entity, held, targetBlock) {
    if (!held || !targetBlock || !SAPLING_ITEMS.has(held.typeId)) return false;
    if (!targetBlock.isAir && !targetBlock.isLiquid) return false;

    const below = targetBlock.below();
    if (!below || !SAPLING_SOIL.has(below.typeId)) return false;

    try {
        targetBlock.setType(held.typeId);
    } catch {
        return false;
    }

    consumeOneDeployerHeldItem(entity, held);
    try { entity.dimension.playSound("dig.grass", targetBlock.center(), { volume: 0.45, pitch: 1.05 }); } catch {}
    return true;
}

/** @param {McItemStack} item */
function isRailItem(item) {
    return typeof item?.typeId === "string" && MINECART_RAIL_BLOCKS.has(item.typeId);
}

/** @param {Entity} entity @param {McItemStack} held @param {Block} targetBlock */
function tryPlaceDeployerConstructRail(entity, held, targetBlock) {
    if (!isRailItem(held) || !targetBlock?.isValid) return false;
    if (!targetBlock.isAir && !targetBlock.isLiquid) return false;

    let support;
    try { support = targetBlock.below(); } catch { return false; }
    if (!support?.isValid || support.isAir || support.isLiquid) return false;

    try {
        targetBlock.setType(held.typeId);
    } catch {
        return false;
    }

    consumeOneDeployerHeldItem(entity, held);
    try { entity.dimension.playSound("place.metal", targetBlock.center(), { volume: 0.55, pitch: 1.05 }); } catch {}
    return true;
}

/** @param {Entity} entity @param {McItemStack} held @param {Block} targetBlock */
function tryUseDeployerConstructBoneMeal(entity, held, targetBlock) {
    if (!held || held.typeId !== "minecraft:bone_meal" || !targetBlock) return false;
    if (!tryNativeBoneMeal(targetBlock) && !tryAdvanceGrowthState(targetBlock)) return false;

    consumeOneDeployerHeldItem(entity, held);
    try { targetBlock.dimension.spawnParticle("minecraft:crop_growth_emitter", targetBlock.center()); } catch {}
    try { targetBlock.dimension.playSound("item.bone_meal.use", targetBlock.center(), { volume: 0.7, pitch: 1.0 }); } catch {}
    return true;
}

/** @param {Block} block */
function tryNativeBoneMeal(block) {
    // @minecraft/server 2.10 does not expose the vanilla fertilizable component
    // to scripts. Crop advancement and sapling growth below are the supported path.
    return false;
}

/** @param {Block} block */
function tryAdvanceGrowthState(block) {
    if (!block?.isValid) return false;
    if (SAPLING_ITEMS.has(block.typeId)) {
        const saplingAge = getBlockStateValue(block, "age_bit");
        if (saplingAge === true || saplingAge === undefined) return growSimpleTree(block);
    }

    let states;
    try { states = block.permutation.getAllStates(); } catch { return false; }
    for (const [state, value] of Object.entries(states)) {
        if (state === "age_bit" && value === false) {
            try {
                setCustomBlockState(block, state, true);
                return true;
            } catch {}
        }

        const max = GROWTH_STATE_MAX.get(state);
        if (max === undefined || typeof value !== "number" || value >= max) continue;

        const increase = 1 + Math.floor(Math.random() * 3);
        for (let next = Math.min(max, value + increase); next > value; next--) {
            try {
                setCustomBlockState(block, state, next);
                return true;
            } catch {}
        }
    }
    return false;
}

/** @param {Block} saplingBlock */
function growSimpleTree(saplingBlock) {
    const tree = TREE_BLOCKS.get(saplingBlock.typeId);
    if (!tree) return false;

    const height = 4 + Math.floor(Math.random() * 2);
    const dimension = saplingBlock.dimension;
    const base = saplingBlock.location;

    for (let y = 1; y <= height + 2; y++) {
        const radius = y >= height - 1 ? 2 : 0;
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const check = dimension.getBlock({ x: base.x + dx, y: base.y + y, z: base.z + dz });
                if (!check || (!check.isAir && !check.isLiquid && !check.typeId?.includes("_leaves"))) return false;
            }
        }
    }

    for (let y = 0; y < height; y++) {
        dimension.getBlock({ x: base.x, y: base.y + y, z: base.z })?.setType(tree.log);
    }

    for (let y = height - 2; y <= height + 1; y++) {
        const radius = y >= height ? 1 : 2;
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                if (Math.abs(dx) === radius && Math.abs(dz) === radius && Math.random() < 0.45) continue;
                if (dx === 0 && dz === 0 && y < height) continue;
                const leafBlock = dimension.getBlock({ x: base.x + dx, y: base.y + y, z: base.z + dz });
                if (leafBlock?.isAir || leafBlock?.isLiquid || leafBlock?.typeId?.includes("_leaves")) leafBlock.setType(tree.leaves);
            }
        }
    }
    return true;
}

/** @param {Entity} entity @param {McItemStack} item */
function consumeOneDeployerHeldItem(entity, item) {
    const container = getContainer(entity);
    if (!container || !item) return;

    if (getItemAmount(item) > 1) {
        const remaining = cloneItemStack(item);
        if (!remaining) return;
        setItemAmount(remaining, getItemAmount(item) - 1);
        try { container.setItem(0, remaining); } catch {}
        try { setItemInHand(remaining.clone(), entity, EquipmentSlot.Mainhand, 0, "create:item_visual"); } catch {}
    } else {
        try { container.setItem(0, undefined); } catch {}
        try { entity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air"); } catch {}
    }
}

/** @param {Entity} entity @param {Entity[]} constructs */
function mechanicalDeployerEntityTick(entity, constructs) {
    if (!entity?.isValid) return false;
    const rpm = Number(entity.getDynamicProperty("create:last_rpm") ?? 0);
    if (!hasRpm(rpm)) return false;

    const lastTick = Number(entity.getDynamicProperty("create:last_deploy_tick") ?? 0);
    if (system.currentTick - lastTick < DEPLOYER_TICK_INTERVAL) return false;

    const container = getContainer(entity);
    if (!container) return false;

    let held = container.getItem(0);
    const sampleType = entity.getDynamicProperty("create:deployer_sample_item");
    let sample = held ?? (typeof sampleType === "string" ? itemStack(sampleType, 1) : undefined);
    if (!held && sample) {
        refillDeployerConstructHand(entity, constructs, sample);
        held = container.getItem(0);
    }
    if (!held) return false;

    try { entity.setDynamicProperty("create:deployer_sample_item", held.typeId); } catch {}
    sample = held;

    const targetBlock = getDeployerConstructTargetBlock(entity);
    if (!targetBlock) return false;
    if (tryUseDeployerConstructBoneMeal(entity, held, targetBlock)) {
        refillDeployerConstructHand(entity, constructs, sample);
        try { entity.setDynamicProperty("create:last_deploy_tick", system.currentTick); } catch {}
        return true;
    }
    if (!targetBlock.isAir && !targetBlock.isLiquid) return false;
    if (tryPlantDeployerConstructSapling(entity, held, targetBlock)) {
        refillDeployerConstructHand(entity, constructs, sample);
        try { entity.setDynamicProperty("create:last_deploy_tick", system.currentTick); } catch {}
        return true;
    }
    if (tryPlaceDeployerConstructRail(entity, held, targetBlock)) {
        refillDeployerConstructHand(entity, constructs, sample);
        try { entity.setDynamicProperty("create:last_deploy_tick", system.currentTick); } catch {}
        return true;
    }
    if (!itemIsBlock(targetBlock, held)) return false;

    try {
        targetBlock.setType(held.typeId);
    } catch {
        return false;
    }

    consumeOneDeployerHeldItem(entity, held);
    refillDeployerConstructHand(entity, constructs, sample);
    try { entity.setDynamicProperty("create:last_deploy_tick", system.currentTick); } catch {}
    try { entity.dimension.playSound("use.stone", targetBlock.center(), { volume: 0.45, pitch: 1.1 }); } catch {}
    return true;
}

/** @param {Block} block @param {Dimension} dimension */
export function mechanicalHarvesterTick(block, dimension) {
    const entity = dimension.getEntities({ location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity` })[0];
    const rpm = entity?.getProperty("create:rpm") ?? 0;
    if (!hasRpm(rpm)) return false;

    const rotation = getBlockStateValue(block, "minecraft:cardinal_direction");
    if (typeof rotation !== "string") return false;
    const inverted = invertFace[rotation];
    const targetFace = typeof inverted === "string" ? rotationToFace[/** @type {keyof typeof rotationToFace} */ (inverted)] : undefined;
    const targetOffset = typeof targetFace === "string" ? cardinalOffsets[targetFace] : undefined;
    if (!targetOffset) return false;

    let targetBlock;
    try { targetBlock = block.offset(targetOffset); } catch { return false; }
    if (!targetBlock?.isValid || !getMatureCropDrops(targetBlock)) return false;

    return harvestMatureCrop(targetBlock);
}

/** @param {Dimension} dimension @param {Vector3} pos @returns {Block | undefined} */
function getBlockAtLocation(dimension, pos) {
    try { return dimension.getBlock(pos); } catch {
        return undefined;
    }
}

/** @param {Entity} entity @returns {Block | undefined} */
function getMovingInterfaceTargetBlock(entity) {
    const angle = Number(entity.getDynamicProperty("create:last_angle") ?? 0);
    const yaw = getSawConstructYaw(entity, angle);
    const offset = getFaceOffset(getYawFace(yaw));
    const location = entity.location;
    const targetCenter = {
        x: location.x + offset.x * 2,
        y: location.y,
        z: location.z + offset.z * 2
    };
    const xChecks = [Math.floor(targetCenter.x), Math.floor(targetCenter.x + 0.15), Math.floor(targetCenter.x - 0.15)];
    const zChecks = [Math.floor(targetCenter.z), Math.floor(targetCenter.z + 0.15), Math.floor(targetCenter.z - 0.15)];
    const yChecks = [
        Math.floor(targetCenter.y),
        Math.floor(targetCenter.y + 0.5),
        Math.floor(targetCenter.y - 0.5)
    ];

    const seen = new Set();
    for (const y of yChecks) {
        for (const x of xChecks) {
            for (const z of zChecks) {
                const key = `${x},${y},${z}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const block = getBlockAtLocation(entity.dimension, { x, y, z });
                if (block?.typeId !== "create:portable_storage_interface") continue;

                const dx = (block.x + 0.5) - location.x;
                const dz = (block.z + 0.5) - location.z;
                const forwardDistance = dx * offset.x + dz * offset.z;
                const sideDistance = Math.abs(dx * offset.z - dz * offset.x);
                if (forwardDistance >= 1.45 && forwardDistance <= 2.05 && sideDistance <= 0.65) return block;
            }
        }
    }
    return undefined;
}

/** @param {Block} block @param {Vector3 | undefined} [excludedPos] @returns {Block | undefined} */
function getAdjacentInventoryBlock(block, excludedPos = undefined) {
    if (!block?.dimension) return undefined;

    const facing = getBlockCardinalDirection(block) ?? "south";
    const preferred = getFaceOffset(getOppositeHorizontalFace(facing));
    const offsets = [
        preferred,
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: -1, z: 0 }
    ];

    const seen = new Set();
    for (const offset of offsets) {
        const pos = { x: block.x + offset.x, y: block.y + offset.y, z: block.z + offset.z };
        const key = posKey(pos);
        if (seen.has(key)) continue;
        seen.add(key);
        if (excludedPos && key === posKey(excludedPos)) continue;

        const candidate = getBlockAtLocation(block.dimension, pos);
        if (candidate?.typeId === "create:vault") return candidate;
        const container = getContainer(candidate);
        if (container) return candidate;
    }
    return undefined;
}

/** @param {Block} block */
/** @param {Block | undefined} block */
function getPortableInterfaceVaultStorage(block) {
    if (block?.typeId !== "create:vault") return undefined;

    let storage = getStorageAt(block.location, vaultVisualStructure, block.dimension);
    if (storage) return storage;
    try { storage = rebuildVaultAt(block, vaultVisualStructure)?.storage; } catch {}
    return storage ?? getStorageAt(block.location, vaultVisualStructure, block.dimension);
}

/** @param {string} face */
function getOppositeHorizontalFace(face) {
    switch (face) {
        case "north": return "south";
        case "south": return "north";
        case "east": return "west";
        case "west": return "east";
        default: return "north";
    }
}

/** @param {Entity[]} constructs @param {Container | undefined} targetContainer @param {Vector3 | undefined} [dropLocation] @param {Dimension | undefined} [dimension] @param {McItemStack[]} [reserveItems] */
/** @param {Entity[]} constructs @param {Container | undefined} targetContainer @param {Vector3 | undefined} [dropLocation] @param {Dimension | undefined} [dimension] @param {McItemStack[]} [reserveItems] */
function transferOneStackFromContraption(constructs, targetContainer, dropLocation = undefined, dimension = undefined, reserveItems = []) {
    for (const construct of constructs) {
        if (!construct?.isValid || !isContraptionStorage(construct)) continue;
        const source = getContainer(construct);
        if (!source) continue;

        for (let slot = CONSTRUCT_INVENTORY_SLOT_OFFSET; slot < source.size; slot++) {
            const item = source.getItem(slot);
            if (!item) continue;
            if (isReservedForDeployer(item, reserveItems)) continue;
            if (targetContainer) {
                if (!insertWholeStack(targetContainer, item, 0)) continue;
            } else if (dimension && dropLocation) {
                try { dimension.spawnItem(item.clone(), dropLocation); } catch { continue; }
            } else {
                continue;
            }

            try { source.setItem(slot, undefined); } catch {}
            try {
                construct.setDynamicProperty(
                    "create:inventory_size",
                    Math.max(Number(construct.getDynamicProperty("create:inventory_size") ?? 0), source.size - CONSTRUCT_INVENTORY_SLOT_OFFSET)
                );
            } catch {}
            return true;
        }
    }

    return false;
}

/** @param {Entity[]} constructs @param {unknown} vaultStorage @param {McItemStack[]} [reserveItems] */
/** @param {Entity[]} constructs @param {{id: string} | undefined} vaultStorage @param {McItemStack[]} [reserveItems] */
function transferOneStackFromContraptionToVault(constructs, vaultStorage, reserveItems = []) {
    if (!vaultStorage?.id) return false;

    for (const construct of constructs) {
        if (!construct?.isValid || !isContraptionStorage(construct)) continue;
        const source = getContainer(construct);
        if (!source) continue;

        for (let slot = CONSTRUCT_INVENTORY_SLOT_OFFSET; slot < source.size; slot++) {
            const item = source.getItem(slot);
            if (!item || isReservedForDeployer(item, reserveItems)) continue;
            if (!insertVaultItem(vaultStorage.id, item, getItemAmount(item))) continue;

            try { source.setItem(slot, undefined); } catch {}
            try {
                construct.setDynamicProperty(
                    "create:inventory_size",
                    Math.max(Number(construct.getDynamicProperty("create:inventory_size") ?? 0), source.size - CONSTRUCT_INVENTORY_SLOT_OFFSET)
                );
            } catch {}
            return true;
        }
    }

    return false;
}

/** @param {Block} block */
function getStaticInterfaceVisualKey(block) {
    return `${block.dimension.id}:${block.x},${block.y},${block.z}`;
}

/** @param {Block} block @returns {Entity | undefined} */
function getStaticInterfaceVisual(block) {
    const key = getStaticInterfaceVisualKey(block);
    const entities = block.dimension.getEntities({
        type: STORAGE_INTERFACE_STATIC_ENTITY,
        location: block.center(),
        maxDistance: 1.25
    });
    return entities.find(entity => {
        try { return entity.hasTag(STORAGE_INTERFACE_STATIC_VISUAL_TAG) && entity.getDynamicProperty("create:static_interface_key") === key; } catch {
            return false;
        }
    });
}

/** @param {Block} block @param {boolean} hidden */
function setPortableInterfaceHidden(block, hidden) {
    if (!block?.isValid || block.typeId !== "create:portable_storage_interface") return;
    try { setCustomBlockState(block, "create:hidden", hidden); } catch {}
}

/** @param {Block} block @param {boolean} connected */
function syncStaticInterfaceVisual(block, connected) {
    if (!block?.isValid || block.typeId !== "create:portable_storage_interface") return;

    let visual = getStaticInterfaceVisual(block);
    if (!connected) {
        setPortableInterfaceHidden(block, false);
        if (visual?.isValid) {
            try { visual.remove(); } catch {}
        }
        return;
    }

    const direction = getBlockCardinalDirection(block) ?? "south";
    const visualOffset = getFaceOffset(direction);
    const visualLocation = {
        x: block.x + 0.5 + visualOffset.x * STORAGE_INTERFACE_STATIC_VISUAL_FORWARD_OFFSET,
        y: block.y + 0.02,
        z: block.z + 0.5 + visualOffset.z * STORAGE_INTERFACE_STATIC_VISUAL_FORWARD_OFFSET
    };
    const states = getBlockStates(block) ?? {};
    setPortableInterfaceHidden(block, true);
    if (!visual?.isValid) {
        try {
            visual = block.dimension.spawnEntity(STORAGE_INTERFACE_STATIC_ENTITY, visualLocation);
            visual.addTag(STORAGE_INTERFACE_STATIC_VISUAL_TAG);
            visual.setDynamicProperty("create:static_interface_key", getStaticInterfaceVisualKey(block));
            visual.setDynamicProperty("create:static_interface_x", block.x);
            visual.setDynamicProperty("create:static_interface_y", block.y);
            visual.setDynamicProperty("create:static_interface_z", block.z);
            visual.setDynamicProperty("create:static_interface_states", JSON.stringify(states));
            visual.setDynamicProperty("create:cardinal_rotation", direction);
        } catch {
            return;
        }
    }

    try { visual.setDynamicProperty("create:static_interface_tick", system.currentTick); } catch {}
    try { visual.setProperty("create:connected", true); } catch {}
    try { visual.setProperty("create:cardinal_rotation", direction); } catch {}
    try { visual.setDynamicProperty("create:cardinal_rotation", direction); } catch {}
    try { visual.teleport(visualLocation, { checkForBlocks: false, rotation: { x: 0, y: getBlockModelYaw(direction) } }); } catch {
        try { visual.teleport(visualLocation); } catch {}
    }
}

/** @param {Entity} entity @param {Entity[]} constructs */
function tickPortableStorageInterface(entity, constructs) {
    if (!entity?.isValid) return false;
    try { entity.setProperty("create:connected", false); } catch {}

    const rpm = Number(entity.getDynamicProperty("create:last_rpm") ?? 0);
    if (!hasRpm(rpm)) return false;

    const stationaryInterface = getMovingInterfaceTargetBlock(entity);if (!stationaryInterface) return false;
    const targetBlock = getAdjacentInventoryBlock(stationaryInterface, stationaryInterface.location);
    const targetContainer = getContainer(targetBlock);
    const targetVaultStorage = getPortableInterfaceVaultStorage(targetBlock);
    const targetsVault = targetBlock?.typeId === "create:vault";
    const dropLocation = stationaryInterface.center();

    const lastTransferTick = Number(entity.getDynamicProperty("create:last_storage_transfer_tick") ?? 0);
    let moved = false;
    if (system.currentTick - lastTransferTick >= STORAGE_INTERFACE_TRANSFER_INTERVAL) {
        const reserveItems = getDeployerHeldReserveItems(constructs);
        for (let i = 0; i < STORAGE_INTERFACE_STACKS_PER_TICK; i++) {
            const transferred = targetsVault
                ? transferOneStackFromContraptionToVault(constructs, targetVaultStorage, reserveItems)
                : transferOneStackFromContraption(constructs, targetContainer, dropLocation, entity.dimension, reserveItems);
            if (!transferred) break;
            moved = true;
        }
        if (moved) {
            try { entity.setDynamicProperty("create:last_storage_transfer_tick", system.currentTick); } catch {}
            try { entity.setDynamicProperty("create:storage_hold_until", system.currentTick + STORAGE_INTERFACE_HOLD_TICKS); } catch {}
            try { entity.dimension.playSound("random.click", stationaryInterface.center(), { volume: 0.35, pitch: 1.2 }); } catch {}
        }
    }

    const holdUntil = Number(entity.getDynamicProperty("create:storage_hold_until") ?? 0);
    const connected = moved || holdUntil >= system.currentTick;
    try { entity.setProperty("create:connected", connected); } catch {}
    syncStaticInterfaceVisual(stationaryInterface, connected);
    return connected;
}

/** @param {Dimension} dimension */
function cleanupStaticInterfaceVisuals(dimension) {
    const dimensionKey = dimension?.id ?? "unknown";
    const lastCleanupTick = Number(staticInterfaceCleanupTicks.get(dimensionKey) ?? -STATIC_INTERFACE_CLEANUP_INTERVAL);
    if (system.currentTick - lastCleanupTick < STATIC_INTERFACE_CLEANUP_INTERVAL) return;
    staticInterfaceCleanupTicks.set(dimensionKey, system.currentTick);

    let visuals = [];
    try { visuals = dimension.getEntities({ type: STORAGE_INTERFACE_STATIC_ENTITY }); } catch { return; }

    for (const visual of visuals) {
        try {
            if (!visual.hasTag(STORAGE_INTERFACE_STATIC_VISUAL_TAG)) continue;
            const lastTick = Number(visual.getDynamicProperty("create:static_interface_tick") ?? 0);
            const x = visual.getDynamicProperty("create:static_interface_x");
            const y = visual.getDynamicProperty("create:static_interface_y");
            const z = visual.getDynamicProperty("create:static_interface_z");
            const block = typeof x === "number" && typeof y === "number" && typeof z === "number"
                ? getBlockAtLocation(dimension, { x, y, z })
                : undefined;

            if (system.currentTick - lastTick > STORAGE_INTERFACE_HOLD_TICKS + 8 || block?.typeId !== "create:portable_storage_interface") {
                if (block) setPortableInterfaceHidden(block, false);
                visual.remove();
            }
        } catch {}
    }
}

/** @param {Block} block @param {Entity} entity @param {number} [quarterTurns] */
function restoreConstruct(block, entity, quarterTurns = 0) {
    if (!entity?.isValid) return;

    const blockId = getConstructBlockId(entity);
    const storedStates = getStoredBlockStates(entity);
    const storedBearingId = entity.getDynamicProperty("create:bearing_block_id");
    const safeBlock = /** @type {Block | undefined} */ (block?.isValid ? block : undefined);
    const belongsToWindmill = block?.typeId === WINDMILL_BEARING_BLOCK || storedBearingId === WINDMILL_BEARING_BLOCK;
    // Windmill sails already keep their facing relative to the windmill axis.
    // Applying the snapped Y rotation here turns them sideways after restoration.
    const states = belongsToWindmill && isWindmillSailConstruct(entity)
        ? storedStates
        : rotateStoredBlockStates(storedStates, quarterTurns);
    const storedBearing = getStoredBearingLocation(entity);
    const fallbackBearing = /** @type {BearingLocation} */ ({
        x: storedBearing?.x ?? Math.floor(entity.location.x),
        y: storedBearing?.y ?? Math.floor(entity.location.y - 1.5),
        z: storedBearing?.z ?? Math.floor(entity.location.z),
        face: storedBearing?.face ?? "south",
        typeId: storedBearingId === WINDMILL_BEARING_BLOCK ? WINDMILL_BEARING_BLOCK : MECHANICAL_BEARING_BLOCK
    });
    const top = getSnappedRestoreBlock(safeBlock ?? fallbackBearing, entity, quarterTurns)
        ?? getStoredOriginalBlock(entity)
        ?? getTopBlock(safeBlock)
        ?? getStoredTopBlock(entity);
    if (top && blockId && restoreStoredConstructBlock(top, entity, blockId, states)) {
        restoreStoredGlueFaces(entity, top, quarterTurns);
        removeConstructAfterInventoryRestore(entity, top);
        return;
    }

    dropStoredInventory(entity);
    if (blockId) {
        const stack = createBlockStack(blockId);
        if (stack) try { entity.dimension.spawnItem(stack, entity.location); } catch {}
    }
    try { entity.remove(); } catch {}
}

/** @param {Entity} entity @param {number} rpm */
function rotateConstruct(entity, rpm) {
    if (!entity?.isValid) return;

    try { entity.teleport(getConstructLocationFromEntity(entity)); } catch {}
    try { entity.setProperty("create:rpm", rpm); } catch {}
}

/** @param {Entity} entity @returns {Vector3} */
function getConstructLocationFromEntity(entity) {
    return entity.location;
}

/** @param {Entity} entity @returns {BearingLocation | undefined} */
/** @param {Entity} entity @returns {BearingLocation | undefined} */
/** @param {Entity} entity @returns {BearingLocation | undefined} */
function getStoredBearingLocation(entity) {
    const x = entity?.getDynamicProperty?.("create:bearing_x");
    const y = entity?.getDynamicProperty?.("create:bearing_y");
    const z = entity?.getDynamicProperty?.("create:bearing_z");
    if (typeof x === "number" && typeof y === "number" && typeof z === "number") {
        const rawTypeId = entity?.getDynamicProperty?.("create:bearing_block_id");
        const rawFace = entity?.getDynamicProperty?.("create:bearing_face");
        const typeId = typeof rawTypeId === "string" ? rawTypeId : MECHANICAL_BEARING_BLOCK;
        const face = typeof rawFace === "string" ? rawFace : "south";
        return { x, y, z, typeId, face };
    }

    const loc = entity?.location;
    if (!loc) return undefined;
    return {
        x: Math.floor(loc.x),
        y: Math.floor(loc.y - 1.5),
        z: Math.floor(loc.z),
        typeId: MECHANICAL_BEARING_BLOCK,
        face: "south"
    };
}

/** @param {Entity} entity @returns {RelativeVector} */
function getStoredRel(entity) {
    const x = entity?.getDynamicProperty?.("create:rel_x");
    const y = entity?.getDynamicProperty?.("create:rel_y");
    const z = entity?.getDynamicProperty?.("create:rel_z");
    return {
        x: typeof x === "number" ? x : 0,
        y: typeof y === "number" ? y : 0,
        z: typeof z === "number" ? z : 0
    };
}

/** @param {Entity} entity @returns {Block | undefined} */
function getStoredOriginalBlock(entity) {
    const storedLocation = getStoredBlockLocation(entity);
    if (storedLocation) {
        try { return entity.dimension.getBlock(storedLocation); } catch {}
    }

    const bearing = getStoredBearingLocation(entity);
    if (!bearing) return undefined;
    const rel = getStoredRel(entity);
    try {
        if (bearing.typeId === WINDMILL_BEARING_BLOCK) {
            return entity.dimension.getBlock({
                x: bearing.x + rel.x,
                y: bearing.y + rel.y,
                z: bearing.z + rel.z
            });
        }
        return entity.dimension.getBlock({
            x: bearing.x + rel.x,
            y: bearing.y + 1 + rel.y,
            z: bearing.z + rel.z
        });
    } catch {
        return undefined;
    }
}

/** @param {Entity} entity @returns {Block | undefined} */
function getStoredTopBlock(entity) {
    const bearing = getStoredBearingLocation(entity);
    if (!bearing) return undefined;
    try {
        if (bearing.typeId === WINDMILL_BEARING_BLOCK) {
            const offset = cardinalOffsets[bearing.face ?? "south"] ?? cardinalOffsets.south;
            return entity.dimension.getBlock({ x: bearing.x + offset.x, y: bearing.y + offset.y, z: bearing.z + offset.z });
        }
        return entity.dimension.getBlock({ x: bearing.x, y: bearing.y + 1, z: bearing.z });
    } catch {
        return undefined;
    }
}

/** @param {Vector3} vector @param {Vector3} axis @param {number} angle @returns {Vector3} */
function rotateVectorAroundAxis(vector, axis, angle) {
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dot = vector.x * axis.x + vector.y * axis.y + vector.z * axis.z;
    return {
        x: vector.x * cos + (axis.y * vector.z - axis.z * vector.y) * sin + axis.x * dot * (1 - cos),
        y: vector.y * cos + (axis.z * vector.x - axis.x * vector.z) * sin + axis.y * dot * (1 - cos),
        z: vector.z * cos + (axis.x * vector.y - axis.y * vector.x) * sin + axis.z * dot * (1 - cos)
    };
}

/** @param {Entity} entity @param {number} angle @returns {Vector3} */
function getRotatedConstructLocation(entity, angle) {
    const bearing = getStoredBearingLocation(entity);
    if (!bearing) return entity.location;

    const rel = getStoredRel(entity);
    const offset = getConstructVisualOffset(entity);
    const pivotOffset = bearing.typeId === WINDMILL_BEARING_BLOCK
        ? getWindmillPivotOffset(bearing)
        : { x: 0, y: 0, z: 0 };
    const visualRel = {
        x: rel.x * CONSTRUCT_VISUAL_SPACING + offset.x - pivotOffset.x,
        y: rel.y * CONSTRUCT_VISUAL_SPACING + offset.y - pivotOffset.y,
        z: rel.z * CONSTRUCT_VISUAL_SPACING + offset.z - pivotOffset.z
    };
    const visualRotation = getConstructRotationForBearing(bearing, angle);
    if (isWindmillSailConstruct(entity)) {
        // Keep base yaw on the child bones. Mixing it into the same Euler
        // rotation as west/east X spin makes the sail lie flat.
        const baseDirection = getWindmillSailBaseDirection(bearing);
        if (entity.getDynamicProperty("create:cardinal_rotation") !== baseDirection) {
            try { entity.setProperty("create:cardinal_rotation", baseDirection); } catch {}
            try { entity.setDynamicProperty("create:cardinal_rotation", baseDirection); } catch {}
        }
        visualRotation.y = 0;
    }
    try { entity.setProperty("create:rotation_x", visualRotation.x); } catch {}
    try { entity.setProperty("create:rotation_y", visualRotation.y); } catch {}
    try { entity.setProperty("create:rotation_z", visualRotation.z); } catch {}

    const center = getBearingCenter(bearing);
    if (bearing.typeId !== WINDMILL_BEARING_BLOCK) {
        const radians = angle * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return {
            x: center.x + visualRel.x * cos - visualRel.z * sin,
            y: center.y + visualRel.y + CONSTRUCT_ATTACH_Y_OFFSET + getConstructAttachYOffset(entity),
            z: center.z + visualRel.x * sin + visualRel.z * cos
        };
    }

    const rotatedRel = rotateWindmillRel(visualRel, bearing, angle);

    return {
        x: center.x + rotatedRel.x,
        y: center.y + rotatedRel.y + CONSTRUCT_ATTACH_Y_OFFSET + getConstructAttachYOffset(entity),
        z: center.z + rotatedRel.z
    };
}

/** @param {Entity} entity @param {number} rpm @param {number | undefined} [angle] */
function updateConstructEntity(entity, rpm, angle = undefined) {
    if (!entity?.isValid) return;

    const bearing = getStoredBearingLocation(entity);
    if (bearing && isSeatConstruct(entity)) {
        // Trust the real block at the saved pivot instead of an old dynamic
        // property. Seats from a Mechanical Bearing must always use its Y axis.
        try {
            const pivotBlock = entity.dimension.getBlock({
                x: bearing.x,
                y: bearing.y,
                z: bearing.z
            });
            if (pivotBlock?.typeId === MECHANICAL_BEARING_BLOCK) {
                bearing.typeId = MECHANICAL_BEARING_BLOCK;
                bearing.face = "up";
                entity.setDynamicProperty("create:bearing_block_id", MECHANICAL_BEARING_BLOCK);
                entity.setDynamicProperty("create:bearing_face", "up");
            }
        } catch {}
    }
    const constructAngle = angle ?? (bearing ? getBearingAngle(bearing) : 0);
    const location = getRotatedConstructLocation(entity, constructAngle);
    try {
        const options = usesMachineTransform(entity)
            ? { checkForBlocks: false, rotation: { x: 0, y: getMachineConstructYaw(entity, constructAngle) } }
            : { checkForBlocks: false };
        entity.teleport(location, options);
    } catch {
        try { entity.teleport(location); } catch {}
    }
    try { entity.clearVelocity(); } catch {}
    try { entity.setProperty("create:rpm", rpm); } catch {}
    if (entity.typeId === CONTRAPTION_ENTITY
        || entity.typeId === SLAB_CONTRAPTION_ENTITY
        || entity.typeId === CARPET_CONTRAPTION_ENTITY
        || entity.typeId === STAIR_CONTRAPTION_ENTITY) {
        try { entity.setProperty("create:item_visual", "block"); } catch {}
    }
    if (isMachineConstruct(entity)) {
        const cardinalRotation = entity.getDynamicProperty("create:cardinal_rotation");
        if (typeof cardinalRotation === "string") {
            try { entity.setProperty("create:cardinal_rotation", cardinalRotation); } catch {}
        }
    }
    if (system.currentTick % 10 === 0) {
        try { entity.setDynamicProperty("create:last_angle", constructAngle); } catch {}
        try { entity.setDynamicProperty("create:last_rpm", rpm); } catch {}
    }
}

/** @param {Entity} entity @param {BearingLocation | undefined} bearing @param {number} angle @returns {Vector3} */
/** @param {Entity} entity @param {BearingLocation | undefined} bearing @param {number} angle */
function getDrillForwardForBearing(entity, bearing, angle) {
    const storedDirection = normalizeSailFacing(
        getStoredBlockStates(entity)?.["minecraft:facing_direction"]
        ?? entity.getDynamicProperty("create:cardinal_rotation")
        ?? "south"
    );
    const invertedDirection = invertFace[storedDirection];
    const originalFace = typeof invertedDirection === "string" ? rotationToFace[/** @type {keyof typeof rotationToFace} */ (invertedDirection)] ?? "south" : "south";
    const originalForward = cardinalOffsets[originalFace] ?? DIRECTION_OFFSETS.south;

    // Minecart contraptions keep their assembled world orientation.
    if (!bearing) return originalForward;

    if (bearing?.typeId === WINDMILL_BEARING_BLOCK) {
        return rotateWindmillRel(originalForward, bearing, angle);
    }

    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
        x: originalForward.x * cos - originalForward.z * sin,
        y: originalForward.y,
        z: originalForward.x * sin + originalForward.z * cos
    };
}

/** @param {Entity[]} constructs @param {BearingLocation} bearing @param {number} angle */
function tickBearingConstructMachines(constructs, bearing, angle) {
    let blocked = false;
    /** @param {McItemStack} itemStack */
    const itemCollector = (itemStack) => insertItemIntoContraptionStorage(constructs, itemStack);
    for (const construct of constructs) {
        try {
            if (isSawConstruct(construct)) {
                if (mechanicalSawEntityTick(construct, itemCollector)) blocked = true;
                damageEntitiesInFrontOfBearingSaw(construct, constructs, angle);
            }
            if (isDrillConstruct(construct)) {
                const drillForward = getDrillForwardForBearing(construct, bearing, angle ?? 0);
                if (mechanicalDrillEntityTick(construct, itemCollector, drillForward)) blocked = true;
            }
            if (isHarvesterConstruct(construct)) mechanicalHarvesterEntityTick(construct, itemCollector);
            if (isDeployerConstruct(construct)) mechanicalDeployerEntityTick(construct, constructs);
            if (isStorageInterfaceConstruct(construct) && tickPortableStorageInterface(construct, constructs)) blocked = true;
        } catch {}
    }
    return blocked;
}

/** @param {Entity[]} constructs @param {Player[] | undefined} [players] */
function tickConstructLadders(constructs, players = undefined) {
    const ladders = constructs.filter(isLadderConstruct);
    if (ladders.length === 0) return;
    if (!players) {
        try { players = ladders[0].dimension.getPlayers(); } catch { players = []; }
    }
    const handled = new Set();
    for (const ladder of ladders) {
        for (const player of players) {
            if (!player?.isValid || handled.has(player.id)) continue;
            const dx = player.location.x - ladder.location.x;
            const dz = player.location.z - ladder.location.z;
            const dy = player.location.y - ladder.location.y;
            if (Math.hypot(dx, dz) > 0.72 || dy < -0.9 || dy > 0.85) continue;
            handled.add(player.id);
            let velocityY = 0;
            try { velocityY = player.getVelocity().y ?? 0; } catch {}
            if (velocityY < -0.08) {
                try { player.applyImpulse({ x: 0, y: Math.min(0.28, -velocityY - 0.04), z: 0 }); } catch {}
            }
            let wantsClimb = true;
            try {
                const movement = player.inputInfo?.getMovementVector?.();
                if (movement) wantsClimb = Math.hypot(movement.x ?? 0, movement.y ?? 0) > 0.05;
            } catch {}
            if (wantsClimb && !player.isSneaking) {
                try { player.applyImpulse({ x: 0, y: 0.085, z: 0 }); } catch {}
            }
        }
    }
}

/** @param {Dimension} dimension @param {Block | BearingLocation} bearing @param {Entity[]} constructs @param {number} rpm @param {Entity | undefined} [bearingEntity] */
function updateBearingConstructGroup(dimension, bearing, constructs, rpm, bearingEntity = undefined) {
    const currentAngle = getBearingAngle(bearing);

    if (tickBearingConstructMachines(constructs, bearing, currentAngle)) {
        holdBearingVisualAngle(bearing, rpm, currentAngle);
        setBearingEntityAngle(dimension, bearing, currentAngle, bearingEntity);
        for (const construct of constructs) updateConstructEntity(construct, rpm, currentAngle);
        tickConstructLadders(constructs);
        return;
    }

    const nextAngle = getBearingVisualAngle(bearing, rpm);
    setBearingEntityAngle(dimension, bearing, nextAngle, bearingEntity);

    for (const construct of constructs) updateConstructEntity(construct, rpm, nextAngle);
    tickConstructLadders(constructs);
}

/** @param {Dimension[]} dimensions */
export function mechanicalBearingConstructSync(dimensions) {
    for (const dimension of dimensions) {
        cleanupStaticInterfaceVisuals(dimension);
        // All moving bearing visuals already share this tag. One query replaces
        // a separate full-dimension entity scan for every construct type.
        const constructs = dimension.getEntities({ tags: [BEARING_CONSTRUCT_TAG] });
        const bearingEntities = new Map();
        for (const type of [BEARING_ENTITY, WINDMILL_BEARING_ENTITY]) {
            let entities = /** @type {Entity[]} */ ([]);
            try { entities = dimension.getEntities({ type }); } catch {}
            for (const entity of entities) {
                const location = entity.location;
                bearingEntities.set(`${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`, entity);
            }
        }
        const groups = new Map();

        for (const construct of constructs) {
            const bearing = getStoredBearingLocation(construct);
            if (!bearing) continue;

            const key = posKey(bearing);
            let group = groups.get(key);
            if (!group) {
                group = { bearing, rpm: 0, constructs: [] };
                groups.set(key, group);
            }

            const rpm = Number(construct.getProperty("create:rpm") ?? 0);
            if (hasRpm(rpm)) group.rpm = rpm;
            group.constructs.push(construct);
        }

        for (const group of groups.values()) {
            const bearingEntity = bearingEntities.get(posKey(group.bearing));
            group.rpm = getSyncedBearingRpm(dimension, group.bearing, group.rpm, bearingEntity);
            if (!hasRpm(group.rpm)) continue;
            updateBearingConstructGroup(dimension, group.bearing, group.constructs, group.rpm, bearingEntity);
        }
    }
}

/** @param {number} angle */
function normalizeCartAngle(angle) {
    let value = Number(angle) || 0;
    while (value > 180) value -= 360;
    while (value < -180) value += 360;
    return value;
}

/** @param {Entity} entity @returns {RelativeVector} */
function getCartConstructRel(entity) {
    let x = entity?.getDynamicProperty?.("create:cart_rel_x");
    const y = entity?.getDynamicProperty?.("create:cart_rel_y");
    let z = entity?.getDynamicProperty?.("create:cart_rel_z");
    if (entity?.getDynamicProperty?.("create:cart_local_coordinates") !== true) {
        const initialYaw = Number(entity?.getDynamicProperty?.("create:cart_initial_yaw") ?? 0);
        const local = rotateCartVector(Number(x ?? 0), Number(z ?? 0), -initialYaw);
        x = local.x;
        z = local.z;
        try { entity.setDynamicProperty("create:cart_rel_x", x); } catch {}
        try { entity.setDynamicProperty("create:cart_rel_z", z); } catch {}
        try { entity.setDynamicProperty("create:cart_local_coordinates", true); } catch {}
    }
    return {
        x: typeof x === "number" ? x : 0,
        y: typeof y === "number" ? y : 0,
        z: typeof z === "number" ? z : 0
    };
}

/** @param {Entity} minecart */
function getMinecartMotionRpm(minecart) {
    try {
        const velocity = minecart.getVelocity();
        const speed = Math.hypot(velocity.x ?? 0, velocity.y ?? 0, velocity.z ?? 0);
        return speed > 0.002 ? Math.max(1, Math.min(MAX_BEARING_RPM, speed * 40)) : 0;
    } catch {
        return 0;
    }
}

/** @param {Entity | undefined} minecart */
function isMinecartOnRail(minecart) {
    const location = minecart?.location;
    const dimension = minecart?.dimension;
    if (!location || !dimension) return false;
    const x = Math.floor(location.x);
    const z = Math.floor(location.z);
    const baseY = Math.floor(location.y);
    for (const y of [baseY, baseY - 1]) {
        try {
            const trackType = dimension.getBlock({ x, y, z })?.typeId;
            if ((trackType && MINECART_RAIL_BLOCKS.has(trackType)) || trackType === CART_ASSEMBLER_BLOCK) return true;
        } catch {}
    }
    return false;
}

/** @param {Dimension} dimension @param {number} x @param {number} y @param {number} z */
function hasRailAt(dimension, x, y, z) {
    for (const checkY of [Math.floor(y), Math.floor(y) - 1]) {
        try {
            const typeId = dimension.getBlock({ x: Math.floor(x), y: checkY, z: Math.floor(z) })?.typeId;
            if ((typeId && MINECART_RAIL_BLOCKS.has(typeId)) || typeId === CART_ASSEMBLER_BLOCK) return true;
        } catch {}
    }
    return false;
}

/** @param {Entity} minecart */
function constrainContraptionCartToRails(minecart) {
    if (!minecart?.isValid) return false;
    if (!isMinecartOnRail(minecart)) {
        try { minecart.clearVelocity(); } catch {}
        try { minecart.setDynamicProperty("create:cart_motion_enabled", false); } catch {}
        return false;
    }

    const travel = getMinecartTravelVector(minecart);
    if (!travel) return true;
    const direction = Math.abs(travel.x) >= Math.abs(travel.z)
        ? { x: Math.sign(travel.x) || 1, z: 0 }
        : { x: 0, z: Math.sign(travel.z) || 1 };
    const location = minecart.location;
    if (!hasRailAt(minecart.dimension, location.x + direction.x, location.y, location.z + direction.z)) return true;

    // Existe trilho reto a frente: remove a deriva lateral sem alterar a
    // velocidade para frente. Curvas ficam a cargo da fisica vanilla.
    try {
        const velocity = minecart.getVelocity();
        const speed = Math.hypot(velocity.x ?? 0, velocity.z ?? 0);
        if (speed > CART_SPEED_EPSILON) {
            minecart.clearVelocity();
            minecart.applyImpulse({ x: direction.x * speed, y: velocity.y ?? 0, z: direction.z * speed });
        }
        minecart.setDynamicProperty("create:cart_travel_x", direction.x);
        minecart.setDynamicProperty("create:cart_travel_z", direction.z);
    } catch {}
    return true;
}

/** @param {Entity} minecart */
function holdMinecartDuringAssembly(minecart) {
    const until = Number(minecart?.getDynamicProperty?.("create:cart_spawn_lock_until") ?? 0);
    if (until <= 0) return false;
    if (system.currentTick > until) {
        try { minecart.setDynamicProperty("create:cart_spawn_lock_until", 0); } catch {}
        return false;
    }
    const x = minecart.getDynamicProperty("create:cart_spawn_lock_x");
    const y = minecart.getDynamicProperty("create:cart_spawn_lock_y");
    const z = minecart.getDynamicProperty("create:cart_spawn_lock_z");
    if (typeof x === "number" && typeof y === "number" && typeof z === "number") {
        try { minecart.teleport({ x, y, z }, { checkForBlocks: false }); } catch {}
    }
    try { minecart.clearVelocity(); } catch {}
    return true;
}

/** @param {Entity} minecart */
function keepMinecartAtPoweredSpeed(minecart) {
    if (!minecart?.isValid || !isMinecartOnRail(minecart)) return false;
    let velocity;
    try { velocity = minecart.getVelocity(); } catch { return false; }

    const horizontalSpeed = Math.hypot(velocity.x ?? 0, velocity.z ?? 0);
    // Um empurrao do jogador nao deve ligar a locomocao constante do
    // contraption. Nesse caso o carrinho conserva apenas o impulso manual.
    try {
        if (minecart.getDynamicProperty("create:cart_manual_push") === true) {
            if (horizontalSpeed <= CART_SPEED_EPSILON) {
                minecart.setDynamicProperty("create:cart_manual_push", false);
            }
            return false;
        }
    } catch {}
    if (horizontalSpeed > CART_SPEED_EPSILON) {
        try { minecart.setDynamicProperty("create:cart_motion_enabled", true); } catch {}
    } else {
        let enabled = false;
        try { enabled = minecart.getDynamicProperty("create:cart_motion_enabled") === true; } catch {}
        if (!enabled) return false;
    }
    let direction;
    if (horizontalSpeed > CART_SPEED_EPSILON) {
        direction = { x: velocity.x / horizontalSpeed, z: velocity.z / horizontalSpeed };
        try { minecart.setDynamicProperty("create:cart_travel_x", direction.x); } catch {}
        try { minecart.setDynamicProperty("create:cart_travel_z", direction.z); } catch {}
    } else {
        const storedX = Number(minecart.getDynamicProperty("create:cart_travel_x"));
        const storedZ = Number(minecart.getDynamicProperty("create:cart_travel_z"));
        const storedLength = Math.hypot(storedX, storedZ);
        direction = storedLength > 0.001
            ? { x: storedX / storedLength, z: storedZ / storedLength }
            : rememberMinecartTravelDirection(minecart);
    }

    const difference = CART_POWERED_SPEED - horizontalSpeed;
    if (Math.abs(difference) <= 0.002) return true;
    const correction = Math.max(-0.3, Math.min(0.3, difference));
    try {
        minecart.applyImpulse({ x: direction.x * correction, y: 0, z: direction.z * correction });
        return true;
    } catch {
        return false;
    }
}

/** @param {Entity} minecart */
function startCartContraptionIfRailAhead(minecart) {
    if (!minecart?.isValid || !isMinecartOnRail(minecart)) return false;
    try {
        const velocity = minecart.getVelocity();
        if (Math.hypot(velocity.x ?? 0, velocity.z ?? 0) > CART_SPEED_EPSILON) return false;
    } catch { return false; }

    const travel = getMinecartTravelVector(minecart) ?? rememberMinecartTravelDirection(minecart);
    if (!travel) return false;
    const direction = Math.abs(travel.x) >= Math.abs(travel.z)
        ? { x: Math.sign(travel.x) || 1, z: 0 }
        : { x: 0, z: Math.sign(travel.z) || 1 };
    const location = minecart.location;
    if (!hasRailAt(minecart.dimension, location.x + direction.x, location.y, location.z + direction.z)) return false;

    try {
        minecart.setDynamicProperty("create:cart_motion_enabled", true);
        minecart.setDynamicProperty("create:cart_manual_push", false);
        minecart.setDynamicProperty("create:cart_travel_x", direction.x);
        minecart.setDynamicProperty("create:cart_travel_z", direction.z);
        minecart.applyImpulse({ x: direction.x * CART_POWERED_SPEED, y: 0, z: direction.z * CART_POWERED_SPEED });
        return true;
    } catch {
        return false;
    }
}

/** @param {Player} player */
function getPlayerStructurePushVector(player) {
    try {
        const velocity = player.getVelocity();
        const speed = Math.hypot(velocity.x ?? 0, velocity.z ?? 0);
        if (speed > 0.002) return { x: velocity.x / speed, z: velocity.z / speed, strength: Math.min(1, speed * 8) };
    } catch {}

    try {
        const movement = player.inputInfo?.getMovementVector?.();
        const inputStrength = Math.hypot(movement?.x ?? 0, movement?.y ?? 0);
        if (inputStrength <= 0.05) throw new Error("no movement input");
        const view = player.getViewDirection();
        const viewLength = Math.hypot(view.x ?? 0, view.z ?? 0);
        if (viewLength <= 0.001) throw new Error("no horizontal view");
        const forwardX = view.x / viewLength;
        const forwardZ = view.z / viewLength;
        const rightX = -forwardZ;
        const rightZ = forwardX;
        const worldX = rightX * movement.x + forwardX * movement.y;
        const worldZ = rightZ * movement.x + forwardZ * movement.y;
        const worldLength = Math.hypot(worldX, worldZ);
        if (worldLength <= 0.001) throw new Error("no world movement");
        return { x: worldX / worldLength, z: worldZ / worldLength, strength: Math.min(1, inputStrength) };
    } catch {
        // Fall through to the view-direction push used when collision prevents
        // the player velocity/input API from reporting movement.
    }

    try {
        const view = player.getViewDirection();
        const length = Math.hypot(view.x ?? 0, view.z ?? 0);
        if (length > 0.001) return { x: view.x / length, z: view.z / length, strength: 1 };
    } catch {}
    return undefined;
}

/** @param {Entity} minecart @param {Entity[]} constructs @param {Player[]} players */
function pushMinecartThroughConstructs(minecart, constructs, players) {
    if (!minecart?.isValid || constructs.length === 0 || players.length === 0) return false;
    const seatedRiderIds = new Set();
    for (const construct of constructs) {
        if (!isSeatConstruct(construct)) continue;
        try {
            const rideable = construct.getComponent("minecraft:rideable") ?? construct.getComponent("rideable");
            for (const rider of rideable?.getRiders?.() ?? []) seatedRiderIds.add(rider.id);
        } catch {}
    }
    const lastPushTick = Number(minecart.getDynamicProperty("create:last_structure_push_tick") ?? -10);
    if (system.currentTick - lastPushTick < 1) return false;

    try {
        const cartVelocity = minecart.getVelocity();
        if (Math.hypot(cartVelocity.x ?? 0, cartVelocity.z ?? 0) >= 0.65) return false;
    } catch {}

    for (const player of players) {
        if (!player?.isValid || seatedRiderIds.has(player.id)) continue;
        const push = getPlayerStructurePushVector(player);
        if (!push) continue;

        for (const construct of constructs) {
            if (!construct?.isValid) continue;
            const dx = construct.location.x - player.location.x;
            const dz = construct.location.z - player.location.z;
            const horizontalDistance = Math.hypot(dx, dz);
            const overlapsHeight = player.location.y <= construct.location.y + 0.7
                && player.location.y + 1.8 >= construct.location.y - 0.7;
            if (!overlapsHeight || horizontalDistance < 0.1 || horizontalDistance > 1.4) continue;

            const toward = (push.x * dx + push.z * dz) / horizontalDistance;
            if (toward < 0.1) continue;
            // O tamanho do contraption e somente visual: ele nao deve deixar o
            // minecart mais pesado. Assim, uma estrutura grande recebe o mesmo
            // impulso confiavel que uma estrutura pequena ao ser empurrada.
            const impulse = player.isSprinting ? 0.19 : 0.12;
            try {
                minecart.applyImpulse({ x: push.x * impulse, y: 0, z: push.z * impulse });
                minecart.setDynamicProperty("create:cart_travel_x", push.x);
                minecart.setDynamicProperty("create:cart_travel_z", push.z);
                minecart.setDynamicProperty("create:cart_motion_enabled", false);
                minecart.setDynamicProperty("create:cart_manual_push", true);
                minecart.setDynamicProperty("create:last_structure_push_tick", system.currentTick);
                return true;
            } catch {
                return false;
            }
        }
    }
    return false;
}

/** @param {Entity} minecart @param {Entity[]} constructs */
function getCartConstructFrame(minecart, constructs) {
    const reference = constructs.find(entity => entity?.isValid);
    if (!reference) return undefined;
    const storedYaw = reference.getDynamicProperty("create:cart_initial_yaw");
    // Mantem a estrutura na direcao em que foi montada. O minecart pode virar
    // nas curvas sem alterar a orientacao visual original do contraption.
    const angle = typeof storedYaw === "number" ? storedYaw : 0;
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
        cartLocation: { ...minecart.location },
        angle,
        cos,
        sin,
        anchor: { x: 0, y: 0, z: 0 }
    };
}

/** @param {Entity} minecart @returns {{x: number, z: number} | undefined} */
function getMinecartTravelVector(minecart) {
    try {
        const velocity = minecart.getVelocity();
        const length = Math.hypot(velocity.x ?? 0, velocity.z ?? 0);
        if (length > CART_SPEED_EPSILON) return { x: velocity.x / length, z: velocity.z / length };
    } catch {}
    const x = Number(minecart.getDynamicProperty("create:cart_travel_x") ?? 0);
    const z = Number(minecart.getDynamicProperty("create:cart_travel_z") ?? 0);
    const length = Math.hypot(x, z);
    return length > 0.001 ? { x: x / length, z: z / length } : undefined;
}

/** @param {Entity} minecart @param {Entity[]} constructs @param {{cartLocation: Vector3, angle: number, cos: number, sin: number, anchor: Vector3} | undefined} frame */
function isCartContraptionPathBlocked(minecart, constructs, frame) {
    const travel = getMinecartTravelVector(minecart);
    if (!travel || !frame) return false;

    // O carrinho anda em trilhos retos. Use um eixo cardinal aqui para que uma
    // pequena deriva lateral da fisica nao faca a estrutura "enroscar" nas
    // paredes laterais.
    const direction = Math.abs(travel.x) >= Math.abs(travel.z)
        ? { x: Math.sign(travel.x) || 1, z: 0 }
        : { x: 0, z: Math.sign(travel.z) || 1 };
    const positions = [];
    let front = -Infinity;

    for (const construct of constructs) {
        if (!construct?.isValid) continue;
        const localRel = getCartConstructRel(construct);
        const current = {
            x: frame.cartLocation.x + localRel.x * frame.cos - localRel.z * frame.sin,
            y: frame.cartLocation.y + localRel.y,
            z: frame.cartLocation.z + localRel.x * frame.sin + localRel.z * frame.cos
        };
        const progress = current.x * direction.x + current.z * direction.z;
        positions.push({ construct, current, progress });
        front = Math.max(front, progress);
    }

    // Somente a fileira mais a frente pode bater em algo. Os blocos nas
    // laterais pertencem ao mesmo contraption e nao devem impedir o movimento.
    for (const { construct, current, progress } of positions) {
        if (progress < front - 0.35) continue;
        const currentCell = { x: Math.floor(current.x), y: Math.floor(current.y), z: Math.floor(current.z) };
        const nextCell = {
            x: currentCell.x + direction.x,
            y: currentCell.y,
            z: currentCell.z + direction.z
        };
        const target = getBlockAt(construct.dimension, nextCell);
        if (target?.isValid && !target.isAir && !target.isLiquid) return true;
    }
    return false;
}

/** @param {Entity} minecart */
function stopMinecartContraption(minecart) {
    try { minecart.clearVelocity(); } catch {}
    const safeX = minecart.getDynamicProperty("create:cart_safe_x");
    const safeY = minecart.getDynamicProperty("create:cart_safe_y");
    const safeZ = minecart.getDynamicProperty("create:cart_safe_z");
    if (typeof safeX === "number" && typeof safeY === "number" && typeof safeZ === "number") {
        try { minecart.teleport({ x: safeX, y: safeY, z: safeZ }, { checkForBlocks: false }); } catch {}
    }
    try { minecart.clearVelocity(); } catch {}
    try { minecart.setDynamicProperty("create:cart_path_blocked", true); } catch {}
}

/** @param {Entity} minecart */
function rememberSafeMinecartLocation(minecart) {
    const location = minecart?.location;
    if (!location) return;
    try { minecart.setDynamicProperty("create:cart_safe_x", location.x); } catch {}
    try { minecart.setDynamicProperty("create:cart_safe_y", location.y); } catch {}
    try { minecart.setDynamicProperty("create:cart_safe_z", location.z); } catch {}
}

/** @param {Entity} minecart */
function resumeBlockedMinecartForward(minecart) {
    const travel = getMinecartTravelVector(minecart);
    if (!travel) return false;
    try {
        minecart.applyImpulse({
            x: travel.x * CART_POWERED_SPEED,
            y: 0,
            z: travel.z * CART_POWERED_SPEED
        });
        return true;
    } catch {
        return false;
    }
}

/** @param {Entity} minecart */
function minecartPathWasBlocked(minecart) {
    try { return minecart.getDynamicProperty("create:cart_path_blocked") === true; } catch { return false; }
}

/** @param {Entity} entity @param {Entity} minecart @param {number} rpm @param {ReturnType<typeof getCartConstructFrame>} frame @param {boolean} [snapInitialTransform] */
function updateCartConstructEntity(entity, minecart, rpm, frame, snapInitialTransform = false) {
    if (!entity?.isValid || !minecart?.isValid) return;
    if (!frame) return;
    const rel = getCartConstructRel(entity);
    const location = {
        x: frame.cartLocation.x + rel.x * frame.cos - rel.z * frame.sin,
        y: frame.cartLocation.y + rel.y + getCartConstructAttachYOffset(entity),
        z: frame.cartLocation.z + rel.x * frame.sin + rel.z * frame.cos
    };

    try { entity.setProperty("create:rotation_x", 0); } catch {}
    try { entity.setProperty("create:rotation_y", 0); } catch {}
    try { entity.setProperty("create:rotation_z", 0); } catch {}
    if (snapInitialTransform && usesMachineTransform(entity)) {
        snapEntityRotation(entity, location, getCartConstructYaw(entity));
    } else {
        try {
            const options = usesMachineTransform(entity)
                ? { checkForBlocks: false, rotation: { x: 0, y: getCartConstructYaw(entity) } }
                : { checkForBlocks: false };
            entity.teleport(location, options);
        } catch {
            try { entity.teleport(location); } catch {}
        }
    }
    try { entity.clearVelocity(); } catch {}
    try { entity.setProperty("create:rpm", rpm); } catch {}
    if (system.currentTick % 10 === 0) {
        try { entity.setDynamicProperty("create:last_angle", frame.angle); } catch {}
        try { entity.setDynamicProperty("create:last_rpm", rpm); } catch {}
    }
}

/** @param {Dimension[]} dimensions */
export function cartAssemblerConstructSync(dimensions) {
    for (const dimension of dimensions) {
        let constructs = [];
        let carriers = [];
        let players = [];
        try {
            constructs = dimension.getEntities({ tags: [CART_CONSTRUCT_TAG] });
            if (constructs.length === 0) continue;
            carriers = dimension.getEntities({ tags: [CART_CARRIER_TAG] }).filter(isMinecartEntity);
            players = dimension.getPlayers();
        } catch { continue; }

        const cartsById = new Map(carriers.map(cart => [cart.id, cart]));
        const groups = new Map();
        for (const construct of constructs) {
            const cartId = construct.getDynamicProperty("create:cart_id");
            if (typeof cartId !== "string") continue;
            const cart = cartsById.get(cartId);
            if (!cart) continue;
            let group = groups.get(cartId);
            if (!group) {
                group = { cart, constructs: [] };
                groups.set(cartId, group);
            }
            group.constructs.push(construct);
        }

        for (const group of groups.values()) {
            if (holdMinecartDuringAssembly(group.cart)) {
                const lockedFrame = getCartConstructFrame(group.cart, group.constructs);
                for (const construct of group.constructs) updateCartConstructEntity(construct, group.cart, 0, lockedFrame);
                tickConstructLadders(group.constructs, players);
                continue;
            }
            const cartOnRail = constrainContraptionCartToRails(group.cart);
            let frame = getCartConstructFrame(group.cart, group.constructs);
            const pathBlocked = isCartContraptionPathBlocked(group.cart, group.constructs, frame);
            const movingRpm = getMinecartMotionRpm(group.cart);
            if (pathBlocked) {
                if (hasRpm(movingRpm)) {
                    try { group.cart.setDynamicProperty("create:cart_blocked_rpm", movingRpm); } catch {}
                }
                stopMinecartContraption(group.cart);
                frame = getCartConstructFrame(group.cart, group.constructs);
            }
            else {
                const wasPathBlocked = minecartPathWasBlocked(group.cart);
                try { group.cart.setDynamicProperty("create:cart_path_blocked", false); } catch {}
                try { group.cart.setDynamicProperty("create:cart_blocked_rpm", 0); } catch {}
                rememberSafeMinecartLocation(group.cart);
                if (wasPathBlocked) resumeBlockedMinecartForward(group.cart);
                startCartContraptionIfRailAhead(group.cart);
                keepMinecartAtPoweredSpeed(group.cart);
            }
            const blockedRpm = Number(group.cart.getDynamicProperty("create:cart_blocked_rpm") ?? 0);
            // Keep tools powered while the cart itself is stopped by an obstacle.
            const hasTravelIntent = getMinecartTravelVector(group.cart) !== undefined && isMinecartOnRail(group.cart);
            const motionRpm = getMinecartMotionRpm(group.cart);
            const rpm = pathBlocked
                ? Math.max(8, Math.abs(blockedRpm))
                : (hasTravelIntent ? Math.max(8, motionRpm) : motionRpm);
            for (const construct of group.constructs) updateCartConstructEntity(construct, group.cart, rpm, frame);
            tickConstructLadders(group.constructs, players);
            if (!pathBlocked && cartOnRail) pushMinecartThroughConstructs(group.cart, group.constructs, players);
            if (hasRpm(rpm)) tickBearingConstructMachines(group.constructs, { typeId: MECHANICAL_BEARING_BLOCK, x: 0, y: 0, z: 0 }, 0);
        }
    }
}

/** @param {Block} assembler @param {Entity | undefined} [minecart] */
export function disassembleCartAssemblerContraption(assembler, minecart = findMinecartOnCartAssembler(assembler)) {
    if (!assembler?.isValid || !isMinecartEntity(minecart)) return false;
    let constructs = [];
    try {
        constructs = assembler.dimension.getEntities({ tags: [CART_CONSTRUCT_TAG] })
            .filter(entity => entity.getDynamicProperty("create:cart_id") === minecart.id);
    } catch { return false; }
    if (constructs.length === 0) return false;

    const quarterTurns = 0;
    let restored = 0;
    for (const entity of constructs) {
        const rel = rotateMechanicalBearingRel(getStoredRel(entity), quarterTurns);
        const target = getBlockAt(assembler.dimension, {
            x: assembler.x + rel.x,
            y: assembler.y + 1 + rel.y,
            z: assembler.z + rel.z
        });
        const blockId = getConstructBlockId(entity);
        const states = rotateStoredBlockStates(getStoredBlockStates(entity), quarterTurns);
        if (target && blockId && (target.isAir || target.isLiquid) && restoreStoredConstructBlock(target, entity, blockId, states)) {
            restoreStoredGlueFaces(entity, target, quarterTurns);
            removeConstructAfterInventoryRestore(entity, target);
            restored++;
        }
    }
    if (restored === constructs.length) {
        try { minecart.removeTag(CART_CARRIER_TAG); } catch {}
    }
    return restored > 0;
}

/** @param {Entity} entity @param {Vector3} cartLocation @param {number} angle @param {number} [verticalOffset] @returns {Block | undefined} */
/** @param {Entity} entity @param {Vector3} cartLocation @param {number} angle @param {number} [verticalOffset] @returns {Vector3} */
function getCartRemovalTarget(entity, cartLocation, angle, verticalOffset = 0) {
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const rel = getCartConstructRel(entity);
    return {
        x: Math.floor(cartLocation.x + rel.x * cos - rel.z * sin),
        y: Math.floor(cartLocation.y + rel.y + verticalOffset),
        z: Math.floor(cartLocation.z + rel.x * sin + rel.z * cos)
    };
}

/** @param {Entity} entity */
function dropCartConstructAsItem(entity) {
    if (!entity?.isValid) return;
    dropStoredInventory(entity);
    const blockId = getConstructBlockId(entity);
    const stack = blockId ? createBlockStack(blockId) : undefined;
    if (stack) {
        try { entity.dimension.spawnItem(stack, entity.location); } catch {}
    }
    try { entity.remove(); } catch {}
}

/** @param {Dimension} dimension @param {string} cartId @param {Vector3} cartLocation @param {number} cartYaw */
function restoreRemovedMinecartContraption(dimension, cartId, cartLocation, cartYaw) {
    let constructs = [];
    try {
        constructs = dimension.getEntities({ tags: [CART_CONSTRUCT_TAG] })
            .filter(entity => entity.getDynamicProperty("create:cart_id") === cartId);
    } catch { return false; }
    if (constructs.length === 0) return false;

    const quarterTurns = 0;
    const snappedAngle = 0;
    let verticalOffset;

    for (let offset = 0; offset <= 8; offset++) {
        const occupied = new Set();
        let canRestore = true;
        for (const entity of constructs) {
            const pos = getCartRemovalTarget(entity, cartLocation, snappedAngle, offset);
            const key = posKey(pos);
            const target = getBlockAt(dimension, pos);
            if (occupied.has(key) || !target || (!target.isAir && !target.isLiquid)) {
                canRestore = false;
                break;
            }
            occupied.add(key);
        }
        if (canRestore) {
            verticalOffset = offset;
            break;
        }
    }

    if (verticalOffset === undefined) {
        for (const entity of constructs) dropCartConstructAsItem(entity);
        return false;
    }

    for (const entity of constructs) {
        const target = getBlockAt(dimension, getCartRemovalTarget(entity, cartLocation, snappedAngle, verticalOffset));
        const blockId = getConstructBlockId(entity);
        const states = rotateStoredBlockStates(getStoredBlockStates(entity), quarterTurns);
        if (target && blockId && restoreStoredConstructBlock(target, entity, blockId, states)) {
            restoreStoredGlueFaces(entity, target, quarterTurns);
            removeConstructAfterInventoryRestore(entity, target);
        } else {
            dropCartConstructAsItem(entity);
        }
    }
    return true;
}

/** @param {Entity} minecart */
export function cartAssemblerCarrierRemoved(minecart) {
    if (!isMinecartEntity(minecart)) return false;
    try { if (!minecart.hasTag(CART_CARRIER_TAG)) return false; } catch { return false; }

    const dimension = minecart.dimension;
    const cartId = minecart.id;
    const cartLocation = { ...minecart.location };
    const cartYaw = getEntityYaw(minecart);
    system.run(() => restoreRemovedMinecartContraption(dimension, cartId, cartLocation, cartYaw));
    return true;
}

/** @param {Block} block @param {Dimension} dimension */
export function mechanicalBearingTick(block, dimension) {
    if (!block?.isValid || block.typeId !== MECHANICAL_BEARING_BLOCK) return false;
    const constructs = getConstructs(block);
    const rpm = getBearingRpm(block);

    if (constructs.length > 0 && !hasRpm(rpm)) {
        const quarterTurns = getNearestBearingQuarterTurn(block);
        for (const construct of constructs) restoreConstruct(block, construct, quarterTurns);
        resetBearingRotationState(block, 0);
        setBearingEntityAngle(block.dimension, block, 0);
        return;
    }

    if (constructs.length === 0) {
        if (getBlockStateValue(block, "create:wrench_active") !== true) return;
        if (!hasRpm(rpm)) return;
        assembleMechanicalBearing(block);
        const nextConstructs = getConstructs(block);
        if (nextConstructs.length === 0) {
            const nextAngle = getBearingVisualAngle(block, rpm);
            setBearingEntityAngle(block.dimension, block, nextAngle);
            return;
        }
    }
    updateBearingConstructGroup(block.dimension, block, getConstructs(block), rpm);
}

/** @param {Block} block @param {number} rpm */
export function bearingContraptionRpmUpdate(block, rpm) {
    if (!block?.isValid || !isBearingBlock(block)) return;
    if (block.typeId !== WINDMILL_BEARING_BLOCK) rpm = clampBearingRpm(rpm);

    let constructs = getConstructs(block);
    if (!hasRpm(rpm)) {
        const quarterTurns = getNearestBearingQuarterTurn(block);
        for (const construct of constructs) restoreConstruct(block, construct, quarterTurns);
        resetBearingRotationState(block, 0);
        setBearingEntityAngle(block.dimension, block, 0);
        return;
    }

    if (constructs.length === 0) {
        if (block.typeId === MECHANICAL_BEARING_BLOCK
            && getBlockStateValue(block, "create:wrench_active") !== true) return;
        if (block.typeId === WINDMILL_BEARING_BLOCK) {
            resetBearingRotationState(block, 0);
            setBearingEntityAngle(block.dimension, block, 0);
        }
        assembleMechanicalBearing(block);
        constructs = getConstructs(block);
        if (constructs.length === 0) {
            if (String(block.typeId) === WINDMILL_BEARING_BLOCK) {
                resetBearingRotationState(block, 0);
                setBearingEntityAngle(block.dimension, block, 0);
                return;
            }
            const nextAngle = getBearingVisualAngle(block, rpm);
            setBearingEntityAngle(block.dimension, block, nextAngle);
            return;
        }
    }

    updateBearingConstructGroup(block.dimension, block, constructs, rpm);
}

/** @param {Block} block @param {number} rpm */
export function mechanicalBearingRpmUpdate(block, rpm) {
    if (!block?.isValid || block.typeId !== MECHANICAL_BEARING_BLOCK) return;
    bearingContraptionRpmUpdate(block, rpm);
}

/** @param {Block} block @param {Dimension} dimension */
export function bearingContraptionBreak(block, dimension) {
    const constructs = getConstructs(block);
    if (constructs.length === 0) {
        for (const type of getConstructEntityTypes()) {
            constructs.push(...dimension.getEntities({
                type,
                location: { x: block.x + 0.5, y: block.y + 1.5, z: block.z + 0.5 },
                maxDistance: 8
            }).filter(entity => {
                const bearing = getStoredBearingLocation(entity);
                return bearing?.x === block.x && bearing?.y === block.y && bearing?.z === block.z;
            }));
        }
    }
    const quarterTurns = getNearestBearingQuarterTurn(block);
    for (const construct of constructs) restoreConstruct(block, construct, quarterTurns);
    resetBearingRotationState(block, 0);
    setBearingEntityAngle(dimension, block, 0);
}

/** @param {Block} block @param {Dimension} dimension */
export function mechanicalBearingBreak(block, dimension) {
    if (!block?.isValid) return;
    bearingContraptionBreak(block, dimension);
}

/** @param {Block} block */
export function mechanicalBearingBlockPlace(block) {
    let below;
    try { below = block.below(); } catch { return; }
    if (below?.typeId !== MECHANICAL_BEARING_BLOCK) return;
    if (getBlockStateValue(below, "create:wrench_active") !== true) return;
    if (!hasRpm(getBearingRpm(below))) return;
    assembleMechanicalBearing(below);
}
/** @param {{block: Block, player: Player, itemStack?: McItemStack, isFirstEvent?: boolean, cancel: boolean}} data */
export function mechanicalBearingWrenchInteract(data) {
    const { block, player } = data;
    let item = data.itemStack;
    try { item ??= player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand); } catch {}
    if (data.isFirstEvent === false) return false;
    if (block?.typeId !== MECHANICAL_BEARING_BLOCK || item?.typeId !== "create:wrench" || player?.isSneaking) return false;

    data.cancel = true;
    system.run(() => {
        if (!block?.isValid || block.typeId !== MECHANICAL_BEARING_BLOCK) return;
        const active = getBlockStateValue(block, "create:wrench_active") === true;
        try { setCustomBlockState(block, "create:wrench_active", !active); } catch { return; }
        if (active) bearingContraptionBreak(block, block.dimension);
        else {
            assembleMechanicalBearing(block);
            updateBearingConstructGroup(block.dimension, block, getConstructs(block), getBearingRpm(block));
        }
        try { block.dimension.playSound("random.click", block.center(), { volume: 0.7, pitch: active ? 0.8 : 1.2 }); } catch {}
    });
    return true;
}








