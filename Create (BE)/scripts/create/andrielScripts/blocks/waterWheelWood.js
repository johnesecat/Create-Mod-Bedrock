import { BlockPermutation, GameMode } from '@minecraft/server';

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

/** @param {import('@minecraft/server').Block | undefined} block
 * @param {import('@minecraft/server').ItemStack | undefined} itemStack
 */
export function isWaterWheelWoodInteraction(block, itemStack) {
    return !!block && !!itemStack && WATER_WHEELS.has(block.typeId) && PLANK_WOOD_TYPES.has(itemStack.typeId);
}

/** @param {import('@minecraft/server').Player} player
 * @param {string} expectedTypeId
 */
function consumeHeldPlank(player, expectedTypeId) {
    try {
        if (player.getGameMode() === GameMode.Creative) return;
    } catch {}

    try {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) return;
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

/** @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').Block | undefined} block
 * @param {import('@minecraft/server').ItemStack | undefined} itemStack
 */
export function applyWaterWheelWood(player, block, itemStack) {
    if (!block || !itemStack || !isWaterWheelWoodInteraction(block, itemStack)) return false;

    const woodType = PLANK_WOOD_TYPES.get(itemStack.typeId);
    if (woodType === undefined) return false;
    const states = block.permutation.getAllStates();
    const oldWoodType = states['create:wood_type'] ?? 0;
    if (oldWoodType === woodType) return true;

    try {
        block.setPermutation(BlockPermutation.resolve(block.typeId, { ...states, 'create:wood_type': woodType }));
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
