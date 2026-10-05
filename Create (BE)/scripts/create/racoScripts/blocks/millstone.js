import * as mc from "@minecraft/server"
import * as racoAPI from "../raco-API"
import { compatibilityRecipes } from "../../compatibility/registries.js"

// Official Create Mod Millstone recipes
// output: array of { item, count, chance } — chance 1.0 = guaranteed
// duration: recipe duration in ticks (default 100)
// particleRGB: color for crushing particles
const millstoneRecipes = {
    // ============ FLOWERS → DYES (duration 50) ============
    'minecraft:allium':           { duration: 50, particleRGB: { red: 0.75, green: 0.30, blue: 0.75, alpha: 1 }, output: [{ item: 'minecraft:magenta_dye', count: 2 }, { item: 'minecraft:purple_dye', count: 2, chance: 0.10 }, { item: 'minecraft:pink_dye', count: 1, chance: 0.10 }] },
    'minecraft:azure_bluet':      { duration: 50, particleRGB: { red: 0.90, green: 0.90, blue: 0.95, alpha: 1 }, output: [{ item: 'minecraft:light_gray_dye', count: 2 }, { item: 'minecraft:white_dye', count: 1, chance: 0.10 }] },
    'minecraft:blue_orchid':      { duration: 50, particleRGB: { red: 0.30, green: 0.60, blue: 0.90, alpha: 1 }, output: [{ item: 'minecraft:light_blue_dye', count: 2 }, { item: 'minecraft:light_gray_dye', count: 1, chance: 0.05 }] },
    'minecraft:cornflower':       { duration: 50, particleRGB: { red: 0.25, green: 0.35, blue: 0.80, alpha: 1 }, output: [{ item: 'minecraft:blue_dye', count: 2 }] },
    'minecraft:dandelion':        { duration: 50, particleRGB: { red: 0.95, green: 0.90, blue: 0.20, alpha: 1 }, output: [{ item: 'minecraft:yellow_dye', count: 2 }, { item: 'minecraft:yellow_dye', count: 1, chance: 0.05 }] },
    'minecraft:lilac':            { duration: 50, particleRGB: { red: 0.70, green: 0.40, blue: 0.70, alpha: 1 }, output: [{ item: 'minecraft:magenta_dye', count: 3 }, { item: 'minecraft:magenta_dye', count: 1, chance: 0.25 }, { item: 'minecraft:purple_dye', count: 1, chance: 0.25 }] },
    'minecraft:lily_of_the_valley': { duration: 50, particleRGB: { red: 0.95, green: 0.95, blue: 0.95, alpha: 1 }, output: [{ item: 'minecraft:white_dye', count: 2 }, { item: 'minecraft:lime_dye', count: 1, chance: 0.10 }, { item: 'minecraft:white_dye', count: 1, chance: 0.10 }] },
    'minecraft:orange_tulip':     { duration: 50, particleRGB: { red: 0.90, green: 0.55, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:orange_dye', count: 2 }, { item: 'minecraft:lime_dye', count: 1, chance: 0.10 }] },
    'minecraft:oxeye_daisy':      { duration: 50, particleRGB: { red: 0.90, green: 0.90, blue: 0.85, alpha: 1 }, output: [{ item: 'minecraft:light_gray_dye', count: 2 }, { item: 'minecraft:white_dye', count: 1, chance: 0.20 }, { item: 'minecraft:yellow_dye', count: 1, chance: 0.05 }] },
    'minecraft:peony':            { duration: 50, particleRGB: { red: 0.90, green: 0.60, blue: 0.70, alpha: 1 }, output: [{ item: 'minecraft:pink_dye', count: 3 }, { item: 'minecraft:magenta_dye', count: 1, chance: 0.25 }, { item: 'minecraft:pink_dye', count: 1, chance: 0.25 }] },
    'minecraft:pink_tulip':       { duration: 50, particleRGB: { red: 0.90, green: 0.55, blue: 0.65, alpha: 1 }, output: [{ item: 'minecraft:pink_dye', count: 2 }, { item: 'minecraft:lime_dye', count: 1, chance: 0.10 }] },
    'minecraft:poppy':            { duration: 50, particleRGB: { red: 0.85, green: 0.15, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:red_dye', count: 2 }, { item: 'minecraft:green_dye', count: 1, chance: 0.05 }] },
    'minecraft:red_tulip':        { duration: 50, particleRGB: { red: 0.85, green: 0.20, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:red_dye', count: 2 }, { item: 'minecraft:lime_dye', count: 1, chance: 0.10 }] },
    'minecraft:rose_bush':        { duration: 50, particleRGB: { red: 0.80, green: 0.15, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:red_dye', count: 3 }, { item: 'minecraft:green_dye', count: 1, chance: 0.05 }, { item: 'minecraft:red_dye', count: 1, chance: 0.25 }] },
    'minecraft:sunflower':        { duration: 50, particleRGB: { red: 0.95, green: 0.85, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:yellow_dye', count: 3 }, { item: 'minecraft:orange_dye', count: 1, chance: 0.25 }, { item: 'minecraft:yellow_dye', count: 1, chance: 0.25 }] },
    'minecraft:white_tulip':      { duration: 50, particleRGB: { red: 0.92, green: 0.92, blue: 0.92, alpha: 1 }, output: [{ item: 'minecraft:white_dye', count: 2 }, { item: 'minecraft:lime_dye', count: 1, chance: 0.10 }] },
    'minecraft:wither_rose':      { duration: 50, particleRGB: { red: 0.15, green: 0.15, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:black_dye', count: 2 }, { item: 'minecraft:black_dye', count: 1, chance: 0.10 }] },

    // ============ PLANTS (duration 50) ============
    'minecraft:cactus':           { duration: 50, particleRGB: { red: 0.20, green: 0.55, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:green_dye', count: 2 }, { item: 'minecraft:green_dye', count: 1, chance: 0.10 }] },
    'minecraft:sea_pickle':       { duration: 50, particleRGB: { red: 0.45, green: 0.60, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:lime_dye', count: 2 }, { item: 'minecraft:green_dye', count: 1, chance: 0.10 }] },
    'minecraft:sugar_cane':       { duration: 50, particleRGB: { red: 0.50, green: 0.75, blue: 0.30, alpha: 1 }, output: [{ item: 'minecraft:sugar', count: 2 }, { item: 'minecraft:sugar', count: 1, chance: 0.10 }] },
    'minecraft:fern':             { duration: 50, particleRGB: { red: 0.30, green: 0.55, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:green_dye', count: 1 }, { item: 'minecraft:wheat_seeds', count: 1, chance: 0.10 }] },
    'minecraft:large_fern':       { duration: 50, particleRGB: { red: 0.30, green: 0.55, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:green_dye', count: 2 }, { item: 'minecraft:green_dye', count: 1, chance: 0.50 }, { item: 'minecraft:wheat_seeds', count: 1, chance: 0.10 }] },
    'minecraft:tall_grass':       { duration: 50, particleRGB: { red: 0.40, green: 0.60, blue: 0.20, alpha: 1 }, output: [{ item: 'minecraft:wheat_seeds', count: 1, chance: 0.50 }] },
    'minecraft:short_grass':      { duration: 50, particleRGB: { red: 0.40, green: 0.60, blue: 0.20, alpha: 1 }, output: [{ item: 'minecraft:wheat_seeds', count: 1, chance: 0.25 }] },

    // ============ ORGANIC (duration 70) ============
    'minecraft:bone_meal':        { duration: 70, particleRGB: { red: 0.90, green: 0.90, blue: 0.85, alpha: 1 }, output: [{ item: 'minecraft:white_dye', count: 2 }, { item: 'minecraft:light_gray_dye', count: 1, chance: 0.10 }] },
    'minecraft:bone':             { duration: 70, particleRGB: { red: 0.90, green: 0.88, blue: 0.80, alpha: 1 }, output: [{ item: 'minecraft:bone_meal', count: 3 }, { item: 'minecraft:white_dye', count: 1, chance: 0.25 }, { item: 'minecraft:bone_meal', count: 3, chance: 0.25 }] },
    'minecraft:cocoa_beans':      { duration: 70, particleRGB: { red: 0.45, green: 0.25, blue: 0.10, alpha: 1 }, output: [{ item: 'minecraft:brown_dye', count: 2 }, { item: 'minecraft:brown_dye', count: 1, chance: 0.10 }] },
    'minecraft:beetroot':         { duration: 70, particleRGB: { red: 0.70, green: 0.15, blue: 0.20, alpha: 1 }, output: [{ item: 'minecraft:red_dye', count: 2 }, { item: 'minecraft:beetroot_seeds', count: 1, chance: 0.10 }] },
    'minecraft:ink_sac':          { duration: 70, particleRGB: { red: 0.10, green: 0.10, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:black_dye', count: 2 }, { item: 'minecraft:gray_dye', count: 1, chance: 0.10 }] },

    // ============ DEFAULT DURATION (100) ============
    'minecraft:wheat':            { duration: 100, particleRGB: { red: 0.85, green: 0.75, blue: 0.45, alpha: 1 }, output: [{ item: 'create:wheat_flour', count: 1 }, { item: 'create:wheat_flour', count: 1, chance: 0.25 }, { item: 'minecraft:wheat_seeds', count: 1, chance: 0.25 }] },
    'minecraft:charcoal':         { duration: 100, particleRGB: { red: 0.20, green: 0.18, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:black_dye', count: 1 }, { item: 'minecraft:gray_dye', count: 2, chance: 0.10 }] },
    'minecraft:coal':             { duration: 100, particleRGB: { red: 0.15, green: 0.15, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:black_dye', count: 1 }, { item: 'minecraft:gray_dye', count: 2, chance: 0.10 }] },
    'minecraft:lapis_lazuli':     { duration: 100, particleRGB: { red: 0.15, green: 0.20, blue: 0.70, alpha: 1 }, output: [{ item: 'minecraft:blue_dye', count: 2 }, { item: 'minecraft:blue_dye', count: 1, chance: 0.10 }] },

    // ============ WOOL → STRING (duration 100) ============
    'minecraft:white_wool':       { duration: 100, particleRGB: { red: 0.95, green: 0.95, blue: 0.95, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:orange_wool':      { duration: 100, particleRGB: { red: 0.90, green: 0.55, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:magenta_wool':     { duration: 100, particleRGB: { red: 0.75, green: 0.30, blue: 0.75, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:light_blue_wool':  { duration: 100, particleRGB: { red: 0.50, green: 0.70, blue: 0.90, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:yellow_wool':      { duration: 100, particleRGB: { red: 0.95, green: 0.90, blue: 0.20, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:lime_wool':        { duration: 100, particleRGB: { red: 0.50, green: 0.75, blue: 0.10, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:pink_wool':        { duration: 100, particleRGB: { red: 0.90, green: 0.55, blue: 0.65, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:gray_wool':        { duration: 100, particleRGB: { red: 0.40, green: 0.40, blue: 0.40, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:light_gray_wool':  { duration: 100, particleRGB: { red: 0.65, green: 0.65, blue: 0.65, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:cyan_wool':        { duration: 100, particleRGB: { red: 0.10, green: 0.50, blue: 0.55, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:purple_wool':      { duration: 100, particleRGB: { red: 0.50, green: 0.15, blue: 0.75, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:blue_wool':        { duration: 100, particleRGB: { red: 0.20, green: 0.25, blue: 0.70, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:brown_wool':       { duration: 100, particleRGB: { red: 0.45, green: 0.30, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:green_wool':       { duration: 100, particleRGB: { red: 0.30, green: 0.40, blue: 0.10, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:red_wool':         { duration: 100, particleRGB: { red: 0.80, green: 0.15, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },
    'minecraft:black_wool':       { duration: 100, particleRGB: { red: 0.10, green: 0.10, blue: 0.10, alpha: 1 }, output: [{ item: 'minecraft:string', count: 1 }] },

    // ============ STONE / BLOCKS ============
    'minecraft:cobblestone':      { duration: 200, particleRGB: { red: 0.50, green: 0.50, blue: 0.50, alpha: 1 }, output: [{ item: 'minecraft:gravel', count: 1 }] },
    'minecraft:gravel':           { duration: 200, particleRGB: { red: 0.55, green: 0.52, blue: 0.50, alpha: 1 }, output: [{ item: 'minecraft:flint', count: 1 }] },
    'minecraft:sandstone':        { duration: 150, particleRGB: { red: 0.85, green: 0.80, blue: 0.55, alpha: 1 }, output: [{ item: 'minecraft:sand', count: 1 }] },
    'minecraft:granite':          { duration: 200, particleRGB: { red: 0.65, green: 0.40, blue: 0.30, alpha: 1 }, output: [{ item: 'minecraft:red_sand', count: 1 }] },
    'minecraft:andesite':         { duration: 200, particleRGB: { red: 0.55, green: 0.55, blue: 0.55, alpha: 1 }, output: [{ item: 'minecraft:cobblestone', count: 1 }] },
    'minecraft:terracotta':       { duration: 150, particleRGB: { red: 0.60, green: 0.38, blue: 0.25, alpha: 1 }, output: [{ item: 'minecraft:red_sand', count: 1 }] },
    'minecraft:calcite':          { duration: 250, particleRGB: { red: 0.90, green: 0.88, blue: 0.85, alpha: 1 }, output: [{ item: 'minecraft:bone_meal', count: 1, chance: 0.12 }] },
    'minecraft:dripstone_block':  { duration: 250, particleRGB: { red: 0.55, green: 0.45, blue: 0.38, alpha: 1 }, output: [{ item: 'minecraft:clay_ball', count: 1 }] },
    'minecraft:clay':             { duration: 50, particleRGB: { red: 0.65, green: 0.62, blue: 0.58, alpha: 1 }, output: [{ item: 'minecraft:clay_ball', count: 3 }, { item: 'minecraft:clay_ball', count: 1, chance: 0.50 }] },

    // ============ SADDLE (duration 150) ============
    'minecraft:saddle':           { duration: 150, particleRGB: { red: 0.55, green: 0.30, blue: 0.15, alpha: 1 }, output: [{ item: 'minecraft:leather', count: 2 }, { item: 'minecraft:leather', count: 2, chance: 0.50 }] },
}

/**
 * Calculate processing time in ticks based on official Create formula:
 * mpf = clamp(abs(RPM / 16), 1, 512)
 * gt/recipe = ceil(duration / mpf) + 1
 */
function getProcessingTicks(rpm, duration) {
    let mpf = Math.abs(rpm / 16)
    mpf = Math.max(1, Math.min(512, mpf))
    return Math.ceil(duration / mpf) + 1
}

export function millstoneTick(block) {
    const entity = block?.dimension?.getEntities({ type: 'create:millstone_entity', location: block?.center(), maxDistance: 0.5, closest: 1 })[0]
    if (!entity) return

    const rpm = Math.abs(entity.getProperty('create:rpm')) ?? 0
    if (rpm <= 0) return

    const property = racoAPI.isJSONParsable(entity.getDynamicProperty('create:processing'))
        ? JSON.parse(entity.getDynamicProperty('create:processing'))
        : undefined

    if (property) {
        entity?.setProperty('create:crushing', true)
    } else {
        entity?.setProperty('create:crushing', false)
    }

    if (!property) {
        // Look for items above
        const itemEntities = block?.dimension?.getEntities({
            type: 'minecraft:item',
            location: racoAPI.blockFloorCenter(block?.above()),
            maxDistance: 0.5
        })

        for (const itemEntity of itemEntities) {
            if (!itemEntity?.isValid) continue
            const item = itemEntity?.getComponent('minecraft:item')?.itemStack
            if (compatibilityRecipes.millstone.has(item?.typeId) || millstoneRecipes[item?.typeId]) {
                const process = millstoneProcess(block, entity, item, rpm)
                if (process === true) {
                    itemEntity?.remove()
                } else if (process) {
                    const spawnedBack = block.dimension.spawnItem(process, itemEntity?.location)
                    spawnedBack?.teleport(itemEntity?.location)
                    itemEntity.remove()
                }
                break
            }
        }
    } else {
        // Currently processing — show particles
        const itemType = property?.itemType
        const recipe = compatibilityRecipes.millstone.get(itemType) ?? millstoneRecipes[itemType]
        const color = recipe?.particleRGB || { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 }
        spawnMillingParticles(block, color, 5)
        spawnCritParticles(block, 1)

        // Check if processing is done
        const duration = recipe?.duration ?? 100
        const requiredTicks = getProcessingTicks(rpm, duration)

        if (mc.system.currentTick - property?.currentTick >= requiredTicks) {
            // Output results
            const outputs = recipe?.output || []
            const belowBlock = block?.below()
            const hasHopperBelow = belowBlock?.typeId === 'minecraft:hopper'
            const loc = hasHopperBelow
                ? { x: block?.center().x, y: block?.center().y - 0.4, z: block?.center().z }
                : { x: block?.center().x, y: block?.center().y + 0.8, z: block?.center().z }

            for (const entry of outputs) {
                const chance = entry.chance ?? 1.0
                if (Math.random() < chance) {
                    const outputItem = new mc.ItemStack(entry.item, entry.count)
                    const itemDropped = block?.dimension?.spawnItem(outputItem, loc)
                    itemDropped?.teleport(loc)
                }
            }
            entity.setDynamicProperty('create:processing', undefined)
        }
    }
}

function spawnMillingParticles(block, color, times) {
    if (times <= 0) return
    try {
        const molang = new mc.MolangVariableMap()
        molang.setColorRGBA('color', color)
        block.dimension.spawnParticle('create:millstone_crushing', {
            x: block.center().x,
            y: block.location.y + 1.1,
            z: block.center().z
        }, molang)
    } catch(e) {}
    mc.system.runTimeout(() => { spawnMillingParticles(block, color, times - 1) }, 2)
}

function spawnCritParticles(block, times) {
    if (times <= 0) return
    try {
        const angle = Math.random() * Math.PI * 2
        const radius = 0.35
        block.dimension.spawnParticle('create:millstone_crit', {
            x: block.center().x + Math.cos(angle) * radius,
            y: block.location.y + 0.9,
            z: block.center().z + Math.sin(angle) * radius
        })
    } catch(e) {}
}

export function millstoneBreak(data) {
    const block = data.block
    const dimension = data.dimension
    const location = block?.center() ?? block?.location
    const entity = dimension?.getEntities({ type: 'create:millstone_entity', location, maxDistance: 0.5, closest: 1 })[0]
    if (!entity?.isValid) return

    const property = racoAPI.isJSONParsable(entity.getDynamicProperty('create:processing'))
        ? JSON.parse(entity.getDynamicProperty('create:processing'))
        : undefined

    if (property) {
        const itemType = property?.itemType
        mc.system.run(() => {
            dimension?.spawnItem(new mc.ItemStack(itemType, 1), location)
            entity.setDynamicProperty('create:processing', undefined)
        })
    }
}

export function tryInsertMillstoneItem(block, itemStack) {
    const entity = block?.dimension?.getEntities({
        type: 'create:millstone_entity',
        location: block?.center(),
        maxDistance: 0.5,
        closest: 1
    })[0]
    if (!entity?.isValid || !itemStack) return false

    const rpm = Math.abs(entity.getProperty('create:rpm')) ?? 0
    if (rpm <= 0) return false

    const oneItem = itemStack.clone()
    oneItem.amount = 1
    return millstoneProcess(block, entity, oneItem, rpm) === true
}

export function tryExtractMillstoneOutput(block, filterItem, invertFilter = false) {
    const filterType = filterItem?.typeId ?? null
    const passes = (typeId) => !filterType || (invertFilter ? typeId !== filterType : typeId === filterType)
    const loc = { x: block.center().x, y: block.center().y + 0.8, z: block.center().z }
    const items = block.dimension.getEntities({ type: 'minecraft:item', location: loc, maxDistance: 1 }) ?? []

    for (const entity of items) {
        if (!entity?.isValid) continue
        if (Math.abs(entity.location.x - block.center().x) > 0.85) continue
        if (Math.abs(entity.location.z - block.center().z) > 0.85) continue
        if (entity.location.y < block.location.y + 0.3 || entity.location.y > block.location.y + 2) continue

        const itemStack = entity.getComponent('minecraft:item')?.itemStack
        if (!itemStack || !passes(itemStack.typeId)) continue

        const taken = itemStack.clone()
        taken.amount = 1
        if (itemStack.amount > 1) {
            const rest = itemStack.clone()
            rest.amount = itemStack.amount - 1
            const spawnedBack = block.dimension.spawnItem(rest, entity.location)
            spawnedBack?.clearVelocity?.()
        }
        try { entity.remove() } catch {}
        return taken
    }
    return null
}

function millstoneProcess(block, entity, itemStack, rpm) {
    if (block?.typeId !== 'create:millstone' || !entity?.isValid || !itemStack || rpm === 0) return false

    const property = entity.getDynamicProperty('create:processing') ?? undefined
    if (!property && (compatibilityRecipes.millstone.has(itemStack?.typeId) || millstoneRecipes[itemStack?.typeId])) {
        const propertyConfig = {
            itemType: itemStack?.typeId,
            currentTick: mc.system.currentTick
        }
        entity.setDynamicProperty('create:processing', JSON.stringify(propertyConfig))

        if (itemStack.amount > 1) {
            const newItem = itemStack.clone()
            newItem.amount = itemStack.amount - 1
            return newItem
        } else if (itemStack.amount === 1) return true
    }
    return false
}
