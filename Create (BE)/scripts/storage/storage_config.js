export const VAULT_BLOCK_ID = "create:vault";
export const STORAGE_ANCHOR_ID = "create:vault_storage_anchor";
export const STORAGE_ANCHOR_TAG = "create_vault_storage_anchor";
export const STORAGE_TAG_PREFIX = "storage_id_";
export const MAX_STORAGE_SLOTS = 9999;
export const VAULT_SLOTS_PER_BLOCK = 3;
export const HOPPER_ENABLED = true;
export const HOPPER_TRANSFER_INTERVAL_TICKS = 8;
export const HOPPER_ITEMS_PER_TRANSFER = 1;
export const MAX_TRANSFERS_PER_HOPPER_PER_CYCLE = 1;
export const MAX_TRANSFERS_PER_STORAGE_PER_CYCLE = 4;
export const MAX_GLOBAL_TRANSFERS_PER_CYCLE = 16;
export const MAX_CONNECTION_CHECKS_PER_CYCLE = 64;

export function storageTag(storageId) {
  return `${STORAGE_TAG_PREFIX}${storageId}`;
}

export function capacityForVisualStructure(structure) {
  if (!structure) return 0;

  const blockCount = Math.max(
    1,
    structure.blockCount
      ?? structure.blocks?.length
      ?? ((structure.width ?? 1) * (structure.height ?? 1) * (structure.depth ?? 1))
  );

  return Math.min(MAX_STORAGE_SLOTS, blockCount * VAULT_SLOTS_PER_BLOCK);
}
