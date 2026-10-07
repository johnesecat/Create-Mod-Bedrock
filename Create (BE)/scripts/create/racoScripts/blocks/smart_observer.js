import * as mc from "@minecraft/server"
import * as racoAPI from "../raco-API"

/** @param {mc.Block} block @param {mc.Player | undefined} player @param {mc.ItemStack | undefined} item */
export function onInteract(block, player, item) {
    if (!player?.isValid) return
    const entity = block.dimension.getEntities({ type: 'create:smart_observer_entity', location: block.center(), maxDistance: 0.5, closest: 1 })[0] ?? block.dimension.spawnEntity('create:smart_observer_entity', block.center())
    const cardinal = block.permutation.getAllStates()['minecraft:cardinal_direction']
    if (cardinal) entity.setProperty('create:cardinal_rotation', cardinal)

    if (item) {
        block?.dimension?.playSound("block.itemframe.add_item", block?.center())
        racoAPI.setItemInHand(item, entity, "Mainhand", '0', 'rc_fb:filter_type')
        racoAPI.setItemInHand(item, entity, "Offhand", '1', 'rc_fb:filter_type')
    } else if (player?.isSneaking) {
        block?.dimension?.playSound("block.itemframe.remove_item", block?.center())
        entity?.getComponent("minecraft:inventory")?.container?.setItem(0, undefined)
        entity?.runCommand('replaceitem entity @s slot.weapon.mainhand 0 air')
        entity?.runCommand('replaceitem entity @s slot.weapon.offhand 0 air')
    }
}

/** @param {mc.Block} block */
export function onTick(block) {
    const on = block.permutation.getAllStates()['create:on']
    const rawDirection = block.permutation.getAllStates()['minecraft:cardinal_direction']
    const direction = typeof rawDirection === 'string' ? rawDirection : undefined
    const entity = block.dimension.getEntities({ type: 'create:smart_observer_entity', location: block.center(), maxDistance: 0.5, closest: 1 })[0]
    const container = entity?.getComponent('minecraft:inventory')?.container
    const filterItem = container?.getItem(0)
    try {
        const visual = racoAPI.isHandEquippedFilterItem(filterItem?.typeId) ? "hand_equipped" : "item"
        if (entity?.getProperty("create:type") !== visual) entity?.setProperty("create:type", visual)
    } catch {}
    if (direction !== 'north' && direction !== 'south' && direction !== 'east' && direction !== 'west') return
    const offsets = { north: { x: 0, y: 0, z: -1 }, south: { x: 0, y: 0, z: 1 }, east: { x: 1, y: 0, z: 0 }, west: { x: -1, y: 0, z: 0 } }
    const frontBlock = block.offset(offsets[direction])
    const frontBlockType = frontBlock?.permutation.type.id

    if (!filterItem) {
        if (on) block.setPermutation(mc.BlockPermutation.resolve(block.typeId, { ...block.permutation.getAllStates(), 'create:on': false }))
        return
    }

    const filterTypeId = filterItem?.typeId
    const matches = typeof filterTypeId === 'string' && typeof frontBlockType === 'string' && frontBlockType === filterTypeId

    if (matches && !on) {
        block.setPermutation(mc.BlockPermutation.resolve(block.typeId, { ...block.permutation.getAllStates(), 'create:on': true }))
    } else if (!matches && on) {
        block.setPermutation(mc.BlockPermutation.resolve(block.typeId, { ...block.permutation.getAllStates(), 'create:on': false }))
    }
}
