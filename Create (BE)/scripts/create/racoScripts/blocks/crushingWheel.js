import * as mc from "@minecraft/server";
import * as racoAPI from "../raco-API.js";
import { compatibilityRecipes } from "../../compatibility/registries.js";

// ── Crushing Wheel recipes ────────────────────────────────────────────────────
// Same format as millstone: { duration, particleRGB, output: [{item, count, chance}] }
// Only includes items present in this addon.
// Source: Create mod wiki / official datapack, adapted for Bedrock items.
const CRUSHING_RECIPES = {
    // ── Ores → Crushed (doubled output like Create Java) ──
    'minecraft:iron_ore':         { duration: 150, particleRGB: { red: 0.70, green: 0.40, blue: 0.30, alpha: 1 }, output: [{ item: 'create:crushed_raw_iron',   count: 2 }, { item: 'minecraft:raw_iron',   count: 1, chance: 0.25 }, { item: 'minecraft:cobblestone', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.12 }] },
    'minecraft:deepslate_iron_ore':{ duration: 150, particleRGB: { red: 0.70, green: 0.40, blue: 0.30, alpha: 1 }, output: [{ item: 'create:crushed_raw_iron',   count: 2 }, { item: 'minecraft:raw_iron',   count: 1, chance: 0.25 }, { item: 'minecraft:cobbled_deepslate', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.12 }] },
    'minecraft:copper_ore':       { duration: 150, particleRGB: { red: 0.85, green: 0.50, blue: 0.30, alpha: 1 }, output: [{ item: 'create:crushed_raw_copper', count: 2 }, { item: 'minecraft:raw_copper', count: 1, chance: 0.25 }, { item: 'minecraft:cobblestone', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.10 }] },
    'minecraft:deepslate_copper_ore':{ duration: 150, particleRGB: { red: 0.85, green: 0.50, blue: 0.30, alpha: 1 }, output: [{ item: 'create:crushed_raw_copper', count: 2 }, { item: 'minecraft:raw_copper', count: 1, chance: 0.25 }, { item: 'minecraft:cobbled_deepslate', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.10 }] },
    'minecraft:gold_ore':         { duration: 150, particleRGB: { red: 0.95, green: 0.80, blue: 0.15, alpha: 1 }, output: [{ item: 'create:crushed_raw_gold',   count: 2 }, { item: 'minecraft:raw_gold',   count: 1, chance: 0.25 }, { item: 'minecraft:cobblestone', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.18 }] },
    'minecraft:deepslate_gold_ore':{ duration: 150, particleRGB: { red: 0.95, green: 0.80, blue: 0.15, alpha: 1 }, output: [{ item: 'create:crushed_raw_gold',   count: 2 }, { item: 'minecraft:raw_gold',   count: 1, chance: 0.25 }, { item: 'minecraft:cobbled_deepslate', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.18 }] },
    'minecraft:nether_gold_ore':  { duration: 150, particleRGB: { red: 0.95, green: 0.80, blue: 0.15, alpha: 1 }, output: [{ item: 'create:crushed_raw_gold',   count: 2 }, { item: 'minecraft:raw_gold',   count: 1, chance: 0.25 }, { item: 'minecraft:netherrack',  count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.20 }] },
    'minecraft:coal_ore':         { duration: 150, particleRGB: { red: 0.15, green: 0.15, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:coal', count: 2 }, { item: 'minecraft:coal', count: 1, chance: 0.25 }, { item: 'minecraft:cobblestone', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.25 }] },
    'minecraft:deepslate_coal_ore':{ duration: 150, particleRGB: { red: 0.15, green: 0.15, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:coal', count: 2 }, { item: 'minecraft:coal', count: 1, chance: 0.25 }, { item: 'minecraft:cobbled_deepslate', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.25 }] },
    'minecraft:lapis_ore':        { duration: 150, particleRGB: { red: 0.15, green: 0.20, blue: 0.75, alpha: 1 }, output: [{ item: 'minecraft:lapis_lazuli', count: 8 }, { item: 'minecraft:lapis_lazuli', count: 4, chance: 0.50 }, { item: 'minecraft:cobblestone', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 2, chance: 0.55 }] },
    'minecraft:deepslate_lapis_ore':{ duration: 150, particleRGB: { red: 0.15, green: 0.20, blue: 0.75, alpha: 1 }, output: [{ item: 'minecraft:lapis_lazuli', count: 8 }, { item: 'minecraft:lapis_lazuli', count: 4, chance: 0.50 }, { item: 'minecraft:cobbled_deepslate', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 2, chance: 0.55 }] },
    'minecraft:redstone_ore':     { duration: 150, particleRGB: { red: 0.85, green: 0.10, blue: 0.08, alpha: 1 }, output: [{ item: 'minecraft:redstone', count: 6 }, { item: 'minecraft:redstone', count: 2, chance: 0.50 }, { item: 'minecraft:cobblestone', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.30 }] },
    'minecraft:deepslate_redstone_ore':{ duration: 150, particleRGB: { red: 0.85, green: 0.10, blue: 0.08, alpha: 1 }, output: [{ item: 'minecraft:redstone', count: 6 }, { item: 'minecraft:redstone', count: 2, chance: 0.50 }, { item: 'minecraft:cobbled_deepslate', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.30 }] },
    'minecraft:diamond_ore':      { duration: 150, particleRGB: { red: 0.25, green: 0.85, blue: 0.90, alpha: 1 }, output: [{ item: 'minecraft:diamond', count: 2 }, { item: 'minecraft:diamond', count: 1, chance: 0.25 }, { item: 'minecraft:cobblestone', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.35 }] },
    'minecraft:deepslate_diamond_ore':{ duration: 150, particleRGB: { red: 0.25, green: 0.85, blue: 0.90, alpha: 1 }, output: [{ item: 'minecraft:diamond', count: 2 }, { item: 'minecraft:diamond', count: 1, chance: 0.25 }, { item: 'minecraft:cobbled_deepslate', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.35 }] },
    'minecraft:emerald_ore':      { duration: 150, particleRGB: { red: 0.10, green: 0.85, blue: 0.35, alpha: 1 }, output: [{ item: 'minecraft:emerald', count: 2 }, { item: 'minecraft:emerald', count: 1, chance: 0.25 }, { item: 'minecraft:cobblestone', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.35 }] },
    'minecraft:deepslate_emerald_ore':{ duration: 150, particleRGB: { red: 0.10, green: 0.85, blue: 0.35, alpha: 1 }, output: [{ item: 'minecraft:emerald', count: 2 }, { item: 'minecraft:emerald', count: 1, chance: 0.25 }, { item: 'minecraft:cobbled_deepslate', count: 1, chance: 0.12 }, { item: 'create:experience_nugget', count: 1, chance: 0.35 }] },

    // ── Raw Ores → Crushed ──
    'minecraft:raw_iron':   { duration: 150, particleRGB: { red: 0.70, green: 0.40, blue: 0.30, alpha: 1 }, output: [{ item: 'create:crushed_raw_iron',   count: 1 }, { item: 'minecraft:raw_iron',   count: 1, chance: 0.25 }, { item: 'create:experience_nugget', count: 1, chance: 0.08 }] },
    'minecraft:raw_copper': { duration: 150, particleRGB: { red: 0.85, green: 0.50, blue: 0.30, alpha: 1 }, output: [{ item: 'create:crushed_raw_copper', count: 1 }, { item: 'minecraft:raw_copper', count: 1, chance: 0.25 }, { item: 'create:experience_nugget', count: 1, chance: 0.07 }] },
    'minecraft:raw_gold':   { duration: 150, particleRGB: { red: 0.95, green: 0.80, blue: 0.15, alpha: 1 }, output: [{ item: 'create:crushed_raw_gold',   count: 1 }, { item: 'minecraft:raw_gold',   count: 1, chance: 0.25 }, { item: 'create:experience_nugget', count: 1, chance: 0.12 }] },
    'create:raw_zinc':      { duration: 150, particleRGB: { red: 0.75, green: 0.75, blue: 0.60, alpha: 1 }, output: [{ item: 'create:crushed_raw_zinc',   count: 1 }, { item: 'create:raw_zinc',      count: 1, chance: 0.25 }, { item: 'create:experience_nugget', count: 1, chance: 0.08 }] },

    // ── Stone variants → Gravel / Sand ──
    'minecraft:cobblestone':       { duration: 100, particleRGB: { red: 0.55, green: 0.55, blue: 0.55, alpha: 1 }, output: [{ item: 'minecraft:gravel', count: 1 }, { item: 'minecraft:flint', count: 1, chance: 0.10 }] },
    'minecraft:stone':             { duration: 100, particleRGB: { red: 0.55, green: 0.55, blue: 0.55, alpha: 1 }, output: [{ item: 'minecraft:cobblestone', count: 1 }] },
    'minecraft:gravel':            { duration: 100, particleRGB: { red: 0.50, green: 0.48, blue: 0.46, alpha: 1 }, output: [{ item: 'minecraft:sand', count: 1 }, { item: 'minecraft:flint', count: 1, chance: 0.25 }] },
    'minecraft:granite':           { duration: 100, particleRGB: { red: 0.75, green: 0.50, blue: 0.45, alpha: 1 }, output: [{ item: 'minecraft:gravel', count: 1 }, { item: 'minecraft:granite', count: 1, chance: 0.10 }] },
    'minecraft:diorite':           { duration: 100, particleRGB: { red: 0.85, green: 0.85, blue: 0.85, alpha: 1 }, output: [{ item: 'minecraft:gravel', count: 1 }, { item: 'minecraft:diorite', count: 1, chance: 0.10 }] },
    'minecraft:andesite':          { duration: 100, particleRGB: { red: 0.55, green: 0.55, blue: 0.55, alpha: 1 }, output: [{ item: 'minecraft:gravel', count: 1 }, { item: 'minecraft:andesite', count: 1, chance: 0.10 }] },
    'minecraft:deepslate':         { duration: 100, particleRGB: { red: 0.30, green: 0.30, blue: 0.35, alpha: 1 }, output: [{ item: 'minecraft:cobbled_deepslate', count: 1 }] },
    'minecraft:cobbled_deepslate': { duration: 100, particleRGB: { red: 0.30, green: 0.30, blue: 0.35, alpha: 1 }, output: [{ item: 'minecraft:gravel', count: 1 }, { item: 'minecraft:flint', count: 1, chance: 0.10 }] },
    // Receita original do Create: Cinder Flour, com uma segunda unidade por chance.
    'minecraft:netherrack':        { duration: 100, particleRGB: { red: 0.65, green: 0.20, blue: 0.20, alpha: 1 }, output: [{ item: 'create:cinder_flour', count: 1 }, { item: 'create:cinder_flour', count: 1, chance: 0.75 }] },

    // ── Logs → Sawdust (via Create: wood planks x4 guaranteed) ──
    'minecraft:oak_log':      { duration: 100, particleRGB: { red: 0.60, green: 0.45, blue: 0.25, alpha: 1 }, output: [{ item: 'minecraft:oak_planks',      count: 6 }] },
    'minecraft:spruce_log':   { duration: 100, particleRGB: { red: 0.45, green: 0.30, blue: 0.18, alpha: 1 }, output: [{ item: 'minecraft:spruce_planks',   count: 6 }] },
    'minecraft:birch_log':    { duration: 100, particleRGB: { red: 0.80, green: 0.72, blue: 0.50, alpha: 1 }, output: [{ item: 'minecraft:birch_planks',    count: 6 }] },
    'minecraft:jungle_log':   { duration: 100, particleRGB: { red: 0.60, green: 0.42, blue: 0.22, alpha: 1 }, output: [{ item: 'minecraft:jungle_planks',   count: 6 }] },
    'minecraft:acacia_log':   { duration: 100, particleRGB: { red: 0.70, green: 0.40, blue: 0.22, alpha: 1 }, output: [{ item: 'minecraft:acacia_planks',   count: 6 }] },
    'minecraft:dark_oak_log': { duration: 100, particleRGB: { red: 0.28, green: 0.20, blue: 0.12, alpha: 1 }, output: [{ item: 'minecraft:dark_oak_planks', count: 6 }] },
    'minecraft:mangrove_log': { duration: 100, particleRGB: { red: 0.55, green: 0.22, blue: 0.18, alpha: 1 }, output: [{ item: 'minecraft:mangrove_planks', count: 6 }] },
    'minecraft:cherry_log':   { duration: 100, particleRGB: { red: 0.80, green: 0.55, blue: 0.55, alpha: 1 }, output: [{ item: 'minecraft:cherry_planks',   count: 6 }] },
    'minecraft:crimson_stem': { duration: 100, particleRGB: { red: 0.55, green: 0.15, blue: 0.35, alpha: 1 }, output: [{ item: 'minecraft:crimson_planks',  count: 6 }] },
    'minecraft:warped_stem':  { duration: 100, particleRGB: { red: 0.15, green: 0.55, blue: 0.50, alpha: 1 }, output: [{ item: 'minecraft:warped_planks',   count: 6 }] },

    // ── Bones ──
    'minecraft:bone':       { duration: 50,  particleRGB: { red: 0.90, green: 0.88, blue: 0.80, alpha: 1 }, output: [{ item: 'minecraft:bone_meal', count: 3 }, { item: 'minecraft:bone_meal', count: 1, chance: 0.50 }] },
    'minecraft:bone_block': { duration: 100, particleRGB: { red: 0.90, green: 0.88, blue: 0.80, alpha: 1 }, output: [{ item: 'minecraft:bone_meal', count: 9 }, { item: 'minecraft:bone_meal', count: 3, chance: 0.50 }] },

    // ── Coal / Charcoal ──
    'minecraft:coal':       { duration: 100, particleRGB: { red: 0.15, green: 0.15, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:coal', count: 1 }, { item: 'minecraft:coal', count: 1, chance: 0.12 }] },
    'minecraft:charcoal':   { duration: 100, particleRGB: { red: 0.20, green: 0.18, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:charcoal', count: 1 }, { item: 'minecraft:charcoal', count: 1, chance: 0.12 }] },
    // ── Nether ──
    'minecraft:quartz_ore':     { duration: 150, particleRGB: { red: 0.90, green: 0.85, blue: 0.80, alpha: 1 }, output: [{ item: 'minecraft:quartz', count: 2 }, { item: 'minecraft:quartz', count: 1, chance: 0.25 }, { item: 'minecraft:netherrack', count: 1, chance: 0.12 }] },
    'minecraft:glowstone':      { duration: 100, particleRGB: { red: 0.95, green: 0.80, blue: 0.30, alpha: 1 }, output: [{ item: 'minecraft:glowstone_dust', count: 4 }, { item: 'minecraft:glowstone_dust', count: 2, chance: 0.50 }] },

    // ── Misc ──
    'minecraft:sand':       { duration: 50, particleRGB: { red: 0.80, green: 0.75, blue: 0.55, alpha: 1 }, output: [{ item: 'minecraft:gravel', count: 1, chance: 0.50 }] },
    'minecraft:prismarine': { duration: 100, particleRGB: { red: 0.30, green: 0.70, blue: 0.65, alpha: 1 }, output: [{ item: 'minecraft:prismarine_shard', count: 4 }, { item: 'minecraft:prismarine_crystals', count: 2, chance: 0.50 }] },
};

// ── Mob damage ────────────────────────────────────────────────────────────────
// Deals damage to living entities caught between the two active wheels.
// Interval: every 10 ticks while spinning.
const MOB_DAMAGE_AMOUNT = 10; // half hearts × 2

/** @typedef {{item: string, count: number, chance?: number}} CrushingOutput */
/** @typedef {{duration: number, particleRGB: {red: number, green: number, blue: number, alpha: number}, output: CrushingOutput[]}} CrushingRecipe */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Entity} Entity */
/** @typedef {{startTick: number}} CrushingProgress */
/** @type {Readonly<Record<string, CrushingRecipe>>} */
const crushingRecipesTyped = CRUSHING_RECIPES;

/**
 * Checks if a neighbor block is a valid crushing partner and returns its entity RPM.
 * Returns null if not a valid partner.
 * @param {mc.Block} neighbor
 * @returns {mc.Entity | null}
 */
/** @param {Block | undefined} neighbor @returns {Entity | null} */
function getNeighborEntity(neighbor) {
    if (!neighbor || neighbor.typeId !== "create:crushing_wheel") return null;
    if (neighbor.permutation.getAllStates()["create:is_spinning"] !== true) return null;
    return neighbor.dimension.getEntities({
        type: "create:crushing_wheel_entity",
        location: neighbor.center(),
        maxDistance: 0.5
    })[0] ?? null;
}

/**
 * Searches all 4 horizontal directions at distance 1 AND distance 2 for a crushing_wheel
 * partner that spins in the opposite direction to `entity`.
 *
 * Returns { partner, gapCenter, partnerEntity } or null.
 * Distance 1 = adjacent blocks (gap center = midpoint between the two block centers).
 * Distance 2 = one air block between them (gap center = center of the middle block).
 */
/** @param {Block} block @param {Entity} entity */
/** @typedef {{partner: Block, partnerEntity: Entity, gap: Vector3}} ActiveCrushingPair */
/** @param {Block} block @param {Entity} entity @returns {ActiveCrushingPair | null} */
function findActivePair(block, entity) {
    const rawRpm = entity.getProperty("create:rpm");
    const myRpm = typeof rawRpm === "number" ? rawRpm : 0;
    if (myRpm === 0) return null;

    const directions = [
        { d1: () => block.east(),  d2: () => block.east(2),  midGap: () => block.east()  },
        { d1: () => block.west(),  d2: () => block.west(2),  midGap: () => block.west()  },
        { d1: () => block.north(), d2: () => block.north(2), midGap: () => block.north() },
        { d1: () => block.south(), d2: () => block.south(2), midGap: () => block.south() },
    ];

    for (const dir of directions) {
        // Check distance 1 (adjacent)
        try {
            const neighbor = dir.d1();
            const neighborEntity = getNeighborEntity(neighbor);
            if (neighbor && neighborEntity) {
                const neighborValue = neighborEntity.getProperty("create:rpm");
                const neighborRpm = typeof neighborValue === "number" ? neighborValue : 0;
                if (neighborRpm !== 0 && Math.sign(myRpm) !== Math.sign(neighborRpm)) {
                    const a = block.center(), b = neighbor.center();
                    return {
                        partner: neighbor,
                        partnerEntity: neighborEntity,
                        gap: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
                    };
                }
            }
        } catch {}

        // Check distance 2 (1-block gap between them)
        try {
            const neighbor2 = dir.d2();
            const neighborEntity2 = getNeighborEntity(neighbor2);
            if (neighbor2 && neighborEntity2) {
                const neighborValue = neighborEntity2.getProperty("create:rpm");
                const neighborRpm2 = typeof neighborValue === "number" ? neighborValue : 0;
                if (neighborRpm2 !== 0 && Math.sign(myRpm) !== Math.sign(neighborRpm2)) {
                    // Gap is the middle block
                    const middleBlock = dir.midGap();
                    if (!middleBlock) continue;
                    const mid = middleBlock.center();
                    return {
                        partner: neighbor2,
                        partnerEntity: neighborEntity2,
                        gap: mid
                    };
                }
            }
        } catch {}
    }
    return null;
}

/**
 * Spawn colored crushing particles at the gap.
 */
/** @param {Dimension} dimension @param {Vector3} pos @param {{red: number, green: number, blue: number, alpha: number}} color @param {number} count */
function spawnCrushingParticles(dimension, pos, color, count) {
    const molang = new mc.MolangVariableMap();
    molang.setColorRGBA("color", color);
    for (let i = 0; i < count; i++) {
        const px = pos.x + (Math.random() - 0.5) * 0.4;
        const pz = pos.z + (Math.random() - 0.5) * 0.4;
        try { dimension.spawnParticle("create:millstone_crushing", { x: px, y: pos.y, z: pz }, molang); } catch {}
    }
}

/** @param {Dimension} dimension @param {Vector3} pos */
function spawnCritParticles(dimension, pos) {
    try { dimension.spawnParticle("create:millstone_crit", pos); } catch {}
}

/** @param {number} rpm @param {number} duration */
function getProcessingTicks(rpm, duration) {
    let mpf = Math.abs(rpm / 16);
    mpf = Math.max(1, Math.min(512, mpf));
    return Math.ceil(duration / mpf) + 1;
}

/**
 * Main tick — called every tick while the crushing wheel is spinning.
 * Only the block with the smaller (x+z) coordinate drives processing (avoids double-processing).
 * @param {mc.Block} block
 */
/** @param {Block} block */
export function crushingWheelTick(block) {
    const entity = block?.dimension?.getEntities({
        type: "create:crushing_wheel_entity",
        location: block.center(),
        maxDistance: 0.5
    })[0];
    if (!entity) return;

    const rpmValue = entity.getProperty("create:rpm");
    const rpm = typeof rpmValue === "number" ? rpmValue : 0;
    if (rpm === 0) return;

    const result = findActivePair(block, entity);
    if (!result) return;

    const { partner, gap } = result;

    const now = mc.system.currentTick;

    // ── Push items sitting on top of THIS wheel toward the gap ────────────
    // Both wheels run this independently — no primary check needed.
    if (now % 2 === 0) {
        const towardPartner = {
            x: Math.sign(partner.x - block.x) * 0.15,
            y: 0,
            z: Math.sign(partner.z - block.z) * 0.15
        };
        const surfaceItems = block.dimension.getEntities({
            type: "minecraft:item",
            location: { x: block.center().x, y: block.location.y + 1, z: block.center().z },
            maxDistance: 0.7
        });
        for (const si of surfaceItems) {
            if (!si.isValid) continue;
            // Don't push items already in the gap (being processed)
            if (si.location.y < gap.y + 0.3) continue;
            try { si.applyImpulse(towardPartner); } catch {}
        }
    }

    // Only the "primary" wheel drives processing to avoid double output.
    // Primary = smaller (x + z) coordinate; use x as tiebreaker.
    const myKey = block.x + block.z + block.x * 0.001;
    const partnerKey = partner.x + partner.z + partner.x * 0.001;
    if (myKey > partnerKey) return;

    // Knockback direction for output items: perpendicular to the pair axis.
    const pairAlongX = partner.x !== block.x;
    const rpmSign = Math.sign(rpm);
    const kickImpulse = pairAlongX
        ? { x: 0,             y: 0.25, z: rpmSign * 0.3 }
        : { x: rpmSign * 0.3, y: 0.25, z: 0 };
    if (now % 10 === 0) {
        const mobs = block.dimension.getEntities({
            location: gap,
            maxDistance: 0.6,
            excludeTypes: ["create:conveyor_item", "create:crushing_wheel_entity",
                           "create:mechanical_press_entity", "create:deployer_entity",
                           "create:millstone_entity", "minecraft:item"]
        });
        for (const mob of mobs) {
            if (!mob.isValid) continue;
            try { mob.applyDamage(MOB_DAMAGE_AMOUNT, { cause: mc.EntityDamageCause.magic }); } catch {}
        }
    }

    // ── Item crushing ─────────────────────────────────────────────────────
    // Small radius: items must physically fall to gap level before being caught.
    // The fall from hand height (~1+ block above) is the natural "falling in" animation.
    // Once inside the radius, pin the item every tick so it can't fall further.
    const itemEntities = block.dimension.getEntities({
        type: "minecraft:item",
        location: gap,
        maxDistance: 0.65
    });

    for (const itemEntity of itemEntities) {
        if (!itemEntity.isValid) continue;

        const itemStack = itemEntity.getComponent("minecraft:item")?.itemStack;
        if (!itemStack) continue;

        const recipe = compatibilityRecipes.crushing.get(itemStack.typeId) ?? crushingRecipesTyped[itemStack.typeId];
        if (!recipe) continue;

        // Pin the item in place every tick so gravity can't drop it below the gap
        try {
            itemEntity.teleport({ x: gap.x, y: gap.y, z: gap.z });
            itemEntity.clearVelocity();
        } catch {}

        // Read or start processing timer
        const procRaw = itemEntity.getDynamicProperty("create:crushing_progress");
        /** @type {CrushingProgress | null} */
        let proc = typeof procRaw === "string" ? JSON.parse(procRaw) : null;

        if (!proc) {
            proc = { startTick: now };
            itemEntity.setDynamicProperty("create:crushing_progress", JSON.stringify(proc));
        }

        const elapsed = now - proc.startTick;

        // Particles while crushing (every 3 ticks)
        if (now % 3 === 0) {
            spawnCrushingParticles(block.dimension, gap, recipe.particleRGB, 2);
            spawnCritParticles(block.dimension, { x: gap.x, y: gap.y + 0.1, z: gap.z });
        }

        if (elapsed < getProcessingTicks(rpm, recipe.duration ?? 100)) continue;

        // ── Done — output and consume ─────────────────────────────────────
        spawnCritParticles(block.dimension, { x: gap.x, y: gap.y + 0.2, z: gap.z });
        block.dimension.playSound("create:mechanical_press.crushing", gap, {
            volume: 0.7, pitch: 1.0 + (Math.random() - 0.5) * 0.2
        });

        // Spawn outputs below the block so they fall away and can't re-enter the gap
        const dropPos = { x: gap.x, y: block.location.y - 0.6, z: gap.z };
        for (const entry of (recipe.output ?? [])) {
            if (Math.random() < (entry.chance ?? 1.0)) {
                try {
                    const spawnedItem = block.dimension.spawnItem(new mc.ItemStack(entry.item, entry.count), dropPos);
                    if (spawnedItem) {
                        spawnedItem.clearVelocity();
                        spawnedItem.applyImpulse({ ...kickImpulse, y: -0.2 });
                    }
                } catch {}
            }
        }

        // Consome uma unidade e mantém o restante preso entre as rodas. Antes,
        // a pilha restante era criada em dropPos e caía junto com o resultado,
        // interrompendo o processamento depois do primeiro item.
        if (itemStack.amount > 1) {
            const remaining = itemStack.clone();
            remaining.amount = itemStack.amount - 1;
            try {
                const spawnedItem = block.dimension.spawnItem(remaining, gap);
                if (spawnedItem) {
                    spawnedItem.teleport(gap);
                    spawnedItem.clearVelocity();
                    spawnedItem.setDynamicProperty("create:crushing_progress", JSON.stringify({ startTick: now }));
                }
            } catch {}
        }
        try { itemEntity.remove(); } catch {}
    }
}
