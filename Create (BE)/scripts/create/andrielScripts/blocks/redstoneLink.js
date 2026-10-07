import { BlockPermutation, ItemStack, system, world } from "@minecraft/server";
import { setItemInHand } from "../../racoScripts/raco-API.js";
import { getItemVisual } from "./conveyorMovement.js";

const LINK_ID = "create:redstone_link";
const RECEIVER_ID = "create:redstone_link_receiver";
const LINK_IDS = new Set([LINK_ID, RECEIVER_ID]);
const VISUAL_ID = "create:redstone_link_frequency";
const VISUAL_TAG = "create_redstone_link_frequency";
const ITEM_PREFIX = "create:redstone_link_frequency_item:";
const OWNER_PROP = "create:redstone_link_owner";
const SLOT_PROP = "create:redstone_link_slot";
const links = new Map();

function key(block) { return `${block.dimension.id}:${block.x},${block.y},${block.z}`; }
function itemKey(block, slot) { return `${ITEM_PREFIX}${key(block)}:${slot}`; }
function state(block, name, fallback) {
    try { return block.permutation.getState(name) ?? fallback; } catch { return fallback; }
}
function isLink(block) { return block?.isValid && LINK_IDS.has(block.typeId); }
function remember(block) {
    if (!isLink(block)) return;
    links.set(key(block), { dimension: block.dimension, location: { x: block.x, y: block.y, z: block.z } });
}
function forget(block) { if (block) links.delete(key(block)); }
function getItemId(block, slot) {
    try {
        const id = world.getDynamicProperty(itemKey(block, slot));
        return typeof id === "string" && id.length ? id : undefined;
    } catch { return undefined; }
}
function setItemId(block, slot, id) {
    try { world.setDynamicProperty(itemKey(block, slot), id); } catch {}
}
function frequency(block) {
    const first = getItemId(block, 0);
    if (!first) return undefined;
    const second = getItemId(block, 1);
    return second ? `${first}|${second}` : first;
}
function loadedLinks(dimension) {
    const result = [];
    for (const [id, entry] of links) {
        if (entry.dimension.id !== dimension.id) continue;
        let block;
        try { block = entry.dimension.getBlock(entry.location); } catch {}
        if (!isLink(block)) { links.delete(id); continue; }
        result.push(block);
    }
    return result;
}
function channelIsPowered(receiver) {
    const selected = frequency(receiver);
    if (!selected) return false;
    return loadedLinks(receiver.dimension).some(block =>
        block.typeId === LINK_ID
        && frequency(block) === selected
        && state(block, "create:powered", false) === true
    );
}
function setPowered(block, powered) {
    if (state(block, "create:powered", false) === powered) return false;
    try { block.setPermutation(block.permutation.withState("create:powered", powered)); return true; }
    catch { return false; }
}
function readIncomingPower(block) {
    let power = 0;
    try { power = Number(block.getRedstonePower() ?? 0); } catch {}
    for (const face of ["north", "south", "east", "west", "above", "below"]) {
        try { power = Math.max(power, Number(block[face]()?.getRedstonePower() ?? 0)); } catch {}
    }
    return power;
}
function refreshReceivers(dimension) {
    for (const block of loadedLinks(dimension)) {
        if (block.typeId === RECEIVER_ID) setPowered(block, channelIsPowered(block));
    }
}
/** @param {import('@minecraft/server').Block} block @param {number} slot @param {string | undefined} [itemId] */
function visualLocation(block, slot, itemId = undefined) {
    const direction = state(block, "minecraft:cardinal_direction", "south");
    const distance = slot === 0 ? -0.16 : 0.16;
    let x = 0, z = distance;
    if (direction === "north") z = -distance;
    if (direction === "east") { x = distance; z = 0; }
    if (direction === "west") { x = -distance; z = 0; }
    const forward = {
        south: { x: 0, z: 0.04 },
        north: { x: 0, z: 0.04 },
        east: { x: 0.04, z: 0 },
        west: { x: -0.04, z: 0 }
    }[direction] ?? { x: 0, z: 0.04 };
    x += forward.x;
    z += forward.z;
    const isBlockVisual = itemId ? getItemVisual(itemId).block === true : false;
    return {
        x: block.x + 0.5 + x,
        y: block.y + 0.25 - (isBlockVisual ? 0.10 : 0),
        z: block.z + 0.5 + z
    };
}
function visualEntities(block) {
    return block.dimension.getEntities({ type: VISUAL_ID, location: block.center(), maxDistance: 0.8 });
}
function findVisual(block, slot) {
    const owner = key(block);
    return visualEntities(block).find(entity =>
        entity.hasTag(VISUAL_TAG)
        && entity.getDynamicProperty(OWNER_PROP) === owner
        && Number(entity.getDynamicProperty(SLOT_PROP)) === slot
    );
}
/** @param {import('@minecraft/server').Block} block @param {number} slot */
function syncVisual(block, slot) {
    const itemId = getItemId(block, slot);
    let entity = findVisual(block, slot);
    if (!itemId) {
        try { entity?.remove(); } catch {}
        return;
    }
    const location = visualLocation(block, slot, itemId);
    if (!entity?.isValid) entity = block.dimension.spawnEntity(VISUAL_ID, location);
    try { entity.addTag(VISUAL_TAG); } catch {}
    try { entity.setDynamicProperty(OWNER_PROP, key(block)); } catch {}
    try { entity.setDynamicProperty(SLOT_PROP, slot); } catch {}
    try { entity.teleport(location); } catch {}
    try {
        const stack = new ItemStack(itemId, 1);
        setItemInHand(stack, entity, "Mainhand", 0, "create:item_visual");
        const visual = getItemVisual(itemId);
        entity.setProperty("create:item_visual", visual.hand ? "hand_equipped" : visual.block ? "block" : "item");
        entity.setProperty("create:rotation_x", 0);
        entity.setProperty("create:rotation_y", 0);
        entity.setProperty("create:rotation_z", 0);
        entity.setProperty("create:visual_scale", 0.65);
    } catch {}
}
function cleanupLegacyVisuals(block) {
    const owner = key(block);
    const oldVisuals = block.dimension.getEntities({ type: "create:conveyor_item", location: block.center(), maxDistance: 0.8 });
    for (const entity of oldVisuals) {
        if (!entity.hasTag(VISUAL_TAG)) continue;
        if (entity.getDynamicProperty(OWNER_PROP) !== owner) continue;
        try { entity.remove(); } catch {}
    }
}
function syncVisuals(block) {
    cleanupLegacyVisuals(block);
    syncVisual(block, 0);
    syncVisual(block, 1);
}
function removeVisuals(block) {
    const owner = key(block);
    for (const entity of visualEntities(block)) {
        if (entity.getDynamicProperty(OWNER_PROP) === owner) try { entity.remove(); } catch {}
    }
}
export function redstoneLinkPlace(block) {
    if (!isLink(block)) return;
    remember(block);
    system.run(() => { syncVisuals(block); refreshReceivers(block.dimension); });
}
export function redstoneLinkBreak(block, brokenPermutation) {
    if (!LINK_IDS.has(brokenPermutation?.type?.id)) return;
    const dimension = block.dimension;
    removeVisuals(block);
    setItemId(block, 0, undefined); setItemId(block, 1, undefined);
    forget(block);
    system.run(() => refreshReceivers(dimension));
}
export function redstoneLinkTick(block) {
    if (!isLink(block)) return;
    remember(block); syncVisuals(block);
    if (block.typeId === RECEIVER_ID) { setPowered(block, channelIsPowered(block)); return; }
    if (setPowered(block, readIncomingPower(block) > 0)) refreshReceivers(block.dimension);
}
export function redstoneLinkRedstoneUpdate(block, dimension, powerLevel) {
    if (block?.typeId !== LINK_ID) return;
    remember(block);
    if (setPowered(block, powerLevel > 0)) system.run(() => refreshReceivers(dimension));
}

export function redstoneLinkInteract(player, block, itemStack) {
    if (!isLink(block) || !player) return false;
    remember(block);
    if (itemStack?.typeId === "create:wrench") {
        const receiver = block.typeId === RECEIVER_ID;
        try {
            const states = block.permutation.getAllStates();
            states["create:receiver"] = !receiver;
            states["create:powered"] = false;
            block.setPermutation(BlockPermutation.resolve(receiver ? LINK_ID : RECEIVER_ID, states));
            block.dimension.playSound("random.click", block.center(), { volume: 0.8, pitch: receiver ? 0.85 : 1.2 });
        } catch { return true; }
        refreshReceivers(block.dimension);
        return true;
    }
    if (itemStack && itemStack.typeId !== LINK_ID) {
        const slot = !getItemId(block, 0) ? 0 : (!getItemId(block, 1) ? 1 : 0);
        setItemId(block, slot, itemStack.typeId);
        syncVisual(block, slot);
        try { block.dimension.playSound("block.itemframe.add_item", block.center(), { volume: 0.7, pitch: 1.1 }); } catch {}
        refreshReceivers(block.dimension);
        return true;
    }
    if (player.isSneaking) {
        if (!getItemId(block, 0) && !getItemId(block, 1)) return true;
        const slot = getItemId(block, 1) ? 1 : 0;
        setItemId(block, slot, undefined);
        syncVisual(block, slot);
        try { block.dimension.playSound("block.itemframe.remove_item", block.center(), { volume: 0.7, pitch: 1.0 }); } catch {}
        refreshReceivers(block.dimension);
        return true;
    }
    return true;
}
