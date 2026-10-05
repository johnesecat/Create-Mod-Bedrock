import { system, world } from "@minecraft/server";
import { rpmConfig, registerRpmBlock } from "../andrielScripts/rpm/rpmConfigs.js";
import { recalculateNetwork } from "../andrielScripts/rpm/rpmCore.js";
import {
    getFluidTankInfo, receiveFluidTankFluid, takeFluidTankFluid,
    peekFluidTankFluid, refreshFluidTankVisual
} from "../tank/fluidTank.js";
import {
    compatibilityFluids, compatibilityFluidsByBlock,
    compatibilityFluidsByBucket, compatibilityRecipes,
    getCompatibilityFluid, resolveCompatibilityFluidId
} from "./registries.js";
import { receiveSpoutFluid } from "../racoScripts/blocks/spout.js";
import { peekItemDrainFluid, receiveItemDrainFluid, takeItemDrainFluid } from "../racoScripts/blocks/itemDrain.js";

const ID = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;
const FAN_MACHINES = new Set(["blasting", "smoking", "splashing", "haunting"]);
const MACHINES = new Set([
    "millstone", "crushing", "pressing", "mixing", "spouting",
    ...FAN_MACHINES, "sequenced", "crafting", "crafting_shapeless"
]);
const SEQUENCED_OPERATIONS = new Set(["deploy", "press", "spout", "cut"]);
const FLUID_VISUAL_TYPES = new Set(["water", "lava", "honey", "chocolate", "milk"]);

function id(value, field) {
    if (typeof value !== "string" || !ID.test(value)) throw new Error(`[Create Compat] ${field} must be a namespaced identifier.`);
    return value;
}
function positive(value, field, fallback) {
    const number = value === undefined ? fallback : Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new Error(`[Create Compat] ${field} must be greater than zero.`);
    return number;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function normalizeOutputs(outputs) {
    if (!Array.isArray(outputs) || outputs.length === 0) throw new Error("[Create Compat] outputs cannot be empty.");
    return outputs.map((entry) => ({
        item: id(entry.item ?? entry.id, "outputs[].item"),
        count: Math.floor(positive(entry.count ?? entry.amount, "outputs[].count", 1)),
        chance: Math.max(0, Math.min(1, Number(entry.chance ?? 1)))
    }));
}

export function registerMachineRecipe(machine, definition) {
    if (!MACHINES.has(machine)) throw new Error(`[Create Compat] Unknown machine: ${machine}`);
    const data = clone(definition ?? {});
    if (machine === "millstone" || machine === "crushing") {
        const input = id(data.input, "input");
        compatibilityRecipes[machine].set(input, {
            duration: positive(data.duration, "duration", 100),
            particleRGB: data.particleRGB,
            output: normalizeOutputs(data.outputs ?? data.output)
        });
    } else if (FAN_MACHINES.has(machine)) {
        compatibilityRecipes[machine].set(id(data.input, "input"), normalizeOutputs(data.outputs ?? data.output));
    } else if (machine === "pressing") {
        compatibilityRecipes.pressing.set(id(data.input, "input"), {
            input: data.input, result: id(data.output ?? data.result, "output")
        });
    } else if (machine === "mixing") {
        if (!data.input || typeof data.input !== "object") throw new Error("[Create Compat] mixing.input must be an object.");
        for (const [itemId, count] of Object.entries(data.input)) {
            id(itemId, "mixing.input"); positive(count, `amount of ${itemId}`);
        }
        compatibilityRecipes.mixing.push(data);
    } else if (machine === "spouting") {
        compatibilityRecipes.spouting.push({
            fluid: id(data.fluid, "fluid"), input: id(data.input, "input"),
            output: id(data.output, "output"), amount: positive(data.amount, "amount", 250)
        });
    } else if (machine === "sequenced") {
        data.id = id(data.id, "sequenced.id");
        if (compatibilityRecipes.sequenced.some((recipe) => recipe.id === data.id)) {
            throw new Error(`[Create Compat] Duplicate sequenced recipe id: ${data.id}`);
        }
        const sourceSteps = data.steps ?? data.sequence;
        if (!Array.isArray(sourceSteps) || sourceSteps.length === 0) throw new Error("[Create Compat] sequenced.steps cannot be empty.");
        data.surface = id(data.surface ?? data.input, "sequenced.surface");
        data.result = id(data.result ?? data.output, "sequenced.result");
        data.inProgress = id(data.inProgress, "sequenced.inProgress");
        data.passes = Math.floor(positive(data.passes, "sequenced.passes", 1));
        data.steps = sourceSteps.map((step) => {
            const operation = step.operation ?? step.type ?? "deploy";
            if (!SEQUENCED_OPERATIONS.has(operation)) throw new Error(`[Create Compat] Unknown sequenced operation: ${operation}`);
            return {
                ...step,
                operation,
                held: step.held || step.item ? id(step.held ?? step.item, "sequenced.steps[].held") : undefined,
                keepHeld: Boolean(step.keepHeld)
            };
        });
        data.junk = Array.isArray(data.junk) ? data.junk : [];
        compatibilityRecipes.sequenced.push(data);
    } else {
        if (!data.result || typeof data.result !== "object") throw new Error(`[Create Compat] ${machine}.result must be an object.`);
        data.result.id = id(data.result.id, `${machine}.result.id`);
        data.result.amount = Math.floor(positive(data.result.amount, `${machine}.result.amount`, 1));
        if (machine === "crafting") {
            if (!Array.isArray(data.pattern) || !data.key || typeof data.key !== "object") throw new Error("[Create Compat] crafting requires pattern and key.");
        } else {
            data.shapeless = true;
            if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) throw new Error("[Create Compat] crafting_shapeless.ingredients cannot be empty.");
        }
        compatibilityRecipes[machine].push(data);
    }
    return true;
}

export function registerFluid(definition) {
    const data = clone(definition ?? {});
    const fluidId = id(data.id, "fluid.id");
    const visualType = String(data.visualType ?? data.fluidType ?? "water");
    if (!FLUID_VISUAL_TYPES.has(visualType)) {
        throw new Error(`[Create Compat] fluid.visualType must be one of: ${[...FLUID_VISUAL_TYPES].join(", ")}.`);
    }
    const fluid = {
        id: fluidId,
        bucket: data.bucket ? id(data.bucket, "fluid.bucket") : fluidId,
        visualType,
        fluidType: visualType,
        translationKey: typeof data.translationKey === "string" ? data.translationKey : undefined,
        empty: data.empty ? id(data.empty, "fluid.empty") : "minecraft:bucket",
        color: data.color,
        fillSound: data.fillSound,
        sound: data.sound ?? data.fillSound,
        particle: data.particle ?? data.splashParticle ?? data.fallParticle,
        jetParticle: data.jetParticle,
        block: data.block ? id(data.block, "fluid.block") : undefined,
        placeDelay: data.placeDelay,
        fallParticle: data.fallParticle,
        splashParticle: data.splashParticle
    };
    const previous = compatibilityFluids.get(fluidId);
    if (previous) {
        compatibilityFluidsByBucket.delete(previous.bucket);
        if (previous.block) compatibilityFluidsByBlock.delete(previous.block);
    }
    compatibilityFluids.set(fluidId, fluid);
    compatibilityFluidsByBucket.set(fluid.bucket, fluid);
    if (fluid.block) compatibilityFluidsByBlock.set(fluid.block, fluid);
    return true;
}

export function registerKineticBlock(blockId, config) {
    registerRpmBlock(id(blockId, "blockId"), config);
    return true;
}

export function refreshKineticNetwork(block) {
    if (!block?.dimension || !rpmConfig.has(block.typeId)) return false;
    system.runJob(recalculateNetwork(block, block.dimension, { eventType: "compatibility" }));
    return true;
}

export function setGeneratorRpm(block, rpm) {
    const config = block && rpmConfig.get(block.typeId);
    const speed = Number(rpm);
    if (!config?.isGenerator || !config.entityType || !Number.isFinite(speed) || Math.abs(speed) > 256) return false;
    const entity = block.dimension.getEntities({ type: config.entityType, location: block.center(), maxDistance: 0.75, closest: 1 })[0];
    if (!entity?.isValid) return false;
    try { entity.setDynamicProperty("create:generator_rpm", speed); } catch { return false; }
    return refreshKineticNetwork(block);
}

export const CreateCompatibility = Object.freeze({
    apiVersion: 2,
    recipes: Object.freeze({ register: registerMachineRecipe }),
    kinetics: Object.freeze({ registerBlock: registerKineticBlock, refreshNetwork: refreshKineticNetwork, setGeneratorRpm }),
    fluids: Object.freeze({
        register: registerFluid,
        get: getCompatibilityFluid,
        resolveId: resolveCompatibilityFluidId
    }),
    tanks: Object.freeze({
        getInfo: getFluidTankInfo, peek: peekFluidTankFluid,
        insert: receiveFluidTankFluid, extract: takeFluidTankFluid, refreshVisual: refreshFluidTankVisual
    }),
    containers: Object.freeze({
        spout: Object.freeze({ insert: receiveSpoutFluid }),
        drain: Object.freeze({ peek: peekItemDrainFluid, insert: receiveItemDrainFluid, extract: takeItemDrainFluid })
    })
});

// Cross-pack bridge: another behavior pack can call
// system.sendScriptEvent("create_compat:register_recipe", JSON.stringify(data)).
export function initCompatibilityBridge() {
    system.afterEvents.scriptEventReceive.subscribe((event) => {
        if (!event.id.startsWith("create_compat:")) return;
        try {
            const data = JSON.parse(event.message || "{}");
            let acknowledged = false;
            if (event.id === "create_compat:register_recipe") { registerMachineRecipe(data.machine, data.recipe ?? data); acknowledged = true; }
            else if (event.id === "create_compat:register_fluid") { registerFluid(data); acknowledged = true; }
            else if (event.id === "create_compat:register_kinetic") { registerKineticBlock(data.blockId, data.config); acknowledged = true; }
            else if (event.id === "create_compat:set_generator_rpm") {
                const block = event.sourceBlock ?? world.getDimension(data.dimension ?? "overworld").getBlock({ x: data.x, y: data.y, z: data.z });
                if (!setGeneratorRpm(block, data.rpm)) throw new Error("Generator block, visual entity, or RPM value is invalid.");
                acknowledged = true;
            }
            if (acknowledged) {
                system.sendScriptEvent("create_compat:registration_ack", JSON.stringify({
                    ok: true, requestId: data.requestId, event: event.id
                }));
            }
        } catch (error) {
            console.error(`[Create Compat] ${event.id}: ${error}`);
            system.sendScriptEvent("create_compat:registration_ack", JSON.stringify({ ok: false, event: event.id, error: String(error) }));
        }
    });
}

export default CreateCompatibility;
