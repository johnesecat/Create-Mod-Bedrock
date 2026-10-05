import {
  STORAGE_ANCHOR_ID,
  STORAGE_ANCHOR_TAG,
  VAULT_SLOTS_PER_BLOCK,
  storageTag
} from "./storage_config.js";
import { addItemLimited, dropInventory, getInventory } from "./storage_inventory.js";

function isValidEntity(entity) {
  try {
    if (!entity) return false;
    if (typeof entity.isValid === "function") return entity.isValid();
    return entity.isValid !== false;
  } catch {
    return false;
  }
}

export function anchorLocation(structure) {
  const min = structure.min ?? structure.origin;

  return {
    x: min.x - 0.5,
    y: min.y - 0.25,
    z: min.z - 0.5
  };
}

function blockAnchorLocation(pos) {
  return {
    x: pos.x + 0.5,
    y: pos.y + 0.5,
    z: pos.z + 0.5
  };
}

function structureDropLocation(structure) {
  const min = structure.min ?? structure.origin;
  const max = structure.max ?? structure.origin;

  return {
    x: (min.x + max.x + 1) / 2,
    y: (min.y + max.y + 1) / 2,
    z: (min.z + max.z + 1) / 2
  };
}

export function findAnchors(dimension, storageId) {
  return dimension.getEntities({
    type: STORAGE_ANCHOR_ID,
    tags: [
      STORAGE_ANCHOR_TAG,
      storageTag(storageId)
    ]
  }).filter(isValidEntity);
}

function blockTag(pos) {
  return `storage_block_${Math.floor(pos.x)}_${Math.floor(pos.y)}_${Math.floor(pos.z)}`;
}

function hasBlockTag(anchor, pos) {
  try {
    return anchor.hasTag(blockTag(pos));
  } catch {
    return false;
  }
}

function anchorBlockKey(anchor) {
  try {
    for (const tag of anchor.getTags?.() ?? []) {
      if (tag.startsWith("storage_block_")) return tag.slice("storage_block_".length);
    }
  } catch {}

  return undefined;
}

export function retagAnchor(anchor, oldStorageId, newStorageId) {
  try {
    anchor.removeTag(storageTag(oldStorageId));
  } catch {}

  anchor.addTag(storageTag(newStorageId));
}

function createAnchor(storage, location, blockPos) {
  const anchor = storage.dimension.spawnEntity(STORAGE_ANCHOR_ID, location);
  anchor.addTag(STORAGE_ANCHOR_TAG);
  anchor.addTag(storageTag(storage.id));
  if (blockPos) anchor.addTag(blockTag(blockPos));
  anchor.nameTag = "";
  return anchor;
}

function moveAnchorItemsIntoAnchors(source, targetAnchors) {
  const sourceInventory = getInventory(source);
  if (!sourceInventory) return;

  const targetInventories = targetAnchors
    .map((anchor) => getInventory(anchor))
    .filter(Boolean);

  for (let slot = 0; slot < sourceInventory.size; slot++) {
    const item = sourceInventory.getItem(slot);
    if (!item) continue;

    let remaining = item.clone?.() ?? item;
    for (const inventory of targetInventories) {
      if (!remaining || remaining.amount <= 0) break;

      for (let amount = remaining.amount; amount > 0; amount--) {
        const part = remaining.clone?.() ?? remaining;
        part.amount = amount;
        if (!addItemLimited(inventory, part, amount, VAULT_SLOTS_PER_BLOCK)) continue;

        remaining.amount -= amount;
        break;
      }
    }

    if (!remaining || remaining.amount <= 0) sourceInventory.setItem(slot, undefined);
    else sourceInventory.setItem(slot, remaining);
  }
}

export function ensureAnchors(storage) {
  const anchors = findAnchors(storage.dimension, storage.id);
  const blocks = storage.structure?.blocks ?? [storage.structure?.origin].filter(Boolean);
  const dropLocation = structureDropLocation(storage.structure);
  const wantedKeys = new Set(blocks.map((pos) => `${Math.floor(pos.x)}_${Math.floor(pos.y)}_${Math.floor(pos.z)}`));
  const result = [];
  const legacyAnchors = [];
  const extraAnchors = [];

  for (const pos of blocks) {
    let anchor = anchors.find((entry) => hasBlockTag(entry, pos));
    if (!anchor) anchor = createAnchor(storage, blockAnchorLocation(pos), pos);
    else anchor.teleport(blockAnchorLocation(pos));

    result.push(anchor);
  }

  for (const anchor of anchors) {
    const key = anchorBlockKey(anchor);
    if (!key) legacyAnchors.push(anchor);
    else if (!wantedKeys.has(key)) extraAnchors.push(anchor);
  }

  for (const anchor of legacyAnchors) {
    moveAnchorItemsIntoAnchors(anchor, result);
    dropInventory(anchor, storage.dimension, dropLocation);
    try { anchor.remove(); } catch {}
  }

  for (const anchor of extraAnchors) {
    dropInventory(anchor, storage.dimension, dropLocation);
    try { anchor.remove(); } catch {}
  }

  return result;
}

export function ensureAnchor(storage) {
  return ensureAnchors(storage)[0];
}

export function removeAnchor(storage, shouldDrop = true) {
  const anchors = findAnchors(storage.dimension, storage.id);
  const location = structureDropLocation(storage.structure);
  let dropped = 0;

  for (const anchor of anchors) {
    if (shouldDrop) dropped += dropInventory(anchor, storage.dimension, location);
    anchor.remove();
  }

  return dropped;
}

export function getAnchorInventory(storage) {
  const anchor = ensureAnchor(storage);
  return getInventory(anchor);
}

export function getAnchorInventories(storage) {
  return ensureAnchors(storage)
    .map((anchor) => getInventory(anchor))
    .filter(Boolean);
}
