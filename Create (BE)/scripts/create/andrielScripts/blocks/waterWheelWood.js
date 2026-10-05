const WATER_WHEELS = new Set([
    "create:water_wheel",
    "create:large_water_wheel"
]);

const PLANK_WOOD_TYPES = new Map([
    ["minecraft:oak_planks", 0],
    ["minecraft:spruce_planks", 1],
    ["minecraft:birch_planks", 2],
    ["minecraft:jungle_planks", 3],
    ["minecraft:acacia_planks", 4],
    ["minecraft:dark_oak_planks", 5],
    ["minecraft:mangrove_planks", 6],
    ["minecraft:cherry_planks", 7],
    ["minecraft:bamboo_planks", 8],
    ["minecraft:crimson_planks", 9],
    ["minecraft:warped_planks", 10],
    ["minecraft:pale_oak_planks", 11]
]);

export function isWaterWheelWoodInteraction(block, itemStack) {
    return WATER_WHEELS.has(block?.typeId) && PLANK_WOOD_TYPES.has(itemStack?.typeId);
}

function consumeHeldPlank(player, expectedTypeId) {
    try {
        if (player.getGameMode() === "Creative") return;
    } catch {}

    try {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        const slot = player.selectedSlotIndex;
        const current = inventory?.getItem(slot);
        if (!current || current.typeId !== expectedTypeId) return;
        if (current.amount <= 1) inventory.setItem(slot);
        else {
            current.amount -= 1;
            inventory.setItem(slot, current);
        }
    } catch {}
}

export function applyWaterWheelWood(player, block, itemStack) {
    if (!isWaterWheelWoodInteraction(block, itemStack)) return false;

    const woodType = PLANK_WOOD_TYPES.get(itemStack.typeId);
    let oldWoodType;
    try { oldWoodType = block.permutation.getState("create:wood_type") ?? 0; } catch { return false; }
    if (oldWoodType === woodType) return true;

    try {
        block.setPermutation(block.permutation.withState("create:wood_type", woodType));
    } catch {
        return false;
    }

    try {
        const visual = block.dimension.getEntities({
            type: `${block.typeId}_entity`,
            location: block.center(),
            maxDistance: 0.4
        })[0];
        if (visual?.isValid) visual.setProperty("create:wood_type", woodType);
    } catch {}

    consumeHeldPlank(player, itemStack.typeId);
    return true;
}
