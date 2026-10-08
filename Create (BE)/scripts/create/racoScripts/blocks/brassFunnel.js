import * as mc from "@minecraft/server"
import { ModalFormData } from "@minecraft/server-ui"
import * as racoAPI from "../raco-API.js"
import { getItemVisual } from "../../andrielScripts/blocks/conveyorMovement.js"
import { getCreativeCrateItem } from "./creativeCrate.js"
import { tryExtractMillstoneOutput, tryInsertMillstoneItem } from "./millstone.js"
import { extractItem, getStorageAt, insertItem } from "../../../storage/storage_registry.js"
import { rebuildVaultAt } from "../../../vault/rebuild.js"
import { vaultVisualStructure } from "../../../vault/visual_structure.js"

const BASIN_SLOT_RADIUS  = 0.6;
const BASIN_FLOOR_OFFSET = 0.2;
const FUNNEL_TRANSFER_INTERVAL = 4;
const BELT_OUTPUT_Y = 13 / 16;

// Itens que usam o visual de equipamento precisam do mesmo modo de modelo e
// das mesmas rotações usadas pelo Weighted Ejector. Os demais continuam com
// o visual normal do funil.
function applyEquipmentItemVisual(entity, item) {
    const visual = getItemVisual(item?.typeId ?? "");
    if (!visual?.hand) return;
    try {
        entity.setProperty("create:item_visual", "hand_equipped");
        entity.setProperty("create:rotation_x", 0);
        entity.setProperty("create:rotation_z", 0);
    } catch {}
}

// O filtro visível do Brass Funnel é uma entidade diferente do item da belt.
// Sem este estado ele sempre usa a animação de item comum, fazendo armas e
// ferramentas ficarem tortas/fora do lugar.
function syncFunnelFilterEquipmentVisual(entity, item) {
    const desiredType = getItemVisual(item?.typeId ?? "").hand ? "hand_equipped" : "item";
    try {
        if (entity.getProperty("create:type") !== desiredType) {
            entity.setProperty("create:type", desiredType);
        }
    } catch {}
}

function getBasinSlots(basinBlock) {
    return basinBlock.dimension.getEntities({
        type: "create:conveyor_item",
        location: { x: basinBlock.center().x, y: basinBlock.location.y + BASIN_FLOOR_OFFSET, z: basinBlock.center().z },
        maxDistance: BASIN_SLOT_RADIUS
    }).filter(e => e?.isValid);
}

function getConveyorItemStack(entity) {
    return entity?.getComponent("inventory")?.container?.getItem(0) ?? null;
}

function basinHasItemType(basinBlock, typeId) {
    if (!typeId) return false;
    return getBasinSlots(basinBlock).some(slot => getConveyorItemStack(slot)?.typeId === typeId);
}

function randomBasinPos(basinBlock) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.18;
    return {
        x: basinBlock.center().x + Math.cos(a) * r,
        y: basinBlock.location.y + BASIN_FLOOR_OFFSET,
        z: basinBlock.center().z + Math.sin(a) * r
    };
}

function hasSurfaceItem(block) {
    if (!block) return false
    const items = block.dimension.getEntities({
        type: "create:conveyor_item",
        location: block.center(),
        maxDistance: 0.55
    })
    return items.some(entity => {
        try { if (entity.hasTag("create_depot_visual")) return false } catch {}
        return entity?.isValid
    })
}

function canOutputFromFunnel(block) {
    const targets = getOutputTargets(block);
    if (targets.length === 0) return true;
    return targets.some(target => !hasSurfaceItem(target));
}

function getOutputTargets(block) {
    const below = getAdjacentBlock(block, "down")
    const targets = []
    if (below?.typeId === "create:mechanical_belt" || below?.typeId === "create:depot") targets.push(below)
    return targets
}

function outputToSurface(block, targetBlock, item) {
    if (!targetBlock || !item || hasSurfaceItem(targetBlock)) return false
    const pos = {
        x: targetBlock.center().x,
        y: targetBlock.y + BELT_OUTPUT_Y,
        z: targetBlock.center().z
    }
    try {
        const conveyorItem = block.dimension.spawnEntity("create:conveyor_item", pos)
        conveyorItem.setProperty("create:rotation_y", Math.random() * 360)
        racoAPI.setItemInHand(item, conveyorItem, "Mainhand", 0, "create:item_visual")
        applyEquipmentItemVisual(conveyorItem, item)
        if (targetBlock.typeId === "create:depot") conveyorItem.addTag("create:conveyor_stop")
        return true
    } catch {}
    return false
}

function outputItemFromFunnel(block, item, fallbackLocation, allowFallbackDrop = true) {
    if (!item) return false

    const targets = getOutputTargets(block)
    for (const target of targets) {
        if (outputToSurface(block, target, item)) return true
    }

    if (targets.length > 0 && !allowFallbackDrop) return false

    if (!allowFallbackDrop) return false
    try {
        const s = block.dimension.spawnItem(item, fallbackLocation)
        if (s?.isValid) s.clearVelocity()
        return true
    } catch {}
    return false
}

// Offset toward belt face (cardinal direction)
const FACE_OFFSET = {
    north: { x: 0, z: -0.1 },
    south: { x: 0, z:  0.1 },
    east:  { x:  0.1, z: 0 },
    west:  { x: -0.1, z: 0 }
}

const INVERT_FACE = { north: "south", south: "north", east: "west", west: "east" }

function getFunnelEntity(block) {
    const entities = block.dimension.getEntities({
        type: "create:brass_funnel_entity",
        location: block.center(),
        maxDistance: 0.5
    }).filter(entity => entity?.isValid)
    if (entities.length <= 1) return entities[0] ?? null

    // Ao recarregar um mundo, o tick pode criar uma entidade vazia antes de
    // a entidade persistente (com o filtro) terminar de carregar. Mantém a
    // que possui o item do filtro e remove as cópias visuais.
    const keeper = entities.find(entity => {
        try { return !!entity.getComponent("inventory")?.container?.getItem(0) } catch { return false }
    }) ?? entities[0]
    for (const entity of entities) {
        if (entity === keeper) continue
        try { entity.remove() } catch {}
    }
    return keeper
}

function spawnFunnelEntity(block) {
    const existing = getFunnelEntity(block)
    if (existing) return existing
    const entity = block.dimension.spawnEntity("create:brass_funnel_entity", block.center())
    const cardinal = block.permutation.getState("minecraft:cardinal_direction")
    entity.setProperty("create:cardinal_rotation", cardinal)
    return entity
}

function getBlockToward(block, face, steps = 1) {
    switch (face) {
        case "north": return block.north(steps)
        case "south": return block.south(steps)
        case "east":  return block.east(steps)
        case "west":  return block.west(steps)
    }
    return null
}

function getAdjacentBlock(block, face) {
    try {
        if (face === "up") return block.above()
        if (face === "down") return block.below()
        return getBlockToward(block, face)
    } catch {
        return null
    }
}

function getStorageBlockForFunnel(block, preferredFace) {
    const preferred = getAdjacentBlock(block, preferredFace)
    if (preferred?.typeId === "create:vault") return preferred
    if (preferred?.getComponent?.("minecraft:inventory") || preferred?.typeId === "create:basin" || preferred?.typeId === "create:millstone") return preferred

    for (const face of ["north", "south", "east", "west"]) {
        if (face === preferredFace) continue
        const adjacent = getAdjacentBlock(block, face)
        if (adjacent?.typeId === "create:vault") return adjacent
    }
    return preferred
}

function getVaultStorage(block) {
    if (block?.typeId !== "create:vault") return null
    const storage = getStorageAt(block.location, vaultVisualStructure, block.dimension)
    if (storage) return storage

    try {
        const rebuilt = rebuildVaultAt(block, vaultVisualStructure)
        if (rebuilt?.storage) return rebuilt.storage
    } catch {}

    return getStorageAt(block.location, vaultVisualStructure, block.dimension) ?? null
}

function vaultItemFilter(filterItem, invertFilter) {
    if (!filterItem) return undefined
    return item => {
        const match = item?.typeId === filterItem.typeId
        return invertFilter ? !match : match
    }
}

function tryInsertVaultItem(vaultBlock, item) {
    if (!item) return false
    const storage = getVaultStorage(vaultBlock)
    if (!storage) return false
    return insertItem(storage.id, item, item.amount)
}

function tryExtractVaultItem(vaultBlock, filterItem, invertFilter, amount = 1, exact = false) {
    const storage = getVaultStorage(vaultBlock)
    if (!storage) return undefined
    const filterTypeId = filterItem?.typeId
    const item = extractItem(storage.id, filterTypeId, amount)
    if (exact && item && item.amount < amount) {
        insertItem(storage.id, item, item.amount)
        return undefined
    }
    return item
}

function returnVaultItem(vaultBlock, item) {
    if (!item) return false
    const storage = getVaultStorage(vaultBlock)
    if (!storage) return false
    return insertItem(storage.id, item, item.amount)
}

function getExtractionSettings(entity) {
    let amount = 1
    let exact = false
    try {
        amount = Number(entity?.getDynamicProperty("create:brass_funnel_extract_amount") ?? 1)
        exact = entity?.getDynamicProperty("create:brass_funnel_extract_exact") === true
    } catch {}
    return {
        amount: Math.max(1, Math.min(64, Math.round(amount) || 1)),
        exact
    }
}

function splitExtractionStack(item, amount, exact) {
    if (!item || (exact && item.amount < amount)) return null
    const takenAmount = Math.min(item.amount, amount)
    const firstItem = item.clone()
    firstItem.amount = takenAmount
    let secondItem
    if (item.amount > takenAmount) {
        secondItem = item.clone()
        secondItem.amount = item.amount - takenAmount
    }
    return { firstItem, secondItem }
}

function showBrassFunnelAmountMenu(block, player) {
    const entity = getFunnelEntity(block)
    if (!entity?.isValid) return

    const initial = getExtractionSettings(entity)
    const blockLocation = { ...block.location }
    const dimension = block.dimension
    const form = new ModalFormData()

    form.title({ rawtext: [{ text: "create:funnel." }, { translate: "create.ui.funnel.title" }] })
    form.toggle({ translate: "create.ui.funnel.exact" }, { defaultValue: initial.exact })
    form.slider({ translate: "create.ui.funnel.amount" }, 1, 64, {
        defaultValue: initial.amount
    })
    form.submitButton({ translate: "creative_motor.confirm.text" })
    form.show(player).then(response => {
        if (response.canceled || !response.formValues) return
        const currentBlock = dimension.getBlock(blockLocation)
        if (!currentBlock || currentBlock.typeId !== "create:brass_funnel") return
        const currentEntity = getFunnelEntity(currentBlock)
        if (!currentEntity?.isValid) return

        const [exact, amount] = response.formValues
        if (typeof exact !== "boolean" || typeof amount !== "number" || !Number.isFinite(amount) || amount < 1 || amount > 64) return
        try {
            currentEntity.setDynamicProperty("create:brass_funnel_extract_exact", exact === true)
            currentEntity.setDynamicProperty(
                "create:brass_funnel_extract_amount",
                Math.max(1, Math.min(64, Math.round(Number(amount) || 1)))
            )
        } catch {
            return
        }
        try {
            player.playSound("beacon.power", {
                pitch: 1.6,
                volume: 0.35,
                location: currentBlock.center()
            })
        } catch {}
    }).catch(error => console.warn(`[Create] Brass funnel form failed: ${error}`))
}

function shouldProcessFunnel(block) {
    return true
}

export function tryInsertItemFromArmIntoFunnel(block, item) {
    if (!block || !["create:brass_funnel", "create:andesite_funnel"].includes(block.typeId) || !item) return false

    const cardinal = block.permutation.getState("minecraft:cardinal_direction")
    const storageFace = INVERT_FACE[cardinal]
    const storageBlock = getStorageBlockForFunnel(block, storageFace)
    if (!storageBlock) return false

    let entity = getFunnelEntity(block)
    if (!entity) entity = spawnFunnelEntity(block)
    const filterItem = entity?.getComponent("inventory")?.container?.getItem(0) ?? null
    const invertFilter = block.permutation.getState("create:on") && filterItem !== null
    if (filterItem) {
        const match = item.typeId === filterItem.typeId
        if (invertFilter ? match : !match) return false
    }

    if (storageBlock.typeId === "create:vault") return tryInsertVaultItem(storageBlock, item)
    if (storageBlock.typeId === "create:millstone") return tryInsertMillstoneItem(storageBlock, item)

    const inv = storageBlock.getComponent("minecraft:inventory")
    if (!inv) return false
    const leftover = inv.container.addItem(item)
    return !leftover
}

function grabItemFromLoc(dimension, loc, filterItem, invertFilter) {
    const filterType = filterItem?.typeId ?? null
    function passes(typeId) {
        if (!filterType) return true
        return invertFilter ? typeId !== filterType : typeId === filterType
    }
    // Ground items
    for (const ent of dimension.getEntities({ type: "minecraft:item", location: loc, maxDistance: 0.5 })) {
        if (!ent.isValid) continue
        const stack = ent.getComponent("minecraft:item")?.itemStack
        if (!stack) continue
        if (!passes(stack.typeId)) continue
        const taken = stack.clone()
        taken.amount = 1
        if (stack.amount > 1) {
            const rest = stack.clone()
            rest.amount = stack.amount - 1
            const s = dimension.spawnItem(rest, ent.location)
            if (s?.isValid) s.clearVelocity()
        }
        ent.remove()
        return taken
    }
    // Conveyor items
    for (const ent of dimension.getEntities({ type: "create:conveyor_item", location: loc, maxDistance: 0.5 })) {
        if (!ent.isValid) continue
        const container = ent.getComponent("inventory")?.container
        const stack = container?.getItem(0)
        if (!stack) continue
        if (!passes(stack.typeId)) continue
        const taken = stack.clone()
        taken.amount = 1
        racoAPI.clearItem(container, 0, 1)
        if (stack.amount <= 1) ent.remove()
        return taken
    }
    return null
}

function peekItemTypeFromLoc(dimension, loc, filterItem, invertFilter) {
    const filterType = filterItem?.typeId ?? null
    function passes(typeId) {
        if (!filterType) return true
        return invertFilter ? typeId !== filterType : typeId === filterType
    }

    for (const ent of dimension.getEntities({ type: "minecraft:item", location: loc, maxDistance: 0.5 })) {
        if (!ent.isValid) continue
        const stack = ent.getComponent("minecraft:item")?.itemStack
        if (stack && passes(stack.typeId)) return stack.typeId
    }

    for (const ent of dimension.getEntities({ type: "create:conveyor_item", location: loc, maxDistance: 0.5 })) {
        if (!ent.isValid) continue
        const stack = getConveyorItemStack(ent)
        if (stack && passes(stack.typeId)) return stack.typeId
    }

    return null
}

export function brassFunnelTick(block) {
    if (!shouldProcessFunnel(block)) return
    let entity = getFunnelEntity(block) ?? spawnFunnelEntity(block)
    setIfParallel(block)
    block = block.dimension.getBlock(block.location) ?? block
    const on = block.permutation.getState("create:on")

    const cardinal   = block.permutation.getState("minecraft:cardinal_direction")
    const isInput    = block.permutation.getState("create:input")
    const isParallel = block.permutation.getState("create:parallel")
    entity = getFunnelEntity(block) ?? entity
    const filterItem = entity?.getComponent("inventory")?.container?.getItem(0) ?? null
    syncFunnelFilterEquipmentVisual(entity, filterItem)
    // on=true: invert filter (blacklist). on=false: normal whitelist
    const invertFilter = on && filterItem !== null

    // Parallel mode: items slide directly below the funnel
    // Non-parallel mode: items come from the belt in the funnel's facing direction
    const fOff = isParallel ? { x: 0, z: 0 } : (FACE_OFFSET[cardinal] ?? { x: 0, z: 0 })
    const beltLoc = {
        x: block.center().x + fOff.x,
        y: block.center().y - 0.75,
        z: block.center().z + fOff.z
    }

    // Storage side: behind the funnel (opposite of cardinal)
    const storageFace  = INVERT_FACE[cardinal]
    const storageBlock = getStorageBlockForFunnel(block, storageFace)

    if (isInput) {
        // INPUT: belt → storage
        // Basin: push item into conveyor_items
        if (storageBlock?.typeId === "create:basin") {
            const bSlots = getBasinSlots(storageBlock);
            if (bSlots.length >= 8) return;
            const nextType = peekItemTypeFromLoc(block.dimension, beltLoc, filterItem, invertFilter);
            if (!nextType || basinHasItemType(storageBlock, nextType)) return;
            const grabbed = grabItemFromLoc(block.dimension, beltLoc, filterItem, invertFilter);
            if (!grabbed) return;
            const convSlot = block.dimension.spawnEntity("create:conveyor_item", randomBasinPos(storageBlock));
            convSlot.setProperty("create:rotation_y", Math.random() * 360);
            racoAPI.setItemInHand(grabbed, convSlot, "Mainhand", 0, "create:item_visual");
            applyEquipmentItemVisual(convSlot, grabbed);
            return;
        }
        if (storageBlock?.typeId === "create:millstone") {
            const grabbed = grabItemFromLoc(block.dimension, beltLoc, filterItem, invertFilter)
            if (!grabbed) return
            if (!tryInsertMillstoneItem(storageBlock, grabbed)) {
                const s = block.dimension.spawnItem(grabbed, beltLoc)
                if (s?.isValid) s.clearVelocity()
            }
            return
        }
        if (storageBlock?.typeId === "create:vault") {
            const grabbed = grabItemFromLoc(block.dimension, beltLoc, filterItem, invertFilter)
            if (!grabbed) return
            if (!tryInsertVaultItem(storageBlock, grabbed)) {
                const s = block.dimension.spawnItem(grabbed, beltLoc)
                if (s?.isValid) s.clearVelocity()
            }
            return
        }
        const item = grabItemFromLoc(block.dimension, beltLoc, filterItem, invertFilter)
        if (!item) return
        const inv = storageBlock?.getComponent("minecraft:inventory")
        if (!inv) {
            const s = block.dimension.spawnItem(item, beltLoc)
            if (s?.isValid) s.clearVelocity()
            return
        }
        const leftover = inv.container.addItem(item)
        if (leftover) {
            const s = block.dimension.spawnItem(leftover, beltLoc)
            if (s?.isValid) s.clearVelocity()
        }
    } else {
        // OUTPUT: storage → belt
        const centerLoc = { x: block.center().x, y: block.center().y - 0.75, z: block.center().z }
        const allowFallbackDrop = getOutputTargets(block).length === 0
        const extraction = getExtractionSettings(entity)
        if (!canOutputFromFunnel(block)) return
        if (storageBlock?.typeId === "create:crate_creative") {
            const item = getCreativeCrateItem(storageBlock, extraction.amount)
            if (!item) return
            if (filterItem) {
                const match = item.typeId === filterItem.typeId
                if (invertFilter ? match : !match) return
            }
            outputItemFromFunnel(block, item, centerLoc, allowFallbackDrop)
            return
        }
        if (storageBlock?.typeId === "create:vault") {
            const item = tryExtractVaultItem(
                storageBlock,
                filterItem,
                invertFilter,
                extraction.amount,
                extraction.exact
            )
            if (!item) return
            if (!outputItemFromFunnel(block, item, centerLoc, allowFallbackDrop)) returnVaultItem(storageBlock, item)
            return
        }
        const inv = storageBlock?.getComponent("minecraft:inventory")
        if (inv) {
            const container = inv.container
            for (let i = 0; i < container.size; i++) {
                const item = container.getItem(i)
                if (!item) continue
                if (filterItem) {
                    const match = item.typeId === filterItem.typeId
                    if (invertFilter ? match : !match) continue
                }
                const separated = splitExtractionStack(item, extraction.amount, extraction.exact)
                if (!separated?.firstItem) continue
                const toSpawn = separated.firstItem
                racoAPI.clearItem(container, i, toSpawn.amount)
                if (!outputItemFromFunnel(block, toSpawn, centerLoc, allowFallbackDrop)) {
                    const current = container.getItem(i)
                    if (!current) container.setItem(i, toSpawn)
                    else container.addItem(toSpawn)
                }
                break
            }
        } else if (storageBlock?.typeId === "create:mechanical_belt" || storageBlock?.typeId === "create:depot") {
            const convItems = block.dimension.getEntities({ type: "create:conveyor_item", location: storageBlock.center(), maxDistance: 0.5 })
            for (const convEnt of convItems) {
                const c = convEnt.getComponent("inventory")?.container
                const item = c?.getItem(0)
                if (!item) continue
                if (filterItem) {
                    const match = item.typeId === filterItem.typeId
                    if (invertFilter ? match : !match) continue
                }
                const separated = splitExtractionStack(item, extraction.amount, extraction.exact)
                if (separated?.firstItem) {
                    if (!outputItemFromFunnel(block, separated.firstItem, centerLoc, allowFallbackDrop)) return
                }
                if (separated?.secondItem) c.setItem(0, separated.secondItem)
                else convEnt.remove()
                break
            }
        } else if (storageBlock?.typeId === "create:basin") {
            // OUTPUT: basin conveyor_items → belt
            const bSlots = getBasinSlots(storageBlock);
            for (const slot of bSlots) {
                const c = slot.getComponent("inventory")?.container;
                const item = c?.getItem(0);
                if (!item) continue;
                if (filterItem) {
                    const match = item.typeId === filterItem.typeId;
                    if (invertFilter ? match : !match) continue;
                }
                const separated = splitExtractionStack(item, extraction.amount, extraction.exact);
                if (separated?.firstItem) {
                    if (!outputItemFromFunnel(block, separated.firstItem, centerLoc, allowFallbackDrop)) return;
                }
                if (separated?.secondItem) c.setItem(0, separated.secondItem);
                else slot.remove();
                break;
            }
        } else if (storageBlock?.typeId === "create:millstone") {
            if (extraction.exact && extraction.amount > 1) return
            const item = tryExtractMillstoneOutput(storageBlock, filterItem, invertFilter)
            if (!item) return
            outputItemFromFunnel(block, item, centerLoc, allowFallbackDrop)
        }
    }
}

export function brassFunnelInteract(block, player, item) {
    let entity = getFunnelEntity(block)
    if (!entity) entity = spawnFunnelEntity(block)

    if (block.typeId === "create:andesite_funnel" && item?.typeId !== "create:wrench") return

    const container = entity.getComponent("inventory")?.container
    if (!container) return

    if (item?.typeId === "create:wrench") {
        const nextInput = !block.permutation.getState("create:input")
        racoAPI.setPermutation(block, "create:input", nextInput)
        player.onScreenDisplay.setActionBar(
            nextInput ? "§aFunnel: Input" : "§eFunnel: Output"
        )
        return
    }

    if (player.isSneaking) {
        const filter = container.getItem(0)
        if (filter) {
            container.setItem(0, undefined)
            entity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air")
            syncFunnelFilterEquipmentVisual(entity, null)
        }
        return
    }

    if (!item) {
        showBrassFunnelAmountMenu(block, player)
        return
    }

    if (item) {
        racoAPI.setItemInHand(item, entity, "Mainhand", 0, "create:type")
        syncFunnelFilterEquipmentVisual(entity, item)
    }
}

export function brassFunnelPlace(block) {
    spawnFunnelEntity(block)
    setIfParallel(block)
}

export function brassFunnelBreak(block, dimension = block?.dimension) {
    const center = block?.center?.()
    if (!dimension || !center) return

    for (const entity of dimension.getEntities({
        type: "create:brass_funnel_entity",
        location: center,
        maxDistance: 0.75
    })) {
        try { entity.remove() } catch {}
    }
}

export function brassFunnelRedstone(block, powerLevel) {
    const hasPower = powerLevel > 0
    const on = block.permutation.getState("create:on")
    if (on !== hasPower) racoAPI.setPermutation(block, "create:on", hasPower)
}

function setIfParallel(block) {
    const direction = block.permutation.getState("minecraft:cardinal_direction")
    const below = block.below?.()
    let isParallel = false

    if (below && below.typeId === "create:mechanical_belt") {
        const belowFace = below.permutation.getState?.("minecraft:block_face")
        if (belowFace) {
            // Parallel = funnel axis !== belt axis
            isParallel = racoAPI.convergeDirection(direction) !== racoAPI.convergeDirection(belowFace)

            if (false && isParallel) {
                // Auto-set input/output based on belt RPM direction
                const beltEntity = below.dimension.getEntities({
                    type: "create:mechanical_belt_entity",
                    location: below.center(),
                    maxDistance: 0.4
                })[0]
                const rpm = beltEntity?.getProperty("create:rpm") ?? 0
                if (rpm !== 0) {
                    const rpmPositive = rpm > 0
                    const currentInput = block.permutation.getState("create:input")
                    // north/east: items move toward funnel when RPM < 0 → INPUT
                    // south/west: items move toward funnel when RPM > 0 → INPUT
                    const targetInput = (direction === "north" || direction === "east")
                        ? !rpmPositive
                        : rpmPositive
                    if (currentInput !== targetInput) {
                        racoAPI.setPermutation(block, "create:input", targetInput)
                    }
                }
            }
        }
    }

    const wasParallel = block.permutation.getState("create:parallel")
    if (wasParallel !== isParallel) {
        racoAPI.setPermutation(block, "create:parallel", isParallel)
    }
    const entity = getFunnelEntity(block)
    entity?.setProperty("create:parallel", isParallel)
}
