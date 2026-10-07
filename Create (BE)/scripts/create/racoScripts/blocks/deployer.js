import * as mc from "@minecraft/server";
import * as racoAPI from "../raco-API.js";
import { initRpmBlock } from "../../andrielScripts/rpm/rpmCore.js";
import { compatibilityRecipes } from "../../compatibility/registries.js";

/** @typedef {import('@minecraft/server').Entity} Entity */
/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').ItemStack} ItemStack */
/** @typedef {{x:number, y:number, z:number}} Vector3 */
/** @typedef {{surface:string, held:string | Set<string>, result:string, keepHeld:boolean, damageHeld?:boolean, sound?:string}} DeployRecipe */
/** @typedef {{held:string, keepHeld:boolean, operation?:string}} SequencedStep */
/** @typedef {{id:string, surface:string, inProgress?:string, steps:SequencedStep[], passes:number, result:string, junk:{item:string, weight:number}[]}} SequencedRecipe */
/** @typedef {SequencedRecipe | import('../../compatibility/registries.js').CompatibilityRecipe} DeployableSequencedRecipe */

// Snaps RPM to nearest power-of-2 for animation selection
/** @param {number} rpm */
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

// Full cycle duration in ticks for each snapped RPM speed.
// Derived from Fabricate's timeConfig (seconds) × 20 (tps) × 2 (extend+retract).
// e.g. speed 32 → 0.625s × 20 × 2 = 25 ticks per full cycle.
const TIME_CONFIG = {
    1: 800, 2: 400, 4: 200, 8: 100,
    16: 50, 32: 25, 64: 12.5, 128: 6.25, 256: 3.125
};

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

const CROP_PLANTS = new Map([
    ["minecraft:wheat_seeds", "minecraft:wheat"],
    ["minecraft:beetroot_seeds", "minecraft:beetroot"],
    ["minecraft:pumpkin_seeds", "minecraft:pumpkin_stem"],
    ["minecraft:melon_seeds", "minecraft:melon_stem"],
    ["minecraft:torchflower_seeds", "minecraft:torchflower_crop"],
    ["minecraft:pitcher_pod", "minecraft:pitcher_crop"],
    ["minecraft:carrot", "minecraft:carrots"],
    ["minecraft:potato", "minecraft:potatoes"]
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

const BREEDING_FOODS = new Map([
    ["minecraft:cow", new Set(["minecraft:wheat"])],
    ["minecraft:sheep", new Set(["minecraft:wheat"])],
    ["minecraft:mooshroom", new Set(["minecraft:wheat"])],
    ["minecraft:goat", new Set(["minecraft:wheat"])],
    ["minecraft:pig", new Set(["minecraft:carrot", "minecraft:potato", "minecraft:beetroot"])],
    ["minecraft:chicken", new Set(["minecraft:wheat_seeds", "minecraft:pumpkin_seeds", "minecraft:melon_seeds", "minecraft:beetroot_seeds", "minecraft:torchflower_seeds"])],
    ["minecraft:rabbit", new Set(["minecraft:carrot", "minecraft:golden_carrot", "minecraft:dandelion"])],
    ["minecraft:turtle", new Set(["minecraft:seagrass"])],
    ["minecraft:panda", new Set(["minecraft:bamboo"])],
    ["minecraft:fox", new Set(["minecraft:sweet_berries", "minecraft:glow_berries"])],
    ["minecraft:cat", new Set(["minecraft:cod", "minecraft:salmon", "minecraft:tropical_fish"])],
    ["minecraft:wolf", new Set(["minecraft:beef", "minecraft:chicken", "minecraft:mutton", "minecraft:porkchop", "minecraft:rabbit", "minecraft:cod", "minecraft:salmon", "minecraft:rotten_flesh", "minecraft:cooked_beef", "minecraft:cooked_chicken", "minecraft:cooked_mutton", "minecraft:cooked_porkchop", "minecraft:cooked_rabbit", "minecraft:cooked_cod", "minecraft:cooked_salmon"])],
    ["minecraft:horse", new Set(["minecraft:golden_carrot", "minecraft:golden_apple", "minecraft:apple", "minecraft:wheat", "minecraft:hay_block"])],
    ["minecraft:donkey", new Set(["minecraft:golden_carrot", "minecraft:golden_apple", "minecraft:apple", "minecraft:wheat", "minecraft:hay_block"])],
    ["minecraft:mule", new Set(["minecraft:golden_carrot", "minecraft:golden_apple", "minecraft:apple", "minecraft:wheat", "minecraft:hay_block"])],
    ["minecraft:llama", new Set(["minecraft:hay_block", "minecraft:wheat"])],
    ["minecraft:bee", new Set(["minecraft:dandelion", "minecraft:poppy", "minecraft:blue_orchid", "minecraft:allium", "minecraft:azure_bluet", "minecraft:red_tulip", "minecraft:orange_tulip", "minecraft:white_tulip", "minecraft:pink_tulip", "minecraft:oxeye_daisy", "minecraft:cornflower", "minecraft:lily_of_the_valley", "minecraft:wither_rose", "minecraft:sunflower", "minecraft:lilac", "minecraft:rose_bush", "minecraft:peony", "minecraft:torchflower"])],
]);

const LOVE_UNTIL_PROP = "create:deployer_love_until";
const BREED_COOLDOWN_PROP = "create:deployer_breed_cooldown";
const DEPLOYER_FILTER_ENTITY = "create:deployer_filter";
const DEPLOYER_FILTER_ITEM_PROP = "create:deployer_filter_item";
const DEPLOYER_NEEDS_RPM_RECALC_PROP = "create:deployer_needs_rpm_recalc";
const DEPLOYER_HOPPER_INPUT_INTERVAL = 20;
const DEPLOYER_HOPPER_INPUT_TICKS = new Map();

const NO_GENERIC_BLOCK_PLACE_ITEMS = new Set([
    "minecraft:wheat", "minecraft:wheat_seeds", "minecraft:beetroot", "minecraft:beetroot_seeds",
    "minecraft:carrot", "minecraft:potato", "minecraft:pumpkin_seeds", "minecraft:melon_seeds",
    "minecraft:torchflower_seeds", "minecraft:pitcher_pod", "minecraft:dandelion", "minecraft:seagrass",
    "minecraft:bamboo", "minecraft:sweet_berries", "minecraft:glow_berries", "minecraft:cod",
    "minecraft:salmon", "minecraft:tropical_fish", "minecraft:beef", "minecraft:chicken",
    "minecraft:mutton", "minecraft:porkchop", "minecraft:rabbit", "minecraft:rotten_flesh",
    "minecraft:cooked_beef", "minecraft:cooked_chicken", "minecraft:cooked_mutton",
    "minecraft:cooked_porkchop", "minecraft:cooked_rabbit", "minecraft:cooked_cod",
    "minecraft:cooked_salmon", "minecraft:apple", "minecraft:golden_apple", "minecraft:golden_carrot",
    "minecraft:hay_block"
]);

const HAND_TOOL_TYPES = new Set(["sword", "axe", "pickaxe", "shovel", "hoe"]);
const DEPOT_OUTPUT_Y = 13 / 16;
const INVERT_FACE = { north: "south", south: "north", east: "west", west: "east", up: "down", down: "up" };

const STRIPPED_LOGS = new Map([
    ["minecraft:oak_log", "minecraft:stripped_oak_log"],
    ["minecraft:spruce_log", "minecraft:stripped_spruce_log"],
    ["minecraft:birch_log", "minecraft:stripped_birch_log"],
    ["minecraft:jungle_log", "minecraft:stripped_jungle_log"],
    ["minecraft:acacia_log", "minecraft:stripped_acacia_log"],
    ["minecraft:dark_oak_log", "minecraft:stripped_dark_oak_log"],
    ["minecraft:mangrove_log", "minecraft:stripped_mangrove_log"],
    ["minecraft:cherry_log", "minecraft:stripped_cherry_log"],
    ["minecraft:pale_oak_log", "minecraft:stripped_pale_oak_log"],
    ["minecraft:crimson_stem", "minecraft:stripped_crimson_stem"],
    ["minecraft:warped_stem", "minecraft:stripped_warped_stem"],
    ["minecraft:bamboo_block", "minecraft:stripped_bamboo_block"]
]);

const TOOL_DAMAGE = new Map([
    ["wooden", 4], ["golden", 4], ["stone", 5], ["iron", 6], ["diamond", 7], ["netherite", 8]
]);

const FORTUNE_BLOCK_DROPS = new Map([
    ["minecraft:coal_ore", "minecraft:coal"],
    ["minecraft:deepslate_coal_ore", "minecraft:coal"],
    ["minecraft:diamond_ore", "minecraft:diamond"],
    ["minecraft:deepslate_diamond_ore", "minecraft:diamond"],
    ["minecraft:emerald_ore", "minecraft:emerald"],
    ["minecraft:deepslate_emerald_ore", "minecraft:emerald"],
    ["minecraft:lapis_ore", "minecraft:lapis_lazuli"],
    ["minecraft:deepslate_lapis_ore", "minecraft:lapis_lazuli"],
    ["minecraft:redstone_ore", "minecraft:redstone"],
    ["minecraft:deepslate_redstone_ore", "minecraft:redstone"],
    ["minecraft:quartz_ore", "minecraft:quartz"],
    ["minecraft:nether_quartz_ore", "minecraft:quartz"],
    ["minecraft:copper_ore", "minecraft:raw_copper"],
    ["minecraft:deepslate_copper_ore", "minecraft:raw_copper"],
    ["minecraft:iron_ore", "minecraft:raw_iron"],
    ["minecraft:deepslate_iron_ore", "minecraft:raw_iron"],
    ["minecraft:gold_ore", "minecraft:raw_gold"],
    ["minecraft:deepslate_gold_ore", "minecraft:raw_gold"],
    ["minecraft:nether_gold_ore", "minecraft:gold_nugget"]
]);

const UNDEAD_MOBS = new Set([
    "minecraft:zombie", "minecraft:zombie_villager", "minecraft:husk", "minecraft:drowned",
    "minecraft:skeleton", "minecraft:stray", "minecraft:wither_skeleton",
    "minecraft:zombified_piglin", "minecraft:phantom", "minecraft:wither"
]);

const ARTHROPOD_MOBS = new Set([
    "minecraft:spider", "minecraft:cave_spider", "minecraft:silverfish",
    "minecraft:endermite", "minecraft:bee"
]);

// Interact with vanilla blocks (doors, levers, trapdoors, fence gates, buttons)
/** @param {ItemStack} item @param {Block} block @param {Entity} entity */
function useOnBlock(item, block, entity) {
    const id = block?.typeId;
    if (!id) return;

    if (id.includes("_fence_gate")) {
        racoAPI.setPermutation(block, "open_bit", !block.permutation.getState("open_bit"));
    } else if (id.includes("_door") && !id.includes("door_item")) {
        racoAPI.setPermutation(block, "open_bit", !block.permutation.getState("open_bit"));
    } else if (id.includes("_trapdoor")) {
        racoAPI.setPermutation(block, "open_bit", !block.permutation.getState("open_bit"));
    } else if (id === "minecraft:lever") {
        const leverDir = block.permutation.getState("lever_direction");
        const isOn = block.permutation.getState("open_bit");
        block.dimension.runCommand(
            `setblock ${block.x} ${block.y} ${block.z} lever ["lever_direction"="${leverDir}","open_bit"=${!isOn}]`
        );
    } else if (id.includes("button")) {
        const facingDir = block.permutation.getState("facing_direction");
        const isPressed = block.permutation.getState("button_pressed_bit");
        if (!isPressed) {
            block.dimension.runCommand(
                `setblock ${block.x} ${block.y} ${block.z} ${id} ["facing_direction"=${facingDir},"button_pressed_bit"=true]`
            );
            mc.system.runTimeout(() => {
                block.dimension.runCommand(
                    `setblock ${block.x} ${block.y} ${block.z} ${id} ["facing_direction"=${facingDir},"button_pressed_bit"=false]`
                );
            }, 20);
        }
    }
}

// ── Deployer Application recipes ────────────────────────────────────────────
// Each entry: { surface, held, result, keepHeld }
//   surface   – typeId of the item currently on the depot/belt
//   held      – typeId the deployer must be holding (string), or a Set for tag-like groups
//   result    – typeId the surface item becomes
//   keepHeld  – if true, deployer's item is not consumed (e.g. tool)

/** @param {Entity} deployerEntity @param {ItemStack | undefined} heldItem @param {number} [amount] */
function consumeDeployerHeldItem(deployerEntity, heldItem, amount = 1) {
    const container = deployerEntity.getComponent("minecraft:inventory")?.container;
    if (!container || !heldItem) return;

    if (heldItem.amount > amount) {
        heldItem.amount -= amount;
        container.setItem(0, heldItem);
    } else {
        container.setItem(0, undefined);
        deployerEntity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air");
    }
}

/** @param {ItemStack | undefined} heldItem @param {Block | undefined} targetBlock @param {Entity} deployerEntity */
function tryUseHeldItemOnWorld(heldItem, targetBlock, deployerEntity) {
    if (!heldItem || !targetBlock) return false;
    if (heldItem.typeId === "minecraft:bucket" && tryFillBucketFromBlock(heldItem, targetBlock, deployerEntity)) return true;
    if (heldItem.typeId === "minecraft:flint_and_steel" && tryUseFlintAndSteel(heldItem, targetBlock, deployerEntity)) return true;
    if (heldItem.typeId.endsWith("_bucket") && tryEmptyBucket(heldItem, targetBlock, deployerEntity)) return true;
    if (tryPlantHeldItem(heldItem, targetBlock, deployerEntity)) return true;
    if (heldItem.typeId === "minecraft:bone_meal" && tryApplyBoneMeal(targetBlock, deployerEntity)) return true;
    return false;
}

/** @param {ItemStack | undefined} heldItem @param {Block | undefined} targetBlock @param {Entity} deployerEntity */
function tryUseHeldItemOnEntity(heldItem, targetBlock, deployerEntity) {
    if (!heldItem || !targetBlock) return false;

    const target = findEntityTarget(targetBlock, deployerEntity);
    if (!target) return false;

    if (heldItem.typeId === "minecraft:shears" && tryShearEntity(heldItem, target, deployerEntity)) return true;
    if (heldItem.typeId === "minecraft:bucket" && tryUseBucketOnEntity(heldItem, target, deployerEntity)) return true;
    if (tryFeedBreedableEntity(heldItem, target, deployerEntity)) return true;
    return false;
}

/** @param {ItemStack | undefined} item */
function getHandToolType(item) {
    const id = item?.typeId?.split(":")?.[1] ?? "";
    for (const type of HAND_TOOL_TYPES) {
        if (id.endsWith(`_${type}`)) return type;
    }
    return undefined;
}

/** @param {ItemStack | undefined} item */
function isHandModeTool(item) {
    return getHandToolType(item) !== undefined;
}

/** @param {ItemStack} item @param {Entity} deployerEntity @param {Block} block */
function setDeployerHeldVisual(item, deployerEntity, block) {
    racoAPI.setItemInHand(item, deployerEntity, "Mainhand", 0, "create:item_visual");
    if (getDeployerHandMode(block) && isHandModeTool(item)) {
        try { deployerEntity.setProperty("create:item_visual", "hand_equipped"); } catch {}
    }
}

/** @param {ItemStack | undefined} heldItem @param {Block | undefined} targetBlock @param {Entity} deployerEntity */
function tryUseHandTool(heldItem, targetBlock, deployerEntity) {
    const toolType = getHandToolType(heldItem);
    if (!heldItem || !toolType || !targetBlock) return false;

    const entityTarget = findEntityTarget(targetBlock, deployerEntity);
    if (entityTarget && toolType === "sword") {
        return attackEntityWithTool(heldItem, toolType, entityTarget, deployerEntity);
    }

    if (toolType === "axe" && tryAxeUseOnBlock(heldItem, targetBlock, deployerEntity)) return true;
    if (toolType === "shovel" && tryShovelUseOnBlock(heldItem, targetBlock, deployerEntity)) return true;
    if (toolType === "hoe" && tryHoeUseOnBlock(heldItem, targetBlock, deployerEntity)) return true;
    if (tryBreakBlockWithTool(heldItem, toolType, targetBlock, deployerEntity)) return true;
    return false;
}

/** @param {ItemStack} heldItem @param {string} toolType @param {Entity} target @param {Entity} deployerEntity */
function attackEntityWithTool(heldItem, toolType, target, deployerEntity) {
    if (target.typeId === "minecraft:player" || target.typeId?.startsWith("create:")) return false;
    const material = getToolMaterial(heldItem);
    const base = TOOL_DAMAGE.get(material) ?? 4;
    const enchantments = getToolEnchantments(heldItem);
    const damage = getEnchantedAttackDamage(base, enchantments, target);
    try {
        target.applyDamage(damage, { cause: mc.EntityDamageCause.entityAttack, damagingEntity: deployerEntity });
        applyAttackEnchantments(target, deployerEntity, enchantments);
        damageDeployerToolWithEnchantments(deployerEntity, heldItem, 1);
        return true;
    } catch {
        return false;
    }
}

/** @param {ItemStack} heldItem @param {Block} block @param {Entity} deployerEntity */
function tryAxeUseOnBlock(heldItem, block, deployerEntity) {
    const stripped = STRIPPED_LOGS.get(block.typeId);
    if (!stripped) return false;
    try {
        const states = block.permutation.getAllStates();
        block.setPermutation(mc.BlockPermutation.resolve(stripped, states));
    } catch {
        try { block.setType(stripped); } catch { return false; }
    }
    damageDeployerToolWithEnchantments(deployerEntity, heldItem, 1);
    playUseEffects(block, "use.wood");
    return true;
}

/** @param {ItemStack} heldItem @param {Block} block @param {Entity} deployerEntity */
function tryShovelUseOnBlock(heldItem, block, deployerEntity) {
    if (!["minecraft:grass_block", "minecraft:dirt", "minecraft:coarse_dirt", "minecraft:podzol", "minecraft:mycelium"].includes(block.typeId)) return false;
    const above = block.above();
    if (above && !above.isAir && !above.isLiquid) return false;

    if (!setFirstValidBlockType(block, ["minecraft:grass_path", "minecraft:dirt_path"])) return false;
    damageDeployerToolWithEnchantments(deployerEntity, heldItem, 1);
    playUseEffects(block, "use.grass");
    return true;
}

/** @param {ItemStack} heldItem @param {Block} block @param {Entity} deployerEntity */
function tryHoeUseOnBlock(heldItem, block, deployerEntity) {
    const above = block.above();
    if (above && !above.isAir && !above.isLiquid) return false;

    if (block.typeId === "minecraft:coarse_dirt") {
        try { block.setType("minecraft:dirt"); } catch { return false; }
    } else if (["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol", "minecraft:mycelium", "minecraft:grass_path", "minecraft:dirt_path"].includes(block.typeId)) {
        try { block.setType("minecraft:farmland"); } catch { return false; }
    } else {
        return false;
    }

    damageDeployerToolWithEnchantments(deployerEntity, heldItem, 1);
    playUseEffects(block, "use.grass");
    return true;
}

/** @param {ItemStack} heldItem @param {string} toolType @param {Block} block @param {Entity} deployerEntity */
function tryBreakBlockWithTool(heldItem, toolType, block, deployerEntity) {
    if (!isToolEffectiveOnBlock(toolType, block.typeId)) return false;
    const blockId = block.typeId;
    const dropLocation = { x: block.x + 0.5, y: block.y + 0.45, z: block.z + 0.5 };
    const silkTouchLevel = getEnchantLevel(heldItem, "silk_touch", "silktouch");
    const fortuneLevel = getEnchantLevel(heldItem, "fortune", "loot_bonus_blocks");
    try {
        if (silkTouchLevel > 0 && dropSilkTouchBlock(block, blockId, dropLocation)) {
            damageDeployerToolWithEnchantments(deployerEntity, heldItem, 1);
            return true;
        }
        block.dimension.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`);
        spawnFortuneBonusDrops(block.dimension, blockId, dropLocation, fortuneLevel);
        damageDeployerToolWithEnchantments(deployerEntity, heldItem, 1);
        return true;
    } catch {
        return false;
    }
}

/** @param {ItemStack | undefined} item @returns {Map<string, number>} */
function getToolEnchantments(item) {
    const enchantments = new Map();
    if (!item?.getComponent) return enchantments;

    try {
        const component = item.getComponent("minecraft:enchantable") ?? item.getComponent("enchantable");
        const rawEnchantments = component?.getEnchantments?.() ?? [];
        for (const enchantment of rawEnchantments) {
            const id = normalizeEnchantmentId(enchantment?.type?.id ?? enchantment?.type);
            const level = Number(enchantment?.level ?? 1);
            if (id && level > 0) enchantments.set(id, Math.max(enchantments.get(id) ?? 0, level));
        }

        const knownIds = [
            "sharpness", "damage_all", "smite", "damage_undead",
            "bane_of_arthropods", "damage_arthropods", "fire_aspect",
            "knockback", "unbreaking", "durability", "fortune",
            "loot_bonus_blocks", "silk_touch"
        ];
        for (const id of knownIds) {
            try {
                const enchantment = component?.getEnchantment?.(id) ?? component?.getEnchantment?.(`minecraft:${id}`);
                const normalized = normalizeEnchantmentId(id);
                const level = Number(enchantment?.level ?? 0);
                if (level > 0) enchantments.set(normalized, Math.max(enchantments.get(normalized) ?? 0, level));
            } catch {}
        }
    } catch {}

    return enchantments;
}

/** @param {string | {id?:string} | undefined} id */
function normalizeEnchantmentId(id) {
    if (!id) return undefined;
    return `${id}`.replace("minecraft:", "").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

/** @param {ItemStack | Map<string, number>} itemOrEnchantments @param {...string} ids */
function getEnchantLevel(itemOrEnchantments, ...ids) {
    const enchantments = itemOrEnchantments instanceof Map ? itemOrEnchantments : getToolEnchantments(itemOrEnchantments);
    for (const id of ids) {
        const normalized = normalizeEnchantmentId(id);
        const level = normalized ? enchantments.get(normalized) : undefined;
        if (level) return level;
    }
    return 0;
}

/** @param {number} baseDamage @param {Map<string, number>} enchantments @param {Entity} target */
function getEnchantedAttackDamage(baseDamage, enchantments, target) {
    let damage = baseDamage;
    const sharpness = getEnchantLevel(enchantments, "sharpness", "damage_all");
    if (sharpness > 0) damage += 1 + Math.max(0, sharpness - 1) * 0.5;

    const smite = getEnchantLevel(enchantments, "smite", "damage_undead");
    if (smite > 0 && UNDEAD_MOBS.has(target.typeId)) damage += smite * 2.5;

    const bane = getEnchantLevel(enchantments, "bane_of_arthropods", "damage_arthropods");
    if (bane > 0 && ARTHROPOD_MOBS.has(target.typeId)) damage += bane * 2.5;

    return damage;
}

/** @param {Entity} target @param {Entity} deployerEntity @param {Map<string, number>} enchantments */
function applyAttackEnchantments(target, deployerEntity, enchantments) {
    const fireAspect = getEnchantLevel(enchantments, "fire_aspect");
    if (fireAspect > 0) {
        try { target.setOnFire(4 * fireAspect, true); } catch {}
    }

    const knockback = getEnchantLevel(enchantments, "knockback");
    if (knockback > 0) applyToolKnockback(target, deployerEntity, knockback);
}

/** @param {Entity} target @param {Entity} deployerEntity @param {number} level */
function applyToolKnockback(target, deployerEntity, level) {
    try {
        const dx = target.location.x - deployerEntity.location.x;
        const dz = target.location.z - deployerEntity.location.z;
        const length = Math.max(0.01, Math.hypot(dx, dz));
        target.applyImpulse({
            x: (dx / length) * 0.35 * level,
            y: 0.12,
            z: (dz / length) * 0.35 * level
        });
    } catch {}
}

/** @param {Block} block @param {string} blockId @param {Vector3} location */
function dropSilkTouchBlock(block, blockId, location) {
    let itemStack;
    try { itemStack = new mc.ItemStack(blockId, 1); } catch { return false; }

    try {
        block.setType("minecraft:air");
        block.dimension.spawnItem(itemStack, location);
        return true;
    } catch {
        return false;
    }
}

/** @param {Entity | undefined} deployerEntity */
function deployerBlockFromEntity(deployerEntity) {
    const loc = deployerEntity?.location;
    if (!loc) return null;

    try {
        return deployerEntity.dimension.getBlock({
            x: Math.floor(loc.x),
            y: Math.floor(loc.y),
            z: Math.floor(loc.z)
        });
    } catch {
        return null;
    }
}

/** @param {Block} block @param {{x:number, z:number}} offset */
function horizontalNeighbor(block, offset) {
    try {
        return block?.dimension?.getBlock({
            x: block.location.x + offset.x,
            y: block.location.y,
            z: block.location.z + offset.z
        }) ?? null;
    } catch {
        return null;
    }
}

/** @param {Block | null | undefined} depotBlock */
function depotHasSurfaceItem(depotBlock) {
    if (!depotBlock) return true;
    const items = depotBlock.dimension.getEntities({
        type: "create:conveyor_item",
        location: depotBlock.center(),
        maxDistance: 0.55
    });
    return items.some(entity => {
        try { if (entity.hasTag("create_depot_visual")) return false; } catch {}
        return entity?.isValid;
    });
}

/** @param {Entity} deployerEntity */
function findAdjacentOutputDepot(deployerEntity) {
    const block = deployerBlockFromEntity(deployerEntity);
    if (!block) return null;

    for (const offset of [
        { x: 1, z: 0 },
        { x: -1, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 }
    ]) {
        const depot = horizontalNeighbor(block, offset);
        if (depot?.typeId === "create:depot" && !depotHasSurfaceItem(depot)) return depot;
    }

    return null;
}

/** @param {Entity} deployerEntity @param {ItemStack} itemStack */
function outputItemToAdjacentDepot(deployerEntity, itemStack) {
    if (!itemStack || itemStack.amount <= 0) return false;
    const depot = findAdjacentOutputDepot(deployerEntity);
    if (!depot) return false;

    try {
        const visual = deployerEntity.dimension.spawnEntity("create:conveyor_item", {
            x: depot.center().x,
            y: depot.location.y + DEPOT_OUTPUT_Y,
            z: depot.center().z
        });
        visual.addTag("create:conveyor_stop");
        visual.setProperty("create:rotation_y", Math.random() * 360);
        racoAPI.setItemInHand(itemStack, visual, "Mainhand", 0, "create:item_visual");
        return true;
    } catch {
        return false;
    }
}

/** @param {Entity} deployerEntity @param {ItemStack} itemStack @param {Vector3 | undefined} fallbackLocation */
function outputOrSpawnFromDeployer(deployerEntity, itemStack, fallbackLocation) {
    if (outputItemToAdjacentDepot(deployerEntity, itemStack)) return true;
    try {
        deployerEntity.dimension.spawnItem(itemStack, fallbackLocation ?? deployerEntity.location);
        return true;
    } catch {
        return false;
    }
}

/** @param {import('@minecraft/server').Dimension} dimension @param {string} blockId @param {Vector3} location @param {number} fortuneLevel */
function spawnFortuneBonusDrops(dimension, blockId, location, fortuneLevel) {
    if (fortuneLevel <= 0) return;
    const itemId = FORTUNE_BLOCK_DROPS.get(blockId);
    if (!itemId) return;

    const extra = Math.floor(Math.random() * (fortuneLevel + 1));
    if (extra <= 0) return;
    try { dimension.spawnItem(new mc.ItemStack(itemId, extra), location); } catch {}
}

/** @param {Entity} deployerEntity @param {ItemStack} heldItem @param {number} [amount] */
function damageDeployerToolWithEnchantments(deployerEntity, heldItem, amount = 1) {
    const unbreaking = getEnchantLevel(heldItem, "unbreaking", "durability");
    if (unbreaking <= 0) {
        damageDeployerTool(deployerEntity, heldItem, amount);
        return;
    }

    let damage = 0;
    for (let i = 0; i < amount; i++) {
        if (Math.random() < 1 / (unbreaking + 1)) damage++;
    }
    if (damage > 0) damageDeployerTool(deployerEntity, heldItem, damage);
}

/** @param {string} toolType @param {string | undefined} blockId */
function isToolEffectiveOnBlock(toolType, blockId) {
    if (!blockId || blockId === "minecraft:air" || blockId === "minecraft:water" || blockId === "minecraft:lava") return false;
    if (toolType === "pickaxe") return includesAny(blockId, ["stone", "ore", "deepslate", "andesite", "diorite", "granite", "tuff", "basalt", "cobble", "brick", "copper", "iron", "gold", "diamond", "emerald", "lapis", "redstone", "coal", "quartz", "obsidian"]);
    if (toolType === "shovel") return includesAny(blockId, ["dirt", "grass_block", "sand", "gravel", "clay", "snow", "soul_sand", "mud"]);
    if (toolType === "axe") return includesAny(blockId, ["log", "wood", "planks", "stem", "hyphae", "bamboo_block", "bookshelf", "chest", "barrel"]);
    if (toolType === "hoe") return includesAny(blockId, ["leaves", "moss", "sculk", "hay_block", "sponge", "wart_block"]);
    return false;
}

/** @param {string} text @param {string[]} parts */
function includesAny(text, parts) {
    return parts.some(part => text.includes(part));
}

/** @param {ItemStack | undefined} item */
function getToolMaterial(item) {
    const id = item?.typeId?.split(":")?.[1] ?? "";
    return id.split("_")[0];
}

/** @param {Block} block @param {string[]} typeIds */
function setFirstValidBlockType(block, typeIds) {
    for (const typeId of typeIds) {
        try {
            block.setType(typeId);
            return true;
        } catch {}
    }
    return false;
}

/** @param {Block} targetBlock @param {Entity} deployerEntity */
function findEntityTarget(targetBlock, deployerEntity) {
    const entities = targetBlock.dimension?.getEntities({
        location: { x: targetBlock.x + 0.5, y: targetBlock.y + 0.75, z: targetBlock.z + 0.5 },
        maxDistance: 1.35,
        excludeTypes: ["minecraft:item", "create:conveyor_item", "minecraft:xp_orb"]
    }) ?? [];

    return entities.find(entity => {
        if (!entity?.isValid || entity.id === deployerEntity.id) return false;
        if (entity.typeId?.startsWith("create:")) return false;
        return entity.typeId !== "minecraft:player";
    }) ?? null;
}

/** @param {ItemStack} heldItem @param {Entity} target @param {Entity} deployerEntity */
function tryShearEntity(heldItem, target, deployerEntity) {
    if (target.typeId !== "minecraft:sheep" && target.typeId !== "minecraft:mooshroom") return false;
    if (isBabyEntity(target)) return false;
    if (Number(target.getDynamicProperty("create:deployer_sheared_until") ?? 0) > mc.system.currentTick) return false;

    try { target.triggerEvent("minecraft:on_sheared"); } catch {}
    try { target.runCommand("event entity @s minecraft:on_sheared"); } catch {}
    if (target.typeId === "minecraft:mooshroom") {
        outputOrSpawnFromDeployer(deployerEntity, new mc.ItemStack("minecraft:red_mushroom", 5), target.location);
    } else {
        const wool = getSheepWoolItem(target);
        outputOrSpawnFromDeployer(deployerEntity, new mc.ItemStack(wool, 1 + Math.floor(Math.random() * 3)), target.location);
    }

    target.setDynamicProperty("create:deployer_sheared_until", mc.system.currentTick + 1200);
    damageDeployerTool(deployerEntity, heldItem, 1);
    playEntityUseEffects(target, "mob.sheep.shear");
    return true;
}

/** @param {Entity} entity */
function isBabyEntity(entity) {
    return getEntityProperty(entity, "minecraft:is_baby") === true
        || getEntityProperty(entity, "is_baby") === true
        || getEntityProperty(entity, "baby") === true
        || entity?.getComponent?.("minecraft:is_baby") !== undefined
        || entity?.getComponent?.("is_baby") !== undefined;
}

/** @param {Entity} sheep */
function getSheepWoolItem(sheep) {
    const color = `${getEntityProperty(sheep, "minecraft:color") ?? getEntityProperty(sheep, "color") ?? "white"}`;
    const normalized = color.replace("light_blue", "light_blue").replace("silver", "light_gray");
    const valid = new Set(["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"]);
    return `minecraft:${valid.has(normalized) ? normalized : "white"}_wool`;
}

/** @param {ItemStack} heldItem @param {Entity} target @param {Entity} deployerEntity */
function tryUseBucketOnEntity(heldItem, target, deployerEntity) {
    const bucketResult = getBucketEntityResult(target);
    if (!bucketResult) return false;
    if (bucketResult === "minecraft:milk_bucket" && isBabyEntity(target)) return false;

    replaceDeployerHeldItem(deployerEntity, heldItem, bucketResult);
    playEntityUseEffects(target, "bucket.fill_water");
    if (bucketResult !== "minecraft:milk_bucket") {
        try { target.remove(); } catch {}
    }
    return true;
}

/** @param {Entity} target */
function getBucketEntityResult(target) {
    if (target.typeId === "minecraft:cow" || target.typeId === "minecraft:goat" || target.typeId === "minecraft:mooshroom") return "minecraft:milk_bucket";
    if (target.typeId === "minecraft:cod") return "minecraft:cod_bucket";
    if (target.typeId === "minecraft:salmon") return "minecraft:salmon_bucket";
    if (target.typeId === "minecraft:tropicalfish" || target.typeId === "minecraft:tropical_fish") return "minecraft:tropical_fish_bucket";
    if (target.typeId === "minecraft:pufferfish") return "minecraft:pufferfish_bucket";
    if (target.typeId === "minecraft:axolotl") return "minecraft:axolotl_bucket";
    if (target.typeId === "minecraft:tadpole") return "minecraft:tadpole_bucket";
    return undefined;
}

/** @param {ItemStack} heldItem @param {Entity} target @param {Entity} deployerEntity */
function tryFeedBreedableEntity(heldItem, target, deployerEntity) {
    const foods = BREEDING_FOODS.get(target.typeId);
    if (!foods?.has(heldItem.typeId)) return false;

    const now = mc.system.currentTick;
    if (Number(target.getDynamicProperty(BREED_COOLDOWN_PROP) ?? 0) > now) return false;

    consumeDeployerHeldItem(deployerEntity, heldItem);
    const mate = findReadyMate(target, now);
    target.setDynamicProperty(LOVE_UNTIL_PROP, now + 600);
    spawnLoveParticles(target);
    playEntityUseEffects(target, "random.eat");

    if (mate) {
        breedEntities(target, mate, now);
    }
    return true;
}

/** @param {Entity} target @param {number} now */
function findReadyMate(target, now) {
    const nearby = target.dimension.getEntities({
        type: target.typeId,
        location: target.location,
        maxDistance: 5
    });

    return nearby.find(entity => {
        if (!entity?.isValid || entity.id === target.id) return false;
        if (Number(entity.getDynamicProperty(BREED_COOLDOWN_PROP) ?? 0) > now) return false;
        return Number(entity.getDynamicProperty(LOVE_UNTIL_PROP) ?? 0) > now;
    }) ?? null;
}

/** @param {Entity} a @param {Entity} b @param {number} now */
function breedEntities(a, b, now) {
    const loc = {
        x: (a.location.x + b.location.x) / 2,
        y: Math.min(a.location.y, b.location.y),
        z: (a.location.z + b.location.z) / 2
    };

    try {
        const baby = a.dimension.spawnEntity(a.typeId, loc);
        try { baby.triggerEvent("minecraft:entity_born"); } catch {}
        spawnLoveParticles(baby);
    } catch {}

    a.setDynamicProperty(LOVE_UNTIL_PROP, 0);
    b.setDynamicProperty(LOVE_UNTIL_PROP, 0);
    a.setDynamicProperty(BREED_COOLDOWN_PROP, now + 6000);
    b.setDynamicProperty(BREED_COOLDOWN_PROP, now + 6000);
    spawnLoveParticles(a);
    spawnLoveParticles(b);
}

/** @param {ItemStack} heldItem @param {Block} targetBlock @param {Entity} deployerEntity */
function tryPlantHeldItem(heldItem, targetBlock, deployerEntity) {
    if (!targetBlock.isAir && !targetBlock.isLiquid) return false;

    const below = targetBlock.below();
    const plantId = getPlantBlockId(heldItem.typeId, below);
    if (!plantId) return false;

    try {
        targetBlock.setType(plantId);
        consumeDeployerHeldItem(deployerEntity, heldItem);
        playUseEffects(targetBlock, "dig.grass");
        return true;
    } catch {
        return false;
    }
}

/** @param {string} itemId @param {Block | undefined} below */
function getPlantBlockId(itemId, below) {
    if (!below) return undefined;
    if (SAPLING_ITEMS.has(itemId) && SAPLING_SOIL.has(below.typeId)) return itemId;
    if (CROP_PLANTS.has(itemId) && below.typeId === "minecraft:farmland") return CROP_PLANTS.get(itemId);
    if (itemId === "minecraft:nether_wart" && below.typeId === "minecraft:soul_sand") return "minecraft:nether_wart";
    if (itemId === "minecraft:sugar_cane" && canPlaceSugarCane(below)) return "minecraft:reeds";
    if (itemId === "minecraft:cactus" && below.typeId === "minecraft:sand") return "minecraft:cactus";
    return undefined;
}

/** @param {Block | undefined} below */
function canPlaceSugarCane(below) {
    if (!below || !["minecraft:grass_block", "minecraft:dirt", "minecraft:sand", "minecraft:mud"].includes(below.typeId)) return false;
    return [below.north(), below.south(), below.east(), below.west()].some(neighbor => neighbor?.typeId === "minecraft:water");
}

/** @param {Block} block @param {Entity} deployerEntity */
function tryApplyBoneMeal(block, deployerEntity) {
    if (tryNativeBoneMeal(block) || tryAdvanceGrowthState(block)) {
        const heldItem = deployerEntity.getComponent("minecraft:inventory")?.container?.getItem(0);
        consumeDeployerHeldItem(deployerEntity, heldItem);
        playUseEffects(block, "item.bone_meal.use");
        return true;
    }
    return false;
}

/** @param {Block} block */
function tryNativeBoneMeal(block) {
    return false;
}

/** @param {Block} block */
function tryAdvanceGrowthState(block) {
    if (SAPLING_ITEMS.has(block.typeId)) {
        const saplingAge = getBlockState(block, "age_bit");
        if (saplingAge === true || saplingAge === undefined) return growSimpleTree(block);
    }

    const states = block.permutation.getAllStates();

    for (const [state, value] of Object.entries(states)) {
        if (state === "age_bit" && value === false) {
            try {
                block.setPermutation(mc.BlockPermutation.resolve(block.typeId, { ...states, [state]: true }));
                return true;
            } catch {}
        }

        const max = GROWTH_STATE_MAX.get(state);
        if (max === undefined || typeof value !== "number" || value >= max) continue;

        const increase = 1 + Math.floor(Math.random() * 3);
        for (let next = Math.min(max, value + increase); next > value; next--) {
            try {
                block.setPermutation(mc.BlockPermutation.resolve(block.typeId, { ...states, [state]: next }));
                return true;
            } catch {}
        }
    }

    return false;
}

/** @param {Block} block @param {string} state */
function getBlockState(block, state) {
    try { return block.permutation.getAllStates()[state]; } catch { return undefined; }
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

/** @param {Block} block @param {string} sound */
function playUseEffects(block, sound) {
    try { block.dimension.playSound(sound, block.center(), { volume: 0.7, pitch: 1.0 }); } catch {}
}

/** @param {Entity} entity @param {string} sound */
function playEntityUseEffects(entity, sound) {
    try { entity.dimension.playSound(sound, entity.location, { volume: 0.7, pitch: 1.0 }); } catch {}
}

/** @param {Entity} entity */
function spawnLoveParticles(entity) {
}

/** @param {Entity} entity @param {string} property */
function getEntityProperty(entity, property) {
    try { return entity.getProperty(property); } catch { return undefined; }
}

/** @param {Entity} deployerEntity @param {ItemStack} oldItem @param {string} newItemId */
function replaceDeployerHeldItem(deployerEntity, oldItem, newItemId) {
    const container = deployerEntity.getComponent("minecraft:inventory")?.container;
    if (!container || !oldItem) return;
    const outputItem = new mc.ItemStack(newItemId, 1);

    if (findAdjacentOutputDepot(deployerEntity)) {
        if (oldItem.amount > 1) {
            oldItem.amount -= 1;
            container.setItem(0, oldItem);
        } else {
            container.setItem(0, undefined);
            deployerEntity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air");
        }
        outputOrSpawnFromDeployer(deployerEntity, outputItem, deployerEntity.location);
        return;
    }

    if (oldItem.amount > 1) {
        oldItem.amount -= 1;
        container.setItem(0, oldItem);
        try { deployerEntity.dimension.spawnItem(outputItem, deployerEntity.location); } catch {}
        return;
    }

    racoAPI.setItemInHand(outputItem, deployerEntity, "Mainhand", 0, "create:item_visual");
}

/** @param {Entity} deployerEntity @param {ItemStack} heldItem @param {number} [amount] */
function damageDeployerTool(deployerEntity, heldItem, amount = 1) {
    const damaged = racoAPI.applyDurability(heldItem, amount);
    const container = deployerEntity.getComponent("minecraft:inventory")?.container;
    if (!container) return;

    if (!damaged || damaged.typeId === "minecraft:air") {
        container.setItem(0, undefined);
        deployerEntity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air");
    } else {
        container.setItem(0, damaged);
    }
}

/** @param {ItemStack} heldItem @param {Block} targetBlock @param {Entity} deployerEntity */
function tryUseFlintAndSteel(heldItem, targetBlock, deployerEntity) {
    const fireBlock = targetBlock.isAir || targetBlock.isLiquid ? targetBlock : targetBlock.above();
    if (!fireBlock || (!fireBlock.isAir && !fireBlock.isLiquid)) return false;
    const below = fireBlock.below();
    if (!below || below.isAir || below.isLiquid) return false;

    try {
        fireBlock.setType("minecraft:fire");
        damageDeployerTool(deployerEntity, heldItem, 1);
        playUseEffects(fireBlock, "fire.ignite");
        return true;
    } catch {
        return false;
    }
}

/** @param {ItemStack} heldItem @param {Block} targetBlock @param {Entity} deployerEntity */
function tryEmptyBucket(heldItem, targetBlock, deployerEntity) {
    const liquidId = heldItem.typeId === "minecraft:water_bucket"
        ? "minecraft:water"
        : heldItem.typeId === "minecraft:lava_bucket"
            ? "minecraft:lava"
            : undefined;
    if (!liquidId || (!targetBlock.isAir && !targetBlock.isLiquid)) return false;

    try {
        targetBlock.setType(liquidId);
        replaceDeployerHeldItem(deployerEntity, heldItem, "minecraft:bucket");
        playUseEffects(targetBlock, liquidId === "minecraft:lava" ? "bucket.empty_lava" : "bucket.empty_water");
        return true;
    } catch {
        return false;
    }
}

/** @param {ItemStack} heldItem @param {Block} targetBlock @param {Entity} deployerEntity */
function tryFillBucketFromBlock(heldItem, targetBlock, deployerEntity) {
    const result = targetBlock.typeId === "minecraft:water"
        ? "minecraft:water_bucket"
        : targetBlock.typeId === "minecraft:lava"
            ? "minecraft:lava_bucket"
            : undefined;
    if (!result) return false;

    try {
        targetBlock.setType("minecraft:air");
        replaceDeployerHeldItem(deployerEntity, heldItem, result);
        playUseEffects(targetBlock, result === "minecraft:lava_bucket" ? "bucket.fill_lava" : "bucket.fill_water");
        return true;
    } catch {
        return false;
    }
}

const PLANKS = new Set([
    "minecraft:oak_planks", "minecraft:spruce_planks", "minecraft:birch_planks",
    "minecraft:jungle_planks", "minecraft:acacia_planks", "minecraft:dark_oak_planks",
    "minecraft:mangrove_planks", "minecraft:cherry_planks", "minecraft:bamboo_planks",
    "minecraft:bamboo_mosaic", "minecraft:crimson_planks", "minecraft:warped_planks"
]);
const AXES = new Set([
    "minecraft:wooden_axe", "minecraft:stone_axe", "minecraft:iron_axe",
    "minecraft:golden_axe", "minecraft:diamond_axe", "minecraft:netherite_axe"
]);
const SAND_PAPERS = new Set(["create:sand_paper", "create:red_sand_paper"]);
const STRIPPED_WOOD_ITEMS = [
    "minecraft:stripped_oak_log",
    "minecraft:stripped_spruce_log",
    "minecraft:stripped_birch_log",
    "minecraft:stripped_jungle_log",
    "minecraft:stripped_acacia_log",
    "minecraft:stripped_dark_oak_log",
    "minecraft:stripped_mangrove_log",
    "minecraft:stripped_cherry_log",
    "minecraft:stripped_pale_oak_log",
    "minecraft:stripped_crimson_stem",
    "minecraft:stripped_warped_stem",
    "minecraft:stripped_oak_wood",
    "minecraft:stripped_spruce_wood",
    "minecraft:stripped_birch_wood",
    "minecraft:stripped_jungle_wood",
    "minecraft:stripped_acacia_wood",
    "minecraft:stripped_dark_oak_wood",
    "minecraft:stripped_mangrove_wood",
    "minecraft:stripped_cherry_wood",
    "minecraft:stripped_pale_oak_wood",
    "minecraft:stripped_crimson_hyphae",
    "minecraft:stripped_warped_hyphae",
    "minecraft:stripped_bamboo_block"
];

function makeCasingDeployRecipes() {
    const casingMaterials = [
        { held: "create:andesite_alloy", result: "create:andesite_casing" },
        { held: "create:brass_ingot", result: "create:brass_casing" },
        { held: "minecraft:copper_ingot", result: "create:copper_casing" }
    ];
    const recipes = [];
    for (const surface of STRIPPED_WOOD_ITEMS) {
        for (const material of casingMaterials) {
            recipes.push({ surface, held: material.held, result: material.result, keepHeld: false, sound: "use.wood" });
        }
    }
    return recipes;
}

/** @type {DeployRecipe[]} */
const DEPLOY_RECIPES = [
    ...makeCasingDeployRecipes(),
    { surface: "create:rose_quartz", held: SAND_PAPERS, result: "create:polished_rose_quartz", keepHeld: true, damageHeld: true, sound: "brush.generic" },

    // Cogwheels (plank consumed)
    { surface: "create:shaft",     held: PLANKS, result: "create:cogwheel",       keepHeld: false },
    { surface: "create:cogwheel",  held: PLANKS, result: "create:large_cogwheel", keepHeld: false },

    // Copper waxing — honeycomb_block NOT consumed
    { surface: "minecraft:copper_block",                held: "minecraft:honeycomb_block", result: "minecraft:waxed_copper_block",                keepHeld: true },
    { surface: "minecraft:exposed_copper",              held: "minecraft:honeycomb_block", result: "minecraft:waxed_exposed_copper",              keepHeld: true },
    { surface: "minecraft:weathered_copper",            held: "minecraft:honeycomb_block", result: "minecraft:waxed_weathered_copper",            keepHeld: true },
    { surface: "minecraft:oxidized_copper",             held: "minecraft:honeycomb_block", result: "minecraft:waxed_oxidized_copper",             keepHeld: true },
    { surface: "minecraft:cut_copper",                  held: "minecraft:honeycomb_block", result: "minecraft:waxed_cut_copper",                  keepHeld: true },
    { surface: "minecraft:exposed_cut_copper",          held: "minecraft:honeycomb_block", result: "minecraft:waxed_exposed_cut_copper",          keepHeld: true },
    { surface: "minecraft:weathered_cut_copper",        held: "minecraft:honeycomb_block", result: "minecraft:waxed_weathered_cut_copper",        keepHeld: true },
    { surface: "minecraft:oxidized_cut_copper",         held: "minecraft:honeycomb_block", result: "minecraft:waxed_oxidized_cut_copper",         keepHeld: true },
    { surface: "minecraft:cut_copper_slab",             held: "minecraft:honeycomb_block", result: "minecraft:waxed_cut_copper_slab",             keepHeld: true },
    { surface: "minecraft:exposed_cut_copper_slab",     held: "minecraft:honeycomb_block", result: "minecraft:waxed_exposed_cut_copper_slab",     keepHeld: true },
    { surface: "minecraft:weathered_cut_copper_slab",   held: "minecraft:honeycomb_block", result: "minecraft:waxed_weathered_cut_copper_slab",   keepHeld: true },
    { surface: "minecraft:oxidized_cut_copper_slab",    held: "minecraft:honeycomb_block", result: "minecraft:waxed_oxidized_cut_copper_slab",    keepHeld: true },
    { surface: "minecraft:cut_copper_stairs",           held: "minecraft:honeycomb_block", result: "minecraft:waxed_cut_copper_stairs",           keepHeld: true },
    { surface: "minecraft:exposed_cut_copper_stairs",   held: "minecraft:honeycomb_block", result: "minecraft:waxed_exposed_cut_copper_stairs",   keepHeld: true },
    { surface: "minecraft:weathered_cut_copper_stairs", held: "minecraft:honeycomb_block", result: "minecraft:waxed_weathered_cut_copper_stairs", keepHeld: true },
    { surface: "minecraft:oxidized_cut_copper_stairs",  held: "minecraft:honeycomb_block", result: "minecraft:waxed_oxidized_cut_copper_stairs",  keepHeld: true },

    // Copper dewaxing — axe NOT consumed
    { surface: "minecraft:waxed_copper_block",                held: AXES, result: "minecraft:copper_block",                keepHeld: true },
    { surface: "minecraft:waxed_exposed_copper",              held: AXES, result: "minecraft:exposed_copper",              keepHeld: true },
    { surface: "minecraft:waxed_weathered_copper",            held: AXES, result: "minecraft:weathered_copper",            keepHeld: true },
    { surface: "minecraft:waxed_oxidized_copper",             held: AXES, result: "minecraft:oxidized_copper",             keepHeld: true },
    { surface: "minecraft:waxed_cut_copper",                  held: AXES, result: "minecraft:cut_copper",                  keepHeld: true },
    { surface: "minecraft:waxed_exposed_cut_copper",          held: AXES, result: "minecraft:exposed_cut_copper",          keepHeld: true },
    { surface: "minecraft:waxed_weathered_cut_copper",        held: AXES, result: "minecraft:weathered_cut_copper",        keepHeld: true },
    { surface: "minecraft:waxed_oxidized_cut_copper",         held: AXES, result: "minecraft:oxidized_cut_copper",         keepHeld: true },
    { surface: "minecraft:waxed_cut_copper_slab",             held: AXES, result: "minecraft:cut_copper_slab",             keepHeld: true },
    { surface: "minecraft:waxed_exposed_cut_copper_slab",     held: AXES, result: "minecraft:exposed_cut_copper_slab",     keepHeld: true },
    { surface: "minecraft:waxed_weathered_cut_copper_slab",   held: AXES, result: "minecraft:weathered_cut_copper_slab",   keepHeld: true },
    { surface: "minecraft:waxed_oxidized_cut_copper_slab",    held: AXES, result: "minecraft:oxidized_cut_copper_slab",    keepHeld: true },
    { surface: "minecraft:waxed_cut_copper_stairs",           held: AXES, result: "minecraft:cut_copper_stairs",           keepHeld: true },
    { surface: "minecraft:waxed_exposed_cut_copper_stairs",   held: AXES, result: "minecraft:exposed_cut_copper_stairs",   keepHeld: true },
    { surface: "minecraft:waxed_weathered_cut_copper_stairs", held: AXES, result: "minecraft:weathered_cut_copper_stairs", keepHeld: true },
    { surface: "minecraft:waxed_oxidized_cut_copper_stairs",  held: AXES, result: "minecraft:oxidized_cut_copper_stairs",  keepHeld: true },

    // Copper deoxidising — axe NOT consumed (one step at a time, same as Java)
    { surface: "minecraft:oxidized_copper",         held: AXES, result: "minecraft:weathered_copper",    keepHeld: true },
    { surface: "minecraft:weathered_copper",        held: AXES, result: "minecraft:exposed_copper",      keepHeld: true },
    { surface: "minecraft:exposed_copper",          held: AXES, result: "minecraft:copper_block",        keepHeld: true },
    { surface: "minecraft:oxidized_cut_copper",     held: AXES, result: "minecraft:weathered_cut_copper", keepHeld: true },
    { surface: "minecraft:weathered_cut_copper",    held: AXES, result: "minecraft:exposed_cut_copper",   keepHeld: true },
    { surface: "minecraft:exposed_cut_copper",      held: AXES, result: "minecraft:cut_copper",           keepHeld: true },
    { surface: "minecraft:oxidized_cut_copper_slab",   held: AXES, result: "minecraft:weathered_cut_copper_slab",   keepHeld: true },
    { surface: "minecraft:weathered_cut_copper_slab",  held: AXES, result: "minecraft:exposed_cut_copper_slab",     keepHeld: true },
    { surface: "minecraft:exposed_cut_copper_slab",    held: AXES, result: "minecraft:cut_copper_slab",             keepHeld: true },
    { surface: "minecraft:oxidized_cut_copper_stairs",   held: AXES, result: "minecraft:weathered_cut_copper_stairs",   keepHeld: true },
    { surface: "minecraft:weathered_cut_copper_stairs",  held: AXES, result: "minecraft:exposed_cut_copper_stairs",     keepHeld: true },
    { surface: "minecraft:exposed_cut_copper_stairs",    held: AXES, result: "minecraft:cut_copper_stairs",             keepHeld: true },
];

/**
 * Tries to apply a deployer application recipe on a depot/belt item.
 * Returns true if a recipe was applied (caller should skip normal block interaction).
 * @param {mc.Entity} deployerEntity
 * @param {mc.Block | undefined} targetBlock
 * @param {mc.Vector3 | undefined} location
 */
function spawnDepotDeployerProcessParticle(deployerEntity, targetBlock, location) {
    if (targetBlock?.typeId !== "create:depot") return;

    const particleLocation = {
        x: location?.x ?? targetBlock.x + 0.5,
        y: targetBlock.y + 1.02,
        z: location?.z ?? targetBlock.z + 0.5
    };

    try {
        deployerEntity.dimension.spawnParticle("create:deploy_impact", particleLocation);
    } catch {}
}

/** @param {Entity} deployerEntity @param {ItemStack | undefined} heldItem @param {Entity | null} conveyorEntity @param {Block | undefined} targetBlock */
function tryApplyDeployerRecipe(deployerEntity, heldItem, conveyorEntity, targetBlock) {
    if (!heldItem || !conveyorEntity) return false;

    const conveyorContainer = conveyorEntity.getComponent("minecraft:inventory")?.container;
    if (!conveyorContainer) return false;
    const surfaceItem = conveyorContainer.getItem(0);
    if (!surfaceItem) return false;

    const recipe = DEPLOY_RECIPES.find(r => {
        if (r.surface !== surfaceItem.typeId) return false;
        if (r.held instanceof Set) return r.held.has(heldItem.typeId);
        return r.held === heldItem.typeId;
    });
    //console.warn(`[Deployer] ${surfaceItem.typeId} + ${heldItem.typeId} -> ${recipe?.result ?? 'NO MATCH'}`);
    if (!recipe) return false;

    const processLocation = { ...conveyorEntity.location };
    const resultItem = new mc.ItemStack(recipe.result, 1);
    racoAPI.processOneConveyorItem(conveyorEntity, resultItem, processLocation);
    spawnDepotDeployerProcessParticle(deployerEntity, targetBlock, processLocation);

    if (recipe.damageHeld) {
        damageDeployerTool(deployerEntity, heldItem, 1);
    } else if (!recipe.keepHeld) {
        if (heldItem.amount > 1) {
            heldItem.amount -= 1;
            deployerEntity.getComponent("minecraft:inventory")?.container?.setItem(0, heldItem);
        } else {
            deployerEntity.getComponent("minecraft:inventory")?.container?.setItem(0, undefined);
            deployerEntity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air");
        }
    }

    if (recipe.sound) {
        try { deployerEntity.dimension.playSound(recipe.sound, conveyorEntity.location, { volume: 0.65, pitch: 1.05 }); } catch {}
    }

    return true;
}

// ── Sequenced Assembly recipes ───────────────────────────────────────────────
// Multi-step, multi-pass recipes (e.g. Precision Mechanism).
// Each step: { held: typeId, keepHeld: bool }
// After all passes complete, rolls for result or junk.

/** @type {SequencedRecipe[]} */
const SEQUENCED_RECIPES = [
    {
        id: "precision_mechanism",
        surface: "create:golden_sheet",
        inProgress: "create:incomplete_precision_mechanism",
        steps: [
            { held: "create:cogwheel",       keepHeld: false },
            { held: "create:large_cogwheel", keepHeld: false },
            { held: "minecraft:iron_nugget", keepHeld: false },
        ],
        passes: 5,
        result: "create:precision_mechanism",
        // Junk table — weights are relative to each other.
        // Success weight = 4× total junk weight ≈ 80% success rate.
        junk: [
            { item: "create:golden_sheet",   weight: 53 },
            { item: "create:andesite_alloy", weight: 53 },
            { item: "create:cogwheel",       weight: 33 },
            { item: "create:shaft",          weight: 13 },
            { item: "minecraft:gold_nugget", weight: 13 },
            { item: "minecraft:iron_ingot",  weight:  6 },
            { item: "minecraft:clock",       weight:  6 },
        ]
    }
];

/** Rolls the final result: ~80% real result, ~20% random junk. */
/** @param {DeployableSequencedRecipe} recipe */
function rollSequencedResult(recipe) {
    const junkTotal = recipe.junk.reduce((/** @type {number} */ sum, /** @type {{weight: number}} */ entry) => sum + entry.weight, 0);
    const roll = Math.random() * (junkTotal * 5); // junkTotal = 20%, junkTotal×4 = 80% success
    if (roll >= junkTotal) return recipe.result;
    let r = roll;
    for (const j of recipe.junk) {
        r -= j.weight;
        if (r <= 0) return j.item;
    }
    return recipe.result;
}

/**
 * Tries to advance a Sequenced Assembly on a depot/belt item.
 * Returns true if a step was applied (caller should skip normal block interaction).
 */
/** @param {Entity} deployerEntity @param {ItemStack | undefined} heldItem @param {Entity | null} conveyorEntity @param {Block | undefined} targetBlock */
function tryApplySequencedRecipe(deployerEntity, heldItem, conveyorEntity, targetBlock) {
    if (!heldItem || !conveyorEntity) return false;
    // No tick cooldown here — create:assembly_data state already prevents double-processing,
    // and a cooldown would block the next deployer in a sequence from processing the same item.

    const conveyorContainer = conveyorEntity.getComponent("minecraft:inventory")?.container;
    if (!conveyorContainer) return false;
    const surfaceItem = conveyorContainer.getItem(0);
    if (!surfaceItem) return false;
    if (surfaceItem.amount > 1) return false;

    const assemblyValue = conveyorEntity.getDynamicProperty("create:assembly_data");
    const assemblyRaw = typeof assemblyValue === "string" ? assemblyValue : undefined;
    let assemblyData = assemblyRaw ? JSON.parse(assemblyRaw) : null;
    /** @type {DeployableSequencedRecipe | undefined} */
    let recipe;
    /** @type {number} */
    let stepIndex;

    if (assemblyData) {
        // Item already in assembly — find the recipe and validate the current step
        /** @type {DeployableSequencedRecipe[]} */
        const recipes = [...SEQUENCED_RECIPES, ...compatibilityRecipes.sequenced];
        recipe = recipes.find(r => r.id === assemblyData.id);
        if (!recipe) return false;
        stepIndex = assemblyData.step;
        const step = recipe.steps[stepIndex];
        if (step?.operation && step.operation !== "deploy") return false;
        if (!step || step.held !== heldItem.typeId) return false;
    } else {
        // Try to start a new assembly: surface item must match, held must match step 0
        /** @type {DeployableSequencedRecipe[]} */
        const recipes = [...SEQUENCED_RECIPES, ...compatibilityRecipes.sequenced];
        recipe = recipes.find(r =>
            r.surface === surfaceItem.typeId &&
            (!r.steps[0].operation || r.steps[0].operation === "deploy") &&
            r.steps[0].held === heldItem.typeId
        );
        if (!recipe) return false;
        assemblyData = { id: recipe.id, step: 0, passes: 0 };
        stepIndex = 0;
    }

    const step = recipe.steps[stepIndex];

    // Consume deployer's held item if needed
    if (!step.keepHeld) {
        if (heldItem.amount > 1) {
            heldItem.amount -= 1;
            deployerEntity.getComponent("minecraft:inventory")?.container?.setItem(0, heldItem);
        } else {
            deployerEntity.getComponent("minecraft:inventory")?.container?.setItem(0, undefined);
            deployerEntity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air");
        }
    }

    // Advance to the next step
    assemblyData.step = stepIndex + 1;

    if (assemblyData.step >= recipe.steps.length) {
        // One full pass complete
        assemblyData.passes += 1;
        assemblyData.step = 0;

        if (assemblyData.passes >= recipe.passes) {
            // All passes done — finalize
            const resultId = rollSequencedResult(recipe);
            const resultItem = new mc.ItemStack(resultId, 1);
            racoAPI.setItemInHand(resultItem, conveyorEntity, "Mainhand", 0, "create:item_visual");
            //console.warn(`[Deployer] seq COMPLETE -> ${resultId}`);
            conveyorEntity.setDynamicProperty("create:assembly_data", undefined);
            spawnDepotDeployerProcessParticle(deployerEntity, targetBlock, conveyorEntity.location);
            return true;
        }
    }

    // Show in-progress visual so the player can confirm the assembly is advancing
    if (recipe.inProgress) {
        const progressItem = new mc.ItemStack(recipe.inProgress, 1);
        racoAPI.setItemInHand(progressItem, conveyorEntity, "Mainhand", 0, "create:item_visual");
    }
    spawnDepotDeployerProcessParticle(deployerEntity, targetBlock, conveyorEntity.location);
    //console.warn(`[Deployer] seq step ${assemblyData.step}/${recipe.steps.length} pass ${assemblyData.passes}/${recipe.passes}`);
    conveyorEntity.setDynamicProperty("create:assembly_data", JSON.stringify(assemblyData));
    return true;
}

/** @param {Vector3} a @param {Vector3} b */
function deployerDistanceSquared(a, b) {
    const dx = (a?.x ?? 0) - (b?.x ?? 0);
    const dy = (a?.y ?? 0) - (b?.y ?? 0);
    const dz = (a?.z ?? 0) - (b?.z ?? 0);
    return dx * dx + dy * dy + dz * dz;
}

/** @param {Entity} entity @param {Vector3} location @param {number} [maxDistance] */
function isDeployerEntityAtLocation(entity, location, maxDistance = 0.35) {
    return entity?.isValid && deployerDistanceSquared(entity.location, location) <= maxDistance * maxDistance;
}

/** @param {Entity} entity @param {Block} block */
function setDeployerEntityOwner(entity, block) {
    try { entity?.setDynamicProperty("create:deployer_block_x", block.x); } catch {}
    try { entity?.setDynamicProperty("create:deployer_block_y", block.y); } catch {}
    try { entity?.setDynamicProperty("create:deployer_block_z", block.z); } catch {}
}

/** @param {Entity} entity @param {Block} block */
function isDeployerEntityOwnedByBlock(entity, block) {
    const x = entity?.getDynamicProperty?.("create:deployer_block_x");
    const y = entity?.getDynamicProperty?.("create:deployer_block_y");
    const z = entity?.getDynamicProperty?.("create:deployer_block_z");
    const hasOwner = typeof x === "number" || typeof y === "number" || typeof z === "number";
    if (!hasOwner) return true;
    return x === block.x && y === block.y && z === block.z;
}

/** @param {Block} block @param {string} type @param {Vector3 | undefined} [location] @param {number} [maxDistance] */
function getDeployerEntities(block, type, location = block?.center(), maxDistance = 0.85) {
    if (!block || !location) return [];
    try {
        const searchDistance = Math.min(maxDistance, 0.45);
        return block.dimension
            .getEntities({ type, location, maxDistance: searchDistance })
            .filter(entity => isDeployerEntityAtLocation(entity, location, 0.35) && isDeployerEntityOwnedByBlock(entity, block));
    } catch {
        return [];
    }
}

/** @param {Entity[]} entities */
function chooseDeployerEntity(entities) {
    return entities.find(entity => entity.getComponent("minecraft:inventory")?.container?.getItem(0)) ?? entities[0];
}

/** @param {Entity[]} entities @param {Entity | undefined} keeper */
function removeDuplicateDeployerEntities(entities, keeper) {
    for (const entity of entities) {
        if (!entity?.isValid || entity === keeper) continue;
        try { entity.remove(); } catch {}
    }
}

/** @param {Block} block @param {Entity} entity */
function syncDeployerEntityRotation(block, entity) {
    try {
        const facing = block.permutation.getAllStates()["minecraft:facing_direction"];
        const direction = typeof facing === "string" ? facing : "south";
        const rotation = INVERT_FACE[/** @type {keyof typeof INVERT_FACE} */ (direction)];
        entity?.setProperty("create:cardinal_rotation", rotation ?? direction);
    } catch {}
}

/** @param {Block} block */
function getOrSpawnEntity(block) {
    if (!block) return undefined;
    const entities = getDeployerEntities(block, "create:deployer_entity", block.center(), 0.45);
    let entity = chooseDeployerEntity(entities);
    if (!entity?.isValid) {
        entity = block.dimension.spawnEntity("create:deployer_entity", block.center());
        try { entity.setDynamicProperty(DEPLOYER_NEEDS_RPM_RECALC_PROP, true); } catch {}
    }
    setDeployerEntityOwner(entity, block);
    removeDuplicateDeployerEntities(entities, entity);
    try { entity.teleport(block.center()); } catch {}
    syncDeployerEntityRotation(block, entity);
    return entity;
}

/** @param {Block} block @param {Entity} entity */
function repairDeployerRpmAfterRespawn(block, entity) {
    if (!block || !entity?.isValid) return;
    let needsRecalc = false;
    try { needsRecalc = entity.getDynamicProperty(DEPLOYER_NEEDS_RPM_RECALC_PROP) === true; } catch {}
    if (!needsRecalc) return;

    try { entity.setDynamicProperty(DEPLOYER_NEEDS_RPM_RECALC_PROP, undefined); } catch {}
    try { initRpmBlock({ block, dimension: block.dimension, previousBlock: undefined }); } catch {}
}

/** @param {Block} block */
function deployerFilterLocation(block) {
    return {
        x: block.center().x,
        y: block.location.y + 1.05,
        z: block.center().z
    };
}

/** @param {Block} block */
function getDeployerFilterEntity(block) {
    if (!block) return undefined;
    const entities = getDeployerEntities(block, DEPLOYER_FILTER_ENTITY, deployerFilterLocation(block), 0.85);
    const entity = chooseDeployerEntity(entities);
    removeDuplicateDeployerEntities(entities, entity);
    return entity;
}

/** @param {Block} block @param {Entity | undefined} [entity] */
function getStoredDeployerFilter(block, entity = getDeployerFilterEntity(block)) {
    try {
    } catch {}

    try {
        const entityFilter = entity?.getDynamicProperty?.(DEPLOYER_FILTER_ITEM_PROP);
        if (typeof entityFilter === "string" && entityFilter.length > 0) return entityFilter;
    } catch {}

    const item = entity?.getComponent("minecraft:inventory")?.container?.getItem(0);
    return item?.typeId;
}

/** @param {Block} block @param {Entity | undefined} entity @param {string | undefined} itemId */
function setStoredDeployerFilter(block, entity, itemId) {
    try { entity?.setDynamicProperty?.(DEPLOYER_FILTER_ITEM_PROP, itemId); } catch {}
}

/** @param {Entity | undefined} entity */
function clearDeployerFilterVisual(entity) {
    try { entity?.getComponent("minecraft:inventory")?.container?.setItem(0, undefined); } catch {}
    try { entity?.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air"); } catch {}
}

/** @param {Block} block */
function syncDeployerFilter(block) {
    if (!block || block.typeId !== "create:deployer") return undefined;
    const filterId = getStoredDeployerFilter(block);
    let entity = getDeployerFilterEntity(block);

    if (!filterId) {
        if (entity?.isValid) {
            clearDeployerFilterVisual(entity);
            try { entity.remove(); } catch {}
        }
        return undefined;
    }

    if (!entity?.isValid) entity = block.dimension.spawnEntity(DEPLOYER_FILTER_ENTITY, deployerFilterLocation(block));
    setDeployerEntityOwner(entity, block);
    try { entity.teleport(deployerFilterLocation(block)); } catch {}
    const filterItem = new mc.ItemStack(filterId, 1);
    racoAPI.setItemInHand(filterItem, entity, "Mainhand", 0, "create:item_visual");
    setStoredDeployerFilter(block, entity, filterId);
    return entity;
}

/** @param {Block} block @param {ItemStack | undefined} item */
function setDeployerFilter(block, item) {
    if (!block || !item) return false;
    const entity = getDeployerFilterEntity(block) ?? block.dimension.spawnEntity(DEPLOYER_FILTER_ENTITY, deployerFilterLocation(block));
    setDeployerEntityOwner(entity, block);
    setStoredDeployerFilter(block, entity, item.typeId);
    syncDeployerFilter(block);
    try { block.dimension.playSound("block.itemframe.add_item", block.center(), { volume: 0.7, pitch: 1.1 }); } catch {}
    return true;
}

/** @param {Block} block */
function clearDeployerFilter(block) {
    const entity = getDeployerFilterEntity(block);
    clearDeployerFilterVisual(entity);
    setStoredDeployerFilter(block, entity, undefined);
    try { entity?.remove(); } catch {}
    try { block.dimension.playSound("block.itemframe.remove_item", block.center(), { volume: 0.7, pitch: 1.0 }); } catch {}
}

/** @param {Block} block @param {ItemStack | undefined} item */
function deployerAcceptsPlayerItem(block, item) {
    const filterId = getStoredDeployerFilter(block);
    return !filterId || item?.typeId === filterId;
}

/** @param {Block} block @param {Entity} entity */
function pullDeployerHopperInput(block, entity) {
    const key = `${block.dimension.id}:${block.x},${block.y},${block.z}`;
    const now = mc.system.currentTick ?? 0;
    if (now < (DEPLOYER_HOPPER_INPUT_TICKS.get(key) ?? 0)) return false;
    DEPLOYER_HOPPER_INPUT_TICKS.set(key, now + DEPLOYER_HOPPER_INPUT_INTERVAL);

    const facing = block.permutation.getAllStates()["minecraft:facing_direction"];
    const frontFace = racoAPI.blockFaceToDirection(typeof facing === "string" ? facing : "south");
    const backFace = racoAPI.invertFace(frontFace);
    const hoppers = getDeployerInputHoppers(block, backFace);

    const deployerContainer = entity.getComponent("minecraft:inventory")?.container;
    if (!deployerContainer) return false;

    const currentItem = deployerContainer.getItem(0);
    for (const hopper of hoppers) {
        const hopperContainer = hopper.getComponent("inventory")?.container;
        if (!hopperContainer) continue;

        for (let i = 0; i < hopperContainer.size; i++) {
            const hopperItem = hopperContainer.getItem(i);
            if (!hopperItem) continue;
            if (!deployerAcceptsPlayerItem(block, hopperItem)) continue;
            if (getDeployerHandMode(block) && !isHandModeTool(hopperItem)) continue;

            const canAdd = !currentItem ||
                (currentItem.typeId === hopperItem.typeId && currentItem.amount < currentItem.maxAmount);
            if (!canAdd) continue;

            const transfer = hopperItem.clone();
            transfer.amount = 1;
            if (!currentItem) {
                setDeployerHeldVisual(transfer, entity, block);
            } else {
                currentItem.amount += 1;
                deployerContainer.setItem(0, currentItem);
            }
            racoAPI.clearItem(hopperContainer, i, 1);
            try { block.dimension.playSound("block.itemframe.add_item", block.center()); } catch {}
            return true;
        }
    }

    return false;
}

/** @param {Block} block @param {string | undefined} preferredFace */
function getDeployerInputHoppers(block, preferredFace) {
    const faces = [preferredFace, "north", "south", "west", "east", "above", "below"]
        .filter((face, index, arr) => typeof face === "string" && arr.indexOf(face) === index);
    const hoppers = [];

    for (const face of faces) {
        const hopper = face === "north" ? block.north() : face === "south" ? block.south() : face === "west" ? block.west() : face === "east" ? block.east() : face === "above" ? block.above() : block.below();
        if (hopper?.typeId !== "minecraft:hopper") continue;
        if (hopper.permutation.getState("toggle_bit") === true) continue;
        hoppers.push(hopper);
    }

    return hoppers;
}

/** @param {Block} block */
function getDeployerHandMode(block) {
    try { return block.permutation.getAllStates()["create:hand_mode"] === true; } catch { return false; }
}

/** @param {Block} block @param {Entity} entity @param {boolean} enabled */
function setDeployerHandMode(block, entity, enabled) {
    try { block.setPermutation(mc.BlockPermutation.resolve(block.typeId, { ...block.permutation.getAllStates(), "create:hand_mode": enabled })); } catch {}
    try { entity?.setProperty("create:hand_mode", enabled); } catch {}
}

/** @param {Block} block @param {Entity} entity */
function syncDeployerHandMode(block, entity) {
    try {
        const mode = getDeployerHandMode(block);
        if (entity?.getProperty("create:hand_mode") !== mode) entity?.setProperty("create:hand_mode", mode);
    } catch {}
}

/**
 * Called when the deployer block is placed.
 * @param {mc.Block} block
 */
export function deployerPlace(block) {
    const entity = getOrSpawnEntity(block);
    if (!entity) return;
    syncDeployerHandMode(block, entity);
    syncDeployerFilter(block);
}

/**
 * Called when the deployer block is broken — drop held item.
 * @param {mc.Block} block
 */
export function deployerBreak(block) {
    if (block) DEPLOYER_HOPPER_INPUT_TICKS.delete(`${block.dimension.id}:${block.x},${block.y},${block.z}`);
    const filterEntities = getDeployerEntities(block, DEPLOYER_FILTER_ENTITY, deployerFilterLocation(block), 0.45);
    for (const filterEntity of filterEntities) {
        clearDeployerFilterVisual(filterEntity);
        try { filterEntity.remove(); } catch {}
    }

    const entities = getDeployerEntities(block, "create:deployer_entity", block?.center?.(), 0.45);
    const entity = chooseDeployerEntity(entities);
    if (!entity) return;
    const held = entity.getComponent("minecraft:inventory")?.container?.getItem(0);
    if (held) {
        block.dimension.spawnItem(held, block.center());
    }
    for (const deployerEntity of entities) {
        try { deployerEntity.remove(); } catch {}
    }
}

/**
 * Called when a player interacts with the deployer.
 * Right-click with item → load it. Sneak+right-click → eject item.
 * @param {mc.Player} player
 * @param {mc.Block} block
 */
export function deployerInteract(player, block) {
    const entity = getOrSpawnEntity(block);
    if (!entity) return;
    syncDeployerHandMode(block, entity);

    const container = entity.getComponent("minecraft:inventory")?.container;
    if (!container) return;
    const heldItem = container.getItem(0);
    const playerItem = player.getComponent("minecraft:equippable")?.getEquipment(mc.EquipmentSlot.Mainhand);
    syncDeployerFilter(block);

    if (playerItem?.typeId === "create:wrench") {
        const enabled = !getDeployerHandMode(block);
        setDeployerHandMode(block, entity, enabled);
        if (enabled && heldItem && !isHandModeTool(heldItem)) {
            block.dimension.spawnItem(heldItem, block.center());
            container.setItem(0, undefined);
            entity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air");
        } else if (heldItem) {
            setDeployerHeldVisual(heldItem, entity, block);
        }
        block.dimension.playSound("random.click", block.center(), { volume: 0.7, pitch: enabled ? 1.25 : 0.85 });
        return;
    }

    if (player.isSneaking) {
        if (playerItem) {
            setDeployerFilter(block, playerItem);
            return;
        }

        if (getStoredDeployerFilter(block)) {
            clearDeployerFilter(block);
            return;
        }

        // Eject item
        if (heldItem) {
            block.dimension.spawnItem(heldItem, block.center());
            container.setItem(0, undefined);
            entity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air");
            block.dimension.playSound("block.itemframe.remove_item", block.center());
        }
    } else {
        if (!playerItem) return;
        if (!deployerAcceptsPlayerItem(block, playerItem)) {
            block.dimension.playSound("random.click", block.center(), { volume: 0.4, pitch: 0.55 });
            return;
        }
        if (getDeployerHandMode(block) && !isHandModeTool(playerItem)) {
            block.dimension.playSound("random.click", block.center(), { volume: 0.4, pitch: 0.6 });
            return;
        }

        // Swap or set item
        if (heldItem) {
            block.dimension.spawnItem(heldItem, block.center());
            container.setItem(0, undefined);
        }
        setDeployerHeldVisual(playerItem, entity, block);
        racoAPI.clearMainhand(player, playerItem.amount, true);
        block.dimension.playSound("block.itemframe.add_item", block.center());
    }
}

/**
 * Main tick function called every tick when spinning.
 * @param {mc.Block} block
 */
export function deployerTick(block) {
    syncDeployerFilter(block);
    const entity = getOrSpawnEntity(block);
    if (!entity) return;
    repairDeployerRpmAfterRespawn(block, entity);
    if (mc.system.currentTick % 20 === 0) syncDeployerHandMode(block, entity);

    const rpmValue = entity.getProperty("create:rpm");
    const rpm = typeof rpmValue === "number" ? rpmValue : 0;

    // Hopper input runs whether spinning or not.
    pullDeployerHopperInput(block, entity);

    if (rpm === 0) return;

    const facing = block.permutation.getAllStates()["minecraft:facing_direction"];
    const frontFace = racoAPI.blockFaceToDirection(typeof facing === "string" ? facing : "south");
    const frontBlock = frontFace === "north" ? block.north(-2) : frontFace === "south" ? block.south(-2) : frontFace === "east" ? block.east(-2) : frontFace === "west" ? block.west(-2) : undefined;
    const bruteSpeed = snapToPowerOf2(Math.abs(rpm));
    const now = mc.system.currentTick;

    // ── Belt-item locking ──────────────────────────────────────────────────
    // Hold any conveyor_item in the deploy zone every tick.
    // Release tracking is per-deployer: stores which block released the item so
    // that only THIS deployer skips re-stopping it (other deployers catch it normally).
    if (frontBlock) {
        const stopY = frontBlock.y + 13 / 16;
        // Cast a wide net then filter by actual block coordinates — items are physically on
        // this block only when floor(item.x) == frontBlock.x && floor(item.z) == frontBlock.z.
        // This is identical to how the depot logic handles stopping (position-based, not radius).
        const candidates = frontBlock.dimension?.getEntities({
            type: "create:conveyor_item",
            location: { x: frontBlock.x + 0.5, y: stopY, z: frontBlock.z + 0.5 },
            maxDistance: 0.1
        });
        for (const item of (candidates ?? [])) {
            if (item.hasTag('create:conveyor_stop')) continue;

            // Item must be physically inside this block's XZ footprint
            if (Math.floor(item.location.x) !== frontBlock.x ||
                Math.floor(item.location.z) !== frontBlock.z) continue;

            // Skip only if THIS deployer's frontBlock released this item recently (60 ticks)
            const releaseValue = item.getDynamicProperty("create:release_from");
            if (typeof releaseValue === "string") {
                try {
                    const r = JSON.parse(releaseValue);
                    if (r.x === frontBlock.x && r.y === frontBlock.y && r.z === frontBlock.z
                        && (now - r.tick) < 60) continue;
                } catch {}
            }

            item.addTag('create:conveyor_stop');
        }
    }

    // ── Deploy cycle ───────────────────────────────────────────────────────
    const movementValue = entity.getDynamicProperty("create:movement_info");
    const movementInfo = typeof movementValue === "string" ? movementValue : undefined;
    if (!movementInfo) {
        const animTicks = TIME_CONFIG[/** @type {keyof typeof TIME_CONFIG} */ (bruteSpeed)];
        entity.setDynamicProperty("create:movement_info", JSON.stringify({
            startTick: now,
            interactTick: now + Math.ceil(animTicks / 2),
            endTick: now + Math.ceil(animTicks)
        }));
    } else {
        const data = JSON.parse(movementInfo);

        const elapsed = now - data.startTick;
        const total = data.endTick - data.startTick;
        entity.setProperty('create:deploy_progress', Math.min(elapsed / total, 1.0));

        if (now >= data.interactTick && !data.interacted) {
            const held = entity.getComponent("minecraft:inventory")?.container?.getItem(0);

            if (frontBlock) {
                const interactPos = { x: frontBlock.x + 0.5, y: frontBlock.y + 13 / 16, z: frontBlock.z + 0.5 };

                // Only interact with an item that THIS deployer's stop-check already tagged.
                // Math.floor coordinate check ensures the item is physically inside THIS block,
                // preventing cross-deployer interference regardless of belt speed.
                const targets = frontBlock.dimension?.getEntities({
                    type: "create:conveyor_item",
                    location: { x: frontBlock.x + 0.5, y: frontBlock.y + 13 / 16, z: frontBlock.z + 0.5 },
                    maxDistance: 1.2
                });
                const conveyorTarget = (targets ?? []).find(/** @param {Entity} t */ t =>
                    t.hasTag('create:conveyor_stop') &&
                    Math.floor(t.location.x) === frontBlock.x &&
                    Math.floor(t.location.z) === frontBlock.z
                ) ?? null;
                if (held && conveyorTarget) {
                    block.dimension.playSound("block.itemframe.add_item", block.center());
                }

                if (!tryApplySequencedRecipe(entity, held, conveyorTarget, frontBlock) && !tryApplyDeployerRecipe(entity, held, conveyorTarget, frontBlock)) {
                    const usedHandTool = getDeployerHandMode(block) && tryUseHandTool(held, frontBlock, entity);
                    if (!usedHandTool && !tryUseHeldItemOnEntity(held, frontBlock, entity) && !tryUseHeldItemOnWorld(held, frontBlock, entity)) {
                        if (held && !NO_GENERIC_BLOCK_PLACE_ITEMS.has(held.typeId) && racoAPI.itemIsBlock(frontBlock, held) && (frontBlock.isAir || frontBlock.isLiquid)) {
                            frontBlock.setType(held.typeId);
                            if (held.amount > 1) {
                                held.amount -= 1;
                                entity.getComponent("minecraft:inventory")?.container?.setItem(0, held);
                            } else {
                                entity.getComponent("minecraft:inventory")?.container?.setItem(0, undefined);
                                entity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air");
                            }
                        } else if (held) {
                            useOnBlock(held, frontBlock, entity);
                        }
                    }
                }

                // Release immediately after the click — use the same entity we already found
                if (conveyorTarget) {
                    const releaseStamp = JSON.stringify({ x: frontBlock.x, y: frontBlock.y, z: frontBlock.z, tick: now });
                    conveyorTarget.setDynamicProperty("create:release_from", releaseStamp);
                    try { conveyorTarget.removeTag('create:conveyor_stop'); } catch {}
                }
            }

            data.interacted = true;
            entity.setDynamicProperty("create:movement_info", JSON.stringify(data));
        }

        if (now >= data.endTick) {
            entity.setProperty('create:deploy_progress', 0.0);
            entity.setDynamicProperty("create:movement_info", undefined);
        }
    }
}
