import * as mc from "@minecraft/server";
import { getStorageAt, insertItem } from "../../../storage/storage_registry.js";
import { addItemLimited } from "../../../storage/storage_inventory.js";
import { rebuildVaultAt } from "../../../vault/rebuild.js";
import { vaultVisualStructure } from "../../../vault/visual_structure.js";

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Player} Player */
/** @typedef {import('@minecraft/server').Container} Container */
/** @typedef {import('@minecraft/server').ItemStack} ItemStack */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */
/** @typedef {{type: 'vault', storage: {id: string}} | {type: 'inventory', inventory: Container, key: string}} HatchTarget */

const HATCH_TYPE = "create:hatch";
const INVENTORY_SLOTS_START = 9;
const INVENTORY_SLOTS_END = 35;
const OPEN_TICKS = 10;

/** @param {Block} block @param {boolean} open */
function setHatchOpenState(block, open) {
    block.setPermutation(mc.BlockPermutation.resolve(block.typeId, {
        ...block.permutation.getAllStates(),
        "create:open": open
    }));
}

/** @type {Vector3[]} */
const OFFSETS = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 }
];

/** @param {Vector3} pos @param {Vector3} offset */
function offsetPos(pos, offset) {
    return { x: pos.x + offset.x, y: pos.y + offset.y, z: pos.z + offset.z };
}

/** @param {Player | undefined} player */
function getSelectedSlot(player) {
    const slot = player?.selectedSlotIndex;
    return Number.isInteger(slot) ? slot : undefined;
}

/** @param {Player | undefined} player @returns {Container | null} */
function getPlayerInventory(player) {
    return player?.getComponent("minecraft:inventory")?.container
        ?? player?.getComponent("inventory")?.container
        ?? null;
}

/** @param {Block | undefined} block @returns {Container | null} */
function getBlockInventory(block) {
    return block?.getComponent?.("minecraft:inventory")?.container
        ?? block?.getComponent?.("inventory")?.container
        ?? null;
}

/** @param {Block | undefined} block @returns {{id: string} | null} */
function getVaultStorage(block) {
    if (block?.typeId !== "create:vault") return null;

    let storage = getStorageAt(block.location, vaultVisualStructure, block.dimension);
    if (storage) return storage;

    try {
        storage = rebuildVaultAt(block, vaultVisualStructure)?.storage;
    } catch {}

    return storage ?? getStorageAt(block.location, vaultVisualStructure, block.dimension) ?? null;
}

/** @param {Vector3} pos */
function posKey(pos) {
    return `${pos.x},${pos.y},${pos.z}`;
}

/** @param {HatchTarget[]} targets @param {Set<string>} seen @param {HatchTarget} target */
function addTarget(targets, seen, target) {
    const key = target.type === "vault" ? `vault:${target.storage.id}` : `inv:${target.key}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push(target);
}

/** @param {Block} startBlock @param {HatchTarget[]} targets @param {Set<string>} seenTargets */
function addConnectedVaultTargets(startBlock, targets, seenTargets) {
    const queue = [startBlock.location];
    const seenBlocks = new Set();

    for (let index = 0; index < queue.length; index++) {
        const pos = queue[index];
        const key = posKey(pos);
        if (seenBlocks.has(key)) continue;
        seenBlocks.add(key);

        const block = startBlock.dimension.getBlock(pos);
        if (block?.typeId !== "create:vault") continue;

        const vaultStorage = getVaultStorage(block);
        if (vaultStorage) addTarget(targets, seenTargets, { type: "vault", storage: vaultStorage });

        for (const offset of OFFSETS) {
            const next = offsetPos(block.location, offset);
            if (!seenBlocks.has(posKey(next))) queue.push(next);
        }
    }
}

/** @param {Block} hatchBlock @returns {HatchTarget[]} */
function findTargetStorages(hatchBlock) {
    /** @type {HatchTarget[]} */
    const targets = [];
    const seenTargets = new Set();

    for (const offset of OFFSETS) {
        const block = hatchBlock.dimension.getBlock(offsetPos(hatchBlock.location, offset));
        if (!block) continue;

        if (block.typeId === "create:vault") {
            addConnectedVaultTargets(block, targets, seenTargets);
            continue;
        }

        const inventory = getBlockInventory(block);
        if (inventory) addTarget(targets, seenTargets, {
            type: "inventory",
            inventory,
            key: `${block.dimension.id}:${block.location.x},${block.location.y},${block.location.z}`
        });
    }

    return targets;
}

/** @param {ItemStack} itemStack @param {number} amount */
function cloneStack(itemStack, amount) {
    const stack = itemStack.clone?.() ?? itemStack;
    stack.amount = amount;
    return stack;
}

/** @param {HatchTarget} target @param {ItemStack} itemStack @param {number} amount */
function insertAmountIntoTarget(target, itemStack, amount) {
    if (amount <= 0) return false;

    const stack = cloneStack(itemStack, amount);
    if (target.type === "vault") return insertItem(target.storage.id, stack, amount);
    if (target.type === "inventory") return addItemLimited(target.inventory, stack, amount);
    return false;
}

/** @param {HatchTarget[] | undefined} targets @param {ItemStack | undefined} itemStack */
function insertIntoTargets(targets, itemStack) {
    if (!targets?.length || !itemStack || itemStack.amount <= 0) return 0;

    let moved = 0;
    let remaining = itemStack.amount;

    for (const target of targets) {
        while (remaining > 0) {
            let inserted = false;
            for (let amount = remaining; amount > 0; amount--) {
                if (!insertAmountIntoTarget(target, itemStack, amount)) continue;
                moved += amount;
                remaining -= amount;
                inserted = true;
                break;
            }

            if (!inserted) break;
        }

        if (remaining <= 0) break;
    }

    return moved;
}

/** @param {Block} block */
function setHatchOpen(block) {
    try { setHatchOpenState(block, true); } catch {}
    mc.system.runTimeout(() => {
        try {
            const current = block.dimension.getBlock(block.location);
            if (current?.typeId === HATCH_TYPE) setHatchOpenState(current, false);
        } catch {}
    }, OPEN_TICKS);
}

/** @param {Block} block @param {Player | undefined} player @param {HatchTarget[]} targets @param {ItemStack | undefined} item */
function depositHeldStack(block, player, targets, item) {
    if (!item || item.amount <= 0) return false;
    const moved = insertIntoTargets(targets, item);
    if (moved <= 0) return false;

    if (player?.getGameMode?.() !== "Creative") {
        const inventory = getPlayerInventory(player);
        const selectedSlot = getSelectedSlot(player);
        if (inventory && selectedSlot !== undefined) {
            const selected = inventory.getItem(selectedSlot);
            if (selected && selected.amount > moved) {
                selected.amount -= moved;
                inventory.setItem(selectedSlot, selected);
            } else {
                inventory.setItem(selectedSlot, undefined);
            }
        }
    }

    return true;
}

/** @param {Block} block @param {Player | undefined} player @param {HatchTarget[]} targets */
function depositInventoryOnly(block, player, targets) {
    const inventory = getPlayerInventory(player);
    if (!inventory) return false;

    let moved = 0;
    const end = Math.min(INVENTORY_SLOTS_END, inventory.size - 1);
    for (let slot = INVENTORY_SLOTS_START; slot <= end; slot++) {
        const item = inventory.getItem(slot);
        if (!item) continue;

        const movedAmount = insertIntoTargets(targets, item);
        if (movedAmount <= 0) continue;

        if (item.amount > movedAmount) {
            item.amount -= movedAmount;
            inventory.setItem(slot, item);
        } else {
            inventory.setItem(slot, undefined);
        }
        moved++;
    }

    return moved > 0;
}

/** @param {Block | undefined} block @param {Player | undefined} player @param {ItemStack | undefined} item */
export function hatchInteract(block, player, item) {
    if (block?.typeId !== HATCH_TYPE) return false;

    const targets = findTargetStorages(block);
    if (!targets.length) {
        return true;
    }

    const success = player?.isSneaking
        ? depositInventoryOnly(block, player, targets)
        : depositHeldStack(block, player, targets, item);

    if (success) setHatchOpen(block);
    return true;
}
