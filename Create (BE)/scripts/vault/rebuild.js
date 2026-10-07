import { system, world } from "@minecraft/server";
import {
  getStorageAt,
  registerStorageForStructure
} from "../storage/storage_registry.js";

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {import('@minecraft/server').Player} Player */
/** @typedef {{x:number, y:number, z:number}} Position */
/** @typedef {import('../storage/storage_events.js').VaultStructure} VaultStructure */
/** @typedef {import('../storage/storage_events.js').VaultVisualStructure} VaultVisualStructure */

const VAULT_ID = "create:vault";
const LOAD_DELAY_TICKS = 20;
const LOAD_SCAN_RADIUS = 12;
const LOAD_SCAN_VERTICAL_RADIUS = 6;
const LOAD_SCAN_BLOCKS_PER_TICK = 192;

let initialized = false;
const scheduledPlayers = new Set();

/** @param {Dimension} dimension @param {Position} location @returns {Block | undefined} */
function safeGetBlock(dimension, location) {
  try {
    return dimension.getBlock(location);
  } catch {
    return undefined;
  }
}

/** @param {Block | undefined} block @param {VaultVisualStructure} vaultVisualStructure */
export function rebuildVaultAt(block, vaultVisualStructure) {
  if (!block || block.typeId !== VAULT_ID) return undefined;

  /** @type {VaultStructure | undefined} */
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

/** @param {Player} player @param {VaultVisualStructure} vaultVisualStructure */
function scanLoadedArea(player, vaultVisualStructure) {
  /** @type {Dimension} */
  let dimension;
  /** @type {Position} */
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

/** @param {VaultVisualStructure} vaultVisualStructure */
export function initVaultRebuild(vaultVisualStructure) {
  if (initialized) return;
  initialized = true;

  world.afterEvents.playerSpawn.subscribe((/** @type {import('@minecraft/server').PlayerSpawnAfterEvent} */ event) => {
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
