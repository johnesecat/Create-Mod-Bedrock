import { system, world } from "@minecraft/server";
import {
  HOPPER_ENABLED,
  HOPPER_ITEMS_PER_TRANSFER,
  HOPPER_TRANSFER_INTERVAL_TICKS,
  MAX_CONNECTION_CHECKS_PER_CYCLE,
  MAX_GLOBAL_TRANSFERS_PER_CYCLE,
  MAX_TRANSFERS_PER_HOPPER_PER_CYCLE,
  MAX_TRANSFERS_PER_STORAGE_PER_CYCLE
} from "./storage_config.js";
import { addItemLimited, getInventory, removeMatchingItem } from "./storage_inventory.js";
import { extractItem, getStorageById, insertItem } from "./storage_registry.js";

const HOPPER_ID = "minecraft:hopper";
/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {{x: number, y: number, z: number}} Position
 * @typedef {{x: number, y: number, z: number}} DirectionVector
 * @typedef {{key: string, kind: 'input'|'output', storageId: string, dimension: import('@minecraft/server').Dimension, hopperPos: Position, direction?: DirectionVector, allowUnknownFacing?: boolean}} HopperConnection
 * @typedef {{dimension: import('@minecraft/server').Dimension, inputHoppers: Map<string, HopperConnection>, outputHoppers: Map<string, HopperConnection>, candidateKeys: Set<string>, inputCursor: number, outputCursor: number, nextMode: 'input'|'output'}} HopperCache
 * @typedef {{id: string, dimension: import('@minecraft/server').Dimension, structure: {blocks: Position[], min?: Position, max?: Position, origin: Position}}} Storage
 * @typedef {{connectionChecks: number}} CycleState
 */
/** @type {Map<string, HopperCache>} */
const hopperCaches = new Map();
/** @type {Map<string, Map<string, HopperConnection>>} */
const candidateConnections = new Map();
/** @type {Map<string, HopperConnection>} */
const assignedConnections = new Map();
/** @type {Set<string>} */
const activeStorageIds = new Set();

let initialized = false;
let storageCursor = 0;
let cycleId = 0;

/** @param {Position} pos */
function posKey(pos) {
  return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
}

/** @param {import('@minecraft/server').Dimension} dimension @param {Position} pos */
function hopperKey(dimension, pos) {
  return `${dimension?.id ?? "unknown"}:${posKey(pos)}`;
}

/** @param {Position} pos @param {number} dx @param {number} dy @param {number} dz @returns {Position} */
function offset(pos, dx, dy, dz) {
  return {
    x: Math.floor(pos.x) + dx,
    y: Math.floor(pos.y) + dy,
    z: Math.floor(pos.z) + dz
  };
}

/** @param {import('@minecraft/server').Dimension} dimension @param {Position} pos */
function safeGetBlock(dimension, pos) {
  try {
    return dimension.getBlock(pos);
  } catch {
    return undefined;
  }
}

/** @param {import('@minecraft/server').Block | undefined} block */
function isHopper(block) {
  return block?.typeId === HOPPER_ID;
}

/** @param {import('@minecraft/server').Block} block @returns {DirectionVector | undefined} */
function getHopperFacing(block) {
  for (const state of [
    "facing_direction",
    "minecraft:facing_direction",
    "direction",
    "minecraft:cardinal_direction"
  ]) {
    try {
      const direction = directionValueToVector(block.permutation.getAllStates()[state]);
      if (direction) return direction;
    } catch {}
  }

  return undefined;
}

/** @param {string | number | boolean | undefined} value @returns {DirectionVector | undefined} */
function directionValueToVector(value) {
  if (value === 0 || value === "down") return { x: 0, y: -1, z: 0 };
  if (value === 1 || value === "up") return { x: 0, y: 1, z: 0 };
  if (value === 2 || value === "north") return { x: 0, y: 0, z: -1 };
  if (value === 3 || value === "south") return { x: 0, y: 0, z: 1 };
  if (value === 4 || value === "west") return { x: -1, y: 0, z: 0 };
  if (value === 5 || value === "east") return { x: 1, y: 0, z: 0 };
  return undefined;
}

/** @param {DirectionVector | undefined} a @param {DirectionVector | undefined} b */
function sameDirection(a, b) {
  return !!a && !!b && a.x === b.x && a.y === b.y && a.z === b.z;
}

/** @param {import('@minecraft/server').Block} hopperBlock @param {HopperConnection} connection */
function pointsAtVault(hopperBlock, connection) {
  if (connection.kind === "output") return true;

  const facing = getHopperFacing(hopperBlock);
  if (!facing) return !!connection.allowUnknownFacing;
  return sameDirection(facing, connection.direction);
}

/** @param {HopperConnection} connection */
function connectionOwnerKey(connection) {
  return `${connection.storageId}:${connection.kind}`;
}

/** @param {HopperCache} cache @param {HopperConnection} connection */
function registerCandidate(cache, connection) {
  const key = connection.key;
  let owners = candidateConnections.get(key);
  if (!owners) {
    owners = new Map();
    candidateConnections.set(key, owners);
  }

  owners.set(connectionOwnerKey(connection), connection);
  cache.candidateKeys.add(key);
}

/** @param {HopperConnection} connection */
function removeAssignedConnection(connection) {
  const cache = hopperCaches.get(connection.storageId);
  if (!cache) return;

  const connections = connection.kind === "input"
    ? cache.inputHoppers
    : cache.outputHoppers;
  connections.delete(connection.key);
  if (cache.inputHoppers.size === 0 && cache.outputHoppers.size === 0) {
    activeStorageIds.delete(connection.storageId);
  }
}

/** @param {HopperConnection} connection */
function addAssignedConnection(connection) {
  const cache = hopperCaches.get(connection.storageId);
  if (!cache) return;

  const connections = connection.kind === "input"
    ? cache.inputHoppers
    : cache.outputHoppers;
  connections.set(connection.key, connection);
  assignedConnections.set(connection.key, connection);
  activeStorageIds.add(connection.storageId);
}

/** @param {Block} hopperBlock @param {Map<string, HopperConnection>} owners */
function chooseConnection(hopperBlock, owners) {
  return Array.from(owners.values())
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "output" ? -1 : 1;
      return a.storageId.localeCompare(b.storageId);
    })
    .find((connection) => pointsAtVault(hopperBlock, connection));
}

/** @param {string} key */
function refreshConnectionKey(key) {
  const previous = assignedConnections.get(key);
  if (previous) {
    removeAssignedConnection(previous);
    assignedConnections.delete(key);
  }

  const owners = candidateConnections.get(key);
  if (!owners || owners.size === 0) return;

  const first = owners.values().next().value;
  if (!first) return;
  const hopperBlock = safeGetBlock(first.dimension, first.hopperPos);
  if (!hopperBlock || !isHopper(hopperBlock)) return;

  const selected = chooseConnection(hopperBlock, owners);
  if (selected) addAssignedConnection(selected);
}

/** @param {import('@minecraft/server').Dimension} dimension @param {Position} pos */
function refreshConnectionAt(dimension, pos) {
  refreshConnectionKey(hopperKey(dimension, pos));
}

/** @param {HopperCache} cache @param {Storage} storage @param {'input'|'output'} kind @param {Position} hopperPos @param {DirectionVector | undefined} direction @param {boolean} allowUnknownFacing */
function addCandidate(cache, storage, kind, hopperPos, direction, allowUnknownFacing = false) {
  const key = hopperKey(storage.dimension, hopperPos);
  registerCandidate(cache, {
    key,
    kind,
    storageId: storage.id,
    dimension: storage.dimension,
    hopperPos,
    direction,
    allowUnknownFacing
  });
}

/** @param {Storage} storage */
export function rebuildHopperCache(storage) {
  if (!storage?.structure?.blocks) return;

  removeHopperCache(storage.id);

  /** @type {HopperCache} */
  const cache = {
    dimension: storage.dimension,
    inputHoppers: new Map(),
    outputHoppers: new Map(),
    candidateKeys: new Set(),
    inputCursor: 0,
    outputCursor: 0,
    nextMode: "input"
  };
  hopperCaches.set(storage.id, cache);

  const min = storage.structure.min ?? storage.structure.origin;
  const max = storage.structure.max ?? storage.structure.origin;

  for (const blockPos of storage.structure.blocks) {
    if (blockPos.y === max.y) {
      addCandidate(cache, storage, "input", offset(blockPos, 0, 1, 0), { x: 0, y: -1, z: 0 }, true);
    }
    if (blockPos.y === min.y) {
      addCandidate(cache, storage, "output", offset(blockPos, 0, -1, 0), undefined, false);
    }
    if (blockPos.x === max.x) {
      addCandidate(cache, storage, "input", offset(blockPos, 1, 0, 0), { x: -1, y: 0, z: 0 });
    }
    if (blockPos.x === min.x) {
      addCandidate(cache, storage, "input", offset(blockPos, -1, 0, 0), { x: 1, y: 0, z: 0 });
    }
    if (blockPos.z === max.z) {
      addCandidate(cache, storage, "input", offset(blockPos, 0, 0, 1), { x: 0, y: 0, z: -1 });
    }
    if (blockPos.z === min.z) {
      addCandidate(cache, storage, "input", offset(blockPos, 0, 0, -1), { x: 0, y: 0, z: 1 });
    }
  }

  for (const key of cache.candidateKeys) refreshConnectionKey(key);
}

/** @param {string} storageId */
export function removeHopperCache(storageId) {
  const cache = hopperCaches.get(storageId);
  if (!cache) return;

  const affectedKeys = Array.from(cache.candidateKeys);
  hopperCaches.delete(storageId);
  activeStorageIds.delete(storageId);

  for (const key of affectedKeys) {
    const assigned = assignedConnections.get(key);
    if (assigned?.storageId === storageId) {
      assignedConnections.delete(key);
    }

    const owners = candidateConnections.get(key);
    if (!owners) continue;

    for (const [ownerKey, connection] of owners) {
      if (connection.storageId === storageId) owners.delete(ownerKey);
    }

    if (owners.size === 0) candidateConnections.delete(key);
    else refreshConnectionKey(key);
  }
}

function initHopperConnectionEvents() {
  world.afterEvents.playerPlaceBlock.subscribe((event) => {
    if (event.block?.typeId !== HOPPER_ID) return;
    const dimension = event.block.dimension;
    const location = { ...event.block.location };
    system.run(() => refreshConnectionAt(dimension, location));
  });

  world.afterEvents.playerBreakBlock.subscribe((event) => {
    if (event.brokenBlockPermutation?.type?.id !== HOPPER_ID) return;
    const dimension = event.dimension;
    const location = { ...event.block.location };
    system.run(() => refreshConnectionAt(dimension, location));
  });
}

export function initHopperSync() {
  if (initialized || !HOPPER_ENABLED) return;
  initialized = true;

  initHopperConnectionEvents();
  system.runInterval(() => {
    try {
      syncHoppers();
    } catch {}
  }, HOPPER_TRANSFER_INTERVAL_TICKS);
}

/** @returns {void} */
function syncHoppers() {
  if (activeStorageIds.size === 0) return;

  /** @type {Storage[]} */
  const storages = [];
  for (const storageId of activeStorageIds) {
    const storage = getStorageById(storageId);
    if (storage && hopperCaches.has(storageId)) storages.push(storage);
    else activeStorageIds.delete(storageId);
  }
  if (storages.length === 0) return;

  cycleId++;
  /** @type {CycleState} */
  const cycleState = { connectionChecks: 0 };
  let globalTransfers = 0;

  for (
    let checked = 0;
    checked < storages.length
      && globalTransfers < MAX_GLOBAL_TRANSFERS_PER_CYCLE
      && cycleState.connectionChecks < MAX_CONNECTION_CHECKS_PER_CYCLE;
    checked++
  ) {
    const storage = storages[storageCursor % storages.length];
    storageCursor = (storageCursor + 1) % storages.length;

    const cache = hopperCaches.get(storage.id);
    if (!cache) continue;

    const storageLimit = Math.min(
      MAX_TRANSFERS_PER_STORAGE_PER_CYCLE,
      MAX_GLOBAL_TRANSFERS_PER_CYCLE - globalTransfers
    );
    const transfers = processStorageHoppers(storage, cache, storageLimit, cycleState);
    globalTransfers += transfers;
  }
}

/** @param {'input'|'output'} mode @returns {'input'|'output'} */
function otherMode(mode) {
  return mode === "input" ? "output" : "input";
}

/** @param {Storage} storage @param {HopperCache} cache @param {number} transferLimit @param {CycleState} cycleState */
function processStorageHoppers(storage, cache, transferLimit, cycleState) {
  let transfers = 0;
  let preferredMode = cache.nextMode;
/** @type {Map<string, number>} */
  const transferCounts = new Map();
  /** @type {Set<string>} */
  const failedHoppers = new Set();

  while (
    transfers < transferLimit
    && cycleState.connectionChecks < MAX_CONNECTION_CHECKS_PER_CYCLE
  ) {
    /** @type {HopperConnection | undefined} */
    let successfulConnection;

    for (const mode of [preferredMode, otherMode(preferredMode)]) {
      successfulConnection = tryHopperList(
        storage,
        cache,
        mode,
        transferCounts,
        failedHoppers,
        cycleState
      );
      if (successfulConnection) break;
    }

    if (!successfulConnection) break;

    transfers++;
    const count = transferCounts.get(successfulConnection.key) ?? 0;
    transferCounts.set(successfulConnection.key, count + 1);
    preferredMode = otherMode(successfulConnection.kind);
  }

  cache.nextMode = preferredMode;
  return transfers;
}

/** @param {Storage} storage @param {HopperCache} cache @param {'input'|'output'} mode @param {Map<string, number>} transferCounts @param {Set<string>} failedHoppers @param {CycleState} cycleState @returns {HopperConnection | undefined} */
function tryHopperList(storage, cache, mode, transferCounts, failedHoppers, cycleState) {
  const connections = mode === "input" ? cache.inputHoppers : cache.outputHoppers;
  if (connections.size === 0) return undefined;

  const entries = Array.from(connections.values());
  const cursorKey = mode === "input" ? "inputCursor" : "outputCursor";

  for (let checked = 0; checked < entries.length; checked++) {
    if (cycleState.connectionChecks >= MAX_CONNECTION_CHECKS_PER_CYCLE) return undefined;

    const index = cache[cursorKey] % entries.length;
    const connection = entries[index];
    cache[cursorKey] = (cache[cursorKey] + 1) % entries.length;
    if (!connection) continue;

    if (failedHoppers.has(connection.key)) continue;
    if ((transferCounts.get(connection.key) ?? 0) >= MAX_TRANSFERS_PER_HOPPER_PER_CYCLE) continue;

    cycleState.connectionChecks++;
    const success = mode === "input"
      ? tryInput(storage, connection)
      : tryOutput(storage, connection);

    if (success) return connection;
    failedHoppers.add(connection.key);
  }

  return undefined;
}

/** @param {Storage} storage @param {HopperConnection} connection */
function tryInput(storage, connection) {
  const hopper = safeGetBlock(connection.dimension, connection.hopperPos);
  if (!hopper || !isHopper(hopper) || !pointsAtVault(hopper, connection)) {
    refreshConnectionKey(connection.key);
    return false;
  }

  const inventory = getInventory(hopper);
  const moved = removeMatchingItem(inventory, undefined, HOPPER_ITEMS_PER_TRANSFER);
  if (!moved) return false;

  if (insertItem(storage.id, moved, moved.amount)) return true;
  addItemLimited(inventory, moved, moved.amount);
  return false;
}

/** @param {Storage} storage @param {HopperConnection} connection */
function tryOutput(storage, connection) {
  const hopper = safeGetBlock(connection.dimension, connection.hopperPos);
  if (!hopper || !isHopper(hopper)) {
    refreshConnectionKey(connection.key);
    return false;
  }

  const inventory = getInventory(hopper);
  const moved = extractItem(storage.id, undefined, HOPPER_ITEMS_PER_TRANSFER);
  if (!moved) return false;

  if (addItemLimited(inventory, moved, moved.amount)) return true;
  insertItem(storage.id, moved, moved.amount);
  return false;
}
