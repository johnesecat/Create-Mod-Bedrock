import * as mc from "@minecraft/server";
import { compatibilityFluidsByBlock, compatibilityFluidsByBucket } from "../../compatibility/registries.js";

const FLUIDS_BY_BUCKET = {
    "create:honey_bucket": {
        block: "create:honey_fluid"
    },
    "create:chocolate_bucket": {
        block: "create:chocolate_fluid"
    },
    "minecraft:milk_bucket": {
        block: "create:milk_fluid"
    }
};

const BUCKET_BY_FLUID = {
    "create:honey_fluid": "create:honey_bucket",
    "create:chocolate_fluid": "create:chocolate_bucket",
    "create:milk_fluid": "minecraft:milk_bucket"
};

const PENDING_PICKUPS = new Set();
const PENDING_PLACEMENTS = new Set();

function getFluidForBucket(bucketId) {
    return FLUIDS_BY_BUCKET[bucketId] ?? compatibilityFluidsByBucket.get(bucketId);
}

function getFluidForBlock(blockId) {
    const builtInBucket = BUCKET_BY_FLUID[blockId];
    return builtInBucket ? { bucket: builtInBucket, empty: "minecraft:bucket" } : compatibilityFluidsByBlock.get(blockId);
}

function isFakeFluid(block) {
    return !!getFluidForBlock(block?.typeId);
}

function blockKey(block, player) {
    return `${player?.id ?? "player"}:${block?.dimension?.id ?? "dimension"}:${block?.x},${block?.y},${block?.z}`;
}

function blockOnlyKey(block) {
    return `${block?.dimension?.id ?? "dimension"}:${block?.x},${block?.y},${block?.z}`;
}

function adjacentLocation(location, face) {
    face = String(face ?? "").toLowerCase();
    const pos = { x: location.x, y: location.y, z: location.z };
    if (face === "up") pos.y++;
    else if (face === "down") pos.y--;
    else if (face === "north") pos.z--;
    else if (face === "south") pos.z++;
    else if (face === "east") pos.x++;
    else if (face === "west") pos.x--;
    return pos;
}

function getTargetBlock(block, face) {
    const pos = adjacentLocation(block.location, face);
    try { return block.dimension.getBlock(pos); } catch { return null; }
}

function setBlockType(block, blockId) {
    try {
        block.setType(blockId);
        return true;
    } catch {}

    try {
        block.dimension.runCommand(`setblock ${block.x} ${block.y} ${block.z} ${blockId}`);
        return true;
    } catch {}

    return false;
}

function addOrDrop(player, itemStack) {
    if (!itemStack) return;
    const inv = player.getComponent("inventory")?.container;
    const leftover = inv?.addItem(itemStack);
    if (leftover) {
        try {
            const dropped = player.dimension.spawnItem(leftover, player.location);
            dropped?.clearVelocity?.();
        } catch {}
    }
}

function getSelectedSlot(player) {
    const slot = player?.selectedSlotIndex ?? player?.selectedSlot;
    return Number.isInteger(slot) ? slot : undefined;
}

function consumeOneItem(player, expectedTypeId) {
    if (player?.getGameMode?.() === "Creative") return { creative: true };

    const inv = player.getComponent("inventory")?.container;
    const selectedSlot = getSelectedSlot(player);
    if (inv && selectedSlot !== undefined) {
        const selected = inv.getItem(selectedSlot);
        if (selected?.typeId === expectedTypeId) {
            const emptied = selected.amount <= 1;
            if (emptied) inv.setItem(selectedSlot, undefined);
            else {
                selected.amount--;
                inv.setItem(selectedSlot, selected);
            }
            return { slot: selectedSlot, selected: true, emptied };
        }
    }

    if (inv) {
        for (let i = 0; i < inv.size; i++) {
            if (i === selectedSlot) continue;
            const stack = inv.getItem(i);
            if (stack?.typeId !== expectedTypeId) continue;
            const emptied = stack.amount <= 1;
            if (emptied) inv.setItem(i, undefined);
            else {
                stack.amount--;
                inv.setItem(i, stack);
            }
            return { slot: i, selected: false, emptied };
        }
    }

    const held = player.getComponent("equippable")?.getEquipment("Mainhand");
    if (!held || held.typeId !== expectedTypeId) return false;

    if (held.amount <= 1) {
        try { player.getComponent("equippable")?.setEquipment("Mainhand", undefined); } catch {}
        return { selected: true, emptied: true };
    }

    held.amount--;
    try { player.getComponent("equippable")?.setEquipment("Mainhand", held); } catch {}
    return { selected: true, emptied: false };
}

function giveBucketResult(player, consumed, resultTypeId) {
    if (!consumed || consumed.creative) return true;

    const result = new mc.ItemStack(resultTypeId, 1);
    const inv = player.getComponent("inventory")?.container;
    if (inv && consumed.selected && consumed.emptied && consumed.slot !== undefined) {
        inv.setItem(consumed.slot, result);
        return true;
    }

    addOrDrop(player, result);
    return true;
}

function consumeFilledBucket(player, filledBucketId, emptyItemId = "minecraft:bucket") {
    const consumed = consumeOneItem(player, filledBucketId);
    if (!consumed) return false;
    return giveBucketResult(player, consumed, emptyItemId);
}

function fillEmptyBucket(player, bucketId, emptyItemId = "minecraft:bucket") {
    if (!bucketId) return false;
    if (player?.getGameMode?.() === "Creative") {
        return true;
    }

    const consumed = consumeOneItem(player, emptyItemId);
    if (!consumed) return false;
    return giveBucketResult(player, consumed, bucketId);
}

function playFluidSound(dimension, location, sound = "place.honey_block") {
    try { dimension.playSound(sound, location, { volume: 0.8, pitch: 1.0 }); } catch {}
}

function schedulePlaceFakeFluid(player, clickedBlock, face, filledBucketId) {
    const config = getFluidForBucket(filledBucketId);
    if (!player || !clickedBlock?.isValid || !config?.block) return false;
    if (isFakeFluid(clickedBlock)) return false;

    const target = getTargetBlock(clickedBlock, face);
    if (!target || isFakeFluid(target) || (!target.isAir && !target.isLiquid)) return false;

    const key = blockOnlyKey(target);
    if (PENDING_PLACEMENTS.has(key)) return true;
    PENDING_PLACEMENTS.add(key);

    mc.system.run(() => {
        try {
            if (!target?.isValid || isFakeFluid(target) || (!target.isAir && !target.isLiquid)) return;
            if (!consumeFilledBucket(player, filledBucketId, config.empty ?? "minecraft:bucket")) return;
            if (!setBlockType(target, config.block)) {
                addOrDrop(player, new mc.ItemStack(filledBucketId, 1));
                return;
            }
            playFluidSound(target.dimension, target.center(), config.sound ?? config.fillSound);
        } finally {
            mc.system.runTimeout(() => PENDING_PLACEMENTS.delete(key), 2);
        }
    });
    return true;
}

export function placeFakeFluidBucket(data) {
    const player = data.source;
    const item = data.itemStack;
    if (data.block?.typeId === "create:smart_fluid_pipe") return;
    schedulePlaceFakeFluid(player, data.block, data.blockFace, item?.typeId);
}

export function handleFluidBucketBlockInteract(data) {
    const player = data.player;
    const block = data.block;
    const item = data.itemStack;
    if (block?.typeId === "create:smart_fluid_pipe") return false;
    const config = getFluidForBucket(item?.typeId);

    if (config) {
        const face = data.face ?? data.blockFace;
        return schedulePlaceFakeFluid(player, block, face, item.typeId);
    }

    return pickupFakeFluid(block, player, item);
}

export function pickupFakeFluid(block, player, item) {
    const config = getFluidForBlock(block?.typeId);
    const bucketId = config?.bucket;
    if (!bucketId || item?.typeId !== (config.empty ?? "minecraft:bucket")) return false;
    const key = blockKey(block, player);
    if (PENDING_PICKUPS.has(key)) return true;
    PENDING_PICKUPS.add(key);

    mc.system.run(() => {
        try {
            if (!block?.isValid || block.typeId === "minecraft:air") return;
            if (!fillEmptyBucket(player, bucketId, config.empty ?? "minecraft:bucket")) return;
            setBlockType(block, "minecraft:air");
            playFluidSound(block.dimension, block.center(), config.sound ?? config.fillSound);
        } finally {
            mc.system.runTimeout(() => PENDING_PICKUPS.delete(key), 2);
        }
    });
    return true;
}
