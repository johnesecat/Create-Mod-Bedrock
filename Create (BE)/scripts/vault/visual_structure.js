import { BlockPermutation, system } from "@minecraft/server";

/** @typedef {{x:number, y:number, z:number}} Position */
/** @typedef {import('@minecraft/server').Dimension} Dimension */

/** @typedef {{id:string, blocks:Position[], origin:Position, min:Position, max:Position, size:Position, axis:'x'|'z', direction:string, width:number, height:number, depth:number, dimension:Dimension, dimensionId?:string, blockCount?:number, updatedTick:number}} VaultStructure */
/** @typedef {{id:string, dimension:Dimension, dimensionId:string, origin:Position, min:Position, max:Position, axis:'x'|'z', direction:string, width:number, height:number, depth:number, blockCount:number, blocks:Position[], updatedTick:number}} PublicVaultStructure */
/** @typedef {{type:'formed'|'removed', structure:PublicVaultStructure}} StructureChange */

const VAULT_ID = "create:vault";
const VAULT_PROFILES = [
  { width: 3, height: 3, maxLength: 9 },
  { width: 2, height: 2, maxLength: 6 },
  { width: 1, height: 1, maxLength: 3 }
];

/** @param {Position} pos @returns {Position} */
function copyPos(pos) {
  return {
    x: Math.floor(pos.x),
    y: Math.floor(pos.y),
    z: Math.floor(pos.z)
  };
}

/** @param {Position} pos */
function posKey(pos) {
  return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
}

/** @param {Dimension} dimension */
function dimensionKey(dimension) {
  if (dimension?.id === "minecraft:nether") return "nether";
  if (dimension?.id === "minecraft:the_end") return "end";
  return "overworld";
}

/** @param {Dimension} dimension @param {Position} min @param {Position} max @param {'x'|'z'} axis */
function visualStructureId(dimension, min, max, axis) {
  return `create_vault_visual_${axis}_${dimensionKey(dimension)}_${posKey(min)}_${posKey(max)}`;
}

function currentTick() {
  return typeof system.currentTick === "number" ? system.currentTick : 0;
}

/** @param {Position} a @param {Position} b */
function posEquals(a, b) {
  return Math.floor(a.x) === Math.floor(b.x)
    && Math.floor(a.y) === Math.floor(b.y)
    && Math.floor(a.z) === Math.floor(b.z);
}

/** @param {VaultStructure[]} array @param {(entry:VaultStructure)=>boolean} predicate */
function removeIf(array, predicate) {
  let i = 0;
  while (i < array.length) {
    if (predicate(array[i])) array.splice(i, 1);
    else i++;
  }
}

/** @param {Dimension} dimension @param {Position} pos @returns {import('@minecraft/server').Block | null} */
function safeGetBlock(dimension, pos) {
  try {
    return dimension.getBlock(copyPos(pos)) ?? null;
  } catch {
    return null;
  }
}

/** @param {import('@minecraft/server').Block | null | undefined} block */
/** @param {import('@minecraft/server').Block | null | undefined} block @returns {block is import('@minecraft/server').Block} */
function isVaultBlock(block) {
  return !!block && block.typeId === VAULT_ID;
}

/** @param {import('@minecraft/server').BlockPermutation} permutation @returns {'x'|'z'} */
function axisFromPermutation(permutation) {
  try {
    const direction = permutation.getState("minecraft:cardinal_direction");
    return direction === "east" || direction === "west" ? "x" : "z";
  } catch {
    return "z";
  }
}

class VaultVisualStructure {
  constructor() {
    /** @type {VaultStructure[]} */
    this.structures = [];
    /** @type {Map<string, VaultStructure>} */
    this.blockToStructure = new Map();
    /** @type {Set<(event:StructureChange)=>void>} */
    this.listeners = new Set();
  }

  /** @param {(event:StructureChange)=>void} listener */
  onStructureChanged(listener) {
    if (typeof listener !== "function") return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** @param {'formed'|'removed'} type @param {VaultStructure} structure */
  emitChange(type, structure) {
    const snapshot = this.toPublicStructure(structure);
    if (!snapshot) return;
    for (const listener of this.listeners) {
      try {
        listener({ type, structure: snapshot });
      } catch {}
    }
  }

  /** @param {VaultStructure | undefined} structure @returns {PublicVaultStructure | undefined} */
  toPublicStructure(structure) {
    if (!structure) return undefined;

    return {
      id: structure.id,
      dimension: structure.dimension,
      dimensionId: structure.dimension.id,
      origin: copyPos(structure.origin),
      min: copyPos(structure.min),
      max: copyPos(structure.max),
      axis: structure.axis,
      direction: structure.direction,
      width: structure.width,
      height: structure.height,
      depth: structure.depth,
      blockCount: structure.blocks.length,
      blocks: structure.blocks.map(copyPos),
      updatedTick: structure.updatedTick
    };
  }

  /** @param {Position} pos @param {Dimension | undefined} dimension @returns {VaultStructure | undefined} */
  _getStructureAt(pos, dimension = undefined) {
    const structure = this.blockToStructure.get(posKey(pos));
    if (!structure) return undefined;
    if (dimension && structure.dimension !== dimension) return undefined;
    return structure;
  }

  /** @param {Position} pos @param {Dimension | undefined} dimension */
  getStructureAt(pos, dimension) {
    return this.toPublicStructure(this._getStructureAt(pos, dimension));
  }

  /** @param {Dimension | undefined} dimension */
  getStructures(dimension) {
    return this.structures
      .filter((structure) => !dimension || structure.dimension === dimension)
      .map((structure) => this.toPublicStructure(structure));
  }

  /** @param {string} id */
  getStructureById(id) {
    return this.toPublicStructure(this.structures.find((structure) => structure.id === id));
  }

  /** @param {VaultStructure} structure */
  registerStructureBlocks(structure) {
    for (const pos of structure.blocks) {
      this.blockToStructure.set(posKey(pos), structure);
    }
  }

  /** @param {VaultStructure} structure */
  unregisterStructureBlocks(structure) {
    for (const pos of structure.blocks) {
      this.blockToStructure.delete(posKey(pos));
    }
  }

  /** @param {Position[]} blocks @param {Position} min @param {Position} max @param {Dimension} dimension @param {'x'|'z'} axis @param {string} direction @returns {VaultStructure} */
  createStructure(blocks, min, max, dimension, axis, direction) {
    const width = axis === "z" ? max.x - min.x + 1 : max.z - min.z + 1;
    const depth = axis === "z" ? max.z - min.z + 1 : max.x - min.x + 1;
    const height = max.y - min.y + 1;

    return {
      id: visualStructureId(dimension, min, max, axis),
      blocks: blocks.map(copyPos),
      origin: copyPos(min),
      min: copyPos(min),
      max: copyPos(max),
      size: {
        x: max.x - min.x + 1,
        y: max.y - min.y + 1,
        z: max.z - min.z + 1
      },
      axis,
      direction,
      width,
      height,
      depth,
      dimension,
      updatedTick: currentTick()
    };
  }

  /** @param {VaultStructure} structure */
  addStructure(structure) {
    this.structures.push(structure);
    this.registerStructureBlocks(structure);
    this.emitChange("formed", structure);
  }

  /** @param {VaultStructure} structure */
  removeStructure(structure) {
    this.unregisterStructureBlocks(structure);
    removeIf(this.structures, (entry) => entry.id === structure.id);
    this.emitChange("removed", structure);
  }

  /** @param {'x'|'z'} axis @param {import('@minecraft/server').BlockPermutation | undefined} currentPermutation */
  getDirectionFromAxis(axis, currentPermutation) {
    try {
      const currentDirection = currentPermutation?.getState("minecraft:cardinal_direction");
      if (axis === "z") {
        return currentDirection === "north" || currentDirection === "south" ? currentDirection : "north";
      }
      return currentDirection === "east" || currentDirection === "west" ? currentDirection : "east";
    } catch {
      return axis === "z" ? "north" : "east";
    }
  }

  /** @param {Position} pos @param {VaultStructure} structure @param {import('@minecraft/server').BlockPermutation} currentPermutation */
  calculateBlockStates(pos, structure, currentPermutation) {
    const { min, max, size, axis } = structure;

    let section = "middle";
    let posH = 0;
    const posV = pos.y - min.y;
    let profileSize = 1;

    if (axis === "z") {
      if (size.z === 1) section = "single";
      else if (pos.z === min.z) section = "start";
      else if (pos.z === max.z) section = "end";

      posH = pos.x - min.x;
      profileSize = size.x;
    } else {
      if (size.x === 1) section = "single";
      else if (pos.x === min.x) section = "start";
      else if (pos.x === max.x) section = "end";

      posH = (size.z - 1) - (pos.z - min.z);
      profileSize = size.z;
    }

    return {
      "create:size": profileSize,
      "minecraft:cardinal_direction": this.getDirectionFromAxis(axis, currentPermutation),
      "create:section": section,
      "create:pos_h": posH,
      "create:pos_v": posV
    };
  }

  /** @param {Position} pos @param {Dimension} dimension @param {VaultStructure} structure */
  updateBlockVisual(pos, dimension, structure) {
    const block = safeGetBlock(dimension, pos);
    if (!isVaultBlock(block)) return;

    try {
      const states = this.calculateBlockStates(pos, structure, block.permutation);
      block.setPermutation(BlockPermutation.resolve(VAULT_ID, states));
    } catch {}
  }

  /** @param {import('@minecraft/server').Block | null} block */
  resetBlockVisual(block) {
    if (!isVaultBlock(block) || !block) return;

    try {
      let direction = "north";
      try {
        direction = block.permutation.getState("minecraft:cardinal_direction") || "north";
      } catch {}

      block.setPermutation(BlockPermutation.resolve(VAULT_ID, {
        "create:size": 1,
        "minecraft:cardinal_direction": direction,
        "create:section": "single",
        "create:pos_h": 0,
        "create:pos_v": 0
      }));
    } catch {}
  }

  /** @param {VaultStructure} structure */
  updateStructureVisuals(structure) {
    for (const pos of structure.blocks) {
      this.updateBlockVisual(pos, structure.dimension, structure);
    }
  }

  /** @param {import('@minecraft/server').Block} block */
  expandOrAssemble(block) {
    if (!isVaultBlock(block)) return;

    const dimension = block.dimension;
    const axis = axisFromPermutation(block.permutation);
    const regionCache = new Set();

    for (const profile of VAULT_PROFILES) {
      for (let horizontalOffset = -profile.width + 1; horizontalOffset <= 0; horizontalOffset++) {
        for (let verticalOffset = -profile.height + 1; verticalOffset <= 0; verticalOffset++) {
          if (this.tryFormStructure(
            dimension,
            block.location,
            axis,
            profile.width,
            profile.height,
            profile.maxLength,
            horizontalOffset,
            verticalOffset,
            regionCache
          )) {
            return;
          }
        }
      }
    }
  }

  /** @param {Dimension} dimension @param {Position} center @param {'x'|'z'} axis @param {number} width @param {number} height @param {number} maxLength @param {number} horizontalOffset @param {number} verticalOffset @param {Set<string>} regionCache */
  tryFormStructure(dimension, center, axis, width, height, maxLength, horizontalOffset, verticalOffset, regionCache) {
    const sliceMin = { x: 0, y: center.y + verticalOffset, z: 0 };
    const sliceMax = { x: 0, y: center.y + verticalOffset + height - 1, z: 0 };

    if (axis === "z") {
      sliceMin.x = center.x + horizontalOffset;
      sliceMin.z = center.z;
      sliceMax.x = sliceMin.x + width - 1;
      sliceMax.z = center.z;
    } else {
      sliceMin.x = center.x;
      sliceMin.z = center.z + horizontalOffset;
      sliceMax.x = center.x;
      sliceMax.z = sliceMin.z + width - 1;
    }

    if (!this.checkSliceOffset(dimension, sliceMin, sliceMax, axis, width, 0)) return false;

    let forward = 0;
    let backward = 0;

    while (forward < maxLength - 1 && this.checkSliceOffset(dimension, sliceMin, sliceMax, axis, width, forward + 1)) {
      forward++;
    }

    while (backward + forward < maxLength - 1 && this.checkSliceOffset(dimension, sliceMin, sliceMax, axis, width, -(backward + 1))) {
      backward++;
    }

    const structureMin = copyPos(sliceMin);
    const structureMax = copyPos(sliceMax);

    if (axis === "z") {
      structureMin.z -= backward;
      structureMax.z += forward;
    } else {
      structureMin.x -= backward;
      structureMax.x += forward;
    }

    const cacheKey = `${structureMin.x},${structureMin.y},${structureMin.z},${structureMax.x},${structureMax.y},${structureMax.z}`;
    if (regionCache.has(cacheKey)) return false;
    regionCache.add(cacheKey);

    const blocks = [];
    for (let x = structureMin.x; x <= structureMax.x; x++) {
      for (let y = structureMin.y; y <= structureMax.y; y++) {
        for (let z = structureMin.z; z <= structureMax.z; z++) {
          blocks.push({ x, y, z });
        }
      }
    }

    if (!blocks.some((pos) => posEquals(pos, center))) return false;

    const structuresInside = this.structures.filter((structure) =>
      structure.dimension === dimension
      && structure.blocks.every((pos) =>
        pos.x >= structureMin.x && pos.x <= structureMax.x
        && pos.y >= structureMin.y && pos.y <= structureMax.y
        && pos.z >= structureMin.z && pos.z <= structureMax.z
      )
    );

    for (const structure of structuresInside) {
      if (structure.axis !== axis) return false;
    }

    for (const pos of blocks) {
      const existing = this._getStructureAt(pos, undefined);
      if (existing && !structuresInside.includes(existing)) return false;
    }

    for (const structure of structuresInside) {
      this.removeStructure(structure);
    }

    const centerBlock = safeGetBlock(dimension, center);
    const direction = this.getDirectionFromAxis(axis, centerBlock?.permutation);
    const structure = this.createStructure(blocks, structureMin, structureMax, dimension, axis, direction);
    this.addStructure(structure);
    this.updateStructureVisuals(structure);
    return true;
  }

  /** @param {Dimension} dimension @param {Position} min @param {Position} max @param {'x'|'z'} axis @param {number} width @param {number} offset */
  checkSliceOffset(dimension, min, max, axis, width, offset) {
    const offsetX = axis === "x" ? offset : 0;
    const offsetZ = axis === "z" ? offset : 0;

    for (let x = min.x + offsetX; x <= max.x + offsetX; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z + offsetZ; z <= max.z + offsetZ; z++) {
          const pos = { x, y, z };
          const block = safeGetBlock(dimension, pos);
          if (!isVaultBlock(block) || !block) return false;

          if (axisFromPermutation(block.permutation) !== axis) return false;

          const existing = this._getStructureAt(pos, undefined);
          if (existing) {
            if (existing.axis !== axis) return false;

            const existingWidth = axis === "z" ? existing.size.x : existing.size.z;
            if (existingWidth > width || existing.size.y > (max.y - min.y + 1)) return false;
          }
        }
      }
    }

    return true;
  }

  /** @param {Dimension} dimension @param {Position} brokenLocation */
  breakAndReassemble(dimension, brokenLocation) {
    const structure = this._getStructureAt(brokenLocation, dimension);

    if (!structure) {
      this.reassembleNearby(dimension, brokenLocation);
      return;
    }

    const remainingBlocks = structure.blocks.filter((pos) => !posEquals(pos, brokenLocation));
    this.removeStructure(structure);

    for (const pos of remainingBlocks) {
      this.resetBlockVisual(safeGetBlock(dimension, pos));
    }

    const processed = new Set();
    for (const pos of remainingBlocks) {
      const key = posKey(pos);
      if (processed.has(key)) continue;

      const block = safeGetBlock(dimension, pos);
      if (isVaultBlock(block) && block) this.expandOrAssemble(block);

      const newStructure = this._getStructureAt(pos, undefined);
      if (newStructure) {
        for (const structurePos of newStructure.blocks) {
          processed.add(posKey(structurePos));
        }
      } else {
        processed.add(key);
      }
    }
  }

  /** @param {Dimension} dimension @param {Position} center */
  reassembleNearby(dimension, center) {
    const radius = 3;
    for (let x = center.x - radius; x <= center.x + radius; x++) {
      for (let y = center.y - radius; y <= center.y + radius; y++) {
        for (let z = center.z - radius; z <= center.z + radius; z++) {
          const block = safeGetBlock(dimension, { x, y, z });
          if (isVaultBlock(block) && block) this.expandOrAssemble(block);
        }
      }
    }
  }
}

export const vaultVisualStructure = new VaultVisualStructure();
