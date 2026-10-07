import * as mc from "@minecraft/server"
import * as racoAPI from "../raco-API"
import { getItemVisual } from "../../andrielScripts/blocks/conveyorMovement.js"

const DEPOT_VISUAL_TAG = 'create_depot_visual'
const DEPOT_MAIN_TAG = 'create_depot_main'
const DEPOT_ITEM_Y = 13 / 16
const DEPOT_VISUAL_SPACING = 0.055
const DEPOT_VISUAL_PAIR_OFFSET = 0.075
const DEPOT_VISUAL_SIGNATURE = 'create:depot_visual_signature'
const DEPOT_MAIN_SIGNATURE = 'create:depot_main_signature'

/**
 * @param {mc.Player} player 
 * @param {mc.Entity} entity 
 */
export function claimConveyorItem(player, entity) {
    if (isDepotVisual(entity)) {
        const mainEntity = getNearestDepotMainEntity(entity)
        if (mainEntity) return claimConveyorItem(player, mainEntity)
        return entity.remove()
    }

    const itemStack = entity.getComponent('inventory')?.container?.getItem(0)
    if (!itemStack) return entity.remove()

    const equippable = player?.getComponent('equippable')
    if (!equippable) return
    if (!equippable.getEquipment(mc.EquipmentSlot.Mainhand)) {
        equippable.setEquipment(mc.EquipmentSlot.Mainhand, itemStack)
        player.playSound('random.pop', { volume: 0.5 })
    } else {
        player.dimension.spawnItem(itemStack, player.location)
    }
    cleanupDepotVisualsNear(entity.dimension, entity.location)
    entity.remove()
}

/**
 * @param {mc.Block} block
 * @param {mc.Dimension} dimension
 */
export function depotBreak(block, dimension = block?.dimension) {
    if (!block || !dimension) return
    cleanupDepotItemsAt(dimension, block.location, true)
}

/**
 * @param {mc.Block} block
 * @param {mc.Player} player
 * @param {mc.ItemStack | undefined} item
 */
export function depotInteract(block, player, item) {
    if (!block || !player || !item) return
    if (item.typeId === 'create:wrench') return

    const added = addStackToDepot(block, item, item.amount ?? 1)
    if (added <= 0) return

    racoAPI.clearMainhand(player, added)
    animateDepotInsertion(block, player)
    block.dimension.playSound("block.itemframe.add_item", block.center())
}

/**
 * Move o item da direção do jogador até a superfície do Depot e dá uma
 * pequena acomodada no fim. Todos os visuais do stack se movem juntos.
 *
 * @param {mc.Block} block
 * @param {mc.Player} player
 */
function animateDepotInsertion(block, player) {
    const mainEntity = getDepotItemEntity(block)
    if (!mainEntity?.isValid) return

    const center = {
        x: block.center().x,
        y: block.location.y + DEPOT_ITEM_Y,
        z: block.center().z
    }
    const nearby = block.dimension.getEntities({
        type: 'create:conveyor_item',
        location: center,
        maxDistance: 1
    })
    const animatedEntities = nearby.filter(entity =>
        entity?.isValid && (entity.id === mainEntity.id || isDepotVisual(entity))
    )
    if (animatedEntities.length === 0) return

    const playerLocation = player.location
    const distanceX = playerLocation.x - center.x
    const distanceZ = playerLocation.z - center.z
    const horizontalLength = Math.hypot(distanceX, distanceZ)
    const startX = horizontalLength > 0.001 ? distanceX / horizontalLength * 0.42 : 0
    const startZ = horizontalLength > 0.001 ? distanceZ / horizontalLength * 0.42 : 0

    const entityOffsets = animatedEntities.map(entity => ({
        entity,
        x: entity.location.x - center.x,
        y: entity.location.y - center.y,
        z: entity.location.z - center.z
    }))
    const frames = [1.00, 0.84, 0.68, 0.53, 0.39, 0.27, 0.17, 0.09, 0.03, 0.00]

    const applyFrame = (side) => {
        for (const entry of entityOffsets) {
            if (!entry.entity?.isValid) continue
            try {
                entry.entity.teleport({
                    x: center.x + entry.x + startX * side,
                    y: center.y + entry.y,
                    z: center.z + entry.z + startZ * side
                })
            } catch {}
        }
    }

    applyFrame(frames[0])
    for (let tick = 1; tick < frames.length; tick++) {
        mc.system.runTimeout(() => applyFrame(frames[tick]), tick)
    }
}

/**
 * @param {mc.Block} block
 * @param {mc.Dimension} dimension
 */
export function scheduleDepotBreak(block, dimension = block?.dimension) {
    if (!block || !dimension) return

    const location = { x: block.location.x, y: block.location.y, z: block.location.z }
    mc.system.runTimeout(() => cleanupDepotItemsAt(dimension, location, true), 1)
    mc.system.runTimeout(() => cleanupDepotItemsAt(dimension, location, false), 5)
}

/**
 * @param {mc.Dimension} dimension
 * @param {{x: number, y: number, z: number}} blockLocation
 * @param {boolean} dropItems
 */
function cleanupDepotItemsAt(dimension, blockLocation, dropItems) {
    const center = {
        x: blockLocation.x + 0.5,
        y: blockLocation.y + DEPOT_ITEM_Y,
        z: blockLocation.z + 0.5
    }
    const conveyorItems = dimension?.getEntities({
        type: 'create:conveyor_item',
        location: center,
        maxDistance: 1.25
    }) ?? []

    for (const conveyorItem of conveyorItems) {
        if (!conveyorItem?.isValid) continue
        if (!isDepotSurfaceItem(conveyorItem, blockLocation)) continue

        const itemStack = conveyorItem.getComponent('inventory')?.container?.getItem(0)
        if (dropItems && itemStack && !isDepotVisual(conveyorItem)) {
            try { dimension.spawnItem(itemStack, conveyorItem.location) } catch {}
        }
        try { conveyorItem.remove() } catch {}
    }
}

function isDepotSurfaceItem(entity, blockLocation) {
    const loc = entity.location
    return Math.abs(loc.x - (blockLocation.x + 0.5)) <= 0.85
        && Math.abs(loc.z - (blockLocation.z + 0.5)) <= 0.85
        && loc.y >= blockLocation.y - 0.25
        && loc.y <= blockLocation.y + 1.5
}

function getDepotItemEntity(block) {
    const entities = block?.dimension?.getEntitiesAtBlockLocation(block) ?? []
    for (const entity of entities) {
        if (entity?.typeId === 'create:conveyor_item' && !isDepotVisual(entity)) return entity
    }

    const nearbyEntities = block?.dimension?.getEntities({
        type: 'create:conveyor_item',
        location: {
            x: block.center().x,
            y: block.location.y + DEPOT_ITEM_Y,
            z: block.center().z
        },
        maxDistance: 1.25
    }) ?? []
    for (const entity of nearbyEntities) {
        if (entity?.typeId === 'create:conveyor_item' && !isDepotVisual(entity) && isDepotSurfaceItem(entity, block.location)) return entity
    }

    return null
}

function hasDepotItem(block) {
    return getDepotItemEntity(block) !== null
}

function canStackItems(a, b) {
    if (!a || !b) return false
    try { return a.isStackableWith(b) } catch {}
    return a.typeId === b.typeId
}

function getItemSpace(item) {
    return Math.max(0, (item?.maxAmount ?? 64) - (item?.amount ?? 0))
}

function setDepotEntityItem(entity, itemStack) {
    try { entity.addTag(DEPOT_MAIN_TAG) } catch {}
    racoAPI.setItemInHand(itemStack, entity, "Mainhand", 0, 'create:item_visual')
    applyFlatBeltItemPose(entity, itemStack)
}

function applyFlatBeltItemPose(entity, itemStack) {
    const visual = getItemVisual(itemStack?.typeId ?? "")
    try {
        entity.setProperty(
            'create:item_visual',
            visual.hand ? 'hand_equipped' : visual.block ? 'block' : 'item'
        )
        entity.setProperty('create:rotation_x', 0)
        entity.setProperty('create:rotation_z', 0)
        entity.setProperty('create:rotation_y', Math.random() * 360)
    } catch {}
}

function isDepotVisual(entity) {
    try { return entity?.hasTag?.(DEPOT_VISUAL_TAG) === true } catch {}
    return false
}

function getNearestDepotMainEntity(entity) {
    const entities = entity?.dimension?.getEntities({
        type: 'create:conveyor_item',
        location: entity.location,
        maxDistance: 1
    }) ?? []

    for (const candidate of entities) {
        if (candidate?.isValid && candidate.id !== entity.id && !isDepotVisual(candidate)) return candidate
    }
    return null
}

function cleanupDepotVisualsNear(dimension, location) {
    const visuals = dimension?.getEntities({
        type: 'create:conveyor_item',
        location,
        maxDistance: 1
    }) ?? []

    for (const visual of visuals) {
        if (!isDepotVisual(visual)) continue
        try { visual.remove() } catch {}
    }
}

function syncDepotVisualStack(block, mainEntity, itemStack) {
    if (!block || !mainEntity?.isValid || !itemStack) return

    const direction = block?.permutation?.getState?.('minecraft:cardinal_direction') ?? 'north'
    const signature = `${itemStack.typeId}|${itemStack.amount ?? 1}|${direction}|${racoAPI.itemStackIs(itemStack)}`
    if (mainEntity.getDynamicProperty(DEPOT_VISUAL_SIGNATURE) === signature) return

    cleanupDepotVisualsNear(block.dimension, mainEntity.location)
    mainEntity.setDynamicProperty(DEPOT_VISUAL_SIGNATURE, signature)

    const visualCount = racoAPI.itemStackIs(itemStack) === 'block'
        ? 1
        : Math.min(3, itemStack.amount ?? 1)
    for (let i = 1; i < visualCount; i++) {
        const visualItem = itemStack.clone()
        visualItem.amount = 1
        const pairOffset = getDepotVisualPairOffset(block, i)

        const visualEntity = block.dimension.spawnEntity('create:conveyor_item', {
            x: block.center().x + pairOffset.x,
            y: block.location.y + DEPOT_ITEM_Y + DEPOT_VISUAL_SPACING * i,
            z: block.center().z + pairOffset.z
        })
        try { visualEntity.addTag(DEPOT_VISUAL_TAG) } catch {}
        racoAPI.setItemInHand(visualItem, visualEntity, "Mainhand", 0, 'create:item_visual')
        applyFlatBeltItemPose(visualEntity, visualItem)
        try { visualEntity.getComponent('inventory')?.container?.setItem(0, undefined) } catch {}
    }
}

function syncDepotMainVisual(mainEntity, itemStack) {
    if (!mainEntity?.isValid || !itemStack) return

    const signature = `${itemStack.typeId}|${itemStack.amount ?? 1}|${racoAPI.itemStackIs(itemStack)}`
    if (mainEntity.getDynamicProperty(DEPOT_MAIN_SIGNATURE) === signature) return

    setDepotEntityItem(mainEntity, itemStack)
    mainEntity.setDynamicProperty(DEPOT_MAIN_SIGNATURE, signature)
}

function getDepotVisualPairOffset(block, visualIndex) {
    const direction = block?.permutation?.getState?.('minecraft:cardinal_direction')
    const sign = visualIndex % 2 === 1 ? 1 : -1

    if (direction === 'east' || direction === 'west') {
        return { x: 0, z: DEPOT_VISUAL_PAIR_OFFSET * sign }
    }
    return { x: DEPOT_VISUAL_PAIR_OFFSET * sign, z: 0 }
}

export function syncDepotVisualsForBlock(block) {
    const mainEntity = getDepotItemEntity(block)
    if (!mainEntity?.isValid) {
        cleanupDepotVisualsNear(block.dimension, {
            x: block.center().x,
            y: block.location.y + DEPOT_ITEM_Y,
            z: block.center().z
        })
        return
    }

    const itemStack = mainEntity.getComponent('inventory')?.container?.getItem(0)
    if (!itemStack) {
        try { mainEntity.remove() } catch {}
        cleanupDepotVisualsNear(block.dimension, mainEntity.location)
        return
    }

    syncDepotMainVisual(mainEntity, itemStack)
    syncDepotVisualStack(block, mainEntity, itemStack)
}

export function resetDepotVisualsForBlock(block) {
    const mainEntity = getDepotItemEntity(block)
    if (!mainEntity?.isValid) {
        syncDepotVisualsForBlock(block)
        return
    }

    try { mainEntity.setDynamicProperty(DEPOT_MAIN_SIGNATURE, undefined) } catch {}
    try { mainEntity.setDynamicProperty(DEPOT_VISUAL_SIGNATURE, undefined) } catch {}
    cleanupDepotVisualsNear(block.dimension, mainEntity.location)
    syncDepotVisualsForBlock(block)
}

function addStackToDepot(block, itemStack, requestedAmount = itemStack?.amount ?? 0) {
    if (!block || !itemStack || requestedAmount <= 0) return 0

    const existingEntity = getDepotItemEntity(block)
    if (existingEntity?.isValid) {
        const container = existingEntity.getComponent('inventory')?.container
        const storedItem = container?.getItem(0)
        if (!storedItem || !canStackItems(storedItem, itemStack)) return 0

        const amountToAdd = Math.min(requestedAmount, getItemSpace(storedItem))
        if (amountToAdd <= 0) return 0

        const updatedItem = storedItem.clone()
        updatedItem.amount += amountToAdd
        setDepotEntityItem(existingEntity, updatedItem)
        syncDepotVisualStack(block, existingEntity, updatedItem)
        return amountToAdd
    }

    const amountToAdd = Math.min(requestedAmount, itemStack.amount ?? requestedAmount, itemStack.maxAmount ?? 64)
    if (amountToAdd <= 0) return 0

    const depositedItem = itemStack.clone()
    depositedItem.amount = amountToAdd

    const spawnedItem = block.dimension.spawnEntity('create:conveyor_item', {
        x: block.center().x,
        y: block.location.y + DEPOT_ITEM_Y,
        z: block.center().z
    })
    setDepotEntityItem(spawnedItem, depositedItem)
    syncDepotVisualStack(block, spawnedItem, depositedItem)
    return amountToAdd
}

/**
 * @param {mc.Block} block 
 * @param {mc.Entity} entity 
 */
export function depotStepOn(block, entity) {
    if (entity?.typeId == 'minecraft:item') {
        const itemStack = entity?.getComponent('minecraft:item')?.itemStack
        if (!itemStack) return
        const added = addStackToDepot(block, itemStack, itemStack.amount)
        if (added <= 0) return

        if (itemStack.amount > added) {
            const remainingItem = itemStack.clone()
            remainingItem.amount = itemStack.amount - added
            const newItem = block?.dimension?.spawnItem(remainingItem, entity?.location)
            newItem?.teleport(entity?.location)
        }
        entity?.remove()
    }
}

function collectMatchingDroppedItems(block) {
    const mainEntity = getDepotItemEntity(block)
    if (!mainEntity?.isValid) return

    const droppedItems = block.dimension?.getEntities({
        location: {
            x: block.center().x,
            y: block.location.y + DEPOT_ITEM_Y + 0.45,
            z: block.center().z
        },
        maxDistance: 1.35
    }) ?? []

    for (const entity of droppedItems) {
        if (entity?.typeId !== 'minecraft:item') continue
        if (!isDroppedItemOverDepot(entity, block.location)) continue

        const storedItem = mainEntity.getComponent('inventory')?.container?.getItem(0)
        if (!storedItem || getItemSpace(storedItem) <= 0) return

        const itemStack = getDroppedItemStack(entity)
        if (!canStackItems(storedItem, itemStack)) continue

        const added = addStackToDepot(block, itemStack, itemStack?.amount ?? 0)
        if (added <= 0) continue

        if (itemStack.amount > added) {
            const remainingItem = itemStack.clone()
            remainingItem.amount = itemStack.amount - added
            const newItem = block.dimension.spawnItem(remainingItem, entity.location)
            newItem?.teleport(entity.location)
        }
        try { entity.remove() } catch {}
    }
}

function getDroppedItemStack(entity) {
    return entity?.getComponent('minecraft:item')?.itemStack
        ?? entity?.getComponent('item')?.itemStack
        ?? null
}

function isDroppedItemOverDepot(entity, blockLocation) {
    const loc = entity.location
    return Math.abs(loc.x - (blockLocation.x + 0.5)) <= 0.75
        && Math.abs(loc.z - (blockLocation.z + 0.5)) <= 0.75
        && loc.y >= blockLocation.y + 0.45
        && loc.y <= blockLocation.y + 1.9
}

/**
 * @param {mc.Block} block 
 */
export function depotTicking(block) {
    const tickOffset = Math.abs((block.x * 31 + block.y * 17 + block.z * 13) % 10)
    collectMatchingDroppedItems(block)

    if ((mc.system.currentTick + tickOffset) % 10 === 0) syncDepotVisualsForBlock(block)

    if ((mc.system.currentTick + tickOffset) % 8 !== 0) return

    const faces = ['north', 'south', 'west', 'east', 'above']

    for (const thisFace of faces) {
        const faceBlock = block[thisFace]()
        if (faceBlock?.typeId == 'minecraft:hopper') {
            const hopperFacing = faceBlock.permutation.getState('facing_direction')
            if (hopperFacing === undefined) continue
            const numericFacing = Number(hopperFacing)
            if (!Number.isFinite(numericFacing)) continue
            const facingDirection = racoAPI.numToDirection(numericFacing)
            if (!facingDirection) continue
            const facing = racoAPI.blockFaceToDirection(facingDirection)
            if (racoAPI.invertFace(facing) == thisFace) {
                const hopperContainer = faceBlock.getComponent('inventory')?.container

                for (let i = 0; i < hopperContainer.size; i++) {
                    const thisItem = hopperContainer.getItem(i)
                    if (!thisItem) continue

                    const added = addStackToDepot(block, thisItem, 1)
                    if (added <= 0) continue

                    racoAPI.clearItem(hopperContainer, i, added)
                    block?.dimension?.playSound("block.itemframe.add_item", block?.center())
                    break
                }
                break
            }
        }
    }
}
