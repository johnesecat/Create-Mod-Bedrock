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

const activeStorages = new Map();
const pendingRemovals = new Map();

function posKey(pos) {
  return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
}

function structuresOverlap(a, b) {
  const blocks = new Set(a.blocks.map(posKey));
  return b.blocks.some((pos) => blocks.has(posKey(pos)));
}

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

function findPendingOverlap(structure) {
  for (const [id, storage] of pendingRemovals) {
    if (storage.dimension !== structure.dimension) continue;
    if (structuresOverlap(storage.structure, structure)) return [id, storage];
  }

  return undefined;
}

function finalizePendingRemoval(storageId) {
  const storage = pendingRemovals.get(storageId);
  if (!storage) return;

  pendingRemovals.delete(storageId);
  removeAnchor(storage, true);
}

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

export function markStorageRemoved(structure) {
  const storage = activeStorages.get(structure.id);
  if (!storage) return;

  activeStorages.delete(structure.id);
  pendingRemovals.set(storage.id, storage);
  system.run(() => finalizePendingRemoval(storage.id));
}

export function getStorageById(storageId) {
  return activeStorages.get(storageId);
}

export function getStorageAt(position, visualApi, dimension) {
  const structure = visualApi.getStructureAt(position, dimension);
  if (!structure) return undefined;
  return activeStorages.get(structure.id);
}

export function getStorages() {
  return Array.from(activeStorages.values());
}

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

export function getStorageSummary(storageId) {
  const storage = getStorageById(storageId);
  if (!storage) return undefined;

  const inventories = getAnchorInventories(storage);
  const inventory = inventories.reduce((total, entry) => {
    const stats = inventoryStats(entry, VAULT_SLOTS_PER_BLOCK);
    total.occupied += stats.occupied;
    total.free += stats.free;
    total.size += stats.size;
    return total;
  }, { occupied: 0, free: 0, size: 0 });

  return {
    storageId: storage.id,
    capacity: storage.capacity,
    structure: storage.structure,
    inventory
  };
}

function cloneStack(itemStack, amount) {
  const stack = itemStack.clone?.() ?? itemStack;
  stack.amount = amount;
  return stack;
}

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

export function insertItem(storageId, itemStack, amount = itemStack?.amount) {
  const storage = getStorageById(storageId);
  if (!storage) return false;

  return addItemAcrossInventories(getAnchorInventories(storage), itemStack, amount);
}

export function extractItem(storageId, filter, amount = 1) {
  const storage = getStorageById(storageId);
  if (!storage) return undefined;

  for (const inventory of getAnchorInventories(storage)) {
    const item = removeMatchingItem(inventory, filter, amount, VAULT_SLOTS_PER_BLOCK);
    if (item) return item;
  }

  return undefined;
}
