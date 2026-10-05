import * as mc from "@minecraft/server";
import * as racoAPI from "../raco-API.js";
import { compatibilityFluids } from "../../compatibility/registries.js";

const ITEM_DRAIN_TYPE = "create:item_drain";
const BASIN_TYPE = "create:basin";
const FLUID_ENTITY_TYPE = "create:fluid.item_drain";
const DRAIN_VISUAL_TAG = "create_item_drain_bucket_visual";
const STORED_FLUID_ID_PROPERTY = "create:stored_fluid_id";
const DRAIN_FLUID_CAPACITY = 16;
const DRAIN_PROCESS_TICKS = 24;
const DRAIN_FLUID_Y = 0.09;

const DRAIN_FLUIDS = {
    "minecraft:water_bucket": { fluidType: "water", empty: "minecraft:bucket", sound: "bucket.empty_water" },
    "minecraft:potion": { fluidType: "water", empty: "minecraft:glass_bottle", sound: "bucket.empty_water" },
    "minecraft:lava_bucket": { fluidType: "lava", empty: "minecraft:bucket", sound: "bucket.empty_lava" },
    "create:honey_bucket": { fluidType: "honey", empty: "minecraft:bucket", sound: "place.honey_block" },
    "create:chocolate_bucket": { fluidType: "chocolate", empty: "minecraft:bucket", sound: "place.honey_block" },
    "minecraft:milk_bucket": { fluidType: "milk", empty: "minecraft:bucket", sound: "bucket.empty_water" }
};

const FLUID_ID_BY_TYPE = {
    water: "minecraft:water_bucket",
    lava: "minecraft:lava_bucket",
    honey: "create:honey_bucket",
    chocolate: "create:chocolate_bucket",
    milk: "minecraft:milk_bucket"
};

function getDrainFluid(fluidOrBucketId) {
    return DRAIN_FLUIDS[fluidOrBucketId]
        ?? compatibilityFluids.get(fluidOrBucketId)
        ?? [...compatibilityFluids.values()].find((fluid) => fluid.bucket === fluidOrBucketId);
}

function fluidLocation(block) {
    const center = block.center();
    const y = block.typeId === BASIN_TYPE ? block.y + 0.24 : block.y + DRAIN_FLUID_Y;
    return { x: center.x, y, z: center.z };
}

function isFluidContainerBlock(block) {
    return block?.typeId === ITEM_DRAIN_TYPE || block?.typeId === BASIN_TYPE;
}

function bucketVisualLocation(block, progress = 0) {
    const center = block.center();
    return {
        x: center.x,
        y: block.y + 1.02,
        z: center.z
    };
}

function getDrainFluidEntity(block) {
    return block?.dimension?.getEntities({
        type: FLUID_ENTITY_TYPE,
        location: fluidLocation(block),
        maxDistance: 0.8,
        closest: 1
    })[0] ?? null;
}

function getStoredFluidType(entity) {
    return entity?.getProperty?.("create:fluid_type");
}

function getStoredFluidId(entity) {
    const storedId = entity?.getDynamicProperty?.(STORED_FLUID_ID_PROPERTY);
    if (typeof storedId === "string" && getDrainFluid(storedId)) return storedId;
    return FLUID_ID_BY_TYPE[getStoredFluidType(entity)];
}

function getStoredAmount(entity) {
    const amount = Number(entity?.getDynamicProperty?.("create:fluid_amount") ?? 0);
    return Number.isFinite(amount) ? amount : 0;
}

function setStoredAmount(entity, amount) {
    try { entity.setDynamicProperty("create:fluid_amount", Math.max(0, amount)); } catch {}
}

function setStoredFluid(entity, bucketId, amount) {
    const config = getDrainFluid(bucketId);
    if (!config) return;
    const canonicalFluidId = config.id ?? FLUID_ID_BY_TYPE[config.fluidType] ?? bucketId;

    try { entity.setProperty("create:fluid_type", config.fluidType); } catch {}
    try { entity.setDynamicProperty(STORED_FLUID_ID_PROPERTY, canonicalFluidId); } catch {}
    try { entity.getComponent("minecraft:inventory")?.container?.setItem(0, new mc.ItemStack(config.bucket ?? canonicalFluidId, 1)); } catch {}
    setStoredAmount(entity, amount);
}

function ensureDrainFluidEntity(block, bucketId, addedAmount = 1) {
    const config = getDrainFluid(bucketId);
    if (!isFluidContainerBlock(block) || !config) return false;

    let entity = getDrainFluidEntity(block);
    if (entity?.isValid) {
        const currentType = getDrainFluid(getStoredFluidId(entity))?.fluidType;
        const currentAmount = getStoredAmount(entity);
        if (currentType && currentType !== config.fluidType) return false;
        if (currentAmount >= DRAIN_FLUID_CAPACITY) return false;

        setStoredFluid(entity, bucketId, Math.min(DRAIN_FLUID_CAPACITY, currentAmount + addedAmount));
        try { entity.teleport(fluidLocation(block)); } catch {}
        return true;
    }

    entity = block.dimension.spawnEntity(FLUID_ENTITY_TYPE, fluidLocation(block));
    if (!entity) return false;

    setStoredFluid(entity, bucketId, Math.min(DRAIN_FLUID_CAPACITY, addedAmount));
    return true;
}

function getDroppedItemStack(entity) {
    return entity?.getComponent("minecraft:item")?.itemStack
        ?? entity?.getComponent("item")?.itemStack
        ?? null;
}

function isDroppedItemOverDrain(entity, block) {
    const loc = entity.location;
    return Math.abs(loc.x - (block.x + 0.5)) <= 0.75
        && Math.abs(loc.z - (block.z + 0.5)) <= 0.75
        && loc.y >= block.y + 0.45
        && loc.y <= block.y + 1.9;
}

function splitOneBucketFromDrop(block, entity, itemStack) {
    if (!itemStack || itemStack.amount <= 1) {
        try { entity.remove(); } catch {}
        return;
    }

    const remaining = itemStack.clone();
    remaining.amount = itemStack.amount - 1;
    const location = { x: entity.location.x, y: entity.location.y, z: entity.location.z };
    try { entity.remove(); } catch {}
    try {
        const dropped = block.dimension.spawnItem(remaining, location);
        dropped?.clearVelocity?.();
    } catch {}
}

function spawnEmptyBucket(block, emptyItemId) {
    try {
        const dropped = block.dimension.spawnItem(new mc.ItemStack(emptyItemId, 1), {
            x: block.x + 0.5,
            y: block.y + 1.04,
            z: block.z + 0.5
        });
        dropped?.clearVelocity?.();
    } catch {}
}

function animateBucketDrain(block, bucketStack, emptyItemId, bucketId) {
    const visual = block.dimension.spawnEntity("create:conveyor_item", bucketVisualLocation(block));
    try { visual.addTag(DRAIN_VISUAL_TAG); } catch {}

    const singleBucket = bucketStack.clone();
    singleBucket.amount = 1;
    racoAPI.setItemInHand(singleBucket, visual, "Mainhand", 0, "create:item_visual");
    try { visual.setProperty("create:item_visual", "item"); } catch {}

    const spin = (tick) => {
        if (!visual?.isValid) return;

        const flipProgress = Math.min(1, tick / Math.max(1, Math.floor(DRAIN_PROCESS_TICKS / 2)));
        try { visual.teleport(bucketVisualLocation(block)); } catch {}
        try { visual.setProperty("create:rotation_x", 90); } catch {}
        try { visual.setProperty("create:rotation_y", 0); } catch {}
        try { visual.setProperty("create:rotation_z", 180 - flipProgress * 180); } catch {}

        if (tick >= DRAIN_PROCESS_TICKS) {
            try { visual.remove(); } catch {}
            spawnEmptyBucket(block, emptyItemId);
            return;
        }

        mc.system.runTimeout(() => spin(tick + 1), 1);
    };

    spin(0);
}

function tryDrainBucketItem(block, entity) {
    if (!block || block.typeId !== ITEM_DRAIN_TYPE || entity?.typeId !== "minecraft:item") return false;
    if (!isDroppedItemOverDrain(entity, block)) return false;

    const itemStack = getDroppedItemStack(entity);
    const config = getDrainFluid(itemStack?.typeId);
    if (!config) return false;

    if (!ensureDrainFluidEntity(block, itemStack.typeId, 1)) return false;

    splitOneBucketFromDrop(block, entity, itemStack);
    animateBucketDrain(block, itemStack, config.empty, itemStack.typeId);
    try { block.dimension.playSound(config.sound, block.center(), { volume: 0.45, pitch: 1.0 }); } catch {}
    return true;
}

function collectDroppedFluidBuckets(block) {
    const entities = block.dimension.getEntities({
        type: "minecraft:item",
        location: { x: block.x + 0.5, y: block.y + 1.05, z: block.z + 0.5 },
        maxDistance: 1.25
    });

    for (const entity of entities) {
        if (tryDrainBucketItem(block, entity)) return;
    }
}

export function itemDrainTick(block) {
    if (!block || block.typeId !== ITEM_DRAIN_TYPE) return;

    const fluidEntity = getDrainFluidEntity(block);
    if (fluidEntity?.isValid) {
        try { fluidEntity.teleport(fluidLocation(block)); } catch {}
        if (getStoredAmount(fluidEntity) <= 0) {
            try { fluidEntity.remove(); } catch {}
        }
    }

    collectDroppedFluidBuckets(block);
}

export function syncBasinFluid(block) {
    if (!block || block.typeId !== BASIN_TYPE) return;
    const fluidEntity = getDrainFluidEntity(block);
    if (!fluidEntity?.isValid) return;
    try { fluidEntity.teleport(fluidLocation(block)); } catch {}
    if (getStoredAmount(fluidEntity) <= 0) {
        try { fluidEntity.remove(); } catch {}
    }
}

export function itemDrainStepOn(block, entity) {
    tryDrainBucketItem(block, entity);
}

export function itemDrainBreak(block, dimension = block?.dimension) {
    if (!block || !dimension) return;

    const entities = dimension.getEntities({
        location: { x: block.x + 0.5, y: block.y + 0.55, z: block.z + 0.5 },
        maxDistance: 1.5
    });

    for (const entity of entities) {
        if (entity?.typeId === FLUID_ENTITY_TYPE || entity?.hasTag?.(DRAIN_VISUAL_TAG)) {
            try { entity.remove(); } catch {}
        }
    }
}

export function isItemDrainVisual(entity) {
    try { return entity?.hasTag?.(DRAIN_VISUAL_TAG) === true; } catch {}
    return false;
}

export function peekItemDrainFluid(block) {
    if (!isFluidContainerBlock(block)) return undefined;
    const entity = getDrainFluidEntity(block);
    if (!entity?.isValid || getStoredAmount(entity) <= 0) return undefined;
    return getStoredFluidId(entity);
}

export function takeItemDrainFluid(block, expectedFluidId) {
    if (!isFluidContainerBlock(block)) return false;
    const entity = getDrainFluidEntity(block);
    if (!entity?.isValid) return false;

    const fluidId = peekItemDrainFluid(block);
    if (!fluidId || (expectedFluidId && fluidId !== expectedFluidId)) return false;

    const nextAmount = getStoredAmount(entity) - 1;
    if (nextAmount <= 0) {
        try { entity.remove(); } catch {}
    } else {
        setStoredAmount(entity, nextAmount);
    }
    return true;
}

export function receiveItemDrainFluid(block, fluidId) {
    if (!isFluidContainerBlock(block) || !getDrainFluid(fluidId)) return false;
    return ensureDrainFluidEntity(block, fluidId, 1);
}

export function transformItemDrainFluid(block, expectedFluidId, outputFluidId) {
    if (!isFluidContainerBlock(block) || !getDrainFluid(outputFluidId)) return false;

    const entity = getDrainFluidEntity(block);
    if (!entity?.isValid) return false;

    const currentFluidId = peekItemDrainFluid(block);
    if (!currentFluidId || (expectedFluidId && currentFluidId !== expectedFluidId)) return false;

    setStoredFluid(entity, outputFluidId, Math.max(1, getStoredAmount(entity)));
    try { entity.teleport(fluidLocation(block)); } catch {}
    return true;
}

function getSelectedSlot(player) {
    const slot = player?.selectedSlotIndex ?? player?.selectedSlot;
    return Number.isInteger(slot) ? slot : undefined;
}

function addOrDrop(player, itemStack) {
    if (!player || !itemStack) return;
    try {
        const leftover = player.getComponent("inventory")?.container?.addItem(itemStack);
        if (leftover) player.dimension.spawnItem(leftover, player.location);
    } catch {
        try { player.dimension.spawnItem(itemStack, player.location); } catch {}
    }
}

function consumeOneFromPlayer(player, itemId) {
    if (player?.getGameMode?.() === "Creative") return { creative: true };

    const inventory = player?.getComponent("inventory")?.container;
    const selectedSlot = getSelectedSlot(player);
    if (inventory && selectedSlot !== undefined) {
        const selected = inventory.getItem(selectedSlot);
        if (selected?.typeId === itemId) {
            const emptied = selected.amount <= 1;
            if (emptied) inventory.setItem(selectedSlot, undefined);
            else {
                selected.amount--;
                inventory.setItem(selectedSlot, selected);
            }
            return { selected: true, emptied, slot: selectedSlot };
        }
    }

    return false;
}

function giveItemResult(player, consumed, itemId) {
    if (!consumed || consumed.creative) return true;

    const result = new mc.ItemStack(itemId, 1);
    const inventory = player?.getComponent("inventory")?.container;
    if (inventory && consumed.selected && consumed.emptied && consumed.slot !== undefined) {
        inventory.setItem(consumed.slot, result);
        return true;
    }

    addOrDrop(player, result);
    return true;
}

export function fillBucketFromFluidContainer(block, player, item) {
    if (!isFluidContainerBlock(block)) return false;

    const fluidId = peekItemDrainFluid(block);
    if (!fluidId) return false;
    const config = getDrainFluid(fluidId);
    const emptyItemId = config?.empty ?? "minecraft:bucket";
    if (item?.typeId !== emptyItemId) return false;

    const consumed = consumeOneFromPlayer(player, emptyItemId);
    if (!consumed) return false;
    if (!takeItemDrainFluid(block, fluidId)) {
        giveItemResult(player, consumed, emptyItemId);
        return false;
    }

    giveItemResult(player, consumed, config?.bucket ?? fluidId);
    try { block.dimension.playSound(config?.sound ?? "bucket.fill_water", block.center(), { volume: 0.8, pitch: 1.0 }); } catch {}
    return true;
}
