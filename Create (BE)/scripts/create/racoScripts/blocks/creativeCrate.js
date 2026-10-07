import * as racoAPI from "../raco-API.js"
import { getItemVisual } from "../../andrielScripts/blocks/conveyorMovement.js"

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Entity} Entity */
/** @typedef {import('@minecraft/server').ItemStack} ItemStack */
/** @typedef {import('@minecraft/server').Container} Container */

const VISUAL_TYPE = "create:conveyor_item"
const VISUAL_TAG = "create_creative_crate_item"
const ITEM_Y = 0.8975

/** @param {Block} block */
function locationTag(block) {
    const { x, y, z } = block.location
    return `creative_crate_${x}_${y}_${z}`
}

/** @param {Block} block */
function visualLocation(block) {
    return {
        x: block.location.x + 0.5,
        y: block.location.y + ITEM_Y,
        z: block.location.z + 0.5
    }
}

/** @param {Block} block */
function visuals(block) {
    const tag = locationTag(block)
    return block.dimension.getEntities({
        type: VISUAL_TYPE,
        location: block.center(),
        maxDistance: 1.35,
        tags: [VISUAL_TAG, tag]
    })
}

/** @param {Block} block */
function getVisual(block) {
    const found = visuals(block)
    const main = found[0]
    for (let i = 1; i < found.length; i++) {
        try { found[i].remove() } catch {}
    }
    return main?.isValid ? main : undefined
}

/** @param {Entity | undefined} entity */
function storedItem(entity) {
    try { return entity?.getComponent("inventory")?.container?.getItem(0) } catch {}
}

/** @param {Entity} entity @param {ItemStack | undefined} item */
function poseVisual(entity, item) {
    const visual = getItemVisual(item?.typeId ?? "")
    try {
        entity.setProperty(
            "create:item_visual",
            visual.hand ? "hand_equipped" : visual.block ? "block" : "item"
        )
        entity.setProperty("create:rotation_x", 0)
        entity.setProperty("create:rotation_z", 0)
        entity.setProperty("create:rotation_y", Math.random() * 360)
    } catch {}
}

/** @param {Block} block @param {ItemStack} item */
function createVisual(block, item) {
    const entity = block.dimension.spawnEntity(VISUAL_TYPE, visualLocation(block))
    try {
        entity.addTag(VISUAL_TAG)
        entity.addTag(locationTag(block))
        entity.addTag("create:conveyor_stop")
    } catch {}
    const display = item.clone()
    display.amount = 1
    racoAPI.setItemInHand(display, entity, "Mainhand", 0, "create:item_visual")
    poseVisual(entity, display)
    return entity
}

/** @param {Block} block @param {ItemStack | undefined} item */
function setConfiguredItem(block, item) {
    creativeCrateBreak(block)
    if (!item) return
    createVisual(block, item)
}

/** @param {Block | undefined} block @param {number} [amount] */
export function getCreativeCrateItem(block, amount = 1) {
    if (block?.typeId !== "create:crate_creative") return undefined
    const configured = storedItem(getVisual(block))
    if (!configured) return undefined
    const result = configured.clone()
    result.amount = Math.max(1, Math.min(amount, result.maxAmount ?? 64))
    return result
}

/** @param {Container | undefined} container @param {ItemStack | undefined} item */
function insertInto(container, item) {
    if (!container || !item) return false
    const remainder = container.addItem(item)
    return !remainder
}

/** @param {Block} block */
function feedHopperBelow(block) {
    const hopper = block.below()
    if (hopper?.typeId !== "minecraft:hopper") return
    const item = getCreativeCrateItem(block, 1)
    if (!item) return
    const container = hopper.getComponent("inventory")?.container
    insertInto(container, item)
}

/** @param {Block | undefined} block @param {import('@minecraft/server').Player | undefined} player @param {ItemStack | undefined} heldItem */
export function creativeCrateInteract(block, player, heldItem) {
    if (!block || !player) return
    if (heldItem?.typeId === "create:wrench") return

    if (!heldItem) {
        if (player.isSneaking) setConfiguredItem(block, undefined)
        return
    }

    const configured = heldItem.clone()
    configured.amount = 1
    setConfiguredItem(block, configured)
}

/** @param {Block} block */
export function creativeCrateTick(block) {
    const entity = getVisual(block)
    if (entity?.isValid) {
        const target = visualLocation(block)
        const loc = entity.location
        if (Math.abs(loc.x - target.x) > 0.01 || Math.abs(loc.y - target.y) > 0.01 || Math.abs(loc.z - target.z) > 0.01) {
            try { entity.teleport(target) } catch {}
        }
        try { entity.clearVelocity() } catch {}
    }
    feedHopperBelow(block)
}

/** @param {Block | undefined} block */
export function creativeCrateBreak(block) {
    if (!block?.dimension) return
    for (const entity of visuals(block)) {
        try { entity.remove() } catch {}
    }
}
