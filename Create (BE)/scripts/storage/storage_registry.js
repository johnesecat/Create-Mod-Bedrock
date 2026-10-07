import { system } from "@minecraft/server";
import { capacityForVisualStructure } from "./storage_config.js";
import {
  ensureAnchor,
  findAnchors,
  getAnchorInventories,
  removeAnchor,
  retagAnchor
} from "./storage_anchor.js";
import {
  addItemLimited,
  canStackItems,
  inventoryStats,
  listItems as listInventoryItems,
  removeMatchingItem
} from "./storage_inventory.js";
import { VAULT_SLOTS_PER_BLOCK } from "./storage_config.js";

/** @typedef {import('./storage_events.js').VaultStructure} VaultStructure
 * @typedef {{id: string, dimension: import('@minecraft/server').Dimension, dimensionId: string, structure: VaultStructure, capacity: number, createdTick: number, updatedTick: number}} VaultStorage
 */
/** @type {Map<string, VaultStorage>} */
const activeStorages = new Map();
/** @type {Map<string, VaultStorage>} */
const pendingRemovals = new Map();

/** @param {import('@minecraft/server').Vector3} pos */
function posKey(pos) {
  return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
}

/** @param {VaultStructure} a @param {VaultStructure} b */
function structuresOverlap(a, b) {
  const blocks = new Set(a.blocks.map(posKey));
  return b.blocks.some((pos) => blocks.has(posKey(pos)));
}

/** @param {VaultStructure} structure @returns {VaultStorage} */
function createStorageFromStructure(structure) {
  return {
    id: structure.id,
    dimension: structure.dimension,
    dimensionId: structure.dimensionId,
    structure,
    capacity: capacityForVisualStructure(structure),
    createdTick: structure.updatedTick,
    updatedTick: structure.updatedTick
  };
}

/** @param {VaultStructure} structure @returns {[string, VaultStorage] | undefined} */
function findPendingOverlap(structure) {
  for (const [id, storage] of pendingRemovals) {
    if (storage.dimension !== structure.dimension) continue;
    if (structuresOverlap(storage.structure, structure)) return [id, storage];
  }

  return undefined;
}

/** @param {string} storageId */
function finalizePendingRemoval(storageId) {
  const storage = pendingRemovals.get(storageId);
  if (!storage) return;

  pendingRemovals.delete(storageId);
  removeAnchor(storage, true);
}

/** @param {VaultStructure} structure @returns {VaultStorage} */
export function registerStorageForStructure(structure) {
  const overlap = findPendingOverlap(structure);
  const storage = createStorageFromStructure(structure);

  if (overlap) {
    const [oldId, oldStorage] = overlap;
    pendingRemovals.delete(oldId);

    const anchors = findAnchors(oldStorage.dimension, oldStorage.id);
    for (const anchor of anchors) {
      retagAnchor(anchor, oldStorage.id, storage.id);
    }

  }

  activeStorages.set(storage.id, storage);
  ensureAnchor(storage);
  return storage;
}

/** @param {VaultStructure} structure */
export function markStorageRemoved(structure) {
  const storage = activeStorages.get(structure.id);
  if (!storage) return;

  activeStorages.delete(structure.id);
  pendingRemovals.set(storage.id, storage);
  system.run(() => finalizePendingRemoval(storage.id));
}

/** @param {string} storageId @returns {VaultStorage | undefined} */
export function getStorageById(storageId) {
  return activeStorages.get(storageId);
}

/** @param {import('@minecraft/server').Vector3} position @param {{getStructureAt(position: import('@minecraft/server').Vector3, dimension: import('@minecraft/server').Dimension): VaultStructure | undefined}} visualApi @param {import('@minecraft/server').Dimension} dimension */
export function getStorageAt(position, visualApi, dimension) {
  const structure = visualApi.getStructureAt(position, dimension);
  if (!structure) return undefined;
  return activeStorages.get(structure.id);
}

export function getStorages() {
  return Array.from(activeStorages.values());
}

/** @param {string} storageId */
export function listItems(storageId) {
  const storage = getStorageById(storageId);
  if (!storage) return [];

  const items = [];
  const inventories = getAnchorInventories(storage);
  for (let index = 0; index < inventories.length; index++) {
    for (const item of listInventoryItems(inventories[index], VAULT_SLOTS_PER_BLOCK)) {
      items.push({
        ...item,
        anchor: index,
        slot: index * VAULT_SLOTS_PER_BLOCK + item.slot
      });
    }
  }

  return items;
}

/** @param {string} storageId */
export function getStorageSummary(storageId) {
  const storage = getStorageById(storageId);
  if (!storage) return undefined;

  const inventories = getAnchorInventories(storage);
  const inventory = inventories.reduce((total, entry) => {
    const stats = inventoryStats(entry, VAULT_SLOTS_PER_BLOCK);
    total.occupied += stats.occupied;
    total.free += stats.free;
    total.size += stats.size;
    return total;    }, /** @type {{occupied: number, free: number, size: number}} */ ({ occupied: 0, free: 0, size: 0 }));

  return {
    storageId: storage.id,
    capacity: storage.capacity,
    structure: storage.structure,
    inventory
  };
}

/** @param {import('@minecraft/server').ItemStack} itemStack @param {number} amount */
function cloneStack(itemStack, amount) {
  const stack = itemStack.clone?.() ?? itemStack;
  stack.amount = amount;
  return stack;
}

/** @param {import('@minecraft/server').Container | undefined} inventory @param {import('@minecraft/server').ItemStack} itemStack */
function availableSpaceForInventory(inventory, itemStack) {
  if (!inventory || !itemStack) return 0;

  const size = Math.min(inventory.size ?? 0, VAULT_SLOTS_PER_BLOCK);
  let available = 0;
  for (let slot = 0; slot < size; slot++) {
    const current = inventory.getItem(slot);
    if (!current) {
      available += itemStack.maxAmount ?? 64;
      continue;
    }

    if (!canStackItems(current, itemStack)) continue;
    const maxAmount = current.maxAmount ?? itemStack.maxAmount ?? 64;
    available += Math.max(0, maxAmount - current.amount);
  }

  return available;
}

/** @param {import('@minecraft/server').Container[]} inventories @param {import('@minecraft/server').ItemStack} itemStack @param {number} amount */
function addItemAcrossInventories(inventories, itemStack, amount) {
  let remaining = Math.min(amount, itemStack?.amount ?? 0);
  if (remaining <= 0) return false;
  if (inventories.reduce((total, inventory) => total + availableSpaceForInventory(inventory, itemStack), 0) < remaining) return false;

  for (const inventory of inventories) {
    while (remaining > 0) {
      let moved = false;
      for (let partAmount = remaining; partAmount > 0; partAmount--) {
        const part = cloneStack(itemStack, partAmount);
        if (!addItemLimited(inventory, part, partAmount, VAULT_SLOTS_PER_BLOCK)) continue;

        remaining -= partAmount;
        moved = true;
        break;
      }

      if (!moved) break;
    }

    if (remaining <= 0) return true;
  }

  return false;
}

/** @param {string} storageId @param {import('@minecraft/server').ItemStack} itemStack @param {number} amount */
export function insertItem(storageId, itemStack, amount = itemStack.amount) {
  const storage = getStorageById(storageId);
  if (!storage) return false;

  return addItemAcrossInventories(getAnchorInventories(storage).filter((inventory) => inventory !== undefined), itemStack, amount);
}

/** @param {string} storageId @param {string | undefined} filter @param {number} amount */
export function extractItem(storageId, filter, amount = 1) {
  const storage = getStorageById(storageId);
  if (!storage) return undefined;

  for (const inventory of getAnchorInventories(storage)) {
    const item = removeMatchingItem(inventory, filter, amount, VAULT_SLOTS_PER_BLOCK);
    if (item) return item;
  }

  return undefined;
}
