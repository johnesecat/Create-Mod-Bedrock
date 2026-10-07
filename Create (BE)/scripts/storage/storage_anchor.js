import {
  STORAGE_ANCHOR_ID,
  STORAGE_ANCHOR_TAG,
  VAULT_SLOTS_PER_BLOCK,
  storageTag
} from "./storage_config.js";
import { addItemLimited, dropInventory, getInventory } from "./storage_inventory.js";

/** @param {import('@minecraft/server').Entity | undefined} entity */
function isValidEntity(entity) {
  return entity?.isValid === true;
}

/** @param {{min?: import('@minecraft/server').Vector3, max?: import('@minecraft/server').Vector3, origin: import('@minecraft/server').Vector3}} structure */
export function anchorLocation(structure) {
  const min = structure.min ?? structure.origin;

  return {
    x: min.x - 0.5,
    y: min.y - 0.25,
    z: min.z - 0.5
  };
}

/** @param {import('@minecraft/server').Vector3} pos */
function blockAnchorLocation(pos) {
  return {
    x: pos.x + 0.5,
    y: pos.y + 0.5,
    z: pos.z + 0.5
  };
}

/** @param {{min?: import('@minecraft/server').Vector3, max?: import('@minecraft/server').Vector3, origin: import('@minecraft/server').Vector3}} structure */
function structureDropLocation(structure) {
  const min = structure.min ?? structure.origin;
  const max = structure.max ?? structure.origin;

  return {
    x: (min.x + max.x + 1) / 2,
    y: (min.y + max.y + 1) / 2,
    z: (min.z + max.z + 1) / 2
  };
}

/** @param {import('@minecraft/server').Dimension} dimension @param {string} storageId */
export function findAnchors(dimension, storageId) {
  return dimension.getEntities({
    type: STORAGE_ANCHOR_ID,
    tags: [
      STORAGE_ANCHOR_TAG,
      storageTag(storageId)
    ]
  }).filter(isValidEntity);
}

/** @param {import('@minecraft/server').Vector3} pos */
function blockTag(pos) {
  return `storage_block_${Math.floor(pos.x)}_${Math.floor(pos.y)}_${Math.floor(pos.z)}`;
}

/** @param {import('@minecraft/server').Entity} anchor @param {import('@minecraft/server').Vector3} pos */
function hasBlockTag(anchor, pos) {
  try {
    return anchor.hasTag(blockTag(pos));
  } catch {
    return false;
  }
}

/** @param {import('@minecraft/server').Entity} anchor */
function anchorBlockKey(anchor) {
  try {
    for (const tag of anchor.getTags?.() ?? []) {
      if (tag.startsWith("storage_block_")) return tag.slice("storage_block_".length);
    }
  } catch {}

  return undefined;
}

/** @param {import('@minecraft/server').Entity} anchor @param {string} oldStorageId @param {string} newStorageId */
export function retagAnchor(anchor, oldStorageId, newStorageId) {
  try {
    anchor.removeTag(storageTag(oldStorageId));
  } catch {}

  anchor.addTag(storageTag(newStorageId));
}

/** @param {{dimension: import('@minecraft/server').Dimension, id: string}} storage @param {import('@minecraft/server').Vector3} location @param {import('@minecraft/server').Vector3 | undefined} blockPos */
function createAnchor(storage, location, blockPos) {
  const anchor = storage.dimension.spawnEntity(STORAGE_ANCHOR_ID, location);
  anchor.addTag(STORAGE_ANCHOR_TAG);
  anchor.addTag(storageTag(storage.id));
  if (blockPos) anchor.addTag(blockTag(blockPos));
  anchor.nameTag = "";
  return anchor;
}

/** @param {import('@minecraft/server').Entity} source @param {import('@minecraft/server').Entity[]} targetAnchors */
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

/** @param {{dimension: import('@minecraft/server').Dimension, id: string, structure: {blocks?: import('@minecraft/server').Vector3[], origin: import('@minecraft/server').Vector3, min?: import('@minecraft/server').Vector3, max?: import('@minecraft/server').Vector3}}} storage */
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

/** @param {Parameters<typeof ensureAnchors>[0]} storage */
export function ensureAnchor(storage) {
  return ensureAnchors(storage)[0];
}

/** @param {Parameters<typeof ensureAnchors>[0]} storage @param {boolean} shouldDrop */
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

/** @param {Parameters<typeof ensureAnchors>[0]} storage */
export function getAnchorInventory(storage) {
  const anchor = ensureAnchor(storage);
  return getInventory(anchor);
}

/** @param {Parameters<typeof ensureAnchors>[0]} storage */
export function getAnchorInventories(storage) {
  return ensureAnchors(storage)
    .map((anchor) => getInventory(anchor))
    .filter(Boolean);
}
