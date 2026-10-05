import * as mc from "@minecraft/server"
import * as racoAPI from "../raco-API"

const BLAZE_BURNER_TYPE = "create:blaze_burner"
const EMPTY_BLAZE_BURNER_TYPE = "create:empty_blaze_burner"
const BLAZE_ENTITY_TYPE = "create:blaze_inert"
const BLAZE_ENTITY_TAG = "create_blaze_burner_visual"
const BLAZE_FLAME_ENTITY_TYPE = "create:blaze_burner_flame"
const BLAZE_FLAME_ENTITY_TAG = "create_blaze_burner_flame_visual"
const BLAZE_ACTIVE_PROPERTY = "create:active"
const BLAZE_SUPERHEATED_PROPERTY = "create:superheated"
const BLAZE_ROTATION_PROPERTY = "create:rotation_y"
const BLAZE_ROTATION_SPEED = 0.10
const BLAZE_PARTICLE_INTERVAL = 4
const BLAZE_INERT_SMOKE_INTERVAL = 24
const BLAZE_SOUND_INTERVAL = 120
const BLAZE_ACTIVE_UNTIL_PROPERTY = "create:active_until_tick"
const BLAZE_CREATIVE_FUEL_PROPERTY = "create:creative_fuel"

function blazeBurnerAnchorTag(block) {
    return `create_blaze_burner:${block.x}:${block.y}:${block.z}`
}

const FURNACE_FUEL_TICKS = {
    // Combustível especial do Create: permanece ativo por mais tempo que a lava.
    "create:blaze_cake": 40000,
    "minecraft:lava_bucket": 20000,
    "minecraft:coal_block": 16000,
    "minecraft:dried_kelp_block": 4000,
    "minecraft:blaze_rod": 2400,
    "minecraft:coal": 1600,
    "minecraft:charcoal": 1600,
    "minecraft:scaffolding": 400,
    "minecraft:crafting_table": 300,
    "minecraft:cartography_table": 300,
    "minecraft:fletching_table": 300,
    "minecraft:smithing_table": 300,
    "minecraft:loom": 300,
    "minecraft:bookshelf": 300,
    "minecraft:chest": 300,
    "minecraft:trapped_chest": 300,
    "minecraft:barrel": 300,
    "minecraft:ladder": 300,
    "minecraft:composter": 300,
    "minecraft:stick": 100,
    "minecraft:bamboo": 50,
    "minecraft:bowl": 100,
    "minecraft:dead_bush": 100
}

const FUEL_SUFFIX_TICKS = [
    ["_chest_boat", 1200],
    ["_boat", 1200],
    ["_log", 300],
    ["_wood", 300],
    ["_stem", 300],
    ["_hyphae", 300],
    ["_planks", 300],
    ["_stairs", 300],
    ["_fence_gate", 300],
    ["_fence", 300],
    ["_door", 200],
    ["_trapdoor", 300],
    ["_pressure_plate", 300],
    ["_sign", 200],
    ["_hanging_sign", 800],
    ["_slab", 150],
    ["_button", 100],
    ["_sapling", 100]
]

export function blazeBurnerTick(block) {
    const entity = ensureBlazeBurnerEntity(block)
    if (!entity?.isValid) return
    syncBlazeBurnerEntityLocation(block, entity)
    if (isBlazeBurnerActive(entity)) {
        if (shouldDeactivateBlaze(entity)) {
            try { entity.setProperty(BLAZE_ACTIVE_PROPERTY, false) } catch {}
            removeBlazeBurnerFlames(block)
            return
        }
        ensureBlazeBurnerFlame(block, isBlazeSuperheated(entity))
        rotateBlazeTowardNearestPlayer(block, entity)
        tickActiveBlazeEffects(block, entity)
    } else {
        removeBlazeBurnerFlames(block)
        rotateBlazeTowardNearestPlayer(block, entity)
        tickInertBlazeEffects(block)
    }
}

export function blazeBurnerInteract(block, player, item) {
    const burnTicks = getFuelBurnTicks(item)
    if (!block || !player || burnTicks <= 0) return

    const entity = ensureBlazeBurnerEntity(block)
    if (!entity?.isValid) return

    setBlazeFuelVariant(entity, item)
    try { entity.setProperty(BLAZE_ACTIVE_PROPERTY, true) } catch {}
    rotateBlazeTowardNearestPlayer(block, entity)
    extendBlazeBurnTime(entity, burnTicks)
    try { entity.setDynamicProperty("create:last_blaze_sound_tick", 0) } catch {}
    spawnBlazeFireBurst(block, isBlazeSuperheated(entity))
    if (!isCreativeBlazeCake(item)) consumeBlazeBurnerFuel(player, item)
    try { block.dimension.playSound("mob.blaze.breathe", block.center(), { volume: 1.25, pitch: 1.0 }) } catch {}
}

export function feedBlazeBurner(block, item) {
    const burnTicks = getFuelBurnTicks(item)
    if (!block || block.typeId !== BLAZE_BURNER_TYPE || burnTicks <= 0) return false

    const entity = ensureBlazeBurnerEntity(block)
    if (!entity?.isValid) return false

    setBlazeFuelVariant(entity, item)
    try { entity.setProperty(BLAZE_ACTIVE_PROPERTY, true) } catch {}
    rotateBlazeTowardNearestPlayer(block, entity)
    extendBlazeBurnTime(entity, burnTicks)
    try { entity.setDynamicProperty("create:last_blaze_sound_tick", 0) } catch {}
    spawnBlazeFireBurst(block, isBlazeSuperheated(entity))
    try { block.dimension.playSound("mob.blaze.breathe", block.center(), { volume: 1.25, pitch: 1.0 }) } catch {}
    return true
}

export function isBlazeBurnerBlockActive(block) {
    if (!block || block.typeId !== BLAZE_BURNER_TYPE) return false
    const entity = ensureBlazeBurnerEntity(block)
    if (!entity?.isValid) return false
    if (shouldDeactivateBlaze(entity)) {
        try { entity.setProperty(BLAZE_ACTIVE_PROPERTY, false) } catch {}
        return false
    }
    const activeUntil = Number(entity.getDynamicProperty(BLAZE_ACTIVE_UNTIL_PROPERTY) ?? 0)
    if (activeUntil > (mc.system.currentTick ?? 0)) return true
    return isBlazeBurnerActive(entity)
}

// Usado pelas receitas de Basin que exigem o estado Super-Heated do Create.
export function isBlazeBurnerBlockSuperheated(block) {
    if (!isBlazeBurnerBlockActive(block)) return false
    const entity = ensureBlazeBurnerEntity(block)
    return !!entity?.isValid && isBlazeSuperheated(entity)
}

export function blazeBurnerBreak(block, dimension = block?.dimension) {
    if (!block || !dimension) return
    for (const entity of getBlazeBurnerEntities(block)) {
        try { entity.triggerEvent("create:despawn") } catch {
            try { entity.remove() } catch {}
        }
    }
    removeBlazeBurnerFlames(block)
}

export function blazeBurnerBeforeBlockInteract(data) {
    const block = data.block
    const player = data.player
    const item = data.itemStack
    if (!data.isFirstEvent || !isEmptyBlazeBurnerItem(item)) return false
    if (block?.typeId !== "minecraft:mob_spawner") return false

    data.cancel = true
    mc.system.run(() => captureBlazeIntoBurner(player, block))
    return true
}

export function blazeBurnerEntityInteract(player, entity, item) {
    if (!player || !entity || !isEmptyBlazeBurnerItem(item)) return false
    if (entity.typeId !== "minecraft:blaze") return false

    captureBlazeIntoBurner(player, entity)
    try { entity.remove() } catch {}
    return true
}

export function blazeBurnerHitEntity(player, entity) {
    const item = player?.getComponent?.("equippable")?.getEquipment?.("Mainhand")
    return blazeBurnerEntityInteract(player, entity, item)
}

function ensureBlazeBurnerEntity(block) {
    if (!block || block.typeId !== BLAZE_BURNER_TYPE) return null
    const existing = getBlazeBurnerEntity(block)
    if (existing?.isValid) {
        cleanupDuplicateBlazeBurnerEntities(block, existing)
        syncBlazeBurnerEntityLocation(block, existing)
        return existing
    }

    const entity = block.dimension.spawnEntity(BLAZE_ENTITY_TYPE, getBlazeBurnerEntityLocation(block))
    try { entity.addTag(BLAZE_ENTITY_TAG) } catch {}
    try { entity.addTag(blazeBurnerAnchorTag(block)) } catch {}
    try { entity.setProperty(BLAZE_ACTIVE_PROPERTY, false) } catch {}
    try { entity.setProperty(BLAZE_SUPERHEATED_PROPERTY, false) } catch {}
    cleanupDuplicateBlazeBurnerEntities(block, entity)
    return entity
}

function getBlazeBurnerEntity(block) {
    return getBlazeBurnerEntities(block)?.[0] ?? null
}

function getBlazeBurnerEntities(block) {
    const anchorTag = blazeBurnerAnchorTag(block)
    let entities = block.dimension.getEntities({
        type: BLAZE_ENTITY_TYPE,
        tags: [anchorTag]
    }) ?? []

    // Migra uma entidade criada pela versao antiga, mas somente se ela ja
    // estiver exatamente sobre este Burner. Nunca captura a do bloco vizinho.
    if (entities.length === 0) {
        const target = getBlazeBurnerEntityLocation(block)
        const legacy = block.dimension.getEntities({
            type: BLAZE_ENTITY_TYPE,
            location: target,
            maxDistance: 0.18
        }).find(entity => {
            try {
                return entity?.isValid
                    && entity.hasTag(BLAZE_ENTITY_TAG)
                    && !entity.getTags().some(tag => tag.startsWith("create_blaze_burner:"))
            } catch { return false }
        })
        if (legacy?.isValid) {
            try { legacy.addTag(anchorTag) } catch {}
            entities = [legacy]
        }
    }

    return entities.filter(entity => {
        try { return entity?.isValid && entity.hasTag(BLAZE_ENTITY_TAG) && entity.hasTag(anchorTag) } catch {}
        return false
    })
}

function cleanupDuplicateBlazeBurnerEntities(block, keepEntity) {
    for (const entity of getBlazeBurnerEntities(block)) {
        if (!entity?.isValid || entity.id === keepEntity?.id) continue
        try { entity.triggerEvent("create:despawn") } catch {
            try { entity.remove() } catch {}
        }
    }
}

function getBlazeBurnerEntityLocation(block) {
    return {
        x: block.location.x + 0.5,
        y: block.location.y,
        z: block.location.z + 0.5
    }
}

function blazeBurnerFlameAnchorTag(block) {
    return `create_blaze_burner_flame:${block.x}:${block.y}:${block.z}`
}

function getBlazeBurnerFlameLocation(block) {
    return {
        x: block.location.x + 0.5,
        y: block.location.y + 0.02,
        z: block.location.z + 0.5
    }
}

function ensureBlazeBurnerFlame(block, superheated = false) {
    const anchorTag = blazeBurnerFlameAnchorTag(block)
    const flames = block.dimension.getEntities({
        type: BLAZE_FLAME_ENTITY_TYPE,
        tags: [anchorTag]
    }) ?? []
    const flame = flames.find(entity => entity?.isValid)
    const target = getBlazeBurnerFlameLocation(block)

    if (flame) {
        try { flame.clearVelocity() } catch {}
        try { flame.teleport(target) } catch {}
        try { flame.setProperty(BLAZE_SUPERHEATED_PROPERTY, superheated) } catch {}
        for (const duplicate of flames) {
            if (!duplicate?.isValid || duplicate.id === flame.id) continue
            try { duplicate.triggerEvent("create:despawn") } catch { try { duplicate.remove() } catch {} }
        }
        return flame
    }

    const entity = block.dimension.spawnEntity(BLAZE_FLAME_ENTITY_TYPE, target)
    try { entity.addTag(BLAZE_FLAME_ENTITY_TAG) } catch {}
    try { entity.addTag(anchorTag) } catch {}
    try { entity.setProperty(BLAZE_SUPERHEATED_PROPERTY, superheated) } catch {}
    return entity
}

function removeBlazeBurnerFlames(block) {
    if (!block?.dimension) return
    const flames = block.dimension.getEntities({
        type: BLAZE_FLAME_ENTITY_TYPE,
        tags: [blazeBurnerFlameAnchorTag(block)]
    }) ?? []
    for (const flame of flames) {
        try { flame.triggerEvent("create:despawn") } catch { try { flame.remove() } catch {} }
    }
}

function syncBlazeBurnerEntityLocation(block, entity) {
    const target = getBlazeBurnerEntityLocation(block)
    const loc = entity.location
    try { entity.clearVelocity() } catch {}
    if (Math.abs(loc.x - target.x) < 0.001 && Math.abs(loc.y - target.y) < 0.001 && Math.abs(loc.z - target.z) < 0.001) return
    try { entity.teleport(target) } catch {}
}

function rotateBlazeTowardNearestPlayer(block, entity) {
    const player = block.dimension.getPlayers({
        location: block.center(),
        maxDistance: 8,
        closest: 1
    })?.[0]
    if (!player) return

    const loc = entity.location
    const dx = player.location.x - loc.x
    const dz = player.location.z - loc.z
    const targetYaw = Math.atan2(dx, dz) * 180 / Math.PI
    const currentYaw = Number(entity.getProperty(BLAZE_ROTATION_PROPERTY) ?? 0)
    const yaw = currentYaw + wrapDegrees(targetYaw - currentYaw) * BLAZE_ROTATION_SPEED
    try { entity.setProperty(BLAZE_ROTATION_PROPERTY, yaw) } catch {}
}

function tickActiveBlazeEffects(block, entity) {
    const currentTick = mc.system.currentTick ?? 0
    if (currentTick % BLAZE_PARTICLE_INTERVAL === 0) spawnBlazeFireParticle(block, isBlazeSuperheated(entity))

    const lastSoundTick = Number(entity.getDynamicProperty("create:last_blaze_sound_tick") ?? 0)
    if (currentTick - lastSoundTick >= BLAZE_SOUND_INTERVAL) {
        try { entity.setDynamicProperty("create:last_blaze_sound_tick", currentTick) } catch {}
        try { block.dimension.playSound("mob.blaze.breathe", block.center(), { volume: 0.38, pitch: 0.85 + Math.random() * 0.25 }) } catch {}
    }
}

function tickInertBlazeEffects(block) {
    const currentTick = mc.system.currentTick ?? 0
    if (currentTick % BLAZE_INERT_SMOKE_INTERVAL !== 0) return
    const location = {
        x: block.location.x + 0.5 + (Math.random() - 0.5) * 0.28,
        y: block.location.y + 0.72 + Math.random() * 0.28,
        z: block.location.z + 0.5 + (Math.random() - 0.5) * 0.28
    }
    try { block.dimension.spawnParticle("minecraft:basic_smoke_particle", location) } catch {
        try { block.dimension.spawnParticle("minecraft:campfire_smoke_particle", location) } catch {}
    }
}

function spawnBlazeFireParticle(block, superheated = false) {
    const amount = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < amount; i++) {
        const location = {
            x: block.location.x + 0.5 + (Math.random() - 0.5) * 0.72,
            y: block.location.y + 0.72 + Math.random() * 0.82,
            z: block.location.z + 0.5 + (Math.random() - 0.5) * 0.72
        }
        try { block.dimension.spawnParticle(superheated ? "minecraft:blue_flame_particle" : "minecraft:basic_flame_particle", location) } catch {
            try { block.dimension.spawnParticle("minecraft:mobflame_single", location) } catch {}
        }
    }
    if (Math.random() < 0.45) {
        const smokeLocation = {
            x: block.location.x + 0.5 + (Math.random() - 0.5) * 0.48,
            y: block.location.y + 1.05 + Math.random() * 0.58,
            z: block.location.z + 0.5 + (Math.random() - 0.5) * 0.48
        }
        try { block.dimension.spawnParticle("minecraft:basic_smoke_particle", smokeLocation) } catch {}
    }
}

function spawnBlazeFireBurst(block, superheated = false) {
    for (let i = 0; i < 22; i++) {
        mc.system.runTimeout(() => {
            const angle = Math.random() * Math.PI * 2
            const radius = 0.22 + Math.random() * 0.62
            const location = {
                x: block.location.x + 0.5 + Math.cos(angle) * radius,
                y: block.location.y + 0.35 + Math.random() * 0.95,
                z: block.location.z + 0.5 + Math.sin(angle) * radius
            }
            try { block.dimension.spawnParticle(superheated ? "minecraft:blue_flame_particle" : "minecraft:basic_flame_particle", location) } catch {
                try { block.dimension.spawnParticle("minecraft:mobflame_single", location) } catch {}
            }
        }, Math.floor(i / 4))
    }
}

function isBlazeBurnerActive(entity) {
    try { return entity.getProperty(BLAZE_ACTIVE_PROPERTY) === true } catch {}
    return false
}

function isBlazeSuperheated(entity) {
    try { return entity.getProperty(BLAZE_SUPERHEATED_PROPERTY) === true } catch {}
    return false
}

// Apenas Blaze Cake usa a variante superheated. Qualquer combustível normal
// troca o burner imediatamente de volta para a aparência ativa comum.
function setBlazeFuelVariant(entity, item) {
    const creativeFuel = isCreativeBlazeCake(item)
    try { entity.setProperty(BLAZE_SUPERHEATED_PROPERTY, item?.typeId === "create:blaze_cake" || creativeFuel) } catch {}
    try { entity.setDynamicProperty(BLAZE_CREATIVE_FUEL_PROPERTY, creativeFuel) } catch {}
}

function isCreativeBlazeCake(item) {
    return item?.typeId === "create:creative_blaze_cake"
}

function captureBlazeIntoBurner(player, source) {
    const dimension = source.dimension ?? player.dimension
    const location = source.location ?? source.center?.() ?? player.location

    replaceMainhandWithFilledBurner(player)
    spawnBlazeCaptureBurst(dimension, location)
    try { dimension.playSound("mob.blaze.breathe", location, { volume: 1.35, pitch: 0.9 }) } catch {}
    try { dimension.playSound("fire.ignite", location, { volume: 1.15, pitch: 1.0 }) } catch {}
}

function replaceMainhandWithFilledBurner(player) {
    const equippable = player.getComponent("equippable")
    const stack = equippable?.getEquipment("Mainhand")
    if (!stack || !isEmptyBlazeBurnerItem(stack)) return

    const filledBurner = new mc.ItemStack(BLAZE_BURNER_TYPE, 1)
    if (stack.amount > 1) {
        stack.amount -= 1
        try { equippable.setEquipment("Mainhand", stack) } catch {}
        giveOrDropFilledBurner(player, filledBurner)
        return
    }

    try { equippable.setEquipment("Mainhand", filledBurner) } catch {}
}

function isEmptyBlazeBurnerItem(item) {
    return item?.typeId === EMPTY_BLAZE_BURNER_TYPE
}

function giveOrDropFilledBurner(player, itemStack) {
    try {
        const inventory = player.getComponent("inventory")?.container
        const leftover = inventory?.addItem(itemStack)
        if (!leftover) return
        player.dimension.spawnItem(leftover, player.location)
    } catch {
        try { player.dimension.spawnItem(itemStack, player.location) } catch {}
    }
}

function spawnBlazeCaptureBurst(dimension, location) {
    for (let i = 0; i < 28; i++) {
        mc.system.runTimeout(() => {
            const angle = Math.random() * Math.PI * 2
            const radius = 0.18 + Math.random() * 0.85
            const pos = {
                x: location.x + Math.cos(angle) * radius,
                y: location.y + 0.35 + Math.random() * 1.15,
                z: location.z + Math.sin(angle) * radius
            }
            try { dimension.spawnParticle("minecraft:basic_flame_particle", pos) } catch {
                try { dimension.spawnParticle("minecraft:mobflame_single", pos) } catch {}
            }
        }, Math.floor(i / 5))
    }
}

function wrapDegrees(value) {
    let wrapped = value % 360
    if (wrapped >= 180) wrapped -= 360
    if (wrapped < -180) wrapped += 360
    return wrapped
}

function isFurnaceFuel(item) {
    return getFuelBurnTicks(item) > 0
}

export function isBlazeBurnerFuel(item) {
    return getFuelBurnTicks(item) > 0
}

function getFuelBurnTicks(item) {
    if (!item?.typeId) return 0
    if (isCreativeBlazeCake(item)) return 1
    if (FURNACE_FUEL_TICKS[item.typeId]) return FURNACE_FUEL_TICKS[item.typeId]
    for (const [suffix, ticks] of FUEL_SUFFIX_TICKS) {
        if (item.typeId.endsWith(suffix)) return ticks
    }
    return 0
}

function extendBlazeBurnTime(entity, burnTicks) {
    const currentTick = mc.system.currentTick ?? 0
    const activeUntil = Number(entity.getDynamicProperty(BLAZE_ACTIVE_UNTIL_PROPERTY) ?? 0)
    try { entity.setDynamicProperty(BLAZE_ACTIVE_UNTIL_PROPERTY, Math.max(currentTick, activeUntil) + burnTicks) } catch {}
}

function shouldDeactivateBlaze(entity) {
    try { if (entity.getDynamicProperty(BLAZE_CREATIVE_FUEL_PROPERTY) === true) return false } catch {}
    const activeUntil = Number(entity.getDynamicProperty(BLAZE_ACTIVE_UNTIL_PROPERTY) ?? 0)
    return activeUntil > 0 && (mc.system.currentTick ?? 0) >= activeUntil
}

function consumeBlazeBurnerFuel(player, item) {
    if (item?.typeId === "minecraft:lava_bucket") {
        const equippable = player.getComponent("equippable")
        const stack = equippable?.getEquipment("Mainhand")
        if (stack?.amount === 1) {
            try { equippable.setEquipment("Mainhand", new mc.ItemStack("minecraft:bucket", 1)) } catch {}
            return
        }
    }
    racoAPI.clearMainhand(player, 1)
}
