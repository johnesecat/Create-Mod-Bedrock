import {
  markStorageRemoved,
  registerStorageForStructure
} from "./storage_registry.js";
import {
  initHopperSync,
  rebuildHopperCache,
  removeHopperCache
} from "./storage_hopper.js";

let initialized = false;

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
