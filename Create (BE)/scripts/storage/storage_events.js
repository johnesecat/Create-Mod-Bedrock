import {
  markStorageRemoved,
  registerStorageForStructure
} from "./storage_registry.js";
import {
  initHopperSync,
  rebuildHopperCache,
  removeHopperCache
} from "./storage_hopper.js";

/** @typedef {typeof import('../vault/visual_structure.js').vaultVisualStructure} VaultVisualStructure */
/** @typedef {NonNullable<ReturnType<VaultVisualStructure['getStructureAt']>>} VaultStructure */
/** @typedef {{type: 'formed' | 'removed', structure: VaultStructure}} StructureChangeEvent */
let initialized = false;

/** @param {VaultVisualStructure} vaultVisualStructure */
export function initVaultStorage(vaultVisualStructure) {
  if (initialized) return;
  initialized = true;

  vaultVisualStructure.onStructureChanged(({ type, structure }) => {
    if (!structure) return;

    if (type === "formed") {
      const storage = registerStorageForStructure(structure);
      rebuildHopperCache(storage);
      return;
    }

    if (type === "removed") {
      removeHopperCache(structure.id);
      markStorageRemoved(structure);
    }
  });

  initHopperSync();
}
