import * as mc from "@minecraft/server"
import * as racoAPI from "../raco-API"

export function onInteract(block, player, item) {
    const on = block?.permutation?.getState(`create:on`)
    const entity = block.dimension.getEntities({ type: 'create:smart_observer_entity', location: block.center(), maxDistance: 0.5, closest: 1 })[0] ?? block.dimension.spawnEntity('create:smart_observer_entity', block.center())
    const cardinal = block?.permutation?.getState(`minecraft:cardinal_direction`)
    entity?.setProperty(`create:cardinal_rotation`, cardinal)

    if (item) {
        block?.dimension?.playSound("block.itemframe.add_item", block?.center())
        racoAPI.setItemInHand(item, entity, "Mainhand", 0, `create:type`)
        racoAPI.setItemInHand(item, entity, "Offhand", 0, `create:type`)
    } else if (player?.isSneaking) {
        block?.dimension?.playSound("block.itemframe.remove_item", block?.center())
        entity?.getComponent("minecraft:inventory")?.container.setItem(0, undefined)
        entity?.runCommand('replaceitem entity @s slot.weapon.mainhand 0 air')
        entity?.runCommand('replaceitem entity @s slot.weapon.offhand 0 air')
    }
}

export function onTick(block) {
    const on = block?.permutation?.getState(`create:on`)
    const direction = block?.permutation?.getState(`minecraft:cardinal_direction`)
    const entity = block.dimension.getEntities({ type: 'create:smart_observer_entity', location: block.center(), maxDistance: 0.5, closest: 1 })[0]
    const container = entity?.getComponent(`inventory`)?.container
    const filterItem = container?.getItem(0) || undefined
    try {
        const visual = racoAPI.isHandEquippedFilterItem(filterItem?.typeId) ? "hand_equipped" : "item"
        if (entity?.getProperty("create:type") !== visual) entity?.setProperty("create:type", visual)
    } catch {}
    const frontBlock = block[direction]()

    if (!filterItem) {
        if (on) block.setPermutation(block.permutation.withState(`create:on`, false))
        return
    }

    const matches = frontBlock?.typeId === filterItem?.typeId

    if (matches && !on) {
        block.setPermutation(block.permutation.withState(`create:on`, true))
    } else if (!matches && on) {
        block.setPermutation(block.permutation.withState(`create:on`, false))
    }
}
