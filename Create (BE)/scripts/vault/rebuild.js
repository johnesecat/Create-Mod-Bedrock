import { system, world } from "@minecraft/server";
import {
  getStorageAt,
  registerStorageForStructure
} from "../storage/storage_registry.js";

const VAULT_ID = "create:vault";
const LOAD_DELAY_TICKS = 20;
const LOAD_SCAN_RADIUS = 12;
const LOAD_SCAN_VERTICAL_RADIUS = 6;
const LOAD_SCAN_BLOCKS_PER_TICK = 192;

let initialized = false;
const scheduledPlayers = new Set();

function safeGetBlock(dimension, location) {
  try {
    return dimension.getBlock(location);
  } catch {
    return undefined;
  }
}

export function rebuildVaultAt(block, vaultVisualStructure) {
  if (!block || block.typeId !== VAULT_ID) return undefined;

  let structure = vaultVisualStructure.getStructureAt(block.location, block.dimension);
  if (!structure) {
    vaultVisualStructure.expandOrAssemble(block);
    structure = vaultVisualStructure.getStructureAt(block.location, block.dimension);
  }

  if (!structure) return undefined;

  let storage = getStorageAt(block.location, vaultVisualStructure, block.dimension);
  if (!storage) storage = registerStorageForStructure(structure);
  return { structure, storage };
}

function scanLoadedArea(player, vaultVisualStructure) {
  let dimension;
  let center;

  try {
    dimension = player.dimension;
    center = {
      x: Math.floor(player.location.x),
      y: Math.floor(player.location.y),
      z: Math.floor(player.location.z)
    };
  } catch {
    return;
  }

  const width = LOAD_SCAN_RADIUS * 2 + 1;
  const height = LOAD_SCAN_VERTICAL_RADIUS * 2 + 1;
  const layerSize = width * width;
  const total = layerSize * height;
  let index = 0;

  function processBatch() {
    const end = Math.min(total, index + LOAD_SCAN_BLOCKS_PER_TICK);

    for (; index < end; index++) {
      const horizontalIndex = index % layerSize;
      const dx = horizontalIndex % width - LOAD_SCAN_RADIUS;
      const dz = Math.floor(horizontalIndex / width) - LOAD_SCAN_RADIUS;
      const dy = Math.floor(index / layerSize) - LOAD_SCAN_VERTICAL_RADIUS;
      const location = {
        x: center.x + dx,
        y: center.y + dy,
        z: center.z + dz
      };

      const block = safeGetBlock(dimension, location);
      if (block?.typeId !== VAULT_ID) continue;
      if (vaultVisualStructure.getStructureAt(location, dimension)) continue;
      rebuildVaultAt(block, vaultVisualStructure);
    }

    if (index < total) system.run(processBatch);
  }

  processBatch();
}

export function initVaultRebuild(vaultVisualStructure) {
  if (initialized) return;
  initialized = true;

  world.afterEvents.playerSpawn.subscribe((event) => {
    if (!event.initialSpawn) return;

    const playerId = event.player?.id;
    if (!playerId || scheduledPlayers.has(playerId)) return;
    scheduledPlayers.add(playerId);

    system.runTimeout(() => {
      scheduledPlayers.delete(playerId);
      scanLoadedArea(event.player, vaultVisualStructure);
    }, LOAD_DELAY_TICKS);
  });
}
