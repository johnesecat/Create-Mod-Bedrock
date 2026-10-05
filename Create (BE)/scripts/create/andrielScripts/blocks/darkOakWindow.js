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

export function isConnectedWindowId(typeId) {
    return WINDOW_IDS.has(typeId);
}

export function darkOakWindowTick(block) {
    if (!WINDOW_IDS.has(block?.typeId)) return;
    const windowId = block.typeId;

    let connectedAbove = false;
    let connectedBelow = false;
    try { connectedAbove = block.above()?.typeId === windowId; } catch {}
    try { connectedBelow = block.below()?.typeId === windowId; } catch {}

    const height = connectedAbove
        ? (connectedBelow ? "middle" : "bottom")
        : (connectedBelow ? "top" : "single");

    let current = "single";
    try { current = block.permutation.getState("create:height") ?? "single"; } catch {}
    if (current === height) return;

    try { block.setPermutation(block.permutation.withState("create:height", height)); } catch {}
}
