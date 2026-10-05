import { BlockPermutation, system, world } from "@minecraft/server";
import { initVaultStorage } from "../storage/storage_events.js";
import { initVaultRebuild } from "./rebuild.js";
import { vaultVisualStructure } from "./visual_structure.js";

const VAULT_ID = "create:vault";
const VAULT_PLACE_SOUNDS = [
  "mob.spawner.spawn",
  "block.trial_spawner.spawn_mob"
];
let initialized = false;

function playVaultPlaceSound(block) {
  let played = false;
  for (const sound of VAULT_PLACE_SOUNDS) {
    try {
      block.dimension.playSound(sound, block.center(), { volume: 1.0, pitch: 1.0 });
      played = true;
    } catch {}
  }
  if (!played) {
    try { block.dimension.playSound("random.fizz", block.center(), { volume: 0.6, pitch: 0.7 }); } catch {}
  }
}

function axisVector(structure) {
  if (structure.direction === "south") return { x: 0, y: 0, z: 1 };
  if (structure.direction === "west") return { x: -1, y: 0, z: 0 };
  if (structure.direction === "east") return { x: 1, y: 0, z: 0 };
  return { x: 0, y: 0, z: -1 };
}

function getExtensionSide(structure, player) {
  const vector = axisVector(structure);
  const center = {
    x: (structure.min.x + structure.max.x + 1) / 2,
    z: (structure.min.z + structure.max.z + 1) / 2
  };
  const playerLocation = player?.location;
  if (!playerLocation) return 1;

  const dot = ((playerLocation.x - center.x) * vector.x)
    + ((playerLocation.z - center.z) * vector.z);
  return dot >= 0 ? 1 : -1;
}

function getNextSlice(structure, side = 1) {
  const vector = axisVector(structure);
  const positions = [];
  const forward = side >= 0;

  if (structure.axis === "z") {
    const z = (vector.z > 0) === forward ? structure.max.z + 1 : structure.min.z - 1;
    for (let x = structure.min.x; x <= structure.max.x; x++) {
      for (let y = structure.min.y; y <= structure.max.y; y++) {
        positions.push({ x, y, z });
      }
    }
    return positions;
  }

  const x = (vector.x > 0) === forward ? structure.max.x + 1 : structure.min.x - 1;
  for (let y = structure.min.y; y <= structure.max.y; y++) {
    for (let z = structure.min.z; z <= structure.max.z; z++) {
      positions.push({ x, y, z });
    }
  }
  return positions;
}

function maxDepthForStructure(structure) {
  if (structure.width === 3 && structure.height === 3) return 9;
  if (structure.width === 2 && structure.height === 2) return 6;
  return 3;
}

function canReplace(block) {
  return block?.typeId === "minecraft:air"
    || block?.typeId === "minecraft:water"
    || block?.typeId === "minecraft:lava";
}

function countVaultItems(player) {
  if (player?.getGameMode?.() === "Creative") return 999999;
  const container = player?.getComponent("inventory")?.container;
  if (!container) return 0;

  let total = 0;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item?.typeId === VAULT_ID) total += item.amount;
  }
  return total;
}

function consumeVaultItems(player, amount) {
  if (player?.getGameMode?.() === "Creative") return true;
  const container = player?.getComponent("inventory")?.container;
  if (!container || countVaultItems(player) < amount) return false;

  let remaining = amount;
  for (let i = 0; i < container.size && remaining > 0; i++) {
    const item = container.getItem(i);
    if (item?.typeId !== VAULT_ID) continue;

    const used = Math.min(item.amount, remaining);
    remaining -= used;
    if (item.amount > used) {
      item.amount -= used;
      container.setItem(i, item);
    } else {
      container.setItem(i, undefined);
    }
  }
  return remaining === 0;
}

function vaultPermutation(direction) {
  return BlockPermutation.resolve(VAULT_ID, {
    "create:size": 1,
    "minecraft:cardinal_direction": direction,
    "create:section": "single",
    "create:pos_h": 0,
    "create:pos_v": 0
  });
}

function getExtensionPlan(block, player) {
  if (!block || block.typeId !== VAULT_ID || !player) return undefined;

  const structure = vaultVisualStructure.getStructureAt(block.location, block.dimension);
  if (!structure) return undefined;
  if (!((structure.width === 2 && structure.height === 2) || (structure.width === 3 && structure.height === 3))) return undefined;
  if (structure.depth >= maxDepthForStructure(structure)) return undefined;

  const positions = getNextSlice(structure, getExtensionSide(structure, player));
  if (countVaultItems(player) < positions.length) return undefined;

  for (const pos of positions) {
    let target;
    try { target = block.dimension.getBlock(pos); } catch { return undefined; }
    if (!canReplace(target)) return undefined;
  }

  return { structure, positions };
}

function extendVaultStructure(block, player) {
  const plan = getExtensionPlan(block, player);
  if (!plan) return false;

  const { structure, positions } = plan;
  if (!consumeVaultItems(player, positions.length)) return false;

  const permutation = vaultPermutation(structure.direction);
  for (const pos of positions) {
    try {
      const target = block.dimension.getBlock(pos);
      target.setPermutation(permutation);
      playVaultPlaceSound(target);
    } catch {}
  }

  system.run(() => vaultVisualStructure.expandOrAssemble(block.dimension.getBlock(positions[0])));
  return true;
}

function isHoldingVault(event) {
  const item = event.itemStack
    ?? event.player?.getComponent("equippable")?.getEquipment("Mainhand");
  return item?.typeId === VAULT_ID;
}

export function initVaultModule() {
  if (initialized) return;
  initialized = true;

  initVaultStorage(vaultVisualStructure);
  initVaultRebuild(vaultVisualStructure);

  world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const block = event.block;
    if (block?.typeId !== VAULT_ID) return;
    playVaultPlaceSound(block);
    system.run(() => vaultVisualStructure.expandOrAssemble(block));
  });

  world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const block = event.block;
    if (block?.typeId !== VAULT_ID) return;
    if (!isHoldingVault(event)) return;
    if (!getExtensionPlan(block, event.player)) return;
    event.cancel = true;
    system.run(() => extendVaultStructure(block, event.player));
  });

  world.afterEvents.playerBreakBlock.subscribe((event) => {
    if (event.brokenBlockPermutation?.type?.id !== VAULT_ID) return;

    const dimension = event.dimension;
    const location = { ...event.block.location };
    system.run(() => vaultVisualStructure.breakAndReassemble(dimension, location));
  });
}
