import * as mc from "@minecraft/server"
import * as racoAPI from "../raco-API"

const STRIPPED_WOOD_BLOCKS = new Set([
    "minecraft:stripped_oak_log",
    "minecraft:stripped_spruce_log",
    "minecraft:stripped_birch_log",
    "minecraft:stripped_jungle_log",
    "minecraft:stripped_acacia_log",
    "minecraft:stripped_dark_oak_log",
    "minecraft:stripped_mangrove_log",
    "minecraft:stripped_cherry_log",
    "minecraft:stripped_pale_oak_log",
    "minecraft:stripped_crimson_stem",
    "minecraft:stripped_warped_stem",
    "minecraft:stripped_oak_wood",
    "minecraft:stripped_spruce_wood",
    "minecraft:stripped_birch_wood",
    "minecraft:stripped_jungle_wood",
    "minecraft:stripped_acacia_wood",
    "minecraft:stripped_dark_oak_wood",
    "minecraft:stripped_mangrove_wood",
    "minecraft:stripped_cherry_wood",
    "minecraft:stripped_pale_oak_wood",
    "minecraft:stripped_crimson_hyphae",
    "minecraft:stripped_warped_hyphae",
    "minecraft:stripped_bamboo_block"
])

/** @type {Readonly<Partial<Record<string, string>>>} */
const CASING_BY_ITEM = {
    "create:andesite_alloy": "create:andesite_casing",
    "create:brass_ingot": "create:brass_casing",
    "minecraft:copper_ingot": "create:copper_casing"
}

const CONNECT_DIRECTIONS = {
    up: { x: 0, y: 1, z: 0, opposite: "down" },
    down: { x: 0, y: -1, z: 0, opposite: "up" },
    north: { x: 0, y: 0, z: -1, opposite: "south" },
    south: { x: 0, y: 0, z: 1, opposite: "north" },
    east: { x: 1, y: 0, z: 0, opposite: "west" },
    west: { x: -1, y: 0, z: 0, opposite: "east" }
}

/** @param {mc.Player | undefined} player @param {mc.Block | undefined} block @param {mc.ItemStack | undefined} item */
export function beforeCasingCraftInteract(player, block, item) {
    if (!player || !block || !item) return false
    const casingId = CASING_BY_ITEM[item.typeId]
    if (!casingId) return false
    if (!STRIPPED_WOOD_BLOCKS.has(block.typeId)) return false

    const location = { ...block.location }
    const dimension = block.dimension

    mc.system.run(() => {
        const targetBlock = dimension.getBlock(location)
        if (!player.isValid || !targetBlock || !STRIPPED_WOOD_BLOCKS.has(targetBlock.typeId)) return
        const held = player.getComponent('minecraft:equippable')?.getEquipment(mc.EquipmentSlot.Mainhand)
        if (held?.typeId !== item.typeId) return

        try { targetBlock.setType(casingId) } catch { return }
        updateCasingConnections(targetBlock, casingId)
        racoAPI.clearMainhand(player, 1)
        try { dimension.playSound("use.wood", targetBlock.center(), { volume: 0.65, pitch: 1.15 }) } catch {}
    })

    return true
}

/** @param {mc.Block} block @param {string} casingId */
function updateCasingConnections(block, casingId) {
    try {
        let permutation = block.permutation
        for (const [direction, offset] of Object.entries(CONNECT_DIRECTIONS)) {
            const neighbor = block.dimension.getBlock({
                x: block.location.x + offset.x,
                y: block.location.y + offset.y,
                z: block.location.z + offset.z
            })
            permutation = mc.BlockPermutation.resolve(block.typeId, { ...permutation.getAllStates(), [`create:${direction}`]: neighbor?.typeId === casingId })
        }
        block.setPermutation(permutation)
    } catch {}

    for (const [direction, offset] of Object.entries(CONNECT_DIRECTIONS)) {
        try {
            const neighbor = block.dimension.getBlock({
                x: block.location.x + offset.x,
                y: block.location.y + offset.y,
                z: block.location.z + offset.z
            })
            if (neighbor?.typeId !== casingId) continue
            neighbor.setPermutation(mc.BlockPermutation.resolve(neighbor.typeId, { ...neighbor.permutation.getAllStates(), [`create:${offset.opposite}`]: true }))
        } catch {}
    }
}
