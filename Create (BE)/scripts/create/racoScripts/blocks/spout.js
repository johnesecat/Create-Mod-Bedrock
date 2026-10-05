import * as mc from "@minecraft/server";
import * as racoAPI from "../raco-API.js";
import { compatibilityFluids, compatibilityRecipes } from "../../compatibility/registries.js";

const FLUID_OFFSET_Y = -0.35;
const SPOUT_BICK_OFFSET_Y = -0.50;
const SPOUT_PROCESS_TICKS = 30;
const POUR_FINISH_DELAY = 24;
const CENTER_TOLERANCE = 0.08;
const spoutCooldowns = new Map();

const SPOUT_RECIPES = [
    {
        fluid: "minecraft:lava_bucket",
        input: "minecraft:bucket",
        output: "minecraft:lava_bucket"
    },
    {
        fluid: "minecraft:lava_bucket",
        input: "create:blaze_cake_base",
        output: "create:blaze_cake"
    },
    {
        fluid: "minecraft:water_bucket",
        input: "minecraft:bucket",
        output: "minecraft:water_bucket"
    },
    {
        fluid: "minecraft:water_bucket",
        input: "minecraft:glass_bottle",
        output: "minecraft:potion"
    },
    {
        fluid: "minecraft:water_bucket",
        input: "minecraft:dirt",
        output: "minecraft:grass_block"
    },
    {
        fluid: "create:honey_bucket",
        input: "minecraft:bucket",
        output: "create:honey_bucket"
    },
    {
        fluid: "create:honey_bucket",
        input: "minecraft:apple",
        output: "create:honeyed_apple"
    },
    {
        fluid: "create:chocolate_bucket",
        input: "minecraft:bucket",
        output: "create:chocolate_bucket"
    },
    {
        fluid: "create:chocolate_bucket",
        input: "minecraft:sweet_berries",
        output: "create:chocolate_glazed_berries"
    },
    {
        fluid: "create:chocolate_bucket",
        input: "minecraft:glow_berries",
        output: "create:chocolate_glazed_berries"
    },
    {
        fluid: "minecraft:milk_bucket",
        input: "minecraft:bucket",
        output: "minecraft:milk_bucket"
    },
    {
        fluid: "minecraft:milk_bucket",
        input: "minecraft:bread",
        output: "create:sweet_roll"
    }
];

const SPOUT_FLUIDS = {
    "minecraft:lava_bucket": {
        type: "lava",
        fillSound: "bucket.empty_lava",
        fallParticle: "create:spout_lava_fall",
        splashParticle: "minecraft:lava_particle"
    },
    "minecraft:water_bucket": {
        type: "water",
        fillSound: "bucket.empty_water",
        fallParticle: "create:spout_water_fall",
        splashParticle: "minecraft:water_drip_particle"
    },
    "create:honey_bucket": {
        type: "honey",
        fillSound: "place.honey_block",
        fallParticle: "create:spout_honey_fall",
        fallOffsetY: -0.14
    },
    "create:chocolate_bucket": {
        type: "chocolate",
        fillSound: "place.honey_block",
        fallParticle: "create:spout_chocolate_fall",
        fallOffsetY: -0.14
    },
    "minecraft:milk_bucket": {
        type: "milk",
        fillSound: "bucket.fill_water",
        fallParticle: "create:spout_milk_fall",
        fallOffsetY: -0.14
    }
};

function getSpoutFluid(fluidOrBucketId) {
    return SPOUT_FLUIDS[fluidOrBucketId]
        ?? compatibilityFluids.get(fluidOrBucketId)
        ?? [...compatibilityFluids.values()].find((fluid) => fluid.bucket === fluidOrBucketId);
}

function resolveSpoutFluidId(fluidOrBucketId) {
    const config = getSpoutFluid(fluidOrBucketId);
    return config?.id ?? (SPOUT_FLUIDS[fluidOrBucketId] ? fluidOrBucketId : undefined);
}

function spoutKey(block) {
    return `${block.dimension.id}:${block.x}:${block.y}:${block.z}`;
}

function spoutFluidStateKey(block) {
    return `create:spout_fluid:${spoutKey(block)}`;
}

function saveSpoutFluid(block, fluidId) {
    try { mc.world.setDynamicProperty(spoutFluidStateKey(block), fluidId); } catch {}
}

function loadSpoutFluid(block) {
    try {
        const fluidId = mc.world.getDynamicProperty(spoutFluidStateKey(block));
        return typeof fluidId === "string" && getSpoutFluid(fluidId) ? fluidId : undefined;
    } catch { return undefined; }
}

function clearSpoutFluid(block) {
    try { mc.world.setDynamicProperty(spoutFluidStateKey(block), undefined); } catch {}
}

function getFluidLocation(block) {
    const center = block.center();
    return {
        x: center.x,
        y: center.y + FLUID_OFFSET_Y,
        z: center.z
    };
}

function getSpoutEntity(block) {
    return block.dimension.getEntities({
        location: getFluidLocation(block),
        maxDistance: 0.65,
        type: "create:fluid_spout",
        closest: 1
    })[0] ?? null;
}

function getSpoutBickLocation(block) {
    const center = block.center();
    return {
        x: center.x,
        y: center.y + SPOUT_BICK_OFFSET_Y,
        z: center.z
    };
}

function getSpoutBickEntity(block) {
    return block.dimension.getEntities({
        location: getSpoutBickLocation(block),
        maxDistance: 0.5,
        type: "create:spout_bick",
        closest: 1
    })[0] ?? null;
}

function ensureSpoutBickEntity(block) {
    let entity = getSpoutBickEntity(block);
    if (!entity) entity = block.dimension.spawnEntity("create:spout_bick", getSpoutBickLocation(block));

    const cardinal = getState(block, "minecraft:cardinal_direction")
        ?? getState(block, "create:direction")
        ?? "south";

    try { entity.setProperty("create:cardinal_rotation", cardinal); } catch {}
    try { entity.teleport(getSpoutBickLocation(block)); } catch {}
    return entity;
}

function setSpoutBickPouring(block, value) {
    try { getSpoutBickEntity(block)?.setProperty("create:pouring", value); } catch {}
}

function removeSpoutVisualEntities(block) {
    setSpoutBickPouring(block, false);
    try { getSpoutEntity(block)?.remove(); } catch {}
    try { getSpoutBickEntity(block)?.remove(); } catch {}
    clearSpoutFluid(block);
}

function hasNextSpoutRecipe(block, fluidId) {
    const targetBlock = block?.below?.(2);
    if (!isValidSpoutTarget(targetBlock)) return false;
    const itemEntity = getSurfaceItemEntity(targetBlock);
    const item = itemEntity?.getComponent("minecraft:inventory")?.container?.getItem(0);
    return !!getSpoutRecipe(fluidId, item?.typeId);
}

function finishSpoutPour(block, fluidId) {
    // Keep the fluid entity alive between recipes. The bick is replaced before
    // the next cycle, guaranteeing its client animation starts at frame zero
    // without making the Spout itself flicker back into an empty block.
    spoutCooldowns.set(spoutKey(block), mc.system.currentTick + POUR_FINISH_DELAY + 1);
    try { getSpoutEntity(block)?.setDynamicProperty("create:movement_info", undefined); } catch {}
    setSpoutBickPouring(block, false);
    mc.system.runTimeout(() => {
        const liveBlock = block?.dimension?.getBlock?.(block.location);
        if (!liveBlock || liveBlock.typeId !== "create:spout") return;
        const entity = getSpoutEntity(liveBlock);
        const storedFluid = getStoredFluid(entity);
        if (entity?.isValid && storedFluid === fluidId && hasNextSpoutRecipe(liveBlock, fluidId)) {
            // The following tick creates a fresh bick and starts its animation.
            try { getSpoutBickEntity(liveBlock)?.remove(); } catch {}
            setSpoutHasFluid(liveBlock, true);
            return;
        }
        setSpoutHasFluid(liveBlock, false);
        removeSpoutVisualEntities(liveBlock);
    }, POUR_FINISH_DELAY);
}

function getStoredFluid(entity) {
    return resolveSpoutFluidId(entity?.getComponent("minecraft:inventory")?.container?.getItem(0)?.typeId);
}

function setSpoutHasFluid(block, value) {
    try { racoAPI.setPermutation(block, "create:has_lava", value); } catch {}
}

function isValidSpoutTarget(block) {
    return block?.typeId === "create:depot" || block?.typeId === "create:mechanical_belt";
}

function getSurfaceItemEntity(targetBlock) {
    const itemPos = {
        x: targetBlock.x + 0.5,
        y: targetBlock.y + 13 / 16,
        z: targetBlock.z + 0.5
    };
    const isBelt = targetBlock.typeId === "create:mechanical_belt";

    const targets = targetBlock.dimension.getEntities({
        type: "create:conveyor_item",
        location: itemPos,
        maxDistance: isBelt ? 0.8 : 0.12
    });

    const exactTarget = (targets ?? []).find(entity =>
        Math.floor(entity.location.x) === targetBlock.x &&
        Math.floor(entity.location.z) === targetBlock.z &&
        (isBelt ||
            (Math.abs(entity.location.x - itemPos.x) <= CENTER_TOLERANCE &&
             Math.abs(entity.location.z - itemPos.z) <= CENTER_TOLERANCE))
    );
    if (exactTarget) return exactTarget;

    return null;
}

function centerItemOnTarget(itemEntity, targetBlock) {
    try {
        itemEntity.teleport({
            x: targetBlock.x + 0.5,
            y: targetBlock.y + 13 / 16,
            z: targetBlock.z + 0.5
        });
    } catch {}
}

function getSpoutRecipe(fluidId, itemId) {
    return compatibilityRecipes.spouting.find(recipe => recipe.fluid === fluidId && recipe.input === itemId)
        ?? SPOUT_RECIPES.find(recipe => recipe.fluid === fluidId && recipe.input === itemId);
}

function spawnFluidFlowParticles(block, fluidId) {
    const center = block.center();
    const baseX = center.x;
    const baseZ = center.z;
    const topY = block.location.y - 0.15;
    const bottomY = block.location.y - 1.35;
    const config = getSpoutFluid(fluidId);
    if (config?.fallParticle) {
        try { block.dimension.spawnParticle(config.fallParticle, { x: baseX, y: topY + (config.fallOffsetY ?? 0), z: baseZ }); } catch {}
        return;
    }

    const particle = config?.splashParticle ?? "minecraft:water_drip_particle";
    const streamPoints = fluidId === "create:honey_bucket" ? 10 : 12;
    const streamWidth = fluidId === "create:honey_bucket" ? 0.08 : 0.1;
    const fallSpeed = fluidId === "create:honey_bucket" ? 0.18 : 0.26;
    const tick = mc.system.currentTick;

    for (let i = 0; i < streamPoints; i++) {
        const progress = (tick * fallSpeed + i / streamPoints + Math.random() * 0.12) % 1;
        const y = topY + (bottomY - topY) * progress;
        const spread = streamWidth * (0.35 + progress * 0.65);
        const x = baseX + (Math.random() - 0.5) * spread;
        const z = baseZ + (Math.random() - 0.5) * spread;

        try { block.dimension.spawnParticle(particle, { x, y, z }); } catch {}
    }

}

function setPlayerMainhand(player, itemId) {
    if (player?.getGameMode?.() === "Creative") return;

    const equippable = player?.getComponent(mc.EntityComponentTypes.Equippable);
    if (!equippable) return;

    equippable.setEquipment(mc.EquipmentSlot.Mainhand, new mc.ItemStack(itemId, 1));
}

function getState(block, stateId) {
    try { return block.permutation.getState(stateId); }
    catch { return undefined; }
}

function playFillSound(block, fluidId) {
    const sound = getSpoutFluid(fluidId)?.fillSound ?? getSpoutFluid(fluidId)?.sound ?? "bucket.empty_water";
    try { block.dimension.playSound(sound, block.center()); }
    catch {}
}

function spawnSpoutSplashEntity(block, fluidId) {
    try {
        // O modelo cresce para baixo a partir do pivô. Por isso ele deve
        // nascer na boca do Spout, e não na posição do item.
        const splash = block.dimension.spawnEntity(
            "create:spolt_splax",
            getSpoutBickLocation(block)
        );
        const config = getSpoutFluid(fluidId);
        splash.setProperty("create:fluid_type", config?.type ?? config?.visualType ?? "water");
    } catch {}
}

function spawnSpoutSplash(block, location, fluidId) {
    if (!getSpoutFluid(fluidId)?.splashParticle && fluidId !== "minecraft:lava_bucket") return;

    const splashLocation = {
        x: location.x,
        y: location.y + 0.08,
        z: location.z
    };

    for (let i = 0; i < 4; i++) {
        const pos = {
            x: splashLocation.x + (Math.random() - 0.5) * 0.22,
            y: splashLocation.y + Math.random() * 0.08,
            z: splashLocation.z + (Math.random() - 0.5) * 0.22
        };
        const particle = getSpoutFluid(fluidId)?.splashParticle;
        if (particle) {
            try { block.dimension.spawnParticle(particle, pos); } catch {}
        } else if (fluidId === "minecraft:lava_bucket") {
            try { block.dimension.spawnParticle("minecraft:lava_particle", pos); }
            catch {
                try { block.dimension.spawnParticle("minecraft:lava_drip_particle", pos); } catch {}
            }
        }
    }
}

function fillSpoutEntity(entity, fluidId) {
    const container = entity.getComponent("minecraft:inventory")?.container;
    const config = getSpoutFluid(fluidId);
    const fluidStack = new mc.ItemStack(config?.bucket ?? fluidId ?? "minecraft:lava_bucket", 1);
    fluidStack.amount = 1;

    container?.setItem(0, fluidStack);
    entity.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${fluidStack.typeId}`);
    try { entity.setProperty("create:type", "item"); } catch {}
    try { entity.setProperty("create:fluid_type", config?.type ?? config?.visualType ?? "lava"); } catch {}
}

export function receiveSpoutFluid(block, fluidId) {
    if (!block || block.typeId !== "create:spout") return false;
    if (!getSpoutFluid(fluidId)) return false;

    const existing = getSpoutEntity(block);
    if (existing) {
        const stored = existing.getComponent("minecraft:inventory")?.container?.getItem(0);
        if (getSpoutFluid(stored?.typeId)) return false;

        fillSpoutEntity(existing, fluidId);
        saveSpoutFluid(block, fluidId);
        setSpoutHasFluid(block, true);
        ensureSpoutBickEntity(block);
        return true;
    }

    const entity = block.dimension.spawnEntity("create:fluid_spout", getFluidLocation(block));
    if (!entity) return false;

    const cardinal = getState(block, "minecraft:cardinal_direction")
        ?? getState(block, "create:direction")
        ?? "south";

    try { entity.setProperty("create:cardinal_rotation", cardinal); } catch {}
    fillSpoutEntity(entity, fluidId);
    saveSpoutFluid(block, fluidId);
    setSpoutHasFluid(block, true);
    ensureSpoutBickEntity(block);
    playFillSound(block, fluidId);
    return true;
}

export function onInteractSpout(block, player, item) {
    return;
}

export function spoutBreak(block) {
    if (!block) return;
    spoutCooldowns.delete(spoutKey(block));
    removeSpoutVisualEntities(block);
}

export function spoutTick(block) {
    if (!block || block.typeId !== "create:spout") return;

    const key = spoutKey(block);
    const cooldownUntil = spoutCooldowns.get(key);
    if (cooldownUntil && mc.system.currentTick < cooldownUntil) return;
    if (cooldownUntil) spoutCooldowns.delete(key);

    const targetBlock = block.below?.(2);
    if (!isValidSpoutTarget(targetBlock)) return;

    const hasFluid = getState(block, "create:has_lava") === true;
    if (!hasFluid && mc.system.currentTick % 10 !== 0) return;

    const spoutEntity = getSpoutEntity(block);
    if (!spoutEntity) {
        if (hasFluid) {
            // Entities are not guaranteed to survive leaving/re-entering a
            // loaded area. Restore the fluid visual from persistent state so
            // the Spout resumes without having to be broken and replaced.
            const savedFluid = loadSpoutFluid(block);
            if (savedFluid) {
                const restored = block.dimension.spawnEntity("create:fluid_spout", getFluidLocation(block));
                if (restored) {
                    const cardinal = getState(block, "minecraft:cardinal_direction")
                        ?? getState(block, "create:direction")
                        ?? "south";
                    try { restored.setProperty("create:cardinal_rotation", cardinal); } catch {}
                    fillSpoutEntity(restored, savedFluid);
                    ensureSpoutBickEntity(block);
                    return;
                }
            }
            try { getSpoutBickEntity(block)?.remove(); } catch {}
        }
        setSpoutHasFluid(block, false);
        clearSpoutFluid(block);
        return;
    }

    const fluidId = getStoredFluid(spoutEntity);
    if (!getSpoutFluid(fluidId)) {
        if (hasFluid) {
            try { getSpoutBickEntity(block)?.remove(); } catch {}
        }
        setSpoutHasFluid(block, false);
        clearSpoutFluid(block);
        return;
    }
    try {
        const config = getSpoutFluid(fluidId);
        spoutEntity.setProperty("create:fluid_type", config?.type ?? config?.visualType ?? "lava");
    } catch {}
    ensureSpoutBickEntity(block);

    const itemEntity = getSurfaceItemEntity(targetBlock);
    const container = itemEntity?.getComponent("minecraft:inventory")?.container;
    const input = container?.getItem(0);
    const recipe = getSpoutRecipe(fluidId, input?.typeId);
    if (!recipe) {
        try { spoutEntity.setDynamicProperty("create:movement_info", undefined); } catch {}
        setSpoutBickPouring(block, false);
        return;
    }

    const now = mc.system.currentTick;

    const movementInfo = spoutEntity.getDynamicProperty("create:movement_info");
    if (!movementInfo) {
        if (targetBlock.typeId === "create:mechanical_belt") {
            centerItemOnTarget(itemEntity, targetBlock);
            itemEntity?.addTag("create:conveyor_stop");
        }
        try { spoutEntity.setDynamicProperty("create:movement_info", JSON.stringify({
            startTick: now,
            interactTick: now + Math.ceil(SPOUT_PROCESS_TICKS / 2),
            endTick: now + SPOUT_PROCESS_TICKS
        })); } catch {}
        setSpoutBickPouring(block, true);
        spawnSpoutSplashEntity(block, fluidId);
        try { block.dimension.playSound("create:spout", block.center()); } catch {}
        playFillSound(block, fluidId);
        return;
    }

    const data = JSON.parse(movementInfo);
    spawnFluidFlowParticles(block, fluidId);

    if (now >= data.interactTick && !data.interacted) {
        const currentInput = container?.getItem(0);
        const currentRecipe = getSpoutRecipe(fluidId, currentInput?.typeId);

        if (currentRecipe) {
            // processOneConveyorItem pode remover/substituir a entidade visual.
            // Salva a posição antes para o splash sempre nascer no item processado.
            const processLocation = {
                x: itemEntity.location.x,
                y: itemEntity.location.y,
                z: itemEntity.location.z
            };
            const output = new mc.ItemStack(currentRecipe.output, 1);
            racoAPI.processOneConveyorItem(itemEntity, output, processLocation);
            spawnSpoutSplash(block, processLocation, fluidId);
            try {
                itemEntity.setDynamicProperty("create:release_from", JSON.stringify({
                    x: targetBlock.x,
                    y: targetBlock.y,
                    z: targetBlock.z,
                    tick: now
                }));
            } catch {}
            try { itemEntity.removeTag("create:conveyor_stop"); } catch {}
            playFillSound(block, fluidId);
            finishSpoutPour(block, fluidId);
            return;
        }

        data.interacted = true;
        try { spoutEntity.setDynamicProperty("create:movement_info", JSON.stringify(data)); } catch {}
    }

    if (now >= data.endTick) {
        try { itemEntity?.removeTag("create:conveyor_stop"); } catch {}
        setSpoutBickPouring(block, false);
        try { spoutEntity.setDynamicProperty("create:movement_info", undefined); } catch {}
    }
}
