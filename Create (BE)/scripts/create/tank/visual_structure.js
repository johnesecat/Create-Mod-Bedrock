import { BlockPermutation } from "@minecraft/server";

const TANK_ID = "create:fluid_tank";
const CREATIVE_TANK_ID = "create:creative_fluid_tank";
const MAX_WIDTH = 3;
const MAX_HEIGHT = 32;
const MAX_BLOCKS = MAX_WIDTH * MAX_WIDTH * MAX_HEIGHT;
const NEIGHBORS = [
  { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
];

function integerPos(pos) {
  return { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
}

function key(pos) {
  return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
}

function safeBlock(dimension, pos) {
  try { return dimension.getBlock(integerPos(pos)); } catch { return undefined; }
}

function isTank(block, tankType) {
  if (tankType) return block?.typeId === tankType;
  return block?.typeId === TANK_ID || block?.typeId === CREATIVE_TANK_ID;
}

function getState(block, name, fallback) {
  try {
    const value = block.permutation.getState(name);
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function collectComponent(origin) {
  if (!isTank(origin)) return [];
  const tankType = origin.typeId;
  const dimension = origin.dimension;
  const queue = [integerPos(origin.location)];
  const visited = new Set();
  const result = [];

  while (queue.length && result.length < MAX_BLOCKS) {
    const pos = queue.shift();
    if (!pos) continue;
    const posId = key(pos);
    if (visited.has(posId)) continue;
    visited.add(posId);

    const block = safeBlock(dimension, pos);
    if (!isTank(block, tankType)) continue;
    result.push(pos);

    for (const direction of NEIGHBORS) {
      queue.push({
        x: pos.x + direction.x,
        y: pos.y + direction.y,
        z: pos.z + direction.z
      });
    }
  }
  return result;
}

function resetVisual(dimension, pos, tankType) {
  const block = safeBlock(dimension, pos);
  if (!isTank(block, tankType)) return;
  const off = Boolean(getState(block, "create:off", false));
  try {
    block.setPermutation(BlockPermutation.resolve(tankType, {
      "create:size": 1,
      "create:height": "single",
      "create:pos_x": 0,
      "create:pos_z": 0,
      "create:off": off
    }));
  } catch {}
}

function layerIsFull(dimension, minX, y, minZ, width, available, tankType) {
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < width; dz++) {
      const pos = { x: minX + dx, y, z: minZ + dz };
      if (!available.has(key(pos)) || !isTank(safeBlock(dimension, pos), tankType)) return false;
    }
  }
  return true;
}

function bestStructureFor(dimension, seed, available, tankType) {
  let best;

  for (let width = MAX_WIDTH; width >= 1; width--) {
    for (let offsetX = 0; offsetX < width; offsetX++) {
      for (let offsetZ = 0; offsetZ < width; offsetZ++) {
        const minX = seed.x - offsetX;
        const minZ = seed.z - offsetZ;
        if (!layerIsFull(dimension, minX, seed.y, minZ, width, available, tankType)) continue;

        let minY = seed.y;
        let maxY = seed.y;
        while (
          maxY - minY + 1 < MAX_HEIGHT
          && layerIsFull(dimension, minX, minY - 1, minZ, width, available, tankType)
        ) minY--;
        while (
          maxY - minY + 1 < MAX_HEIGHT
          && layerIsFull(dimension, minX, maxY + 1, minZ, width, available, tankType)
        ) maxY++;

        const volume = width * width * (maxY - minY + 1);
        if (!best || volume > best.volume || (volume === best.volume && width > best.width)) {
          best = { minX, minY, minZ, maxY, width, volume };
        }
      }
    }
  }
  return best;
}

function applyStructure(dimension, structure, tankType) {
  const heightCount = structure.maxY - structure.minY + 1;
  const positions = [];

  for (let y = structure.minY; y <= structure.maxY; y++) {
    let height = "middle";
    if (heightCount === 1) height = "single";
    else if (y === structure.minY) height = "bottom";
    else if (y === structure.maxY) height = "top";

    for (let dx = 0; dx < structure.width; dx++) {
      for (let dz = 0; dz < structure.width; dz++) {
        const pos = { x: structure.minX + dx, y, z: structure.minZ + dz };
        const block = safeBlock(dimension, pos);
        if (!isTank(block, tankType)) continue;
        const off = Boolean(getState(block, "create:off", false));
        try {
          block.setPermutation(BlockPermutation.resolve(tankType, {
            "create:size": structure.width,
            "create:height": height,
            "create:pos_x": dx,
            "create:pos_z": dz,
            "create:off": off
          }));
        } catch {}
        positions.push(pos);
      }
    }
  }
  return positions;
}

function rebuildComponent(origin) {
  const component = collectComponent(origin);
  if (!component.length) return;
  const tankType = origin.typeId;
  const dimension = origin.dimension;
  const available = new Set(component.map(key));

  for (const pos of component) resetVisual(dimension, pos, tankType);

  component.sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
  while (available.size) {
    const seed = component.find((pos) => available.has(key(pos)));
    if (!seed) break;
    const structure = bestStructureFor(dimension, seed, available, tankType);
    if (!structure) {
      available.delete(key(seed));
      continue;
    }
    for (const pos of applyStructure(dimension, structure, tankType)) available.delete(key(pos));
  }
}

function structureBlocks(block) {
  if (!isTank(block)) return [];
  const tankType = block.typeId;
  const width = Number(getState(block, "create:size", 1)) || 1;
  const posX = Number(getState(block, "create:pos_x", 0)) || 0;
  const posZ = Number(getState(block, "create:pos_z", 0)) || 0;
  const minX = block.x - posX;
  const minZ = block.z - posZ;

  let minY = block.y;
  let maxY = block.y;
  const matches = (candidate) =>
    isTank(candidate, tankType)
    && Number(getState(candidate, "create:size", 1)) === width
    && candidate.x - Number(getState(candidate, "create:pos_x", 0)) === minX
    && candidate.z - Number(getState(candidate, "create:pos_z", 0)) === minZ;

  while (maxY - minY + 1 < MAX_HEIGHT) {
    const below = safeBlock(block.dimension, { x: block.x, y: minY - 1, z: block.z });
    if (!matches(below)) break;
    minY--;
  }
  while (maxY - minY + 1 < MAX_HEIGHT) {
    const above = safeBlock(block.dimension, { x: block.x, y: maxY + 1, z: block.z });
    if (!matches(above)) break;
    maxY++;
  }

  const blocks = [];
  for (let y = minY; y <= maxY; y++) {
    for (let dx = 0; dx < width; dx++) {
      for (let dz = 0; dz < width; dz++) {
        const candidate = safeBlock(block.dimension, { x: minX + dx, y, z: minZ + dz });
        if (matches(candidate)) blocks.push(candidate);
      }
    }
  }
  return blocks;
}

class FluidTankVisualStructure {
  expandOrAssemble(block) {
    rebuildComponent(block);
  }

  breakAndReassemble(dimension, brokenLocation, tankType = TANK_ID) {
    const rebuilt = new Set();
    for (const direction of NEIGHBORS) {
      const neighbor = safeBlock(dimension, {
        x: brokenLocation.x + direction.x,
        y: brokenLocation.y + direction.y,
        z: brokenLocation.z + direction.z
      });
      if (!isTank(neighbor, tankType) || rebuilt.has(key(neighbor.location))) continue;
      const component = collectComponent(neighbor);
      rebuildComponent(neighbor);
      for (const pos of component) rebuilt.add(key(pos));
    }
  }

  getBlocks(block) {
    return structureBlocks(block);
  }
}

export const fluidTankVisualStructure = new FluidTankVisualStructure();
