import * as mc from "@minecraft/server"
import * as racoAPI from "../raco-API.js"

// Offset from block.center() to the mouth of each side opening
const SPAWN_POINT = {
    north: { x:    0, y: -0.75, z: -0.7 },
    south: { x:    0, y: -0.75, z:  0.7 },
    east:  { x:  0.7, y: -0.75, z:    0 },
    west:  { x: -0.7, y: -0.75, z:    0 },
}

function syncTunnelEquipmentVisual(entity, face, slot) {
    const item = entity?.getComponent("inventory")?.container?.getItem(slot)
    const visual = racoAPI.isHandEquippedFilterItem(item?.typeId) ? "hand_equipped" : "item"
    try {
        if (entity?.getProperty(`create:type_${face}`) !== visual) {
            entity.setProperty(`create:type_${face}`, visual)
        }
    } catch {}
}

export function brassTunnelTick(block) {
    if (!block?.dimension) return
    const dim    = block.dimension
    const center = block.center()

    // --- Ensure exactly one entity of each type ---
    const entitiesX = dim.getEntities({ type: "create:brass_tunnel_entity_x", location: center, maxDistance: 0.5 })
    const entitiesZ = dim.getEntities({ type: "create:brass_tunnel_entity_z", location: center, maxDistance: 0.5 })
    let entityX = entitiesX[0]
    let entityZ = entitiesZ[0]
    for (let i = 1; i < entitiesX.length; i++) entitiesX[i]?.remove()
    for (let i = 1; i < entitiesZ.length; i++) entitiesZ[i]?.remove()

    if (mc.system.currentTick % 10 === 0) {
        if (!entityX) entityX = dim.spawnEntity("create:brass_tunnel_entity_x", center)
        if (!entityZ) entityZ = dim.spawnEntity("create:brass_tunnel_entity_z", center)

        // Every 20 ticks: update port directions based on adjacent belt RPM
        if (mc.system.currentTick % 20 === 0) {
            for (const face of ["north", "south", "east", "west"]) {
                const adjacentBeltBlock = block[face]()?.below?.()
                if (adjacentBeltBlock?.typeId !== "create:mechanical_belt") continue

                const beltEntity = dim.getEntities({
                    type: "create:mechanical_belt_entity",
                    location: racoAPI.blockFloorCenter(adjacentBeltBlock),
                    maxDistance: 0.5
                })[0]
                const rpm = beltEntity?.getProperty("create:rpm") ?? 0

                let port = "input"
                if (((face === "south" || face === "west") && rpm < 0) ||
                    ((face === "north" || face === "east") && rpm > 0)) {
                    port = "output"
                }

                const which = racoAPI.convergeDirection(face) === "west" ? entityX : entityZ
                which?.setProperty(`create:${face}_port`, port)
            }
        }
    }

    if (!entityX || !entityZ) return

    syncTunnelEquipmentVisual(entityZ, "north", 0)
    syncTunnelEquipmentVisual(entityZ, "south", 1)
    syncTunnelEquipmentVisual(entityX, "west", 0)
    syncTunnelEquipmentVisual(entityX, "east", 1)

    // --- Determine input/output faces ---
    const faceDefs = {
        north: entityZ?.getProperty("create:north_port"),
        south: entityZ?.getProperty("create:south_port"),
        east:  entityX?.getProperty("create:east_port"),
        west:  entityX?.getProperty("create:west_port"),
    }
    const inputFaces  = Object.keys(faceDefs).filter(f => faceDefs[f] === "input")
    const outputFaces = Object.keys(faceDefs).filter(f => faceDefs[f] === "output")
    if (inputFaces.length === 0 || outputFaces.length === 0) return

    // --- Items on the main belt below ---
    const belowBlock = block.below()
    const belowLoc = belowBlock?.typeId === "create:mechanical_belt"
        ? racoAPI.blockFloorCenter(block) : undefined
    const belowItems = belowLoc
        ? dim.getEntities({ type: "create:conveyor_item", location: belowLoc, maxDistance: 0.55 })
        : []
    if (!belowLoc || belowItems.length === 0) return

    const processedBelow = new Set()

    // Memoized filter check
    const filterMemo = new Map()
    const isIncluded = (typeId, ent, slot) => {
        if (!typeId || !ent) return false
        const key = `${ent.id}|${slot}|${typeId}`
        if (filterMemo.has(key)) return filterMemo.get(key)
        const ok = racoAPI.idIncludedInFilter(typeId, ent, slot)
        filterMemo.set(key, ok)
        return ok
    }

    // Pre-calculate output descriptors
    const outputDescs = outputFaces.map(outFace => {
        const outEnt  = racoAPI.convergeDirection(outFace) === "west" ? entityX : entityZ
        const outSlot = (outFace === "north" || outFace === "west") ? 1 : 0
        const filterItem = outEnt?.getComponent("inventory")?.container?.getItem(outSlot)
        const hasFilter  = !!(filterItem?.typeId && filterItem.typeId !== "minecraft:air")
        const hasBelt    = block[outFace]()?.below?.()?.typeId === "create:mechanical_belt"
        return { face: outFace, ent: outEnt, slot: outSlot, hasFilter, hasBelt }
    })

    // --- Process each input face ---
    for (const face of inputFaces) {
        const whichEntity = racoAPI.convergeDirection(face) === "west" ? entityX : entityZ
        const whichSlot   = (face === "north" || face === "west") ? 1 : 0

        // Items arriving at this input mouth
        const spawnLoc = {
            x: center.x + SPAWN_POINT[face].x,
            y: center.y + SPAWN_POINT[face].y,
            z: center.z + SPAWN_POINT[face].z,
        }
        const conveyorItems = dim.getEntities({ type: "create:conveyor_item", location: spawnLoc, maxDistance: 0.5 })

        let hasAnyValidInputItem = false
        for (const ci of conveyorItems) {
            if (!ci?.isValid) continue
            const stack = ci?.getComponent("inventory")?.container?.getItem(0)
            if (!stack?.typeId || !isIncluded(stack.typeId, whichEntity, whichSlot)) {
                ci?.addTag("create:conveyor_stop")
                continue
            }
            hasAnyValidInputItem = true
        }
        if (!hasAnyValidInputItem) continue

        // Route matching below-belt items to an output
        for (const belowItem of belowItems) {
            if (processedBelow.has(belowItem.id)) continue
            processedBelow.add(belowItem.id)

            const belowStack = belowItem.getComponent("inventory")?.container?.getItem(0)
            if (!belowStack?.typeId) continue

            if (!isIncluded(belowStack.typeId, whichEntity, whichSlot)) {
                belowItem?.addTag("create:conveyor_stop")
                continue
            }

            // Specific-filter output has priority over catch-all
            let chosen = null, fallback = null
            for (const out of outputDescs) {
                if (!out?.ent || !isIncluded(belowStack.typeId, out.ent, out.slot)) continue
                if (out.hasFilter) { chosen = out; break }
                else if (!fallback) fallback = out
            }
            chosen = chosen ?? fallback

            if (chosen) {
                const separated = racoAPI.separeItemStack(belowStack, 1)
                const movedStack = separated?.firstItem
                if (!movedStack) continue

                const outLoc = {
                    x: center.x + SPAWN_POINT[chosen.face].x,
                    y: center.y + SPAWN_POINT[chosen.face].y,
                    z: center.z + SPAWN_POINT[chosen.face].z,
                }
                if (chosen.hasBelt) {
                    const newItem = dim.spawnEntity("create:conveyor_item", outLoc)
                    racoAPI.setItemInHand(movedStack, newItem, "Mainhand", 0, "create:item_visual")
                    newItem?.teleport(outLoc)
                } else {
                    const dropped = dim.spawnItem(movedStack, outLoc)
                    dropped?.clearVelocity()
                }
                if (separated?.secondItem) {
                    racoAPI.setItemInHand(separated.secondItem, belowItem, "Mainhand", 0, "create:item_visual")
                } else {
                    belowItem?.remove()
                }
            } else {
                belowItem?.addTag("create:conveyor_stop")
            }
        }
    }
}

export function brassTunnelInteract(block, player, face, item) {
    // invertFace: clicking North face → filter is for items coming FROM north → "north" slot
    const faceDir = racoAPI.invertFace(racoAPI.blockFaceToDirection(face))
    const dim     = block.dimension
    const center  = block.center()

    let entityX = dim.getEntities({ type: "create:brass_tunnel_entity_x", location: center, maxDistance: 0.5 })[0]
    let entityZ = dim.getEntities({ type: "create:brass_tunnel_entity_z", location: center, maxDistance: 0.5 })[0]
    if (!entityX) entityX = dim.spawnEntity("create:brass_tunnel_entity_x", center)
    if (!entityZ) entityZ = dim.spawnEntity("create:brass_tunnel_entity_z", center)

    const whichEntity  = racoAPI.convergeDirection(faceDir) === "west" ? entityX : entityZ
    const whichSlotName = (faceDir === "north" || faceDir === "west") ? "mainhand" : "offhand"
    const whichSlot    = (faceDir === "north" || faceDir === "west") ? 0 : 1

    if (item && !player?.isSneaking) {
        racoAPI.setItemInHand(item, whichEntity, whichSlotName, whichSlot, `create:type_${faceDir}`)
    } else {
        whichEntity?.getComponent("inventory")?.container?.setItem(whichSlot, undefined)
        whichEntity?.runCommand(`replaceitem entity @s slot.weapon.${whichSlotName} 0 minecraft:air`)
    }
}

export function brassTunnelPlace(block) {
    const center = block.center()
    block.dimension.spawnEntity("create:brass_tunnel_entity_x", center)
    block.dimension.spawnEntity("create:brass_tunnel_entity_z", center)
}
