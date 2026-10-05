import * as mc from "@minecraft/server";
import * as racoAPI from "../raco-API.js";
import { resolveCompatibilityFluidId } from "../../compatibility/registries.js";

const SMART_FLUID_PIPE_TYPE = "create:smart_fluid_pipe";
const FILTER_ENTITY_TYPE = "create:smart_fluid_pipe_filter";
const FILTER_FLUID_BY_BUCKET = new Map([
    ["minecraft:water_bucket", "minecraft:water_bucket"],
    ["minecraft:lava_bucket", "minecraft:lava_bucket"],
    ["minecraft:milk_bucket", "minecraft:milk_bucket"],
    ["create:honey_bucket", "create:honey_bucket"],
    ["create:chocolate_bucket", "create:chocolate_bucket"]
]);
const FILTER_STATE_BY_BUCKET = new Map([
    ["minecraft:water_bucket", "water"],
    ["minecraft:lava_bucket", "lava"],
    ["minecraft:milk_bucket", "milk"],
    ["create:honey_bucket", "honey"],
    ["create:chocolate_bucket", "chocolate"]
]);
const BUCKET_BY_FILTER_STATE = new Map([
    ["water", "minecraft:water_bucket"],
    ["lava", "minecraft:lava_bucket"],
    ["milk", "minecraft:milk_bucket"],
    ["honey", "create:honey_bucket"],
    ["chocolate", "create:chocolate_bucket"]
]);
const FILTER_CACHE_TICKS = 60;
const FILTER_ITEM_PROPERTY = "create:smart_fluid_pipe_filter_item";
const filterCache = new Map();

function getFilterFluidForItem(itemId) {
    return FILTER_FLUID_BY_BUCKET.get(itemId) ?? resolveCompatibilityFluidId(itemId);
}

function isFluidFilterItem(itemId) {
    return typeof itemId === "string" && !!getFilterFluidForItem(itemId);
}

function blockKey(block) {
    const dimensionId = block?.dimension?.id ?? "overworld";
    const location = block?.location;
    return `${dimensionId}:${location?.x},${location?.y},${location?.z}`;
}

function getCached(block) {
    const id = blockKey(block);
    let entry = filterCache.get(id);
    if (!entry) {
        entry = {};
        filterCache.set(id, entry);
    }
    return entry;
}

function updateFilterCache(block, entity, fluidId) {
    if (!block) return;
    const entry = getCached(block);
    entry.entity = entity;
    entry.fluidId = fluidId;
    entry.fluidExpires = mc.system.currentTick + FILTER_CACHE_TICKS;
    entry.facing = getFacing(block);
}

function setStoredFilterItem(block, entity, itemId) {
    const filterState = FILTER_STATE_BY_BUCKET.get(itemId) ?? "none";
    try {
        if (block?.permutation?.getState("create:filter") !== filterState) {
            racoAPI.setPermutation(block, "create:filter", filterState);
        }
    } catch {}
    try { block?.setDynamicProperty?.(FILTER_ITEM_PROPERTY, itemId); } catch {}
    try { entity?.setDynamicProperty?.(FILTER_ITEM_PROPERTY, itemId); } catch {}
}

function getStoredFilterItem(block, entity) {
    try {
        const filterState = block?.permutation?.getState("create:filter");
        const stateItem = BUCKET_BY_FILTER_STATE.get(filterState);
        if (stateItem) return stateItem;
    } catch {}

    try {
        const blockItem = block?.getDynamicProperty?.(FILTER_ITEM_PROPERTY);
        if (typeof blockItem === "string" && blockItem.length > 0) return blockItem;
    } catch {}

    try {
        const entityItem = entity?.getDynamicProperty?.(FILTER_ITEM_PROPERTY);
        if (typeof entityItem === "string" && entityItem.length > 0) return entityItem;
    } catch {}

    return undefined;
}

function applyFilterItemVisual(block, entity, itemId) {
    if (!entity?.isValid || !isFluidFilterItem(itemId)) return undefined;
    const filterItem = new mc.ItemStack(itemId, 1);
    racoAPI.setItemInHand(filterItem, entity, "Mainhand", 0, "create:type");
    try { entity.setProperty("create:type", "item"); } catch {}
    setStoredFilterItem(block, entity, itemId);
    return getFilterFluidForItem(itemId);
}

function getFacing(block) {
    try { return block.permutation.getState("minecraft:facing_direction") ?? "south"; }
    catch { return "south"; }
}

function filterLocation(block) {
    return block.center();
}

function getFilterEntity(block) {
    if (!block || block.typeId !== SMART_FLUID_PIPE_TYPE) return undefined;
    const cached = getCached(block).entity;
    if (cached?.isValid) return cached;

    return block.dimension.getEntities({
        type: FILTER_ENTITY_TYPE,
        location: filterLocation(block),
        maxDistance: 0.9,
        closest: 1
    })[0];
}

function clearFilterVisual(entity) {
    try { entity.getComponent("minecraft:inventory")?.container?.setItem(0, undefined); } catch {}
    try { entity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 air"); } catch {}
}

function syncFilterEntity(block, entity = getFilterEntity(block)) {
    if (!block || block.typeId !== SMART_FLUID_PIPE_TYPE || !entity?.isValid) return;
    const entry = getCached(block);
    const facing = getFacing(block);
    if (entry.facing !== facing) {
        try { entity.setProperty("create:facing_direction", facing); } catch {}
        entry.facing = facing;
    }
    if (entry.entity !== entity) entry.entity = entity;
    if (mc.system.currentTick >= (entry.nextTeleport ?? 0)) {
        try { entity.teleport(filterLocation(block)); } catch {}
        entry.nextTeleport = mc.system.currentTick + 200;
    }
}

export function smartFluidPipePlace(block) {
    if (!block || block.typeId !== SMART_FLUID_PIPE_TYPE) return;
    const entity = getFilterEntity(block) ?? block.dimension.spawnEntity(FILTER_ENTITY_TYPE, filterLocation(block));
    syncFilterEntity(block, entity);
    const storedItem = getStoredFilterItem(block, entity);
    const fluidId = storedItem ? applyFilterItemVisual(block, entity, storedItem) : readFilterFluidFromEntity(entity);
    updateFilterCache(block, entity, fluidId);
}

export function smartFluidPipeBreak(block, dimension = block?.dimension) {
    if (!block || !dimension) return;
    const entities = dimension.getEntities({
        type: FILTER_ENTITY_TYPE,
        location: filterLocation(block),
        maxDistance: 1.1
    });
    for (const entity of entities) {
        try { entity.remove(); } catch {}
    }
    filterCache.delete(blockKey(block));
}

export function smartFluidPipeTick(block) {
    if (!block || block.typeId !== SMART_FLUID_PIPE_TYPE) return;
    const entity = getFilterEntity(block) ?? block.dimension.spawnEntity(FILTER_ENTITY_TYPE, filterLocation(block));
    syncFilterEntity(block, entity);
    const entry = getCached(block);
    if (mc.system.currentTick >= (entry.fluidExpires ?? 0)) {
        let fluidId = readFilterFluidFromEntity(entity);
        if (!fluidId) {
            const storedItem = getStoredFilterItem(block, entity);
            if (storedItem) fluidId = applyFilterItemVisual(block, entity, storedItem);
        }
        updateFilterCache(block, entity, fluidId);
    }
}

export function smartFluidPipeInteract(block, player, item) {
    if (!block || block.typeId !== SMART_FLUID_PIPE_TYPE) return false;
    const entity = getFilterEntity(block) ?? block.dimension.spawnEntity(FILTER_ENTITY_TYPE, filterLocation(block));
    syncFilterEntity(block, entity);

    if (player?.isSneaking) {
        clearFilterVisual(entity);
        setStoredFilterItem(block, entity, undefined);
        updateFilterCache(block, entity, undefined);
        try { block.dimension.playSound("block.itemframe.remove_item", block.center(), { volume: 0.7, pitch: 1.0 }); } catch {}
        return true;
    }

    if (!isFluidFilterItem(item?.typeId)) return false;

    const filterItem = new mc.ItemStack(item.typeId, 1);
    racoAPI.setItemInHand(filterItem, entity, "Mainhand", 0, "create:type");
    try { entity.setProperty("create:type", "item"); } catch {}
    setStoredFilterItem(block, entity, item.typeId);
    updateFilterCache(block, entity, getFilterFluidForItem(item.typeId));
    try { block.dimension.playSound("block.itemframe.add_item", block.center(), { volume: 0.7, pitch: 1.0 }); } catch {}
    return true;
}

export function smartFluidPipeCanHandle(block, player, item) {
    if (!block || block.typeId !== SMART_FLUID_PIPE_TYPE) return false;
    if (player?.isSneaking) return true;
    return isFluidFilterItem(item?.typeId);
}

export function smartFluidPipeAllows(block, fluidId) {
    if (!block || block.typeId !== SMART_FLUID_PIPE_TYPE) return true;
    const entry = getCached(block);
    let filterFluid = entry.fluidId;
    if (mc.system.currentTick >= (entry.fluidExpires ?? 0)) {
        const entity = getFilterEntity(block);
        filterFluid = readFilterFluidFromEntity(entity);
        if (!filterFluid) {
            const storedItem = getStoredFilterItem(block, entity);
            if (storedItem && entity?.isValid) filterFluid = applyFilterItemVisual(block, entity, storedItem);
            else filterFluid = getFilterFluidForItem(storedItem);
        }
        updateFilterCache(block, entity, filterFluid);
    }
    return !filterFluid || filterFluid === fluidId;
}

export function isSmartFluidPipe(block) {
    return block?.typeId === SMART_FLUID_PIPE_TYPE;
}

function readFilterFluidFromEntity(entity) {
    const filterItem = entity?.getComponent("minecraft:inventory")?.container?.getItem(0);
    const fluidId = getFilterFluidForItem(filterItem?.typeId);
    if (fluidId) return fluidId;
    const storedItem = getStoredFilterItem(undefined, entity);
    return getFilterFluidForItem(storedItem);
}
