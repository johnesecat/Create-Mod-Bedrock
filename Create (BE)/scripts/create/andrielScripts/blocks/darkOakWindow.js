import { BlockPermutation } from '@minecraft/server';

const WINDOW_IDS = new Set([
    "create:acacia_window_connected",
    "create:bamboo_window_connected",
    "create:birch_window_connected",
    "create:cherry_window_connected",
    "create:crimson_window_connected",
    "create:dark_oak_window_connected",
    "create:jungle_window_connected",
    "create:mangrove_window_connected",
    "create:oak_window_connected",
    "create:ornate_iron_window_connected",
    "create:spruce_window_connected",
    "create:vertical_framed_glass_connected",
    "create:warped_window_connected"
]);

/** @param {string} typeId */
export function isConnectedWindowId(typeId) {
    return WINDOW_IDS.has(typeId);
}

/** @param {import('@minecraft/server').Block | undefined} block */
export function darkOakWindowTick(block) {
    if (!block || !WINDOW_IDS.has(block.typeId)) return;
    const windowId = block.typeId;

    let connectedAbove = false;
    let connectedBelow = false;
    try { connectedAbove = block.above()?.typeId === windowId; } catch {}
    try { connectedBelow = block.below()?.typeId === windowId; } catch {}

    const height = connectedAbove
        ? (connectedBelow ? "middle" : "bottom")
        : (connectedBelow ? "top" : "single");

    const states = block.permutation.getAllStates();
    if (states['create:height'] === height) return;
    try { block.setPermutation(BlockPermutation.resolve(block.typeId, { ...states, 'create:height': height })); } catch {}
}
