import * as mc from "@minecraft/server"
import * as racoAPI from "../raco-API"
import { getItemVisual } from "../../andrielScripts/blocks/conveyorMovement.js"
import { ADDON_CRAFTING_RECIPES, ADDON_SHAPELESS_CRAFTING_RECIPES } from "./mechanicalCrafterAddonRecipes.js"
import { VANILLA_CRAFTING_RECIPES } from "./mechanicalCrafterVanillaRecipes.js"
import { compatibilityRecipes } from "../../compatibility/registries.js"

const CRAFTER_ITEM_TAG = "create_mechanical_crafter_item"
const CRAFTER_MOVING_ITEM_TAG = "create_mechanical_crafter_item_moving"
const CRAFTER_ITEM_ENTITY = "create:mechanical_crafter_item"
const CRAFTER_RPM_ENTITY = "create:mechanical_crafter_entity"
const CRAFTER_ITEM_Y = 0.38
const CRAFTER_ITEM_SIGNATURE = "create:mechanical_crafter_item_signature"
const CRAFTER_ITEM_VISUAL_VERSION = "frame_item_fake_tools_split_north_v1"
const CRAFTER_TYPE = "create:mechanical_crafter"
const CRAFTER_CRAFT_RADIUS = 4
const CRAFTER_CRAFT_BASE_ANIMATION_RPM = 16
const CRAFTER_CRAFT_BASE_ANIMATION_TICKS = 125
const CRAFTER_CRAFT_MIN_ANIMATION_TICKS = 34
const CRAFTER_CRAFT_MAX_ANIMATION_TICKS = 260
const CRAFTER_OUTPUT_SHRINK_TICKS = 18
const CRAFTER_OUTPUT_GROW_TICKS = 30
const CRAFTER_OUTPUT_PROCESS_TICKS = CRAFTER_OUTPUT_SHRINK_TICKS + CRAFTER_OUTPUT_GROW_TICKS
const CRAFTER_ITEM_SPACING = 0.09
const CRAFTER_RECIPE_IMAGE_SPACING = 0.165
const CRAFTER_RECIPE_IMAGE_ITEM_SCALE = 0.52
const CRAFTER_RECIPE_IMAGE_HOLD_TICKS = 20
const CRAFTER_CRAFT_CHECK_INTERVAL = 12
const CRAFTER_RECIPE_INPUT_DEBOUNCE_TICKS = 20
const CRAFTER_OUTPUT_UPDATE_INTERVAL = 200
const CRAFTER_HOPPER_INPUT_INTERVAL = 8
const CRAFTER_VISUAL_SYNC_INTERVAL = 6
const CRAFTER_SLOT_MAX_AMOUNT = 1
const ACTIVE_CRAFTER_CRAFTS = new Set()
const CRAFTER_CRAFT_CHECK_TICKS = new Map()
const CRAFTER_HOPPER_INPUT_TICKS = new Map()
const CRAFTER_VISUAL_SYNC_TICKS = new Map()
const CRAFTER_OUTPUT_UPDATE_TICKS = new Map()
const CRAFTER_RECIPE_SIGNATURES = new Map()
const CRAFTER_RECIPE_DEBOUNCE_TICKS = new Map()
const GUIDE_DIRECTIONS = ["right", "down", "left", "up"]

const EXTRA_CRAFTING_RECIPES = [
    {
        pattern: [
            " AAA ",
            "AACAA",
            "ACBCA",
            "AACAA",
            " AAA "
        ],
        keys: {
            A: "create:andesite_alloy",
            C: {
                ids: [
                    "minecraft:oak_planks",
                    "minecraft:spruce_planks",
                    "minecraft:birch_planks",
                    "minecraft:jungle_planks",
                    "minecraft:acacia_planks",
                    "minecraft:dark_oak_planks",
                    "minecraft:mangrove_planks",
                    "minecraft:cherry_planks",
                    "minecraft:bamboo_planks",
                    "minecraft:crimson_planks",
                    "minecraft:warped_planks"
                ],
                suffixes: ["_planks"]
            },
            B: {
                ids: [
                    "minecraft:stone",
                    "minecraft:smooth_stone",
                    "minecraft:cobblestone",
                    "minecraft:mossy_cobblestone",
                    "minecraft:granite",
                    "minecraft:polished_granite",
                    "minecraft:diorite",
                    "minecraft:polished_diorite",
                    "minecraft:andesite",
                    "minecraft:polished_andesite",
                    "minecraft:deepslate",
                    "minecraft:cobbled_deepslate",
                    "minecraft:tuff",
                    "minecraft:calcite",
                    "minecraft:dripstone_block",
                    "minecraft:blackstone",
                    "minecraft:polished_blackstone",
                    "minecraft:basalt",
                    "minecraft:smooth_basalt"
                ]
            }
        },
        result: { id: "create:crushing_wheel", amount: 2 }
    },
    {
        // Receita 5 × 2 original do Potato Cannon.
        pattern: [
            "ARPPP",
            "CC   "
        ],
        keys: {
            A: "create:andesite_alloy",
            R: "create:precision_mechanism",
            P: "create:pipe",
            C: "minecraft:copper_ingot"
        },
        result: { id: "create:potato_cannon", amount: 1 }
    }
]

// Receitas da addon extraídas dos JSON com a tag crafting_table, além das
// receitas especiais que usam grupos de itens e padrões maiores que 3 × 3.
const CRAFTING_RECIPES = [
    // A Crushing Wheel usa o padrão especial 5 × 5 e precisa ser avaliada
    // antes das receitas comuns para nunca ser substituída.
    ...EXTRA_CRAFTING_RECIPES,
    {
        pattern: ["PPP", "CIC", "CRC"],
        key: {
            P: { item: "minecraft:planks" },
            C: { item: "minecraft:cobblestone" },
            I: { item: "minecraft:iron_ingot" },
            R: { item: "minecraft:redstone" }
        },
        result: { id: "minecraft:piston", amount: 1 }
    },
    {
        // Receita original da Super Glue no Create.
        pattern: ["AS", "NA"],
        key: {
            A: { item: "minecraft:slime_ball" },
            S: { item: "create:iron_sheet" },
            N: { item: "minecraft:iron_nugget" }
        },
        result: { id: "create:super_glue", amount: 1 }
    },
    ...ADDON_CRAFTING_RECIPES,
    ...ADDON_SHAPELESS_CRAFTING_RECIPES,
    ...VANILLA_CRAFTING_RECIPES
]

const FACE_OFFSET = {
    north: { x: 0, z: -1, sideX: -1, sideZ: 0, rotationY: 180 },
    south: { x: 0, z: 1, sideX: 1, sideZ: 0, rotationY: 0 },
    east: { x: 1, z: 0, sideX: 0, sideZ: -1, rotationY: 90 },
    west: { x: -1, z: 0, sideX: 0, sideZ: 1, rotationY: 90 }
}

const POSITION_BY_FRONT = {
    north: { front: 0.6, side: -0.009, y: CRAFTER_ITEM_Y },
    south: { front: 0.6, side: 0.00010, y: CRAFTER_ITEM_Y },
    east: { front: 0.6, side: 0.009, y: CRAFTER_ITEM_Y },
    west: { front: 0.6, side: 0.009, y: CRAFTER_ITEM_Y }
}

const ITEM_ROTATION_BY_FRONT = {
    north: { x: 90, z: 0 },
    south: { x: -90, z: 0 },
    east: { x: 0, z: 90 },
    west: { x: 0, z: 90 }
}

const FAKE_ITEM_ROTATION_BY_FRONT = {
    north: { x: 90, z: 0 },
    south: { x: -0, z: 0 },
    east: { x: 0, z: 180 },
    west: { x: 180, z: 180 }
}

const INVERT_FACE = {
    north: "south",
    south: "north",
    east: "west",
    west: "east"
}

export function mechanicalCrafterInteract(block, player, item) {
    if (!block || !player) return
    if (item?.typeId === "create:wrench") {
        cycleCrafterGuideDirection(block)
        const outputBlock = updateCrafterNetworkOutput(block)
        if (outputBlock) {
            tryCraftFromCrafterNetwork(outputBlock)
        }
        return
    }
    if (!item) return

    const added = addStackToCrafter(block, item, 1)
    if (added <= 0) return

    racoAPI.clearMainhand(player, added)
    block.dimension.playSound("block.itemframe.add_item", getCrafterItemLocation(block))
}

function cycleCrafterGuideDirection(block) {
    const current = getCrafterGuideDirection(block)
    const next = GUIDE_DIRECTIONS[(GUIDE_DIRECTIONS.indexOf(current) + 1) % GUIDE_DIRECTIONS.length]
    try { block.setPermutation(block.permutation.withState("create:guide_direction", next)) } catch {}
    try { block.dimension.playSound("random.click", block.center(), { volume: 0.6, pitch: 1.1 + GUIDE_DIRECTIONS.indexOf(next) * 0.1 }) } catch {}
}

function getCrafterGuideDirection(block) {
    try {
        const direction = block?.permutation?.getState?.("create:guide_direction")
        if (GUIDE_DIRECTIONS.includes(direction)) return direction
    } catch {}
    return "right"
}

export function mechanicalCrafterBreak(block, dimension = block?.dimension) {
    if (!block || !dimension) return
    const key = blockKey(block)
    CRAFTER_CRAFT_CHECK_TICKS.delete(key)
    CRAFTER_HOPPER_INPUT_TICKS.delete(key)
    CRAFTER_VISUAL_SYNC_TICKS.delete(key)
    CRAFTER_OUTPUT_UPDATE_TICKS.delete(key)
    CRAFTER_RECIPE_SIGNATURES.delete(key)

    for (const itemEntity of getCrafterItemEntities(block)) {
        if (!itemEntity?.isValid) continue

        const itemStack = itemEntity.getComponent("inventory")?.container?.getItem(0)
        if (itemStack) {
            try { dimension.spawnItem(itemStack, itemEntity.location) } catch {}
        }
        try { itemEntity.remove() } catch {}
    }

}

export function mechanicalCrafterTick(block) {
    maybePullCrafterHopperInput(block)

    // Só existe saída quando as setas da grade apontam para o mesmo crafter.
    if (block?.permutation?.getState?.("create:is_output") !== true) {
        const key = blockKey(block)
        const now = mc.system.currentTick ?? 0
        const nextOutputUpdate = CRAFTER_OUTPUT_UPDATE_TICKS.get(key) ?? 0
        if (now >= nextOutputUpdate) {
            CRAFTER_OUTPUT_UPDATE_TICKS.set(key, now + CRAFTER_OUTPUT_UPDATE_INTERVAL)
            updateCrafterNetworkOutput(block)
        }
    }

    if (block?.permutation?.getState?.("create:is_output") === true) {
        maybeTryCraftFromCrafterNetwork(block)
    }

    const key = blockKey(block)
    const now = mc.system.currentTick ?? 0
    const nextVisualSync = CRAFTER_VISUAL_SYNC_TICKS.get(key) ?? 0
    if (now < nextVisualSync) return
    CRAFTER_VISUAL_SYNC_TICKS.set(key, now + CRAFTER_VISUAL_SYNC_INTERVAL)

    const itemEntity = getCrafterItemEntity(block)
    if (!itemEntity?.isValid) return
    try {
        if (itemEntity.hasTag(CRAFTER_MOVING_ITEM_TAG)) return
    } catch {}

    let itemStack = itemEntity.getComponent("inventory")?.container?.getItem(0)
    if (!itemStack) {
        try { itemEntity.remove() } catch {}
        return
    }
    itemStack = limitCrafterStoredItemAmount(block, itemEntity, itemStack)

    const loc = getCrafterItemLocation(block)
    const current = itemEntity.location
    if (Math.abs(current.x - loc.x) > 0.03 || Math.abs(current.y - loc.y) > 0.03 || Math.abs(current.z - loc.z) > 0.03) {
        try { itemEntity.teleport(loc) } catch {}
    }
    syncCrafterItemVisual(block, itemEntity, itemStack)
}

function maybePullCrafterHopperInput(block) {
    if (!block || block.typeId !== CRAFTER_TYPE) return false
    const key = blockKey(block)
    const now = mc.system.currentTick ?? 0
    const nextInput = CRAFTER_HOPPER_INPUT_TICKS.get(key) ?? 0
    if (now < nextInput) return false
    CRAFTER_HOPPER_INPUT_TICKS.set(key, now + CRAFTER_HOPPER_INPUT_INTERVAL)

    const backFace = getCrafterBackFace(block)
    const hopperBlock = block[backFace]?.()
    if (hopperBlock?.typeId !== "minecraft:hopper") return false

    try {
        const facing = racoAPI.blockFaceToDirection(racoAPI.numToDirection(hopperBlock.permutation.getState("facing_direction")))
        if (racoAPI.invertFace(facing) !== backFace) return false
        if (hopperBlock.permutation.getState("toggle_bit") === true) return false
    } catch {
        return false
    }

    const hopperContainer = hopperBlock.getComponent("inventory")?.container
    if (!hopperContainer) return false

    for (let i = 0; i < hopperContainer.size; i++) {
        const hopperItem = hopperContainer.getItem(i)
        if (!hopperItem) continue

        const added = addStackToCrafter(block, hopperItem, 1)
        if (added <= 0) continue

        racoAPI.clearItem(hopperContainer, i, added)
        try { block.dimension.playSound("block.itemframe.add_item", getCrafterItemLocation(block), { volume: 0.45, pitch: 1.0 }) } catch {}
        return true
    }

    return false
}

function maybeTryCraftFromCrafterNetwork(block) {
    const key = blockKey(block)
    const currentTick = mc.system.currentTick ?? 0
    const nextCheckTick = CRAFTER_CRAFT_CHECK_TICKS.get(key) ?? 0
    if (currentTick < nextCheckTick) return false

    CRAFTER_CRAFT_CHECK_TICKS.set(key, currentTick + CRAFTER_CRAFT_CHECK_INTERVAL)
    return tryCraftFromCrafterNetwork(block)
}

function updateCrafterNetworkOutput(block) {
    if (!block || block.typeId !== CRAFTER_TYPE) return null
    const network = collectCrafterNetwork(block)
    if (!network?.blocks?.length) return null

    updateCrafterNetworkConnections(network)
    const outputBlock = findUniqueCrafterGuideOutput(network)
    const nextOutputUpdate = (mc.system.currentTick ?? 0) + CRAFTER_OUTPUT_UPDATE_INTERVAL
    for (const crafterBlock of network.blocks) {
        const shouldBeOutput = !!outputBlock && blockKey(crafterBlock) === blockKey(outputBlock)
        setCrafterOutputState(crafterBlock, shouldBeOutput)
        // Uma atualização da rede vale para todos os blocos dela. Assim 81
        // crafters não recalculam a mesma grade no mesmo segundo.
        CRAFTER_OUTPUT_UPDATE_TICKS.set(blockKey(crafterBlock), nextOutputUpdate)
    }
    return outputBlock
}

function findUniqueCrafterGuideOutput(network) {
    const terminals = new Set()
    for (const block of network.blocks) {
        const terminal = getCrafterGuideTerminalBlock(block, network)
        if (!terminal) return null
        terminals.add(blockKey(terminal))
        if (terminals.size > 1) return null
    }

    const [terminalKey] = [...terminals]
    return network.blocks.find(block => blockKey(block) === terminalKey) ?? null
}

function getCrafterGuideTerminalBlock(block, network) {
    const seen = new Set()
    let currentBlock = block

    for (let i = 0; i < 40; i++) {
        const currentKey = blockKey(currentBlock)
        if (seen.has(currentKey)) return null
        seen.add(currentKey)

        const nextBlock = getCrafterGuideNextBlock(currentBlock, network)
        if (!nextBlock) return currentBlock
        currentBlock = nextBlock
    }

    return null
}

function setCrafterOutputState(block, isOutput) {
    try {
        if (block.permutation.getState("create:is_output") === isOutput) return
        block.setPermutation(block.permutation.withState("create:is_output", isOutput))
    } catch {}
}

function updateCrafterNetworkConnections(network) {
    const connectionsByBlock = new Map()
    for (const block of network.blocks) {
        connectionsByBlock.set(blockKey(block), {
            right: false,
            down: false,
            left: false,
            up: false
        })
    }

    for (const block of network.blocks) {
        const nextBlock = getCrafterGuideNextBlock(block, network)
        if (!nextBlock || nextBlock.typeId !== CRAFTER_TYPE) continue

        const connections = connectionsByBlock.get(blockKey(nextBlock))
        const incomingSide = getCrafterIncomingConnectionSide(block, nextBlock, network)
        if (connections && incomingSide) connections[incomingSide] = true
    }

    for (const block of network.blocks) {
        setCrafterConnectionStates(block, connectionsByBlock.get(blockKey(block)))
    }
}

function getCrafterIncomingConnectionSide(fromBlock, toBlock, network) {
    const fromSlot = getCrafterPlaneSlot(fromBlock, network.plane)
    const toSlot = getCrafterPlaneSlot(toBlock, network.plane)
    const sideDelta = toSlot.side - fromSlot.side
    const yDelta = toSlot.y - fromSlot.y
    const sideSign = getCrafterGuideSideSign(network.front)

    if (yDelta > 0) return "down"
    if (yDelta < 0) return "up"
    if (sideDelta === sideSign) return "left"
    if (sideDelta === -sideSign) return "right"
    return null
}

function setCrafterConnectionStates(block, connections = {}) {
    try {
        const nextStates = {
            "create:connect_right": !!connections.right,
            "create:connect_down": !!connections.down,
            "create:connect_left": !!connections.left,
            "create:connect_up": !!connections.up
        }

        let permutation = block.permutation
        let changed = false
        for (const [state, value] of Object.entries(nextStates)) {
            if (permutation.getState(state) === value) continue
            permutation = permutation.withState(state, value)
            changed = true
        }

        if (changed) block.setPermutation(permutation)
    } catch {}
}

function addStackToCrafter(block, itemStack, requestedAmount = itemStack?.amount ?? 0) {
    if (!block || !itemStack || requestedAmount <= 0) return 0
    // Ferramentas/equipamentos não podem ocupar os slots do Mechanical Crafter.
    if (getItemVisual(itemStack.typeId).hand) return 0

    const existingEntity = getCrafterItemEntity(block)
    if (existingEntity?.isValid) {
        return 0
    }

    const amountToAdd = Math.min(requestedAmount, itemStack.amount ?? requestedAmount, CRAFTER_SLOT_MAX_AMOUNT)
    if (amountToAdd <= 0) return 0

    const depositedItem = itemStack.clone()
    depositedItem.amount = amountToAdd

    const spawnedItem = block.dimension.spawnEntity(CRAFTER_ITEM_ENTITY, getCrafterItemLocation(block))
    try { spawnedItem.addTag(CRAFTER_ITEM_TAG) } catch {}
    setCrafterEntityItem(block, spawnedItem, depositedItem)
    CRAFTER_RECIPE_DEBOUNCE_TICKS.set(getCrafterRecipeDebounceKey(block), (mc.system.currentTick ?? 0) + CRAFTER_RECIPE_INPUT_DEBOUNCE_TICKS)
    return amountToAdd
}

function getCrafterItemEntity(block) {
    const loc = getCrafterItemLocation(block)
    const entities = block?.dimension?.getEntities({
        type: CRAFTER_ITEM_ENTITY,
        location: loc,
        maxDistance: 0.45
    }) ?? []

    for (const entity of entities) {
        try {
            if (entity?.isValid && entity.hasTag(CRAFTER_ITEM_TAG)) return entity
        } catch {}
    }
    return null
}

function getCrafterItemEntities(block) {
    const primary = getCrafterItemEntity(block)
    const result = []
    const seen = new Set()

    if (primary?.isValid) {
        result.push(primary)
        seen.add(primary.id)
    }

    const center = {
        x: block.location.x + 0.5,
        y: block.location.y + 0.5,
        z: block.location.z + 0.5
    }

    for (const type of [CRAFTER_ITEM_ENTITY, "create:conveyor_item"]) {
        const entities = block.dimension?.getEntities({
            type,
            location: center,
            maxDistance: 0.85
        }) ?? []

        for (const entity of entities) {
            if (!entity?.isValid || seen.has(entity.id)) continue
            try {
                if (!entity.hasTag(CRAFTER_ITEM_TAG)) continue
            } catch {
                continue
            }
            result.push(entity)
            seen.add(entity.id)
        }
    }

    return result
}

function setCrafterEntityItem(block, entity, itemStack) {
    try { entity.addTag(CRAFTER_ITEM_TAG) } catch {}
    setCrafterEntityDisplayItem(entity, itemStack)
    syncCrafterItemVisual(block, entity, itemStack)
}

function tryCraftFromCrafterNetwork(outputBlock) {
    if (!outputBlock || outputBlock.typeId !== CRAFTER_TYPE) return false
    const outputKey = blockKey(outputBlock)
    if (ACTIVE_CRAFTER_CRAFTS.has(outputKey)) return false
    if ((CRAFTER_RECIPE_DEBOUNCE_TICKS.get(getCrafterRecipeDebounceKey(outputBlock)) ?? 0) > (mc.system.currentTick ?? 0)) return false
    const rpm = getCrafterRpm(outputBlock)
    if (rpm <= 0) return false

    const network = collectCrafterNetwork(outputBlock)
    if (!network?.blocks?.length) return false

    // Só procura nas centenas de receitas quando os itens da grade realmente
    // mudaram. Isso evita varrer todas as receitas em todo intervalo de tick.
    const signature = getCrafterRecipeSignature(network)
    if (CRAFTER_RECIPE_SIGNATURES.get(outputKey) === signature) return false
    CRAFTER_RECIPE_SIGNATURES.set(outputKey, signature)

    for (const recipe of [...compatibilityRecipes.crafting, ...compatibilityRecipes.crafting_shapeless, ...CRAFTING_RECIPES]) {
        const match = recipe.shapeless
            ? findCrafterShapelessRecipeMatch(network, recipe)
            : findCrafterRecipeMatch(network, recipe)
        if (!match) continue
        if (!doesCrafterRecipeLeadToOutput(network, match, outputBlock)) continue
        CRAFTER_RECIPE_SIGNATURES.delete(outputKey)
        beginCrafterCraftAnimation(outputBlock, match.slots, recipe, rpm, network, match)
        return true
    }

    return false
}

function getCrafterRecipeDebounceKey(block) {
    const plane = getCrafterPlane(block)
    return `${block.dimension.id}:${getCrafterFront(block)}:${plane.fixedAxis}:${plane.fixed}`
}

function getCrafterRecipeSignature(network) {
    return network.blocks
        .map(block => {
            const slot = getCrafterPlaneSlot(block, network.plane)
            const item = getCrafterStoredItem(block)
            return `${slot.side},${slot.y}:${item?.typeId ?? ""}:${item?.amount ?? 0}`
        })
        .sort()
        .join("|")
}

function beginCrafterCraftAnimation(outputBlock, slotBlocks, recipe, rpm, network, match) {
    const outputKey = blockKey(outputBlock)
    const ingredients = []

    for (let i = 0; i < slotBlocks.length; i++) {
        const slotBlock = slotBlocks[i]
        const entity = getCrafterItemEntity(slotBlock)
        const itemStack = entity?.getComponent("inventory")?.container?.getItem(0)
        if (!entity?.isValid || !itemStack) return false
        const path = getCrafterCraftPath(slotBlock, outputBlock, network)
        const outputOffset = getCrafterRecipeOutputOffset(slotBlock, match, getCrafterFront(outputBlock))
        ingredients.push({
            block: slotBlock,
            entity,
            itemStack: itemStack.clone(),
            from: { ...entity.location },
            path,
            offset: subtractLocation(entity.location, path?.[0] ?? entity.location),
            outputOffset
        })
    }

    ACTIVE_CRAFTER_CRAFTS.add(outputKey)
    setCrafterBlocksCraftingState(slotBlocks, true)

    const target = getCrafterItemLocation(outputBlock)
    const animationTicks = getCrafterCraftAnimationTicks(rpm)
    animateCrafterIngredientsToOutput(ingredients, target, animationTicks, outputBlock)

    mc.system.runTimeout(() => {
        try {
            beginCrafterOutputProcess(outputBlock, ingredients, recipe)
        } finally {
            mc.system.runTimeout(() => {
                ACTIVE_CRAFTER_CRAFTS.delete(outputKey)
                setCrafterBlocksCraftingState(slotBlocks, false)
            }, CRAFTER_OUTPUT_PROCESS_TICKS + 2)
        }
    }, animationTicks + CRAFTER_RECIPE_IMAGE_HOLD_TICKS)

    return true
}

function setCrafterBlocksCraftingState(blocks, isCrafting) {
    for (const block of blocks ?? []) {
        try {
            if (block?.typeId !== CRAFTER_TYPE) continue
            if (block.permutation.getState("create:is_crafting") === isCrafting) continue
            block.setPermutation(block.permutation.withState("create:is_crafting", isCrafting))
        } catch {}
    }
}

function beginCrafterOutputProcess(outputBlock, ingredients, recipe) {
    const result = new mc.ItemStack(recipe.result.id, recipe.result.amount)
    const target = getCrafterItemLocation(outputBlock)
    let resultEntity

    let tick = 0
    const intervalId = mc.system.runInterval(() => {
        tick++
        const shrinkProgress = Math.min(1, tick / CRAFTER_OUTPUT_SHRINK_TICKS)

        if (tick % 2 === 0) {
            spawnCrafterAssemblyParticles(outputBlock, target, 1)
        }

        if (shrinkProgress < 1) {
            const shrinkScale = lerp(CRAFTER_RECIPE_IMAGE_ITEM_SCALE, 0.05, easeInOut(shrinkProgress))
            for (const ingredient of ingredients) {
                if (!ingredient.entity?.isValid) continue
                try { ingredient.entity.teleport(addLocation(target, ingredient.outputOffset ?? ingredient.offset)) } catch {}
                try { ingredient.entity.setProperty("create:item_scale", shrinkScale) } catch {}
            }
            return
        }

        if (!resultEntity?.isValid) {
            for (const ingredient of ingredients) {
                finishCrafterIngredientConsume(ingredient)
            }
            resultEntity = outputBlock.dimension.spawnEntity(CRAFTER_ITEM_ENTITY, target)
            try { resultEntity.addTag(CRAFTER_ITEM_TAG) } catch {}
            try { resultEntity.addTag(CRAFTER_MOVING_ITEM_TAG) } catch {}
            setCrafterEntityItem(outputBlock, resultEntity, result)
            try { resultEntity.setProperty("create:item_scale", 0.12) } catch {}
        }

        const growProgress = Math.min(1, (tick - CRAFTER_OUTPUT_SHRINK_TICKS) / CRAFTER_OUTPUT_GROW_TICKS)
        const easedGrow = easeInOut(growProgress)

        if (resultEntity?.isValid) {
            try { resultEntity.teleport(target) } catch {}
            try { resultEntity.setProperty("create:item_scale", lerp(0.12, 1, easedGrow)) } catch {}
        }

        if (growProgress >= 1) {
            try { mc.system.clearRun(intervalId) } catch {}
            if (resultEntity?.isValid) {
                const remaining = insertCrafterResultIntoOutputInventory(outputBlock, result)
                if (!remaining) {
                    try { resultEntity.remove() } catch {}
                } else {
                    try { resultEntity.removeTag(CRAFTER_MOVING_ITEM_TAG) } catch {}
                    try { resultEntity.setProperty("create:item_scale", 1) } catch {}
                    try { resultEntity.setDynamicProperty(CRAFTER_ITEM_SIGNATURE, "") } catch {}
                    setCrafterEntityItem(outputBlock, resultEntity, remaining)
                    syncCrafterItemVisual(outputBlock, resultEntity, remaining)
                }
            } else {
                const remaining = insertCrafterResultIntoOutputInventory(outputBlock, result)
                if (!remaining) return
                const added = addStackToCrafter(outputBlock, remaining, remaining.amount)
                if (added <= 0) {
                    try { outputBlock.dimension.spawnItem(remaining, target) } catch {}
                }
            }
            spawnCrafterAssemblyParticles(outputBlock, target, 2)
        }
    }, 1)
}

function insertCrafterResultIntoOutputInventory(outputBlock, itemStack) {
    if (!outputBlock || !itemStack) return itemStack

    const outputFace = getCrafterFront(outputBlock)
    // A face do bico é a primeira tentativa. As outras faces mantêm a
    // compatibilidade com blocos antigos cuja rotação visual é invertida.
    const faces = [outputFace, "north", "south", "east", "west"]
        .filter((face, index, all) => all.indexOf(face) === index)

    for (const face of faces) {
        let destinationBlock
        try { destinationBlock = outputBlock[face]?.() } catch {}

        let destination
        try { destination = destinationBlock?.getComponent("minecraft:inventory")?.container } catch {}
        if (!destination) {
            try { destination = destinationBlock?.getComponent("inventory")?.container } catch {}
        }
        if (!destination) continue

        try {
            // addItem devolve o que não coube; undefined significa que entrou tudo.
            return destination.addItem(itemStack.clone())
        } catch {}
    }

    return itemStack
}

function animateCrafterIngredientsToOutput(ingredients, target, animationTicks, outputBlock) {
    for (const ingredient of ingredients) {
        try { ingredient.entity?.addTag(CRAFTER_MOVING_ITEM_TAG) } catch {}
        ingredient.assemblyStage = 0
    }

    let tick = 0
    const emittedStages = new Set()
    const intervalId = mc.system.runInterval(() => {
        tick++
        const progress = Math.min(1, tick / animationTicks)
        const pathProgress = easeSmooth(clamp(progress / 0.72, 0, 1))
        const formationProgress = easeSmooth(clamp(progress / 0.22, 0, 1))
        const smallImageProgress = easeSmooth(clamp((progress - 0.72) / 0.28, 0, 1))
        const formationScale = lerp(1, CRAFTER_RECIPE_IMAGE_ITEM_SCALE, smallImageProgress)

        for (const ingredient of ingredients) {
            if (!ingredient.entity?.isValid) continue
            const currentOffset = lerpLocation(ingredient.offset, ingredient.outputOffset ?? ingredient.offset, formationProgress)
            const loc = addLocation(getCrafterPathLocation(ingredient.path, pathProgress), currentOffset)
            try { ingredient.entity.teleport(loc) } catch {}
            try { ingredient.entity.setProperty("create:item_scale", formationScale) } catch {}
            updateCrafterAssemblyStage(ingredient, addLocation(target, ingredient.outputOffset ?? ingredient.offset), progress, outputBlock, emittedStages)
        }

        if (progress >= 1) {
            try { mc.system.clearRun(intervalId) } catch {}
        }
    }, 1)
}

function updateCrafterAssemblyStage(ingredient, target, progress, outputBlock, emittedStages) {
    const stages = getCrafterAssemblyStages(ingredient.from, target)
    while (ingredient.assemblyStage < stages.length && progress >= stages[ingredient.assemblyStage].progress) {
        const stage = stages[ingredient.assemblyStage]
        const stageKey = getCrafterAssemblyStageKey(ingredient.assemblyStage, stage.location)
        ingredient.assemblyStage++
        if (emittedStages.has(stageKey)) continue
        emittedStages.add(stageKey)
        try { outputBlock.dimension.playSound("dig.wood", stage.location, { volume: 0.28, pitch: 1.0 + Math.random() * 0.3 }) } catch {}
        spawnCrafterAssemblyParticles(outputBlock, stage.location, stage.final ? 2 : 1)
    }
}

function getCrafterAssemblyStageKey(stageIndex, location) {
    return `${stageIndex}:${Math.round(location.x * 10)},${Math.round(location.y * 10)},${Math.round(location.z * 10)}`
}

function getCrafterAssemblyStages(from, target) {
    const horizontalDistance = Math.abs(target.x - from.x) + Math.abs(target.z - from.z)
    const verticalDistance = Math.abs(target.y - from.y)
    const totalDistance = Math.max(0.001, horizontalDistance + verticalDistance)
    const horizontalEndProgress = horizontalDistance <= 0 ? 0.25 : Math.min(0.82, horizontalDistance / totalDistance)
    const middleProgress = horizontalEndProgress + (1 - horizontalEndProgress) * 0.52
    const horizontalMeet = {
        x: target.x,
        y: from.y,
        z: target.z
    }
    const middleMeet = {
        x: target.x,
        y: lerp(from.y, target.y, 0.55),
        z: target.z
    }

    return [
        { progress: Math.max(0.18, horizontalEndProgress), location: horizontalMeet },
        { progress: Math.max(horizontalEndProgress + 0.08, middleProgress), location: middleMeet },
        { progress: 0.96, location: target, final: true }
    ]
}

function spawnCrafterAssemblyParticles(block, target, times) {
    if (!block || times <= 0) return
    try {
        const molang = new mc.MolangVariableMap()
        molang.setColorRGBA("color", { red: 0.62, green: 0.58, blue: 0.46, alpha: 1 })
        const angle = Math.random() * Math.PI * 2
        const radius = 0.18 + Math.random() * 0.08
        block.dimension.spawnParticle("create:millstone_crushing", {
            x: target.x + Math.cos(angle) * radius,
            y: target.y + 0.05 + Math.random() * 0.12,
            z: target.z + Math.sin(angle) * radius
        }, molang)
        if (times === 1) {
            block.dimension.spawnParticle("create:millstone_crit", {
                x: target.x,
                y: target.y + 0.08,
                z: target.z
            })
        }
    } catch {}
    mc.system.runTimeout(() => spawnCrafterAssemblyParticles(block, target, times - 1), 2)
}

function getCrafterCraftAnimationTicks(rpm) {
    const absRpm = Math.max(1, Math.abs(rpm))
    const scaledTicks = Math.round(CRAFTER_CRAFT_BASE_ANIMATION_TICKS / Math.sqrt(absRpm / CRAFTER_CRAFT_BASE_ANIMATION_RPM))
    return Math.max(CRAFTER_CRAFT_MIN_ANIMATION_TICKS, Math.min(CRAFTER_CRAFT_MAX_ANIMATION_TICKS, scaledTicks))
}

function getCrafterRpm(block) {
    const entity = block?.dimension?.getEntities({
        type: CRAFTER_RPM_ENTITY,
        location: block.center(),
        maxDistance: 0.7,
        closest: 1
    })?.[0]
    return Math.abs(entity?.getProperty("create:rpm") ?? 0)
}

function getCrafterCraftPath(fromBlock, outputBlock, network) {
    const guidedBlocks = getCrafterGuidedBlockPath(fromBlock, outputBlock, network)
    if (guidedBlocks?.length) return guidedBlocks.map(getCrafterItemLocation)
    if (!fromBlock || !outputBlock || !network) return [fromBlock, outputBlock].filter(Boolean).map(getCrafterItemLocation)

    const startSlot = getCrafterPlaneSlot(fromBlock, network.plane)
    const endSlot = getCrafterPlaneSlot(outputBlock, network.plane)
    const startKey = slotKey(startSlot.side, startSlot.y)
    const endKey = slotKey(endSlot.side, endSlot.y)
    const queue = [startKey]
    const previous = new Map([[startKey, null]])
    const directions = [
        { side: 1, y: 0 },
        { side: -1, y: 0 },
        { side: 0, y: 1 },
        { side: 0, y: -1 }
    ]

    while (queue.length > 0) {
        const currentKey = queue.shift()
        if (currentKey === endKey) break

        const [sideText, yText] = currentKey.split(",")
        const side = Number(sideText)
        const y = Number(yText)
        for (const direction of directions) {
            const nextKey = slotKey(side + direction.side, y + direction.y)
            if (previous.has(nextKey) || !network.blockBySlot.has(nextKey)) continue
            previous.set(nextKey, currentKey)
            queue.push(nextKey)
        }
    }

    if (!previous.has(endKey)) return [getCrafterItemLocation(fromBlock), getCrafterItemLocation(outputBlock)]

    const blocks = []
    let currentKey = endKey
    while (currentKey) {
        const block = network.blockBySlot.get(currentKey)
        if (block) blocks.unshift(block)
        currentKey = previous.get(currentKey)
    }
    return blocks.map(getCrafterItemLocation)
}

function doesCrafterRecipeLeadToOutput(network, match, outputBlock) {
    if (!network || !match || !outputBlock) return false
    const terminalKey = blockKey(outputBlock)
    for (const slotBlock of match.slots) {
        const path = getCrafterGuidedBlockPath(slotBlock, outputBlock, network)
        if (!path?.length || blockKey(path[path.length - 1]) !== terminalKey) return false
    }
    return true
}

function getCrafterGuidedBlockPath(fromBlock, outputBlock, network) {
    if (!fromBlock || !outputBlock || !network) return null
    const outputKey = blockKey(outputBlock)
    const path = [fromBlock]
    const seen = new Set([blockKey(fromBlock)])
    let currentBlock = fromBlock

    for (let i = 0; i < 40; i++) {
        if (blockKey(currentBlock) === outputKey) return path

        const nextBlock = getCrafterGuideNextBlock(currentBlock, network)
        if (!nextBlock || nextBlock.typeId !== CRAFTER_TYPE) return null
        const nextKey = blockKey(nextBlock)
        if (seen.has(nextKey)) return null
        seen.add(nextKey)
        path.push(nextBlock)
        currentBlock = nextBlock
    }

    return null
}

function getCrafterGuideNextBlock(block, network) {
    const direction = getCrafterGuideDirection(block)
    const slot = getCrafterPlaneSlot(block, network.plane)
    let side = slot.side
    let y = slot.y
    const sideSign = getCrafterGuideSideSign(network.front)

    if (direction === "right") side += sideSign
    else if (direction === "left") side -= sideSign
    else if (direction === "up") y += 1
    else if (direction === "down") y -= 1

    return network.blockBySlot.get(slotKey(side, y))
}

function getCrafterGuideSideSign(front) {
    if (front === "north" || front === "east") return -1
    return 1
}

function getCrafterPathLocation(path, progress) {
    if (!path || path.length <= 1) return path?.[0]

    const distances = []
    let totalDistance = 0
    for (let i = 1; i < path.length; i++) {
        const distance = Math.abs(path[i].x - path[i - 1].x)
            + Math.abs(path[i].y - path[i - 1].y)
            + Math.abs(path[i].z - path[i - 1].z)
        distances.push(distance)
        totalDistance += distance
    }

    let traveled = totalDistance * progress
    for (let i = 0; i < distances.length; i++) {
        if (traveled > distances[i]) {
            traveled -= distances[i]
            continue
        }
        const partProgress = distances[i] <= 0 ? 1 : traveled / distances[i]
        return {
            x: lerp(path[i].x, path[i + 1].x, partProgress),
            y: lerp(path[i].y, path[i + 1].y, partProgress),
            z: lerp(path[i].z, path[i + 1].z, partProgress)
        }
    }

    return path[path.length - 1]
}

function getCrafterIngredientOffset(index, total, front) {
    const lane = (index % 5) - 2
    const layer = Math.floor(index / 5) - 2
    const sideAmount = lane * CRAFTER_ITEM_SPACING
    const yAmount = layer * CRAFTER_ITEM_SPACING * 0.45
    const face = FACE_OFFSET[front] ?? FACE_OFFSET.north

    return {
        x: face.sideX * sideAmount,
        y: yAmount,
        z: face.sideZ * sideAmount
    }
}

function getCrafterRecipeOutputOffset(block, match, front) {
    const position = match?.slotPositions?.get(blockKey(block))
    if (!position) return { x: 0, y: 0, z: 0 }

    const sideAmount = (position.col - ((position.cols - 1) / 2)) * CRAFTER_RECIPE_IMAGE_SPACING
    const yAmount = (((position.rows - 1) / 2) - position.row) * CRAFTER_RECIPE_IMAGE_SPACING
    const face = FACE_OFFSET[front] ?? FACE_OFFSET.north
    return {
        x: face.sideX * sideAmount,
        y: yAmount,
        z: face.sideZ * sideAmount
    }
}

function addLocation(location, offset) {
    return {
        x: location.x + (offset?.x ?? 0),
        y: location.y + (offset?.y ?? 0),
        z: location.z + (offset?.z ?? 0)
    }
}

function subtractLocation(location, offset) {
    return {
        x: location.x - (offset?.x ?? 0),
        y: location.y - (offset?.y ?? 0),
        z: location.z - (offset?.z ?? 0)
    }
}

function lerpLocation(from, to, progress) {
    return {
        x: lerp(from?.x ?? 0, to?.x ?? 0, progress),
        y: lerp(from?.y ?? 0, to?.y ?? 0, progress),
        z: lerp(from?.z ?? 0, to?.z ?? 0, progress)
    }
}

function finishCrafterIngredientConsume(ingredient) {
    const { block, entity, itemStack } = ingredient
    if (entity?.isValid) {
        try { entity.removeTag(CRAFTER_MOVING_ITEM_TAG) } catch {}
        try { entity.remove() } catch {}
    }

    if ((itemStack.amount ?? 1) <= 1) return true

    const remaining = itemStack.clone()
    remaining.amount -= 1
    const replacement = block.dimension.spawnEntity(CRAFTER_ITEM_ENTITY, getCrafterItemLocation(block))
    try { replacement.addTag(CRAFTER_ITEM_TAG) } catch {}
    setCrafterEntityItem(block, replacement, remaining)
    return true
}

function collectCrafterNetwork(startBlock) {
    const front = getCrafterFront(startBlock)
    const plane = getCrafterPlane(startBlock)
    const queue = [startBlock]
    const seen = new Set([blockKey(startBlock)])
    const blocks = []
    const blockBySlot = new Map()

    // Rede completa do Mechanical Crafter: até 9 × 9 blocos (81 slots).
    while (queue.length > 0 && blocks.length < 81) {
        const block = queue.shift()
        if (!isCrafterInPlane(block, front, plane)) continue

        blocks.push(block)
        const slot = getCrafterPlaneSlot(block, plane)
        blockBySlot.set(slotKey(slot.side, slot.y), block)

        for (let dy = -1; dy <= 1; dy++) {
            for (let ds = -1; ds <= 1; ds++) {
                if (dy === 0 && ds === 0) continue
                const neighbor = getCrafterPlaneBlock(block.dimension, plane, slot.side + ds, slot.y + dy)
                if (!neighbor || seen.has(blockKey(neighbor))) continue
                if (Math.abs(neighbor.location.x - startBlock.location.x) > CRAFTER_CRAFT_RADIUS) continue
                if (Math.abs(neighbor.location.y - startBlock.location.y) > CRAFTER_CRAFT_RADIUS) continue
                if (Math.abs(neighbor.location.z - startBlock.location.z) > CRAFTER_CRAFT_RADIUS) continue
                seen.add(blockKey(neighbor))
                queue.push(neighbor)
            }
        }
    }

    return { front, plane, blocks, blockBySlot }
}

function findCrafterRecipeMatch(network, recipe) {
    const slots = []
    for (const block of network.blocks) {
        const slot = getCrafterPlaneSlot(block, network.plane)
        slots.push(slot)
    }
    if (slots.length === 0) return null

    const minSide = Math.min(...slots.map(slot => slot.side)) - 4
    const maxSide = Math.max(...slots.map(slot => slot.side))
    const minY = Math.min(...slots.map(slot => slot.y))
    const maxY = Math.max(...slots.map(slot => slot.y)) + 4

    for (let topY = maxY; topY >= minY; topY--) {
        for (let leftSide = minSide; leftSide <= maxSide; leftSide++) {
            const match = matchCrafterRecipeAt(network, recipe, leftSide, topY)
            if (match) return match
        }
    }

    return null
}

function findCrafterShapelessRecipeMatch(network, recipe) {
    const occupied = []
    for (const block of network.blocks) {
        const itemStack = getCrafterStoredItem(block)
        if (itemStack) occupied.push({ block, itemStack })
    }
    if (occupied.length !== recipe.ingredients.length) return null

    const used = new Set()
    for (const ingredient of recipe.ingredients) {
        const index = occupied.findIndex((entry, entryIndex) =>
            !used.has(entryIndex) && isCrafterRecipeIngredient(entry.itemStack, ingredient)
        )
        if (index < 0) return null
        used.add(index)
    }

    return {
        slots: occupied.map(entry => entry.block),
        slotPositions: new Map()
    }
}

function matchCrafterRecipeAt(network, recipe, leftSide, topY) {
    const requiredBlocks = []
    const slotPositions = new Map()

    for (let row = 0; row < recipe.pattern.length; row++) {
        const line = recipe.pattern[row]
        for (let col = 0; col < line.length; col++) {
            const symbol = line[col]
            const block = network.blockBySlot.get(slotKey(leftSide + col, topY - row))
            const itemStack = block ? getCrafterStoredItem(block) : undefined

            if (symbol === " ") {
                if (itemStack) return null
                continue
            }

            const recipeKeys = recipe?.keys ?? recipe?.key ?? {}
            const expected = recipeKeys[symbol]
            if (!block || !itemStack || !isCrafterRecipeIngredient(itemStack, expected)) return null
            requiredBlocks.push(block)
            slotPositions.set(blockKey(block), { row, col, rows: recipe.pattern.length, cols: line.length })
        }
    }

    // Uma receita da mesa de trabalho não pode pegar somente uma parte de uma
    // grade maior. Isso protege, por exemplo, o padrão 5 × 5 da Crushing Wheel.
    const requiredKeys = new Set(requiredBlocks.map(blockKey))
    for (const block of network.blocks) {
        if (!getCrafterStoredItem(block)) continue
        if (!requiredKeys.has(blockKey(block))) return null
    }

    return { slots: requiredBlocks, slotPositions }
}

function isCrafterRecipeIngredient(itemStack, expected) {
    if (!itemStack || !expected) return false
    if (typeof expected === "string") return itemStack.typeId === expected
    if (Array.isArray(expected)) return expected.includes(itemStack.typeId)

    if (typeof expected.tag === "string") return itemMatchesCrafterRecipeTag(itemStack.typeId, expected.tag)
    if (typeof expected.item === "string") {
        if (expected.item === "minecraft:planks") return itemMatchesCrafterRecipeTag(itemStack.typeId, "minecraft:planks")
        return itemStack.typeId === expected.item
    }

    if (expected.ids?.includes?.(itemStack.typeId)) return true
    for (const suffix of expected.suffixes ?? []) {
        if (itemStack.typeId.endsWith(suffix)) return true
    }

    return false
}

function itemMatchesCrafterRecipeTag(typeId, tag) {
    switch (tag) {
        case "minecraft:planks":
            return typeId.endsWith("_planks") || typeId === "minecraft:bamboo_mosaic"
        case "minecraft:wool":
            return typeId === "minecraft:white_wool" || typeId.endsWith("_wool")
        case "minecraft:stone_crafting_materials":
            return [
                "minecraft:stone", "minecraft:cobblestone", "minecraft:mossy_cobblestone",
                "minecraft:blackstone", "minecraft:cobbled_deepslate"
            ].includes(typeId)
        default:
            return false
    }
}

function consumeOneCrafterItem(block) {
    const entity = getCrafterItemEntity(block)
    const itemStack = entity?.getComponent("inventory")?.container?.getItem(0)
    if (!entity?.isValid || !itemStack) return false

    if ((itemStack.amount ?? 1) <= 1) {
        try { entity.remove() } catch {}
        return true
    }

    const updated = itemStack.clone()
    updated.amount -= 1
    setCrafterEntityItem(block, entity, updated)
    return true
}

function getCrafterStoredItem(block) {
    return getCrafterItemEntity(block)?.getComponent("inventory")?.container?.getItem(0)
}

function limitCrafterStoredItemAmount(block, entity, itemStack) {
    if (!block || !entity?.isValid || !itemStack || (itemStack.amount ?? 1) <= CRAFTER_SLOT_MAX_AMOUNT) return itemStack

    const keptItem = itemStack.clone()
    keptItem.amount = CRAFTER_SLOT_MAX_AMOUNT
    setCrafterEntityItem(block, entity, keptItem)

    const extraItem = itemStack.clone()
    extraItem.amount = (itemStack.amount ?? 1) - CRAFTER_SLOT_MAX_AMOUNT
    try { block.dimension.spawnItem(extraItem, getCrafterItemLocation(block)) } catch {}
    return keptItem
}

function getCrafterPlane(block) {
    const front = getCrafterFront(block)
    if (front === "east" || front === "west") {
        return { axis: "z", fixedAxis: "x", fixed: block.location.x }
    }
    return { axis: "x", fixedAxis: "z", fixed: block.location.z }
}

function isCrafterInPlane(block, front, plane) {
    return block?.typeId === CRAFTER_TYPE
        && getCrafterFront(block) === front
        && block.location?.[plane.fixedAxis] === plane.fixed
}

function getCrafterPlaneSlot(block, plane) {
    return { side: block.location[plane.axis], y: block.location.y }
}

function getCrafterPlaneBlock(dimension, plane, side, y) {
    const location = plane.axis === "x"
        ? { x: side, y, z: plane.fixed }
        : { x: plane.fixed, y, z: side }
    try { return dimension?.getBlock(location) } catch {}
    return undefined
}

function slotKey(side, y) {
    return `${side},${y}`
}

function blockKey(block) {
    return `${block.dimension.id}:${block.location.x},${block.location.y},${block.location.z}`
}

function lerp(from, to, progress) {
    return from + (to - from) * progress
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

function easeInOut(progress) {
    return progress * progress * (3 - 2 * progress)
}

function easeSmooth(progress) {
    return progress * progress * progress * (progress * (progress * 6 - 15) + 10)
}

function syncCrafterItemVisual(block, entity, itemStack) {
    if (!block || !entity?.isValid || !itemStack) return

    const front = getCrafterFront(block)
    const fakeVisual = isCrafterFakeVisual(itemStack)
    const storedVisualType = getCrafterStoredVisualType(itemStack)
    const visualType = getCrafterVisualType(storedVisualType, front)
    const signature = `${CRAFTER_ITEM_VISUAL_VERSION}|${itemStack.typeId}|${itemStack.amount ?? 1}|${front}|${storedVisualType}|${visualType}|${fakeVisual}`
    if (entity.getDynamicProperty(CRAFTER_ITEM_SIGNATURE) === signature) return

    setCrafterEntityDisplayItem(entity, itemStack)

    const face = FACE_OFFSET[front] ?? FACE_OFFSET.north
    const itemRotation = fakeVisual
        ? (FAKE_ITEM_ROTATION_BY_FRONT[front] ?? FAKE_ITEM_ROTATION_BY_FRONT.north)
        : (ITEM_ROTATION_BY_FRONT[front] ?? ITEM_ROTATION_BY_FRONT.north)
    const flatItem = visualType === "item" || visualType === "frame_item" || visualType === "frame_item_flat"
    try { entity.setProperty("create:item_visual", visualType) } catch {}
    try { entity.setProperty("create:rotation_x", flatItem ? itemRotation.x : 0) } catch {}
    try { entity.setProperty("create:rotation_y", face.rotationY) } catch {}
    try { entity.setProperty("create:rotation_z", flatItem ? itemRotation.z : 0) } catch {}
    try { entity.setDynamicProperty(CRAFTER_ITEM_SIGNATURE, signature) } catch {}
}

function getCrafterVisualType(visualType, front = "north") {
    if (visualType === "fake_item") return front === "north" ? "frame_item_flat" : "frame_item"
    return visualType === "hand_equipped" ? "item" : visualType
}

function getCrafterStoredVisualType(itemStack) {
    return isCrafterFakeVisual(itemStack) ? "fake_item" : racoAPI.itemStackIs(itemStack)
}

function getCrafterDisplayItemStack(itemStack) {
    const fakeItemId = racoAPI.getFakeItemId(itemStack)
    if (!fakeItemId) return itemStack

    try {
        return new mc.ItemStack(fakeItemId, 1)
    } catch {
        return itemStack
    }
}

function isCrafterFakeVisual(itemStack) {
    return !!racoAPI.getFakeItemId(itemStack)
}

function setCrafterEntityDisplayItem(entity, itemStack) {
    racoAPI.setItemInHand(getCrafterDisplayItemStack(itemStack), entity, "Mainhand", 0, "create:item_visual")
    try { entity.getComponent("inventory")?.container?.setItem(0, itemStack) } catch {}
}

function getCrafterItemLocation(block) {
    const front = getCrafterFront(block)
    const face = FACE_OFFSET[front] ?? FACE_OFFSET.north
    const position = POSITION_BY_FRONT[front] ?? POSITION_BY_FRONT.north
    return {
        x: block.center().x + face.x * position.front + face.sideX * position.side,
        y: block.location.y + position.y,
        z: block.center().z + face.z * position.front + face.sideZ * position.side
    }
}

function getCrafterFront(block) {
    const rawDirection = block?.permutation?.getState?.("minecraft:cardinal_direction") ?? "south"
    return INVERT_FACE[rawDirection] ?? "north"
}

function getCrafterBackFace(block) {
    return racoAPI.invertFace(getCrafterFront(block))
}

function canStackItems(a, b) {
    if (!a || !b) return false
    try { return a.isStackableWith(b) } catch {}
    return a.typeId === b.typeId
}

function getItemSpace(item) {
    return Math.max(0, (item?.maxAmount ?? 64) - (item?.amount ?? 0))
}
