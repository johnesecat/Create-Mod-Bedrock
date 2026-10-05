import { system } from "@minecraft/server";

const BAR_IDS = new Set([
    "create:andesite_bars",
    "create:brass_bars",
    "create:copper_bars"
]);

const SIDES = [
    ["create:north", 0, 0, -1],
    ["create:south", 0, 0, 1],
    ["create:west", -1, 0, 0],
    ["create:east", 1, 0, 0]
];

function getBlock(dimension, location, dx, dy, dz) {
    try {
        return dimension.getBlock({ x: location.x + dx, y: location.y + dy, z: location.z + dz });
    } catch {
        return undefined;
    }
}

function canConnectTo(block) {
    if (!block) return false;
    if (BAR_IDS.has(block.typeId)) return true;
    const id = block.typeId;
    if (!id || id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return false;
    if (id === "minecraft:water" || id === "minecraft:flowing_water" || id === "minecraft:lava" || id === "minecraft:flowing_lava") return false;
    try {
        if (block.isAir === true || block.isLiquid === true) return false;
    } catch {}
    return true;
}

function refreshBar(block) {
    if (!block || !BAR_IDS.has(block.typeId)) return;
    let permutation = block.permutation;
    for (const [state, dx, dy, dz] of SIDES) {
        const neighbor = getBlock(block.dimension, block.location, dx, dy, dz);
        permutation = permutation.withState(state, canConnectTo(neighbor));
    }
    try { block.setPermutation(permutation); } catch {}
}

function refreshAround(dimension, location) {
    refreshBar(getBlock(dimension, location, 0, 0, 0));
    for (const [, dx, dy, dz] of SIDES) refreshBar(getBlock(dimension, location, dx, dy, dz));
}

export function connectedBarsPlace(block) {
    if (!block) return;
    const dimension = block.dimension;
    const location = { ...block.location };
    system.run(() => refreshAround(dimension, location));
}

export function connectedBarsBreak(block, brokenBlockPermutation) {
    if (!block) return;
    const dimension = block.dimension;
    const location = { ...block.location };
    system.run(() => refreshAround(dimension, location));
}

export function connectedBarsTick(block) {
    refreshBar(block);
}
