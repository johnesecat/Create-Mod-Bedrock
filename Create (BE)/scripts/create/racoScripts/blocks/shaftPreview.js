import * as mc from "@minecraft/server"

const MAINHAND = mc.EquipmentSlot.Mainhand

/** @typedef {import('@minecraft/server').Player} Player */
/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Entity} Entity */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */
/** @typedef {'north' | 'south' | 'east' | 'west' | 'up' | 'down'} Direction */

const SHAFT_ITEMS = new Set(["create:shaft", "create:cogwheel", "create:large_cogwheel"])
const SHAFT_BLOCKS = new Set(["create:shaft", "create:shaft.steam_engine", "create:cogwheel", "create:large_cogwheel"])
/** @type {Map<string, {entity: Entity | undefined, type: string, locationKey: string, direction: Direction}>} */
const previews = new Map()
/** @type {Map<string, Array<Entity | undefined>>} */
const largeCogwheelDiagonalPreviews = new Map()

/** @type {Readonly<Record<Direction, Vector3>>} */
/** @param {unknown} value @returns {value is Direction} */
function isDirection(value) {
    return value === "north" || value === "south" || value === "east" || value === "west" || value === "up" || value === "down"
}

const FACE_OFFSETS = {
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    west: { x: -1, y: 0, z: 0 },
    east: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    down: { x: 0, y: -1, z: 0 }
}

/** @param {Player} player @param {number} currentTick */
export function shaftPreviewTick(player, currentTick) {
    if (!player?.isValid) return
    // A prévia não precisa ser recalculada em todo tick; isso reduz bastante o
    // custo quando há vários jogadores segurando engrenagens.
    if (currentTick % 6 !== 0) return

    /** @type {import('@minecraft/server').ItemStack | undefined} */
    let held
    try { held = player.getComponent("equippable")?.getEquipment(MAINHAND) } catch {}
    if (!held || !SHAFT_ITEMS.has(held.typeId)) {
        removePreview(player.id)
        removeLargeCogwheelDiagonalPreviews(player.id)
        return
    }

    let hit
    try { hit = player.getBlockFromViewDirection({ maxDistance: 7 }) } catch {}
    const shaft = hit?.block
    if (!shaft || !SHAFT_BLOCKS.has(shaft.typeId)) {
        removePreview(player.id)
        removeLargeCogwheelDiagonalPreviews(player.id)
        return
    }

    if (held.typeId === "create:cogwheel" && shaft.typeId === "create:large_cogwheel") {
        removePreview(player.id)
        updateLargeCogwheelDiagonalPreviews(player, shaft)
        return
    }
    removeLargeCogwheelDiagonalPreviews(player.id)

    // Uma cogwheel pequena encaixa na face lateral que foi atingida em outra cogwheel.
    // A posição diagonal é reservada exclusivamente para a large cogwheel.
    const placingLargeInFrontOfCogwheel = held.typeId === "create:large_cogwheel" && shaft.typeId === "create:cogwheel"
    const placingShaftInFrontOfGear = held.typeId === "create:shaft" && (shaft.typeId === "create:cogwheel" || shaft.typeId === "create:large_cogwheel")
    const direction = placingLargeInFrontOfCogwheel || placingShaftInFrontOfGear
        ? getPreviewDirection(shaft, hit?.face, player)
        : getCogwheelSideDirection(shaft, hit?.face) ?? getPreviewDirection(shaft, hit?.face, player)
    if (!isDirection(direction)) return removePreview(player.id)
    const offset = FACE_OFFSETS[direction]
    if (!offset) return removePreview(player.id)

    const targetLocation = {
        x: shaft.location.x + offset.x,
        y: shaft.location.y + offset.y,
        z: shaft.location.z + offset.z
    }
    let targetBlock;
    try { targetBlock = shaft.dimension.getBlock(targetLocation) } catch {}
    if (!targetBlock || (targetBlock.typeId !== "minecraft:air" && !targetBlock.isLiquid)) return removePreview(player.id)

    const previewType = getPreviewEntityType(held.typeId)
    const locationKey = `${targetLocation.x},${targetLocation.y},${targetLocation.z}`
    const stored = previews.get(player.id)
    /** @type {Entity | undefined} */
    let preview = stored?.entity
    // Nunca mova a entidade entre blocos: removemos a prévia antiga e criamos
    // outra no novo alvo, impedindo o efeito de ela "correr" pelo mundo.
    if (stored?.type !== previewType || stored?.locationKey !== locationKey) {
        try { if (preview?.isValid) preview.remove() } catch {}
        preview = undefined
    }
    if (!preview?.isValid) {
        try {
            preview = shaft.dimension.spawnEntity(previewType, {
                x: targetLocation.x + 0.5,
                y: targetLocation.y + 0.5,
                z: targetLocation.z + 0.5
            })
            if (!preview) return
            preview.addTag(`create_shaft_preview:${player.id}`)
            previews.set(player.id, { entity: preview, type: previewType, locationKey, direction })
        } catch { return }
    }

    if (!preview) return
    if (stored?.type === previewType && stored.locationKey === locationKey && stored.direction === direction) return
    try { preview.setProperty("create:cardinal_rotation", direction) } catch {}
    previews.set(player.id, { entity: preview, type: previewType, locationKey, direction })
}

/** @param {Player} player @param {Block | undefined} shaft @param {unknown} hitFace */
export function tryExtendShaft(player, shaft, hitFace) {
    if (!player || !shaft || !SHAFT_BLOCKS.has(shaft.typeId)) return false

    /** @type {import('@minecraft/server').ItemStack | undefined} */
    let held
    try { held = player.getComponent("equippable")?.getEquipment(MAINHAND) } catch {}
    if (!held || !SHAFT_ITEMS.has(held.typeId)) return false
    const sourceIsShaft = shaft.typeId === "create:shaft" || shaft.typeId === "create:shaft.steam_engine"
    const canPlaceShaftInFrontOfGear = held.typeId === "create:shaft" && (shaft.typeId === "create:cogwheel" || shaft.typeId === "create:large_cogwheel")
    if (held.typeId === "create:shaft" && !sourceIsShaft && !canPlaceShaftInFrontOfGear) return false
    const canPlaceLargeInFrontOfCogwheel = held.typeId === "create:large_cogwheel" && shaft.typeId === "create:cogwheel"
    if (!sourceIsShaft && held.typeId !== shaft.typeId && !canPlaceLargeInFrontOfCogwheel && !canPlaceShaftInFrontOfGear) return false

    const direction = canPlaceLargeInFrontOfCogwheel || canPlaceShaftInFrontOfGear
        ? getPreviewDirection(shaft, hitFace, player)
        : getCogwheelSideDirection(shaft, hitFace) ?? getPreviewDirection(shaft, hitFace, player)
    const diagonalOffset = held.typeId === "create:cogwheel" && shaft.typeId === "create:large_cogwheel"
        ? getCogwheelDiagonalPlacementOffset(shaft, hitFace, player)
        : undefined
    if (!diagonalOffset && !isDirection(direction)) return false
    const offset = diagonalOffset ?? FACE_OFFSETS[/** @type {Direction} */ (direction)]
    if (!offset) return false

    const sourceLocation = { ...shaft.location }
    const targetLocation = {
        x: sourceLocation.x + offset.x,
        y: sourceLocation.y + offset.y,
        z: sourceLocation.z + offset.z
    }
    let target
    try { target = shaft.dimension.getBlock(targetLocation) } catch {}
    if (!target || (target.typeId !== "minecraft:air" && !target.isLiquid)) return false

    mc.system.run(() => {
        /** @type {Block | undefined} */
        let source
        /** @type {Block | undefined} */
        let destination
        try {
            source = shaft.dimension.getBlock(sourceLocation)
            destination = shaft.dimension.getBlock(targetLocation)
        } catch { return }
        if (!source || !SHAFT_BLOCKS.has(source.typeId) || !destination || (destination.typeId !== "minecraft:air" && !destination.isLiquid)) return

        const sourceDirectionState = source.typeId === "create:shaft" || source.typeId === "create:shaft.steam_engine"
            ? "minecraft:block_face"
            : "minecraft:facing_direction"
        const destinationDirectionState = held.typeId === "create:shaft" ? "minecraft:block_face" : "minecraft:facing_direction"
        /** @type {unknown} */
        let axis
        try { axis = source.permutation.getAllStates()[sourceDirectionState] } catch {}
        if (typeof axis !== "string") return
        try {
            destination.setType(held.typeId)
            destination.setPermutation(destination.permutation.withState(destinationDirectionState, axis))
        } catch { return }
        consumeHeldShaft(player)
    })
    return true
}

/** @param {Block} shaft @param {unknown} hitFace @param {Player} player @returns {Direction} */
function getPreviewDirection(shaft, hitFace, player) {
    const face = String(hitFace ?? "").toLowerCase()
    const directionState = shaft.typeId === "create:shaft" || shaft.typeId === "create:shaft.steam_engine"
        ? "minecraft:block_face"
        : "minecraft:facing_direction"
    let blockFace
    try { blockFace = String(shaft.permutation.getState(directionState) ?? "north").toLowerCase() } catch {}

    const axisFaces = /** @type {Direction[]} */ (blockFace === "east" || blockFace === "west"
        ? ["east", "west"]
        : blockFace === "up" || blockFace === "down"
            ? ["up", "down"]
            : ["north", "south"])
    if (isDirection(face) && axisFaces.includes(face)) return face    /** @type {Vector3 | undefined} */
    let view
    try { view = player.getViewDirection() } catch {}
    if (axisFaces[0] === "east") return (view?.x ?? 0) >= 0 ? "east" : "west"
    if (axisFaces[0] === "up") return (view?.y ?? 0) >= 0 ? "up" : "down"
    return (view?.z ?? 0) >= 0 ? "south" : "north"
}

/** @param {Block} block @param {unknown} hitFace @returns {Direction | undefined} */
function getCogwheelSideDirection(block, hitFace) {
    if (block.typeId !== "create:cogwheel") return undefined
    const face = String(hitFace ?? "").toLowerCase()
    return isDirection(face) && FACE_OFFSETS[face] ? face : undefined
}

/** @param {string} playerId */
function removePreview(playerId) {
    const preview = previews.get(playerId)?.entity
    previews.delete(playerId)
    try { if (preview?.isValid) preview.remove() } catch {}
}

/** @param {Player} player @param {Block} largeCogwheel */
function updateLargeCogwheelDiagonalPreviews(player, largeCogwheel) {
    const offsets = getLargeCogwheelDiagonalOffsets(largeCogwheel)
    const existing = largeCogwheelDiagonalPreviews.get(player.id) ?? []
    const next = []

    for (let index = 0; index < offsets.length; index++) {
        const offset = offsets[index]
        const location = {
            x: largeCogwheel.location.x + offset.x,
            y: largeCogwheel.location.y + offset.y,
            z: largeCogwheel.location.z + offset.z
        }
        let target
        try { target = largeCogwheel.dimension.getBlock(location) } catch {}
        if (!target || (target.typeId !== "minecraft:air" && !target.isLiquid)) {
            const previous = existing[index]
            try { if (previous?.isValid) previous.remove() } catch {}
            continue
        }

        let hologram = existing[index]
        let created = false
        if (!hologram?.isValid) {
            try {
                hologram = largeCogwheel.dimension.spawnEntity("create:cogwheel_hologram", {
                    x: location.x + 0.5,
                    y: location.y + 0.5,
                    z: location.z + 0.5
                })
                hologram.addTag(`create_large_cogwheel_diagonal:${player.id}:${index}`)
                created = true
            } catch { continue }
        }
        // Hologramas diagonais são estáticos: configure somente quando nascerem.
        if (created && hologram) {
            try { hologram.setProperty("create:cardinal_rotation", getLargeCogwheelFacing(largeCogwheel)) } catch {}
        }
        next[index] = hologram
    }

    for (let index = offsets.length; index < existing.length; index++) {
        const preview = existing[index]
        try { if (preview?.isValid) preview.remove() } catch {}
    }
    largeCogwheelDiagonalPreviews.set(player.id, next)
}

/** @param {Block} cogwheel @param {unknown} hitFace @param {Player} player @returns {Vector3 | undefined} */
function getCogwheelDiagonalPlacementOffset(cogwheel, hitFace, player) {
    const face = String(hitFace ?? "").toLowerCase()
    const facing = getLargeCogwheelFacing(cogwheel)
    let view
    try { view = player.getViewDirection() } catch {}

    if (facing === "east" || facing === "west") {
        if (face === "south" || face === "north") return { x: 0, y: (view?.y ?? 0) >= 0 ? 1 : -1, z: face === "south" ? 1 : -1 }
        if (face === "up" || face === "down") return { x: 0, y: face === "up" ? 1 : -1, z: (view?.z ?? 0) >= 0 ? 1 : -1 }
    } else if (facing === "up" || facing === "down") {
        if (face === "east" || face === "west") return { x: face === "east" ? 1 : -1, y: 0, z: (view?.z ?? 0) >= 0 ? 1 : -1 }
        if (face === "south" || face === "north") return { x: (view?.x ?? 0) >= 0 ? 1 : -1, y: 0, z: face === "south" ? 1 : -1 }
    } else {
        if (face === "east" || face === "west") return { x: face === "east" ? 1 : -1, y: (view?.y ?? 0) >= 0 ? 1 : -1, z: 0 }
        if (face === "up" || face === "down") return { x: (view?.x ?? 0) >= 0 ? 1 : -1, y: face === "up" ? 1 : -1, z: 0 }
    }
    return undefined
}

/** @param {Block} block @returns {Vector3[]} */
function getLargeCogwheelDiagonalOffsets(block) {
    const facing = getLargeCogwheelFacing(block)
    if (facing === "east" || facing === "west") {
        return [{ y: 1, z: 1 }, { y: 1, z: -1 }, { y: -1, z: 1 }, { y: -1, z: -1 }].map(offset => ({ x: 0, ...offset }))
    }
    if (facing === "up" || facing === "down") {
        return [{ x: 1, z: 1 }, { x: 1, z: -1 }, { x: -1, z: 1 }, { x: -1, z: -1 }].map(offset => ({ ...offset, y: 0 }))
    }
    return [{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }].map(offset => ({ ...offset, z: 0 }))
}

/** @param {Block} block */
function getLargeCogwheelFacing(block) {
    try { return String(block.permutation.getState("minecraft:facing_direction") ?? "north").toLowerCase() } catch {}
    return "north"
}

/** @param {string} playerId */
function removeLargeCogwheelDiagonalPreviews(playerId) {
    const previews = largeCogwheelDiagonalPreviews.get(playerId) ?? []
    largeCogwheelDiagonalPreviews.delete(playerId)
    for (const preview of previews) {
        try { if (preview?.isValid) preview.remove() } catch {}
    }
}

/** @param {Player} player */
function consumeHeldShaft(player) {
    try {
        if (player.getGameMode?.() === "Creative") return true
        const equippable = player.getComponent("equippable")
        if (!equippable) return false
        const held = equippable.getEquipment(MAINHAND)
        if (!held || !SHAFT_ITEMS.has(held.typeId)) return false
        if ((held.amount ?? 1) <= 1) equippable.setEquipment(MAINHAND, undefined)
        else {
            const next = held.clone()
            next.amount--
            equippable.setEquipment(MAINHAND, next)
        }
        return true
    } catch {}
    return false
}

/** @param {string} itemId */
function getPreviewEntityType(itemId) {
    if (itemId === "create:cogwheel") return "create:cogwheel_hologram"
    if (itemId === "create:large_cogwheel") return "create:large_cogwheel_hologram"
    return "create:shaft_hologram"
}
