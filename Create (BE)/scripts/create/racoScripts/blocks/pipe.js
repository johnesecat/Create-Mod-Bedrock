import * as mc from "@minecraft/server";
import { compatibilityFluids } from "../../compatibility/registries.js";

const PIPE_TYPE = "create:pipe";
const GLASS_PIPE_TYPE = "create:glass_pipe";
const PIPE_FLUID_ENTITY_TYPE = "create:pipe_fluid";
const FLUID_CONNECTORS = new Set([
    "create:mechanical_pump",
    "create:spout",
    "create:smart_fluid_pipe",
    "create:fluid_tank",
    "create:creative_fluid_tank"
]);

const DIRECTIONS = {
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    west: { x: -1, y: 0, z: 0 },
    east: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    down: { x: 0, y: -1, z: 0 }
};

const HORIZONTAL_DIRECTIONS = ["north", "south", "west", "east"];
const pipeFluidVisualTokens = new Map();
const pipeWrenchTicks = new Map();
const PIPE_FLUID_TYPES = new Map([
    ["minecraft:water_bucket", "water"],
    ["minecraft:lava_bucket", "lava"],
    ["create:honey_bucket", "honey"],
    ["create:chocolate_bucket", "chocolate"],
    ["minecraft:milk_bucket", "milk"]
]);

function offsetLocation(location, offset) {
    return {
        x: location.x + offset.x,
        y: location.y + offset.y,
        z: location.z + offset.z
    };
}

function opposite(offset) {
    return { x: -offset.x, y: -offset.y, z: -offset.z };
}

function isPipe(block) {
    return block?.typeId === PIPE_TYPE || block?.typeId === GLASS_PIPE_TYPE;
}

function pipeFluidVisualKey(block) {
    return `${block.dimension.id}:${block.location.x},${block.location.y},${block.location.z}`;
}

function getPipeFluidVisual(block) {
    try {
        return block.dimension.getEntities({
            type: PIPE_FLUID_ENTITY_TYPE,
            location: block.center(),
            maxDistance: 0.7,
            closest: 1
        })[0];
    } catch {
        return undefined;
    }
}

function removePipeFluidVisual(block) {
    const entity = getPipeFluidVisual(block);
    try { if (entity?.isValid) entity.remove(); } catch {}
    pipeFluidVisualTokens.delete(pipeFluidVisualKey(block));
}

export function showPipeFluidVisual(block, fluidId) {
    if (block?.typeId !== GLASS_PIPE_TYPE) return;
    const shape = block.permutation?.getState("create:shape");
    if (shape !== "straight" && shape !== "vertical") return;

    const fluidType = PIPE_FLUID_TYPES.get(fluidId) ?? compatibilityFluids.get(fluidId)?.visualType;
    if (!fluidType) return;

    let entity = getPipeFluidVisual(block);
    try {
        if (!entity?.isValid) entity = block.dimension.spawnEntity(PIPE_FLUID_ENTITY_TYPE, block.center());
        entity.setProperty("create:fluid_type", fluidType);

        const direction = getPipeDirection(block);
        const axis = shape === "vertical"
            ? "y"
            : direction === "east" || direction === "west"
                ? "x"
                : "z";
        entity.setProperty("create:pipe_axis", axis);
        entity.teleport(block.center(), { rotation: { x: 0, y: 0 } });
    } catch {
        return;
    }

    const visualKey = pipeFluidVisualKey(block);
    const token = (pipeFluidVisualTokens.get(visualKey) ?? 0) + 1;
    pipeFluidVisualTokens.set(visualKey, token);
    mc.system.runTimeout(() => {
        if (pipeFluidVisualTokens.get(visualKey) !== token) return;
        removePipeFluidVisual(block);
    }, 100);
}

function isPipeConnection(block) {
    return isPipe(block) || FLUID_CONNECTORS.has(block?.typeId);
}

// O Fluid Tank usa o aro externo do próprio pipe como encaixe, igual ao
// Create Java. Ele conecta à rede, mas não deve esconder a borda do cano.
function hidesPipeEnd(block) {
    return isPipeConnection(block)
        && block?.typeId !== "create:fluid_tank"
        && block?.typeId !== "create:creative_fluid_tank";
}

function getPipeDirection(block) {
    return block?.permutation?.getState("minecraft:cardinal_direction") ?? "north";
}

function getPipeAt(dimension, location) {
    try { return dimension.getBlock(location); } catch { return undefined; }
}

function getJunctionBase(neighbors) {
    const connectedHorizontal = HORIZONTAL_DIRECTIONS.filter((name) => neighbors[name]);
    if (connectedHorizontal.length === 1) {
        const direction = connectedHorizontal[0];
        if (direction === "north") return "n";
        if (direction === "south") return "s";
        if (direction === "west") return "w";
        return "e";
    }

    if (neighbors.north && neighbors.south && !neighbors.east && !neighbors.west) return "ns";
    if (neighbors.east && neighbors.west && !neighbors.north && !neighbors.south) return "ew";

    const ns = neighbors.north && neighbors.south
        ? "ns"
        : neighbors.north
            ? "n"
            : "s";
    const ew = neighbors.east && neighbors.west
        ? "ew"
        : neighbors.east
            ? "e"
            : "w";
    return `${ns}_${ew}`;
}

function getJunctionVertical(neighbors) {
    if (neighbors.up && neighbors.down) return "ud";
    if (neighbors.up) return "u";
    if (neighbors.down) return "d";
    return "none";
}

function getHorizontalElbowType(neighbors) {
    if (neighbors.north && neighbors.east) return "n_e";
    if (neighbors.north && neighbors.west) return "n_w";
    if (neighbors.south && neighbors.east) return "s_e";
    if (neighbors.south && neighbors.west) return "s_w";
    return "s_e";
}

function getStraightDirection(neighbors, currentDirection) {
    const connectedHorizontal = HORIZONTAL_DIRECTIONS.filter((name) => neighbors[name]);
    if (connectedHorizontal.length === 1) return connectedHorizontal[0];

    const hasNorthSouth = neighbors.north || neighbors.south;
    const hasEastWest = neighbors.east || neighbors.west;

    if (hasNorthSouth && !hasEastWest) {
        if (currentDirection === "north" || currentDirection === "south") return currentDirection;
        return neighbors.north ? "north" : "south";
    }

    if (hasEastWest && !hasNorthSouth) {
        if (currentDirection === "east" || currentDirection === "west") return currentDirection;
        return neighbors.east ? "east" : "west";
    }

    return currentDirection;
}

function getElbowDirection(neighbors, currentDirection) {
    if (neighbors.up || neighbors.down) {
        return HORIZONTAL_DIRECTIONS.find((name) => neighbors[name]) ?? currentDirection;
    }

    if (neighbors[currentDirection] && HORIZONTAL_DIRECTIONS.includes(currentDirection)) return currentDirection;
    return HORIZONTAL_DIRECTIONS.find((name) => neighbors[name]) ?? currentDirection;
}

function getEndType(connectFront, connectBack) {
    if (connectFront && connectBack) return "both";
    if (connectFront) return "front";
    if (connectBack) return "back";
    return "open";
}

function updatePipe(block) {
    if (!isPipe(block)) return;

    const neighbors = {};
    for (const [name, offset] of Object.entries(DIRECTIONS)) {
        neighbors[name] = isPipeConnection(getPipeAt(block.dimension, offsetLocation(block.location, offset)));
    }

    const connectedHorizontal = HORIZONTAL_DIRECTIONS.filter((name) => neighbors[name]);
    const hasVertical = neighbors.up || neighbors.down;
    const connectedCount = connectedHorizontal.length + (neighbors.up ? 1 : 0) + (neighbors.down ? 1 : 0);
    const hasNorthSouth = neighbors.north || neighbors.south;
    const hasEastWest = neighbors.east || neighbors.west;
    const isHorizontalCorner = !hasVertical && connectedHorizontal.length === 2 && hasNorthSouth && hasEastWest;
    const shape = connectedCount >= 3
        ? "junction"
        : hasVertical
            ? (connectedHorizontal.length > 0 ? "elbow" : "vertical")
            : isHorizontalCorner
            ? "elbow"
            : "straight";
    const verticalDirection = neighbors.down && !neighbors.up ? "down" : "up";
    const elbowType = hasVertical ? verticalDirection : getHorizontalElbowType(neighbors);
    const junctionBase = getJunctionBase(neighbors);
    const junctionVertical = getJunctionVertical(neighbors);
    const currentDirection = getPipeDirection(block);
    const preferredDirection = shape === "elbow"
        ? getElbowDirection(neighbors, currentDirection)
        : shape === "straight"
            ? getStraightDirection(neighbors, currentDirection)
            : "north";
    const direction = DIRECTIONS[preferredDirection] ?? DIRECTIONS.north;
    const connectFront = shape === "vertical"
        ? hidesPipeEnd(getPipeAt(block.dimension, offsetLocation(block.location, DIRECTIONS.up)))
        : hidesPipeEnd(getPipeAt(block.dimension, offsetLocation(block.location, direction)));
    const connectBack = shape === "vertical"
        ? hidesPipeEnd(getPipeAt(block.dimension, offsetLocation(block.location, DIRECTIONS.down)))
        : hidesPipeEnd(getPipeAt(block.dimension, offsetLocation(block.location, opposite(direction))));
    const endType = getEndType(connectFront, connectBack);

    if (block.typeId === GLASS_PIPE_TYPE && shape !== "straight" && shape !== "vertical") {
        try {
            block.setPermutation(mc.BlockPermutation.resolve(PIPE_TYPE));
            updatePipe(block);
        } catch {}
        return;
    }

    let permutation = block.permutation;
    let changed = false;

    if (permutation.getState("create:shape") !== shape) {
        permutation = permutation.withState("create:shape", shape);
        changed = true;
    }

    if (permutation.getState("minecraft:cardinal_direction") !== preferredDirection) {
        permutation = permutation.withState("minecraft:cardinal_direction", preferredDirection);
        changed = true;
    }

    if (block.typeId === PIPE_TYPE && permutation.getState("create:elbow_type") !== elbowType) {
        permutation = permutation.withState("create:elbow_type", elbowType);
        changed = true;
    }

    if (block.typeId === PIPE_TYPE && permutation.getState("create:junction_base") !== junctionBase) {
        permutation = permutation.withState("create:junction_base", junctionBase);
        changed = true;
    }

    if (block.typeId === PIPE_TYPE && permutation.getState("create:junction_vertical") !== junctionVertical) {
        permutation = permutation.withState("create:junction_vertical", junctionVertical);
        changed = true;
    }

    if (permutation.getState("create:end_type") !== endType) {
        permutation = permutation.withState("create:end_type", endType);
        changed = true;
    }

    if (changed) {
        try { block.setPermutation(permutation); } catch {}
    }
}

function updatePipeAndNeighbors(block, includeSelf = true) {
    if (!block) return;

    if (includeSelf) updatePipe(block);

    for (const direction of Object.values(DIRECTIONS)) {
        const neighbor = getPipeAt(block.dimension, offsetLocation(block.location, direction));
        updatePipe(neighbor);
    }
}

export function pipePlace(block) {
    mc.system.run(() => updatePipeAndNeighbors(block));
}

export function updatePipeConnectionsAround(block) {
    mc.system.run(() => updatePipeAndNeighbors(block, false));
}

export function pipeBreak(block, dimension) {
    if (!block || !dimension) return;
    const location = { ...block.location };
    removePipeFluidVisual(block);

    mc.system.run(() => {
        for (const direction of Object.values(DIRECTIONS)) {
            const neighbor = getPipeAt(dimension, offsetLocation(location, direction));
            updatePipe(neighbor);
        }
    });
}

export function pipeWrenchInteract(block, player, item) {
    if (!isPipe(block) || item?.typeId !== "create:wrench" || player?.isSneaking) return false;

    const shape = block.permutation?.getState("create:shape");
    if (shape !== "straight" && shape !== "vertical") return false;

    try {
        const interactionKey = `${player?.id ?? "unknown"}:${block.dimension.id}:${block.x},${block.y},${block.z}`;
        const lastInteractionTick = pipeWrenchTicks.get(interactionKey) ?? -100;
        if (mc.system.currentTick - lastInteractionTick < 5) return true;

        const targetType = block.typeId === GLASS_PIPE_TYPE ? PIPE_TYPE : GLASS_PIPE_TYPE;
        let target = mc.BlockPermutation.resolve(targetType)
            .withState("create:shape", shape)
            .withState("create:end_type", block.permutation.getState("create:end_type") ?? "open")
            .withState("minecraft:cardinal_direction", block.permutation.getState("minecraft:cardinal_direction") ?? "north");
        removePipeFluidVisual(block);
        block.setPermutation(target);
        // Only consume/debounce the click after the permutation succeeds. A
        // before-event can run in read-only mode and must not block the later
        // custom/item interaction that is allowed to change the block.
        pipeWrenchTicks.set(interactionKey, mc.system.currentTick);
        block.dimension.playSound("random.click", block.center(), {
            volume: 0.7,
            pitch: targetType === GLASS_PIPE_TYPE ? 1.15 : 0.9
        });
        updatePipeAndNeighbors(block);
        return true;
    } catch {
        return false;
    }
}
