import { BlockPermutation, system, world } from "@minecraft/server";
import { DIRECTION_OFFSETS, posToKey } from "../rpm/rpmHelpers";

const GLUE_ITEM = "create:super_glue";
const WRENCH_ITEM = "create:wrench";
const GLUE_ENTITY = "create:glue";
const GLUE_SELECTION_ENTITY = "create:glue_selection";
const GLUE_PREFIX = "create:glue:";
const GLUE_CONNECTION_PREFIX = "create:glue_connection:";
const GLUED_BLOCK_PREFIX = "create:glued_block:";
const GLUE_REGION_BLOCK_PREFIX = "create:glue_region_block:";
const FACE_ORDER = ["north", "south", "east", "west", "above", "below"];
const recentGlueUses = new Map();
const recentGlueBlockPlaces = new Map();
const glueSelections = new Map();
const GLUE_SELECTION_MAX_BLOCKS = 512;
const GLUE_SELECTION_TIMEOUT = 200;
const GLUE_PROPERTY_CACHE_INTERVAL = 100;
const MAX_SELECTION_PREVIEW_PARTICLES = 32;
const cachedGluePropertyIds = new Set();
let lastGluePropertyScan = -GLUE_PROPERTY_CACHE_INTERVAL;
const GLUE_PARTICLES = {
  north: "create:glue_north",
  south: "create:glue_south",
  east: "create:glue_east",
  west: "create:glue_west",
  above: "create:glue_up",
  below: "create:glue_down"
};

function isStillValid(value) {
  if (!value) return false;
  if (typeof value.isValid === "function") return value.isValid();
  if (typeof value.isValid === "boolean") return value.isValid;
  return true;
}

function normalizeFace(face) {
  const value = `${face ?? ""}`.toLowerCase();
  if (value === "up") return "above";
  if (value === "down") return "below";
  if (FACE_ORDER.includes(value)) return value;
  return null;
}

function clonePos(pos) {
  return {
    x: Math.floor(pos.x),
    y: Math.floor(pos.y),
    z: Math.floor(pos.z)
  };
}

function glueKey(pos, face) {
  const p = clonePos(pos);
  return `${GLUE_PREFIX}${p.x},${p.y},${p.z}:${face}`;
}

function glueConnectionKey(pos, face) {
  const p = clonePos(pos);
  return `${GLUE_CONNECTION_PREFIX}${p.x},${p.y},${p.z}:${face}`;
}

function gluedBlockKey(pos) {
  const p = clonePos(pos);
  return `${GLUED_BLOCK_PREFIX}${p.x},${p.y},${p.z}`;
}

function gluedRegionBlockKey(pos) {
  return `${GLUE_REGION_BLOCK_PREFIX}${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
}

function setGluedRegionBounds(pos, dimension, bounds) {
  try {
    world.setDynamicProperty(`${getDimensionKey(dimension)}:${gluedRegionBlockKey(pos)}`, JSON.stringify(bounds));
  } catch {}
}

function getGluedRegionBounds(pos, dimension) {
  try {
    const raw = world.getDynamicProperty(`${getDimensionKey(dimension)}:${gluedRegionBlockKey(pos)}`);
    return typeof raw === "string" ? JSON.parse(raw) : undefined;
  } catch { return undefined; }
}

function getDimensionKey(dimension) {
  return dimension?.id ?? "minecraft:overworld";
}

function setGlueData(pos, face, dimension) {
  const id = `${getDimensionKey(dimension)}:${glueKey(pos, face)}`;
  world.setDynamicProperty(id, true);
  cachedGluePropertyIds.add(id);
}

function clearGlueData(pos, face, dimension) {
  const id = `${getDimensionKey(dimension)}:${glueKey(pos, face)}`;
  world.setDynamicProperty(id, undefined);
  cachedGluePropertyIds.delete(id);
}

function hasGlueData(pos, face, dimension) {
  return world.getDynamicProperty(`${getDimensionKey(dimension)}:${glueKey(pos, face)}`) === true;
}

function setGlueConnection(pos, face, dimension) {
  world.setDynamicProperty(`${getDimensionKey(dimension)}:${glueConnectionKey(pos, face)}`, true);
}

function clearGlueConnection(pos, face, dimension) {
  world.setDynamicProperty(`${getDimensionKey(dimension)}:${glueConnectionKey(pos, face)}`, undefined);
}

function hasGlueConnection(pos, face, dimension) {
  return world.getDynamicProperty(`${getDimensionKey(dimension)}:${glueConnectionKey(pos, face)}`) === true;
}

function setGluedBlock(pos, dimension) {
  world.setDynamicProperty(`${getDimensionKey(dimension)}:${gluedBlockKey(pos)}`, true);
}

function clearGluedBlock(pos, dimension) {
  world.setDynamicProperty(`${getDimensionKey(dimension)}:${gluedBlockKey(pos)}`, undefined);
  world.setDynamicProperty(`${getDimensionKey(dimension)}:${gluedRegionBlockKey(pos)}`, undefined);
}

function isGluedBlock(pos, dimension) {
  return world.getDynamicProperty(`${getDimensionKey(dimension)}:${gluedBlockKey(pos)}`) === true;
}

function addPos(pos, offset) {
  return {
    x: Math.floor(pos.x) + offset.x,
    y: Math.floor(pos.y) + offset.y,
    z: Math.floor(pos.z) + offset.z
  };
}

function getOppositeFace(face) {
  switch (face) {
    case "north": return "south";
    case "south": return "north";
    case "east": return "west";
    case "west": return "east";
    case "above": return "below";
    case "below": return "above";
    default: return null;
  }
}

function getFaceAxis(face) {
  if (face === "east" || face === "west") return "x";
  if (face === "above" || face === "below") return "y";
  return "z";
}

function getHorizontalFaceFromYaw(yaw) {
  const normalized = ((yaw % 360) + 360) % 360;
  if (normalized >= 45 && normalized < 135) return "west";
  if (normalized >= 135 && normalized < 225) return "north";
  if (normalized >= 225 && normalized < 315) return "east";
  return "south";
}

function getPlayerHorizontalFace(player) {
  try {
    return getHorizontalFaceFromYaw(player.getRotation().y);
  } catch {
    return "south";
  }
}

function faceToFacingDirection(face) {
  switch (face) {
    case "below": return 0;
    case "above": return 1;
    case "north": return 2;
    case "south": return 3;
    case "west": return 4;
    case "east": return 5;
    default: return 3;
  }
}

function withStateIfSupported(permutation, state, value) {
  try {
    return permutation.withState(state, value);
  } catch {
    return permutation;
  }
}

function orientPermutationForGlue(permutation, player, glue) {
  const playerFace = getPlayerHorizontalFace(player);
  const attachFace = getOppositeFace(glue.supportFace) ?? playerFace;
  let oriented = permutation;

  oriented = withStateIfSupported(oriented, "minecraft:cardinal_direction", playerFace);
  oriented = withStateIfSupported(oriented, "minecraft:facing_direction", faceToFacingDirection(attachFace));
  oriented = withStateIfSupported(oriented, "minecraft:block_face", attachFace);
  oriented = withStateIfSupported(oriented, "minecraft:pillar_axis", getFaceAxis(glue.supportFace));
  return oriented;
}

function glueLocation(pos, face) {
  const offset = DIRECTION_OFFSETS[face] ?? { x: 0, y: 0, z: 0 };
  return {
    x: Math.floor(pos.x) + 0.5 + offset.x * 0.515,
    y: Math.floor(pos.y) + 0.5 + offset.y * 0.515,
    z: Math.floor(pos.z) + 0.5 + offset.z * 0.515
  };
}

function spawnGlueParticle(dimension, particle, location) {
  try {
    dimension.spawnParticle(particle, location);
    return;
  } catch {
    try { dimension.spawnParticle("minecraft:villager_happy", location); } catch {}
  }
}

function glueRotation(face) {
  switch (face) {
    case "north": return { x: 0, y: 180 };
    case "south": return { x: 0, y: 0 };
    case "east": return { x: 0, y: 270 };
    case "west": return { x: 0, y: 90 };
    case "above": return { x: 90, y: 0 };
    case "below": return { x: -90, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

function findGlueEntity(dimension, pos, face) {
  const loc = glueLocation(pos, face);
  const entities = dimension.getEntities({
    type: GLUE_ENTITY,
    location: loc,
    maxDistance: 0.12
  });
  return entities.find((entity) => isStillValid(entity));
}

function removeGlueEntity(dimension, pos, face) {
  const entity = findGlueEntity(dimension, pos, face);
  if (isStillValid(entity)) entity.remove();
}

function showGlueParticle(dimension, pos, face) {
  const particle = GLUE_PARTICLES[face] ?? "minecraft:slime_particle";
  const location = {
    x: Math.floor(pos.x) + 0.5,
    y: Math.floor(pos.y) + 0.5,
    z: Math.floor(pos.z) + 0.5
  };
  spawnGlueParticle(dimension, particle, location);
}

function playGlueFeedback(dimension, pos) {
  const loc = { x: Math.floor(pos.x) + 0.5, y: Math.floor(pos.y) + 0.5, z: Math.floor(pos.z) + 0.5 };
  for (const sound of ["mob.slime.big", "mob.slime.small", "block.slime.place"]) {
    try {
      dimension.playSound(sound, loc, { volume: 0.55, pitch: 1.1 });
      break;
    } catch {
      // Keep trying the next sound id; pack versions differ here.
    }
  }
  for (const particle of ["minecraft:slime_particle", "minecraft:villager_happy"]) {
    try {
      dimension.spawnParticle(particle, loc);
      break;
    } catch {
      // Same fallback idea as the sound above.
    }
  }
}

function getHeldItem(source) {
  try {
    return source?.getComponent("minecraft:equippable")?.getEquipment("Mainhand");
  } catch {
    return undefined;
  }
}

function getOffhandItem(source) {
  try {
    return source?.getComponent("minecraft:equippable")?.getEquipment("Offhand");
  } catch {
    return undefined;
  }
}

function setEquipmentItem(source, slot, itemStack) {
  try {
    source?.getComponent("minecraft:equippable")?.setEquipment(slot, itemStack);
  } catch {
    // Older runtimes can refuse equipment writes; placing still works in creative.
  }
}

function setHeldItem(source, itemStack) {
  setEquipmentItem(source, "Mainhand", itemStack);
}

function isCreative(source) {
  try {
    return source?.getGameMode?.() === "creative";
  } catch {
    return false;
  }
}

function damageGlueItem(source, slot = "Mainhand") {
  if (!source || isCreative(source)) return;

  let itemStack;
  try {
    itemStack = source.getComponent("minecraft:equippable")?.getEquipment(slot);
  } catch {
    return;
  }
  if (itemStack?.typeId !== GLUE_ITEM) return;

  const next = itemStack.clone();
  const durability = next.getComponent("minecraft:durability");
  if (!durability) return;

  durability.damage += 1;
  if (durability.damage >= durability.maxDurability) {
    setEquipmentItem(source, slot, undefined);
    return;
  }
  setEquipmentItem(source, slot, next);
}

function consumeOneHeldItem(source, itemStack) {
  if (!itemStack || isCreative(source)) return;
  if (itemStack.amount <= 1) {
    setHeldItem(source, undefined);
    return;
  }
  const next = itemStack.clone();
  next.amount -= 1;
  setHeldItem(source, next);
}

function isReplaceableBlock(block) {
  return !!block && (block.isAir || block.isLiquid || block.typeId === "minecraft:cave_air" || block.typeId === "minecraft:void_air");
}

function isSolidSupportBlock(block) {
  return isStillValid(block) && !block.isAir && !block.isLiquid && block.typeId !== "minecraft:cave_air" && block.typeId !== "minecraft:void_air";
}

const GLUE_FORBIDDEN_EXACT_BLOCKS = new Set([
  "create:windmill_bearing",
  "create:cart_assembler",
  "minecraft:redstone_wire",
  "minecraft:repeater",
  "minecraft:unpowered_repeater",
  "minecraft:powered_repeater",
  "minecraft:comparator",
  "minecraft:unpowered_comparator",
  "minecraft:powered_comparator",
  "minecraft:lever",
  "minecraft:observer",
  "minecraft:daylight_detector",
  "minecraft:tripwire",
  "minecraft:tripwire_hook"
]);

const GLUE_FORBIDDEN_BLOCK_PARTS = [
  "rail", "redstone", "button", "pressure_plate",
  "sapling", "flower", "tulip", "orchid", "dandelion", "poppy",
  "grass", "fern", "bush", "crop", "wheat", "carrots", "potatoes",
  "beetroot", "torchflower", "pitcher", "vine", "lily_pad", "mushroom",
  "cactus", "sugar_cane", "bamboo", "kelp", "seagrass", "azalea"
];

export function isGlueForbiddenBlock(block) {
  const typeId = typeof block === "string" ? block : block?.typeId;
  if (typeof typeId !== "string") return false;
  if (GLUE_FORBIDDEN_EXACT_BLOCKS.has(typeId)) return true;
  const name = typeId.includes(":") ? (typeId.split(":").pop() ?? typeId) : typeId;
  if (name === "grass_block") return false;
  return GLUE_FORBIDDEN_BLOCK_PARTS.some(part => name.includes(part));
}

function resolvePlacePermutation(itemStack) {
  try {
    return BlockPermutation.resolve(itemStack.typeId);
  } catch {
    return undefined;
  }
}

function getGlueUseKey(source, block, face) {
  return `${source?.id ?? "player"}:${posToKey(block.location.x, block.location.y, block.location.z)}:${face}`;
}

function getSelectionPositions(start, end, face) {
  const a = clonePos(start);
  const b = clonePos(end);
  const positions = [];
  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
  const minZ = Math.min(a.z, b.z), maxZ = Math.max(a.z, b.z);
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        positions.push({ x, y, z });
        if (positions.length > GLUE_SELECTION_MAX_BLOCKS) return [];
      }
    }
  }
  return positions;
}

function isSelectionEdge(pos, start, end, face) {
  const minX = Math.min(start.x, end.x), maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y), maxY = Math.max(start.y, end.y);
  const minZ = Math.min(start.z, end.z), maxZ = Math.max(start.z, end.z);
  if (face === "north" || face === "south") return pos.x === minX || pos.x === maxX || pos.y === minY || pos.y === maxY;
  if (face === "east" || face === "west") return pos.z === minZ || pos.z === maxZ || pos.y === minY || pos.y === maxY;
  return pos.x === minX || pos.x === maxX || pos.z === minZ || pos.z === maxZ;
}

function beginGlueSelection(source, block, face) {
  const oldSelection = glueSelections.get(source.id);
  try { if (oldSelection?.entity?.isValid) oldSelection.entity.remove(); } catch {}
  let entity;
  try { entity = block.dimension.spawnEntity(GLUE_SELECTION_ENTITY, { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 }); } catch {}
  glueSelections.set(source.id, {
    dimensionId: getDimensionKey(block.dimension),
    pos: clonePos(block.location),
    face,
    entity,
    tick: system.currentTick
  });
  showGlueParticle(block.dimension, block.location, face);
  try { source.playSound("random.click", { volume: 0.4, pitch: 1.35 }); } catch {}
}

function updateGlueSelectionEntity(selection, endBlock) {
  const entity = selection?.entity;
  if (!entity?.isValid || !endBlock) return;
  const min = {
    x: Math.min(selection.pos.x, endBlock.x),
    y: Math.min(selection.pos.y, endBlock.y),
    z: Math.min(selection.pos.z, endBlock.z)
  };
  const size = {
    x: Math.abs(selection.pos.x - endBlock.x) + 1,
    y: Math.abs(selection.pos.y - endBlock.y) + 1,
    z: Math.abs(selection.pos.z - endBlock.z) + 1
  };
  try { entity.teleport({ x: min.x + size.x / 2, y: min.y + size.y / 2, z: min.z + size.z / 2 }, { checkForBlocks: false }); } catch {}
  try { entity.setProperty("create:scale_x", size.x); } catch {}
  try { entity.setProperty("create:scale_y", size.y); } catch {}
  try { entity.setProperty("create:scale_z", size.z); } catch {}
}

function getGlueRegionBounds(entity) {
  const min = {}, max = {};
  for (const axis of ["x", "y", "z"]) {
    min[axis] = Number(entity.getDynamicProperty(`create:glue_min_${axis}`));
    max[axis] = Number(entity.getDynamicProperty(`create:glue_max_${axis}`));
    if (!Number.isFinite(min[axis]) || !Number.isFinite(max[axis])) return undefined;
  }
  return { min, max };
}

export function getGlueRegionPositions(dimension, pos) {
  if (!dimension || !pos) return [];
  let regions = [];
  try { regions = dimension.getEntities({ type: GLUE_SELECTION_ENTITY, tags: ["create_glue_region"] }); } catch { return []; }
  const positions = [];
  const added = new Set();
  const savedBounds = getGluedRegionBounds(pos, dimension);
  if (savedBounds?.min && savedBounds?.max) {
    regions.unshift({
      isValid: true,
      getDynamicProperty(id) {
        const match = /^create:glue_(min|max)_([xyz])$/.exec(id);
        return match ? savedBounds[match[1]]?.[match[2]] : undefined;
      }
    });
  }
  for (const region of regions) {
    const bounds = getGlueRegionBounds(region);
    if (!bounds || pos.x < bounds.min.x || pos.x > bounds.max.x
        || pos.y < bounds.min.y || pos.y > bounds.max.y
        || pos.z < bounds.min.z || pos.z > bounds.max.z) continue;
    for (let x = bounds.min.x; x <= bounds.max.x; x++) {
      for (let y = bounds.min.y; y <= bounds.max.y; y++) {
        for (let z = bounds.min.z; z <= bounds.max.z; z++) {
          const key = `${x},${y},${z}`;
          if (added.has(key)) continue;
          const block = getBlockSafe(dimension, { x, y, z });
          if (!isSolidSupportBlock(block) || isGlueForbiddenBlock(block)) continue;
          added.add(key);
          positions.push({ x, y, z });
          if (positions.length >= GLUE_SELECTION_MAX_BLOCKS) return positions;
        }
      }
    }
  }
  return positions;
}

function areMergeableGlueRegions(a, b) {
  let extendingAxes = 0;
  for (const axis of ["x", "y", "z"]) {
    const sameSpan = a.min[axis] === b.min[axis] && a.max[axis] === b.max[axis];
    const touches = a.min[axis] <= b.max[axis] + 1 && b.min[axis] <= a.max[axis] + 1;
    if (!touches) return false;
    if (!sameSpan) extendingAxes++;
  }
  return extendingAxes <= 1;
}

function updateGlueRegionVisual(entity, min, max) {
  const size = {
    x: max.x - min.x + 1,
    y: max.y - min.y + 1,
    z: max.z - min.z + 1
  };
  try { entity.teleport({ x: min.x + size.x / 2, y: min.y + size.y / 2, z: min.z + size.z / 2 }, { checkForBlocks: false }); } catch {}
  for (const axis of ["x", "y", "z"]) {
    try { entity.setProperty(`create:scale_${axis}`, size[axis]); } catch {}
    try { entity.setDynamicProperty(`create:glue_min_${axis}`, min[axis]); } catch {}
    try { entity.setDynamicProperty(`create:glue_max_${axis}`, max[axis]); } catch {}
  }
}

function persistGlueSelectionEntity(selection, endBlock) {
  const entity = selection?.entity;
  if (!entity?.isValid || !endBlock) return false;
  const bounds = {
    min: {
      x: Math.min(selection.pos.x, endBlock.x),
      y: Math.min(selection.pos.y, endBlock.y),
      z: Math.min(selection.pos.z, endBlock.z)
    },
    max: {
      x: Math.max(selection.pos.x, endBlock.x),
      y: Math.max(selection.pos.y, endBlock.y),
      z: Math.max(selection.pos.z, endBlock.z)
    }
  };

  let changed = true;
  while (changed) {
    changed = false;
    let regions = [];
    try { regions = endBlock.dimension.getEntities({ type: GLUE_SELECTION_ENTITY, tags: ["create_glue_region"] }); } catch {}
    for (const region of regions) {
      if (!region?.isValid || region.id === entity.id) continue;
      const regionFace = region.getDynamicProperty("create:glue_face");
      if (typeof regionFace === "string" && regionFace !== selection.face) continue;
      const existing = getGlueRegionBounds(region);
      if (!existing || !areMergeableGlueRegions(bounds, existing)) continue;
      for (const axis of ["x", "y", "z"]) {
        bounds.min[axis] = Math.min(bounds.min[axis], existing.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], existing.max[axis]);
      }
      try { region.remove(); } catch {}
      changed = true;
    }
  }

  try { entity.addTag("create_glue_region"); } catch {}
  try { entity.setDynamicProperty("create:glue_face", selection.face); } catch {}
  updateGlueRegionVisual(entity, bounds.min, bounds.max);
  selection.entity = undefined;
  return true;
}

function mergeExistingGlueRegions(dimension) {
  let regions = [];
  try { regions = dimension.getEntities({ type: GLUE_SELECTION_ENTITY, tags: ["create_glue_region"] }); } catch { return; }
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < regions.length; i++) {
      const first = regions[i];
      if (!first?.isValid) continue;
      const firstBounds = getGlueRegionBounds(first);
      if (!firstBounds) continue;
      for (let j = i + 1; j < regions.length; j++) {
        const second = regions[j];
        if (!second?.isValid) continue;
        const firstFace = first.getDynamicProperty("create:glue_face");
        const secondFace = second.getDynamicProperty("create:glue_face");
        if (typeof firstFace === "string" && typeof secondFace === "string" && firstFace !== secondFace) continue;
        const secondBounds = getGlueRegionBounds(second);
        if (!secondBounds || !areMergeableGlueRegions(firstBounds, secondBounds)) continue;
        for (const axis of ["x", "y", "z"]) {
          firstBounds.min[axis] = Math.min(firstBounds.min[axis], secondBounds.min[axis]);
          firstBounds.max[axis] = Math.max(firstBounds.max[axis], secondBounds.max[axis]);
        }
        updateGlueRegionVisual(first, firstBounds.min, firstBounds.max);
        if (typeof firstFace !== "string" && typeof secondFace === "string") {
          try { first.setDynamicProperty("create:glue_face", secondFace); } catch {}
        }
        try { second.remove(); } catch {}
        regions.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }
}
function removeGlueRegionAt(dimension, pos) {
  let regions = [];
  try { regions = dimension.getEntities({ type: GLUE_SELECTION_ENTITY, tags: ["create_glue_region"] }); } catch { return; }
  for (const region of regions) {
    const minX = Number(region.getDynamicProperty("create:glue_min_x"));
    const minY = Number(region.getDynamicProperty("create:glue_min_y"));
    const minZ = Number(region.getDynamicProperty("create:glue_min_z"));
    const maxX = Number(region.getDynamicProperty("create:glue_max_x"));
    const maxY = Number(region.getDynamicProperty("create:glue_max_y"));
    const maxZ = Number(region.getDynamicProperty("create:glue_max_z"));
    if (pos.x < minX || pos.x > maxX || pos.y < minY || pos.y > maxY || pos.z < minZ || pos.z > maxZ) continue;
    try { region.remove(); } catch {}
  }
}

function clearGlueSelection(playerId) {
  const selection = glueSelections.get(playerId);
  glueSelections.delete(playerId);
  try { if (selection?.entity?.isValid) selection.entity.remove(); } catch {}
}

function applyGlueSelection(source, selection, block, face) {
  if (selection.dimensionId !== getDimensionKey(block.dimension)) return false;
  const positions = getSelectionPositions(selection.pos, block.location, face);
  if (positions.length === 0) return false;

  const solidPositions = [];
  for (const pos of positions) {
    const target = getBlockSafe(block.dimension, pos);
    if (!isSolidSupportBlock(target) || isGlueForbiddenBlock(target)) continue;
    solidPositions.push(pos);
  }
  if (solidPositions.length === 0) return false;
  persistGlueSelectionEntity(selection, block);
  damageGlueItem(source, "Mainhand");
  const dimension = block.dimension;
  const feedbackPos = clonePos(block.location);
  const selectionBounds = {
    min: {
      x: Math.min(selection.pos.x, block.x), y: Math.min(selection.pos.y, block.y), z: Math.min(selection.pos.z, block.z)
    },
    max: {
      x: Math.max(selection.pos.x, block.x), y: Math.max(selection.pos.y, block.y), z: Math.max(selection.pos.z, block.z)
    }
  };

  // Commit the complete selection before returning. The Cart Assembler can be
  // activated on the next tick, so yielding while writing these flags caused
  // partially assembled contraptions.
  for (const pos of solidPositions) {
    setGluedBlock(pos, dimension);
    setGluedRegionBounds(pos, dimension, selectionBounds);
    setGlueData(pos, face, dimension);
    removeGlueEntity(dimension, pos, face);
  }

  // Visual feedback may still be spread over several ticks.
  system.runJob((function* applyGlueSelectionJob() {
    for (let index = 0; index < solidPositions.length; index++) {
      const pos = solidPositions[index];
      if (index % 4 === 0) showGlueParticle(dimension, pos, face);
      if ((index + 1) % 8 === 0) yield;
    }
    playGlueFeedback(dimension, feedbackPos);
  })());
  return true;
}

function getBlockHitFromView(player) {
  if (!player || typeof player.getBlockFromViewDirection !== "function") return undefined;
  try {
    return player.getBlockFromViewDirection({ maxDistance: 6 });
  } catch {
    return undefined;
  }
}

function placeHeldBlockOnGlue(player, held, supportBlock, face) {
  const normalizedFace = normalizeFace(face);
  if (!player || !held || held.typeId === GLUE_ITEM || held.typeId === WRENCH_ITEM || !supportBlock?.dimension || !normalizedFace) return false;
  if (!hasGlueData(supportBlock.location, normalizedFace, supportBlock.dimension)) return false;

  const permutation = resolvePlacePermutation(held);
  if (!permutation) return false;

  const glue = {
    supportPos: clonePos(supportBlock.location),
    supportFace: normalizedFace,
    blockPos: addPos(supportBlock.location, DIRECTION_OFFSETS[normalizedFace])
  };
  const block = supportBlock.dimension.getBlock(glue.blockPos);
  if (!isReplaceableBlock(block)) return false;

  try {
    block.setPermutation(orientPermutationForGlue(permutation, player, glue));
  } catch {
    return false;
  }

  setGlueConnection(glue.supportPos, glue.supportFace, supportBlock.dimension);
  clearGlueData(glue.supportPos, glue.supportFace, supportBlock.dimension);
  setGluedBlock(block.location, supportBlock.dimension);
  removeGlueEntity(supportBlock.dimension, glue.supportPos, glue.supportFace);
  consumeOneHeldItem(player, held);
  playGlueFeedback(supportBlock.dimension, block.location);
  return true;
}

function getBlockSafe(dimension, pos) {
  try { return dimension.getBlock(pos); } catch {
    return undefined;
  }
}

function hasGlueConnectionAround(pos, dimension) {
  for (const face of FACE_ORDER) {
    if (hasGlueConnection(pos, face, dimension)) return true;

    const opposite = getOppositeFace(face);
    const supportPos = addPos(pos, DIRECTION_OFFSETS[opposite]);
    if (hasGlueConnection(supportPos, face, dimension)) return true;
  }
  return false;
}

function isGluedStructureBlock(pos, dimension) {
  return isGluedBlock(pos, dimension) || hasGlueConnectionAround(pos, dimension);
}

function getOffhandGlueConnection(block, player) {
  if (!isStillValid(block)) return undefined;

  const hit = getBlockHitFromView(player);
  const hitFace = normalizeFace(hit?.face);
  if (hit?.block && hitFace) {
    if (posToKey(hit.block.location.x, hit.block.location.y, hit.block.location.z) === posToKey(block.location.x, block.location.y, block.location.z)) {
      const supportFaceFromPlaced = getOppositeFace(hitFace);
      const supportPos = addPos(block.location, DIRECTION_OFFSETS[supportFaceFromPlaced]);
      const supportBlock = getBlockSafe(block.dimension, supportPos);
      if (isSolidSupportBlock(supportBlock)) {
        return { supportPos: clonePos(supportBlock.location), supportFace: hitFace };
      }
    }

    const placedPos = addPos(hit.block.location, DIRECTION_OFFSETS[hitFace]);
    if (posToKey(placedPos.x, placedPos.y, placedPos.z) === posToKey(block.location.x, block.location.y, block.location.z) && isSolidSupportBlock(hit.block)) {
      return { supportPos: clonePos(hit.block.location), supportFace: hitFace };
    }
  }

  const faces = ["below", "north", "south", "east", "west", "above"];
  for (const requireGlued of [true, false]) {
    for (const faceFromPlaced of faces) {
      const supportPos = addPos(block.location, DIRECTION_OFFSETS[faceFromPlaced]);
      const supportBlock = getBlockSafe(block.dimension, supportPos);
      if (!isSolidSupportBlock(supportBlock)) continue;
      if (requireGlued && !isGluedStructureBlock(supportBlock.location, block.dimension)) continue;
      return {
        supportPos: clonePos(supportBlock.location),
        supportFace: getOppositeFace(faceFromPlaced)
      };
    }
  }

  return undefined;
}

export function superGlueUseOn({ source, itemStack, block, blockFace }) {
  const held = itemStack ?? getHeldItem(source);
  if (held?.typeId !== GLUE_ITEM || !isStillValid(block)) return false;
  if (isGlueForbiddenBlock(block)) {
    clearGlueSelection(source.id);
    try { source.playSound("random.click", { volume: 0.35, pitch: 0.65 }); } catch {}
    return true;
  }

  const face = normalizeFace(blockFace);
  if (!face) return false;

  const useKey = getGlueUseKey(source, block, face);
  const tick = system.currentTick;
  if (recentGlueUses.get(useKey) === tick) return true;
  recentGlueUses.set(useKey, tick);

  const selection = glueSelections.get(source.id);
  if (!selection || system.currentTick - selection.tick > GLUE_SELECTION_TIMEOUT) {
    beginGlueSelection(source, block, face);
    return true;
  }
  if (!applyGlueSelection(source, selection, block, face)) {
    beginGlueSelection(source, block, face);
    return true;
  }
  clearGlueSelection(source.id);
  return true;
}

export function superGlueInteract(event) {
  const source = event?.source ?? event?.player;
  const held = event?.itemStack ?? event?.beforeItemStack ?? getHeldItem(source);
  // Leave wrench interactions entirely to the machine/block wrench handlers.
  if (held?.typeId === WRENCH_ITEM) return false;
  if (held?.typeId !== GLUE_ITEM) {
    if (getOffhandItem(source)?.typeId === GLUE_ITEM) return false;
    const hit = getBlockHitFromView(source);
    const hitFace = normalizeFace(hit?.face);
    if (hit?.block && hitFace && placeHeldBlockOnGlue(source, held, hit.block, hitFace)) return true;
  }

  let block = event?.block;
  let face = event?.blockFace ?? event?.face;

  if (!block && typeof source?.getBlockFromViewDirection === "function") {
    try {
      const hit = source.getBlockFromViewDirection({ maxDistance: 6 });
      block = hit?.block;
      face = hit?.face;
    } catch {
      // Some script runtimes only expose the block on itemUseOn.
    }
  }

  return superGlueUseOn({
    source,
    itemStack: event?.itemStack ?? event?.beforeItemStack,
    block,
    blockFace: face
  });
}

export function applyRadialChassisGlue(event) {
  const source = event?.source ?? event?.player;
  const held = event?.itemStack ?? event?.beforeItemStack ?? getHeldItem(source);
  const block = event?.block;
  if (held?.typeId !== GLUE_ITEM || block?.typeId !== "create:radial_chassis") return false;

  let sticky = false;
  try { sticky = block.permutation.getState("create:sticky") === true; } catch {}
  if (sticky) return true;

  try {
    block.setPermutation(block.permutation.withState("create:sticky", true));
  } catch {
    return false;
  }

  damageGlueItem(source, "Mainhand");
  playGlueFeedback(block.dimension, block.location);
  return true;
}

function findGlueForPlacedBlock(block) {
  const pos = clonePos(block.location);
  for (const face of FACE_ORDER) {
    const opposite = getOppositeFace(face);
    const supportPos = addPos(pos, DIRECTION_OFFSETS[opposite]);
    if (hasGlueData(supportPos, face, block.dimension)) {
      return { supportPos, supportFace: face };
    }
  }
  return null;
}

function applyPlacedGlueConnection(block, connection) {
  if (!isStillValid(block) || !connection || isGlueForbiddenBlock(block)) return false;
  const support = getBlockSafe(block.dimension, connection.supportPos);
  if (isGlueForbiddenBlock(support)) return false;

  setGlueConnection(connection.supportPos, connection.supportFace, block.dimension);
  clearGlueData(connection.supportPos, connection.supportFace, block.dimension);
  setGluedBlock(block.location, block.dimension);
  removeGlueEntity(block.dimension, connection.supportPos, connection.supportFace);
  playGlueFeedback(block.dimension, block.location);
  return true;
}

function clearGlueAroundPosition(dimension, pos) {
  if (!dimension || !pos) return;

  clearGluedBlock(pos, dimension);
  for (const face of FACE_ORDER) {
    clearGlueData(pos, face, dimension);
    clearGlueConnection(pos, face, dimension);
    removeGlueEntity(dimension, pos, face);

    const opposite = getOppositeFace(face);
    const supportPos = addPos(pos, DIRECTION_OFFSETS[opposite]);
    clearGluedBlock(supportPos, dimension);
    clearGlueData(supportPos, face, dimension);
    clearGlueConnection(supportPos, face, dimension);
    removeGlueEntity(dimension, supportPos, face);
  }
}

/** @param {import('@minecraft/server').Block} block
 * @param {import('@minecraft/server').Player | undefined} [player]
 */
export function superGlueBlockPlace(block, player = undefined) {
  if (!isStillValid(block) || isGlueForbiddenBlock(block)) return;

  const tick = system.currentTick;
  const placeKey = `${player?.id ?? "player"}:${block.dimension?.id ?? "minecraft:overworld"}:${posToKey(block.location.x, block.location.y, block.location.z)}`;
  if (recentGlueBlockPlaces.get(placeKey) === tick) return;
  recentGlueBlockPlaces.set(placeKey, tick);

  const glue = findGlueForPlacedBlock(block);
  const offhand = getOffhandItem(player);
  const connection = glue ?? (offhand?.typeId === GLUE_ITEM ? getOffhandGlueConnection(block, player) : undefined);
  if (applyPlacedGlueConnection(block, connection)) {
    if (!glue && offhand?.typeId === GLUE_ITEM) damageGlueItem(player, "Offhand");
    return;
  }

  if (offhand?.typeId !== GLUE_ITEM) return;
  system.run(() => {
    if (!isStillValid(block) || getOffhandItem(player)?.typeId !== GLUE_ITEM) return;
    const delayedConnection = findGlueForPlacedBlock(block) ?? getOffhandGlueConnection(block, player);
    if (!applyPlacedGlueConnection(block, delayedConnection)) return;
    damageGlueItem(player, "Offhand");
  });
}

function parseGluePropertyId(id) {
  const marker = `:${GLUE_PREFIX}`;
  const markerIndex = id.indexOf(marker);
  if (markerIndex < 0) return undefined;

  const dimensionId = id.slice(0, markerIndex);
  const rest = id.slice(markerIndex + marker.length);
  const [posText, faceText] = rest.split(":");
  const [x, y, z] = posText.split(",").map(Number);
  const face = normalizeFace(faceText);
  if (!dimensionId || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !face) return undefined;
  return { dimensionId, pos: { x, y, z }, face };
}

function cleanupGlueEntitiesNearPlayer(player, currentTick) {
  if (currentTick % 20 !== 0) return;
  try {
    const entities = player.dimension.getEntities({
      type: GLUE_ENTITY,
      location: player.location,
      maxDistance: 48
    });
    for (const entity of entities) {
      try { entity.remove(); } catch {}
    }
  } catch {}
}

export function superGlueParticleTick(player, currentTick) {
  if (!player?.dimension || currentTick % 3 !== 0) return;
  if (currentTick % GLUE_PROPERTY_CACHE_INTERVAL === 0) mergeExistingGlueRegions(player.dimension);
  cleanupGlueEntitiesNearPlayer(player, currentTick);

  const selection = glueSelections.get(player.id);
  if (selection) {
    const held = getHeldItem(player);
    if (held?.typeId !== GLUE_ITEM || currentTick - selection.tick > GLUE_SELECTION_TIMEOUT) {
      clearGlueSelection(player.id);
    } else {
      const hit = getBlockHitFromView(player);
      const face = normalizeFace(hit?.face);
      if (hit?.block && getDimensionKey(player.dimension) === selection.dimensionId) {
        const positions = getSelectionPositions(selection.pos, hit.block.location, selection.face);
        updateGlueSelectionEntity(selection, hit.block);
        const edgePositions = positions.filter(pos => positions.length <= 4 || isSelectionEdge(pos, selection.pos, hit.block.location, selection.face));
        const step = Math.max(1, Math.ceil(edgePositions.length / MAX_SELECTION_PREVIEW_PARTICLES));
        for (let index = 0; index < edgePositions.length; index += step) {
          const pos = edgePositions[index];
          showGlueParticle(player.dimension, pos, selection.face);
        }
      }
    }
  }

  if (getHeldItem(player)?.typeId !== GLUE_ITEM && getOffhandItem(player)?.typeId !== GLUE_ITEM) return;
  if (currentTick - lastGluePropertyScan >= GLUE_PROPERTY_CACHE_INTERVAL) {
    lastGluePropertyScan = currentTick;
    try {
      for (const id of world.getDynamicPropertyIds()) {
        if (id.includes(`:${GLUE_PREFIX}`)) cachedGluePropertyIds.add(id);
      }
    } catch { return; }
  }
  const ids = cachedGluePropertyIds;

  for (const id of ids) {
    const data = parseGluePropertyId(id);
    if (!data || data.dimensionId !== getDimensionKey(player.dimension)) continue;

    const dx = (data.pos.x + 0.5) - player.location.x;
    const dy = (data.pos.y + 0.5) - player.location.y;
    const dz = (data.pos.z + 0.5) - player.location.z;
    if ((dx * dx + dy * dy + dz * dz) > 48 * 48) continue;
    if (world.getDynamicProperty(id) !== true) continue;

    showGlueParticle(player.dimension, data.pos, data.face);
  }
}

export function consumeGlueForBlock(block) {
  if (!isStillValid(block)) return false;

  const glue = findGlueForPlacedBlock(block);
  const hadGlue = !!glue;

  removeGlueRegionAt(block.dimension, block.location);
  clearGlueAroundPosition(block.dimension, block.location);
  return hadGlue;
}

export function superGlueBlockBreak(block, dimension = undefined) {
  const activeDimension = dimension ?? block?.dimension;
  if (!block?.location || !activeDimension) return;

  removeGlueRegionAt(activeDimension, block.location);
  clearGluedBlock(block.location, activeDimension);
  clearGlueAroundPosition(activeDimension, block.location);
}

export function clearGlueForMovingBlock(block) {
  if (!isStillValid(block)) return;
  clearGluedBlock(block.location, block.dimension);
  clearGlueAroundPosition(block.dimension, block.location);
}

export function restoreGlueFacesForBlock(block, faces) {
  if (!isStillValid(block) || isGlueForbiddenBlock(block) || !Array.isArray(faces)) return;
  let restored = false;
  for (const face of faces) {
    const normalizedFace = normalizeFace(face);
    if (!normalizedFace) continue;
    setGlueConnection(block.location, normalizedFace, block.dimension);
    restored = true;
  }
  if (restored) setGluedBlock(block.location, block.dimension);
}

export function isGlueConnected(dimension, a, b) {
  if (!dimension || !a || !b) return false;

  const blockA = getBlockSafe(dimension, a);
  const blockB = getBlockSafe(dimension, b);
  if (isGlueForbiddenBlock(blockA) || isGlueForbiddenBlock(blockB)) return false;

  const ax = Math.floor(a.x);
  const ay = Math.floor(a.y);
  const az = Math.floor(a.z);
  const bx = Math.floor(b.x);
  const by = Math.floor(b.y);
  const bz = Math.floor(b.z);
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;

  /** @type {"east" | "west" | "south" | "north" | "above" | "below" | null} */
  let face = null;
  if (dx === 1 && dy === 0 && dz === 0) face = "east";
  if (dx === -1 && dy === 0 && dz === 0) face = "west";
  if (dx === 0 && dy === 0 && dz === 1) face = "south";
  if (dx === 0 && dy === 0 && dz === -1) face = "north";
  if (dx === 0 && dy === 1 && dz === 0) face = "above";
  if (dx === 0 && dy === -1 && dz === 0) face = "below";
  if (!face) return false;

  return hasGlueData(a, face, dimension)
    || hasGlueData(b, getOppositeFace(face), dimension)
    || hasGlueConnection(a, face, dimension)
    || hasGlueConnection(b, getOppositeFace(face), dimension)
    || (isGluedBlock(a, dimension) && isGluedBlock(b, dimension));
}
export function clearAllGlueSelectionVisuals() {
  glueSelections.clear();
  for (const dimensionId of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
    let dimension;
    try { dimension = world.getDimension(dimensionId); } catch { continue; }
    let entities = [];
    try { entities = dimension.getEntities({ type: GLUE_SELECTION_ENTITY }); } catch { continue; }
    for (const entity of entities) {
      try { entity.remove(); } catch {}
    }
  }
}

export function removeLoadedGlueSelectionVisual(entity) {
  if (entity?.typeId !== GLUE_SELECTION_ENTITY) return false;
  try { entity.remove(); } catch {}
  return true;
}

