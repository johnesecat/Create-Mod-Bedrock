import { world, system, ItemStack, MolangVariableMap } from "@minecraft/server";
import { DIRECTION_OFFSETS, INVERT_FACE, posToKey } from "../rpm/rpmHelpers";
import { isSolid, rotationToFace } from "../xZ-Utils";
import * as racoAPI from "../../racoScripts/raco-API.js";
import { resetDepotVisualsForBlock } from "../../racoScripts/blocks/depot.js";
import { compatibilityRecipes } from "../../compatibility/registries.js";

const fanData = new Map();
const itemProcessingData = new Map();
const fanConfig = {
    maxDistance: 20,
    minDistance: 3,
    rpmArgmax: 256,
    entitySearchRate: 12,
    blockCheckRate: 10,
    processingTime: 150,
};
const FAN_IGNORED_VISUAL_ENTITIES = new Set([
    "create:brass_funnel_entity",
    "create:chute_smart_filter",
    "create:deployer_filter",
    "create:smart_fluid_pipe_filter",
    "create:mechanical_crafter_item",
    "create:mechanical_crafter_entity"
]);
const FAN_FRONT_FACE_DISTANCE = 0.5;

export function encasedFanTick(block, dimension) {
    const currentTick = system.currentTick;
    const entity = dimension.getEntities({ location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity` })[0];
    if (!entity) return;

    const rpm = entity.getProperty("create:rpm") ?? 0;
    if (rpm === 0) {
        encasedFanDeleteData(block);
        return;
    }

    const blockRotation = block.permutation.getState("minecraft:facing_direction");
    const airFaceDir = rotationToFace[INVERT_FACE[blockRotation]];
    if (applyNozzleAirflow(block, dimension, airFaceDir, rpm, currentTick)) {
        encasedFanDeleteData(block);
        return;
    }
    const blockKey = posToKey(block.x, block.y, block.z);
    let blockData = fanData.get(blockKey);

    if (!blockData) {
        blockData = {
            airFlowDistance: 0,
            segments: [],
            pushing: true,
            direction: airFaceDir,
            caughtEntities: [],
            segmentEntities: [],
            frontProcessingSignature: undefined,
            needsRebuild: true,
        };
        fanData.set(blockKey, blockData);
    }

    // Lava, água e fogueiras normalmente ficam encostadas no Fan. Confere esse
    // bloco todo tick para trocar imediatamente entre vento processado e normal.
    const frontProcessingSignature = getFrontProcessingSignature(block, dimension, airFaceDir);
    if (frontProcessingSignature !== blockData.frontProcessingSignature) {
        blockData.frontProcessingSignature = frontProcessingSignature;
        blockData.needsRebuild = true;
    }
    if (currentTick % fanConfig.blockCheckRate === 0) blockData.needsRebuild = true;
    if (blockData.needsRebuild) {
        blockData.needsRebuild = false;
        if (!airFaceDir) {
            blockData.airFlowDistance = 0;
            blockData.segments = [];
            return;
        }

        const axisNeg = ["north", "west", "down"].includes(INVERT_FACE[blockRotation]);
        blockData.pushing = (axisNeg ? -rpm : rpm) > 0;

        const rpmRatio = Math.min(Math.abs(rpm) / fanConfig.rpmArgmax, 1);
        const maxDistance = fanConfig.minDistance + rpmRatio * (fanConfig.maxDistance - fanConfig.minDistance);
        const flow = buildAirFlow(dimension, block.location, airFaceDir, maxDistance, blockData.pushing);
        blockData.airFlowDistance = flow.distance;
        blockData.direction = airFaceDir;
        blockData.segments = flow.segments;
    }

    if (blockData.airFlowDistance <= 0) return;
    encasedFanParticles(block, dimension, rpm, blockData);

    const fanCenter = block.center();
    const offset = DIRECTION_OFFSETS[airFaceDir];
    if (!offset) return;

    if (currentTick % fanConfig.entitySearchRate === 0) {
        updateFanEntityCache(block, dimension, airFaceDir, blockData);
    }

    for (const target of blockData.caughtEntities) {
        if (!target?.isValid) continue;
        if (isFanPushIgnoredEntity(target, block.typeId)) continue;
        if (target.typeId === "minecraft:player" && target.getGameMode() === "creative" && !target.isOnGround && !target.isFalling) continue;

        const dx = target.location.x - fanCenter.x;
        const dy = target.location.y - fanCenter.y;
        const dz = target.location.z - fanCenter.z;
        if (!isEntityInsideFanColumn(target, fanCenter, offset)) continue;
        const entityDistance = dx * offset.x + dy * offset.y + dz * offset.z;
        // A entidade precisa ter ultrapassado a face frontal do bloco. Usar
        // apenas o centro do Fan fazia entidades nas laterais/traseira entrarem
        // na zona de impulso por causa do tamanho da hitbox.
        if (entityDistance <= FAN_FRONT_FACE_DISTANCE) continue;
        if (entityDistance > blockData.airFlowDistance + 1) continue;
        if (isFanBlockedBeforeDistance(dimension, block.location, offset, entityDistance)) continue;

        const speed = Math.abs(rpm);
        const sneakMod = (target.isSneaking ?? false) ? 4096 : 512;
        const distRatio = Math.max(entityDistance / blockData.airFlowDistance, 0.1);
        const accel = speed / sneakMod / distRatio;
        const flowDir = blockData.pushing ? 1 : -1;
        const maxAccel = 5;

        try {
            const vel = target.getVelocity();
            const xIn = clamp(offset.x * flowDir * accel - vel.x, -maxAccel, maxAccel);
            const yIn = clamp(offset.y * flowDir * accel - vel.y, -maxAccel, maxAccel);
            const zIn = clamp(offset.z * flowDir * accel - vel.z, -maxAccel, maxAccel);
            target.applyImpulse({ x: xIn / 8, y: yIn / 8, z: zIn / 8 });
        } catch {}
    }

    for (const { type, entities } of blockData.segmentEntities) {
        if (!type) continue;
        for (const target of entities) {
            if (!target?.isValid) continue;
            if (isFanProcessingIgnoredEntity(target, block.typeId)) continue;
            if (!isEntityInOpenFanFlow(target, block, offset, blockData.airFlowDistance, dimension)) continue;
            if (target.typeId === "minecraft:item") processItemEntity(target, type, dimension);
            else if (target.typeId === "create:conveyor_item") processConveyorItemEntity(target, type, dimension);
            else affectEntity(target, type, dimension);
        }
    }

    if (currentTick % 100 === 0) {
        for (const [id] of itemProcessingData) {
            try {
                const e = world.getEntity(id);
                if (!e?.isValid) itemProcessingData.delete(id);
            } catch {
                itemProcessingData.delete(id);
            }
        }
    }
}

function getFrontProcessingSignature(block, dimension, direction) {
    const offset = DIRECTION_OFFSETS[direction];
    if (!offset) return "";
    try {
        const frontBlock = dimension.getBlock({
            x: block.x + offset.x,
            y: block.y + offset.y,
            z: block.z + offset.z
        });
        if (!frontBlock?.isValid) return "";
        return `${frontBlock.typeId}:${getProcessingType(frontBlock) ?? "normal"}`;
    } catch {
        return "";
    }
}

function isEntityInsideFanColumn(entity, fanCenter, offset) {
    const location = entity?.location;
    if (!location || !fanCenter || !offset) return false;
    const halfWidth = 0.72;

    // Entity.location fica nos pes. O deslocamento de 0.5 aproxima o centro
    // usado para comparar a altura com o centro do bloco do Fan.
    const centerY = location.y + 0.5;
    if (offset.x !== 0) {
        return Math.abs(location.z - fanCenter.z) <= halfWidth
            && Math.abs(centerY - fanCenter.y) <= 0.9;
    }
    if (offset.z !== 0) {
        return Math.abs(location.x - fanCenter.x) <= halfWidth
            && Math.abs(centerY - fanCenter.y) <= 0.9;
    }
    return Math.abs(location.x - fanCenter.x) <= halfWidth
        && Math.abs(location.z - fanCenter.z) <= halfWidth;
}

function applyNozzleAirflow(block, dimension, airFaceDir, rpm, currentTick) {
    const offset = DIRECTION_OFFSETS[airFaceDir];
    if (!offset) return false;

    let nozzle;
    try {
        nozzle = dimension.getBlock({
            x: block.x + offset.x,
            y: block.y + offset.y,
            z: block.z + offset.z
        });
    } catch {
        return false;
    }
    if (nozzle?.typeId !== "create:nozzle") return false;

    // A busca é atualizada junto com o tick do fan. A força radial transforma
    // o fluxo reto em uma rajada larga, como o nozzle do Create.
    const rpmRatio = Math.min(Math.abs(rpm) / fanConfig.rpmArgmax, 1);
    const radius = 2.25 + rpmRatio * 2.75;
    const center = nozzle.center();
    const targets = dimension.getEntities({ location: center, maxDistance: radius });

    for (const target of targets) {
        if (!target?.isValid || isFanPushIgnoredEntity(target, block.typeId)) continue;
        if (target.typeId === "minecraft:player" && target.getGameMode() === "creative" &&
            !target.isOnGround && !target.isFalling) continue;

        const dx = target.location.x - center.x;
        const dy = (target.location.y + 0.35) - center.y;
        const dz = target.location.z - center.z;
        // Não empurra entidades que estão atrás do nozzle, junto ao fan.
        if (dx * offset.x + dy * offset.y + dz * offset.z < -0.2) continue;

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance < 0.05 || distance > radius) continue;
        const falloff = 1 - (distance / radius) * 0.55;
        const force = (0.055 + rpmRatio * 0.16) * falloff;

        try {
            const velocity = target.getVelocity();
            target.applyImpulse({
                x: dx / distance * force - velocity.x * 0.025,
                y: dy / distance * force - velocity.y * 0.015,
                z: dz / distance * force - velocity.z * 0.025
            });
        } catch {}
    }

    if (currentTick % 4 === 0) {
        try {
            dimension.spawnParticle("minecraft:basic_smoke_particle", {
                x: center.x + offset.x * 0.55,
                y: center.y + offset.y * 0.55,
                z: center.z + offset.z * 0.55
            });
        } catch {}
    }
    return true;
}

export function encasedFanDeleteData(block) {
    fanData.delete(posToKey(block.x, block.y, block.z));
}

function updateFanEntityCache(block, dimension, airFaceDir, blockData) {
    const offset = DIRECTION_OFFSETS[airFaceDir];
    const positive = ["south", "east", "above"].includes(airFaceDir);
    const alongX = Math.abs(offset.x) === 1;
    const alongY = Math.abs(offset.y) === 1;
    const alongZ = Math.abs(offset.z) === 1;
    const range = Math.ceil(blockData.airFlowDistance);

    const pivot = {
        x: block.x + (alongX ? (positive ? 1 : -range) : 0),
        y: block.y + (alongY ? (positive ? 1 : -range) : 0),
        z: block.z + (alongZ ? (positive ? 1 : -range) : 0),
    };
    const size = {
        x: alongX ? range - 1 : 0,
        y: alongY ? range - 1 : 0,
        z: alongZ ? range - 1 : 0,
    };

    try {
        blockData.caughtEntities = dimension
            .getEntities({ location: pivot, volume: size, excludeFamilies: ["immovable"] })
            .filter(e => !isFanPushIgnoredEntity(e, block.typeId));
    } catch {
        blockData.caughtEntities = [];
    }

    blockData.segmentEntities = [];
    for (const seg of blockData.segments) {
        const segLength = seg.end - seg.start + 1;
        const segPivot = {
            x: block.x + (alongX ? (positive ? seg.start : -(seg.start + segLength)) : 0),
            y: block.y + (alongY ? (positive ? seg.start : -(seg.start + segLength)) : 0),
            z: block.z + (alongZ ? (positive ? seg.start : -(seg.start + segLength)) : 0),
        };
        const segSize = {
            x: alongX ? segLength - 1 : 0,
            y: alongY ? segLength - 1 : 0,
            z: alongZ ? segLength - 1 : 0,
        };

        try {
            const entities = dimension
                .getEntities({ location: segPivot, volume: segSize, excludeFamilies: ["immovable"] })
                .filter(e => !isFanProcessingIgnoredEntity(e, block.typeId));
            blockData.segmentEntities.push({ type: seg.type, entities });
        } catch {
            blockData.segmentEntities.push({ type: seg.type, entities: [] });
        }
    }
}

function encasedFanParticles(block, dimension, rpm, data) {
    if (system.currentTick % 2 !== 0) return;

    const offset = DIRECTION_OFFSETS[data.direction];
    if (!offset) return;

    const absRpm = Math.abs(rpm);
    const flowDir = data.pushing ? 1 : -1;
    const fanCenter = block.center();
    const spawnOffset = data.pushing ? 0.5 : data.airFlowDistance;
    const particlePos = {
        x: fanCenter.x + offset.x * spawnOffset,
        y: fanCenter.y + offset.y * spawnOffset,
        z: fanCenter.z + offset.z * spawnOffset,
    };

    const particleData = new MolangVariableMap();
    particleData.setFloat("speed", absRpm);
    particleData.setFloat("direction_x", offset.x * flowDir);
    particleData.setFloat("direction_y", offset.y * flowDir);
    particleData.setFloat("direction_z", offset.z * flowDir);
    particleData.setFloat("is_push", data.pushing ? 1 : 0);
    particleData.setFloat("air_distance", data.airFlowDistance);
    const color = getAirFlowColor(data);
    particleData.setColorRGBA("color", color);
    particleData.setFloat("color_r", color.red);
    particleData.setFloat("color_g", color.green);
    particleData.setFloat("color_b", color.blue);
    particleData.setFloat("color_a", color.alpha);

    const particleCount = absRpm >= 64 ? 2 : 1;
    for (let index = 0; index < particleCount; index++) {
        try {
            if (Math.random() > 0.92) continue;
            const spread = index === 0 ? 0 : 0.12;
            dimension.spawnParticle("create:air_flow", {
                x: particlePos.x + (offset.x === 0 ? (Math.random() - 0.5) * spread : 0),
                y: particlePos.y + (offset.y === 0 ? (Math.random() - 0.5) * spread : 0),
                z: particlePos.z + (offset.z === 0 ? (Math.random() - 0.5) * spread : 0)
            }, particleData);
        } catch {}
    }
}

function getAirFlowColor(data) {
    const activeType = data.segments?.[0]?.type;
    if (activeType === "blasting") return { red: 1.0, green: 0.42, blue: 0.08, alpha: 1.0 };
    if (activeType === "smoking") return { red: 0.04, green: 0.04, blue: 0.04, alpha: 1.0 };
    if (activeType === "haunting") return { red: 0.08, green: 0.35, blue: 0.45, alpha: 1.0 };
    if (activeType === "splashing") return { red: 0.25, green: 0.62, blue: 1.0, alpha: 1.0 };
    return { red: 1.0, green: 1.0, blue: 1.0, alpha: 0.28 };
}

function buildAirFlow(dimension, fanPos, direction, maxDist, pushing) {
    const offset = DIRECTION_OFFSETS[direction];
    if (!offset) return { distance: 0, segments: [] };

    let actualDistance = maxDist;
    for (let i = 1; i <= Math.ceil(maxDist); i++) {
        const pos = { x: fanPos.x + offset.x * i, y: fanPos.y + offset.y * i, z: fanPos.z + offset.z * i };
        let block;
        try {
            block = dimension.getBlock(pos);
        } catch {
            actualDistance = i - 1;
            break;
        }
        if (!block?.isValid) {
            actualDistance = i - 1;
            break;
        }
        if (!block.isAir && !block.isLiquid && isSolid(block)) {
            actualDistance = i - 1;
            break;
        }
    }

    const limit = Math.floor(actualDistance);
    if (limit <= 0) return { distance: 0, segments: [] };

    const segments = [];
    const start = pushing ? 1 : limit;
    const end = pushing ? limit : 1;
    const step = pushing ? 1 : -1;
    let activeType = null;
    let currentType = null;
    let segmentStart = start;

    for (let i = start; pushing ? i <= end : i >= end; i += step) {
        const pos = { x: fanPos.x + offset.x * i, y: fanPos.y + offset.y * i, z: fanPos.z + offset.z * i };
        let block;
        try {
            block = dimension.getBlock(pos);
        } catch {
            continue;
        }

        const newType = block ? getProcessingType(block) : null;
        if (newType !== null) activeType = newType;

        if (activeType !== currentType) {
            if (currentType !== null) {
                const s = Math.min(segmentStart, i - step);
                const e = Math.max(segmentStart, i - step);
                segments.push({ type: currentType, start: s, end: e });
            }
            currentType = activeType;
            segmentStart = i;
        }
    }

    if (currentType !== null) {
        const s = Math.min(segmentStart, end);
        const e = Math.max(segmentStart, end);
        segments.push({ type: currentType, start: s, end: e });
    }

    return { distance: Math.min(actualDistance, maxDist), segments };
}

function isEntityInOpenFanFlow(entity, fanBlock, offset, airFlowDistance, dimension) {
    const fanCenter = fanBlock.center();
    const dx = entity.location.x - fanCenter.x;
    const dy = entity.location.y - fanCenter.y;
    const dz = entity.location.z - fanCenter.z;
    const entityDistance = dx * offset.x + dy * offset.y + dz * offset.z;

    if (entityDistance <= FAN_FRONT_FACE_DISTANCE) return false;
    if (entityDistance > airFlowDistance + 1) return false;
    return !isFanBlockedBeforeDistance(dimension, fanBlock.location, offset, entityDistance);
}

function isFanBlockedBeforeDistance(dimension, fanPos, offset, entityDistance) {
    const limit = Math.max(1, Math.floor(entityDistance));
    for (let i = 1; i <= limit; i++) {
        const pos = {
            x: fanPos.x + offset.x * i,
            y: fanPos.y + offset.y * i,
            z: fanPos.z + offset.z * i,
        };

        let block;
        try {
            block = dimension.getBlock(pos);
        } catch {
            return true;
        }
        if (!block?.isValid) return true;
        if (!block.isAir && !block.isLiquid && isSolid(block)) return true;
    }
    return false;
}

function getProcessingType(block) {
    const typeId = block.typeId;

    if (BLASTING_BLOCKS.has(typeId)) {
        // Fogo comum aquece o fluxo como uma fogueira; lava e magma continuam
        // usando o processamento mais forte de blasting.
        if (typeId === "minecraft:fire") return "smoking";
        if (typeId === "minecraft:campfire") {
            return block.permutation.getState("extinguished") === false ? "smoking" : null;
        }
        return "blasting";
    }
    if (HAUNTING_BLOCKS.has(typeId)) {
        if (typeId === "minecraft:soul_campfire") {
            return block.permutation.getState("extinguished") === false ? "haunting" : null;
        }
        return "haunting";
    }
    if (SPLASHING_BLOCKS.has(typeId)) return "splashing";
    return null;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function isFanPushIgnoredEntity(entity, fanBlockTypeId) {
    if (entity?.typeId === `${fanBlockTypeId}_entity`) return true;
    if (entity?.typeId === "create:conveyor_item") return true;
    return FAN_IGNORED_VISUAL_ENTITIES.has(entity?.typeId);
}

function isFanProcessingIgnoredEntity(entity, fanBlockTypeId) {
    if (entity?.typeId === `${fanBlockTypeId}_entity`) return true;
    if (FAN_IGNORED_VISUAL_ENTITIES.has(entity?.typeId)) return true;
    try {
        if (entity?.hasTag?.("create_depot_visual")) return true;
    } catch {}
    return false;
}

function affectEntity(entity, processingType, dimension) {
    if (!entity?.isValid) return;
    switch (processingType) {
        case "blasting":
            try {
                entity.setOnFire(10, true);
                entity.applyDamage(4, { cause: "fire" });
            } catch {}
            break;
        case "haunting":
            try {
                entity.addEffect("blindness", 30, { amplifier: 0, showParticles: false });
                entity.addEffect("slowness", 20, { amplifier: 1, showParticles: false });
            } catch {}
            break;
        case "splashing":
            try {
                entity.extinguishFire(true);
                const t = entity.typeId;
                if (t === "minecraft:enderman" || t === "minecraft:blaze" || t === "minecraft:snow_golem") {
                    entity.applyDamage(2, { cause: "drowning" });
                }
            } catch {}
            break;
    }
}

function processItemEntity(itemEntity, processingType, dimension) {
    if (!itemEntity?.isValid) return;

    const itemComp = itemEntity.getComponent("minecraft:item");
    const itemStack = itemComp?.itemStack;
    if (!itemStack) return;

    const id = itemEntity.id;
    let data = itemProcessingData.get(id);
    if (!data || data.type !== processingType || data.itemId !== itemStack.typeId) {
        const stackMod = Math.ceil(itemStack.amount / 16);
        data = { type: processingType, itemId: itemStack.typeId, timeLeft: fanConfig.processingTime * stackMod };
        itemProcessingData.set(id, data);
        return;
    }

    if (data.timeLeft === -1) return;

    data.timeLeft--;
    spawnFanProcessingParticles(itemEntity, dimension, processingType);
    if (data.timeLeft > 0) return;

    const recipes = getRecipesForType(processingType);
    if (!recipes) return;

    const outputs = recipes[itemStack.typeId];
    if (!outputs || outputs.length === 0) {
        if (processingType === "blasting") try { itemEntity.kill(); } catch {}
        data.timeLeft = -1;
        return;
    }

    const inputCount = itemStack.amount;
    const pos = itemEntity.location;
    try { itemEntity.kill(); } catch {}

    for (const outputStack of buildOutputStacks(outputs, inputCount)) {
        try { dimension.spawnItem(outputStack, pos); } catch {}
    }

    itemProcessingData.delete(id);
}

function processConveyorItemEntity(itemEntity, processingType, dimension) {
    if (!itemEntity?.isValid) return;

    const container = itemEntity.getComponent("minecraft:inventory")?.container;
    const itemStack = container?.getItem(0);
    if (!itemStack) return;

    const id = itemEntity.id;
    let data = itemProcessingData.get(id);
    if (!data || data.type !== processingType || data.itemId !== itemStack.typeId) {
        const stackMod = Math.ceil(itemStack.amount / 16);
        data = { type: processingType, itemId: itemStack.typeId, timeLeft: fanConfig.processingTime * stackMod };
        itemProcessingData.set(id, data);
        return;
    }

    if (data.timeLeft === -1) return;

    data.timeLeft--;
    spawnFanProcessingParticles(itemEntity, dimension, processingType);
    if (data.timeLeft > 0) return;

    const recipes = getRecipesForType(processingType);
    if (!recipes) return;

    const depotBlock = getDepotBlockForProcessedItem(itemEntity, dimension);
    const outputs = recipes[itemStack.typeId];
    if (!outputs || outputs.length === 0) {
        if (processingType === "blasting") {
            try { itemEntity.remove(); } catch {}
            if (depotBlock) resetDepotVisualsForBlock(depotBlock);
        }
        data.timeLeft = -1;
        return;
    }

    const outputStacks = buildOutputStacks(outputs, itemStack.amount);
    const pos = itemEntity.location;
    if (outputStacks.length === 0) {
        try { itemEntity.remove(); } catch {}
        if (depotBlock) resetDepotVisualsForBlock(depotBlock);
        itemProcessingData.delete(id);
        return;
    }

    if (outputStacks.length === 1) {
        racoAPI.setItemInHand(outputStacks[0], itemEntity, "Mainhand", 0, "create:item_visual");
        if (depotBlock) resetDepotVisualsForBlock(depotBlock);
    } else {
        try { itemEntity.remove(); } catch {}
        for (const outputStack of outputStacks) {
            try {
                const spawned = dimension.spawnItem(outputStack, pos);
                spawned?.clearVelocity?.();
            } catch {}
        }
        if (depotBlock) resetDepotVisualsForBlock(depotBlock);
    }

    itemProcessingData.delete(id);
}

function buildOutputStacks(outputs, inputCount) {
    const outputStacks = [];
    for (const output of outputs) {
        let totalCount;
        if (output.chance !== undefined && output.chance < 1) {
            totalCount = 0;
            for (let i = 0; i < inputCount; i++) {
                if (Math.random() < output.chance) totalCount += output.count;
            }
        } else {
            totalCount = output.count * inputCount;
        }
        if (totalCount <= 0) continue;

        try {
            const sample = new ItemStack(output.item, 1);
            let remaining = totalCount;
            while (remaining > 0) {
                const stackSize = Math.min(remaining, sample.maxAmount ?? 64);
                outputStacks.push(new ItemStack(output.item, stackSize));
                remaining -= stackSize;
            }
        } catch {}
    }
    return outputStacks;
}

function spawnFanProcessingParticles(itemEntity, dimension, processingType) {
    const isSplashing = processingType === "splashing";
    const isSmoking = processingType === "smoking";
    if (system.currentTick % (isSplashing ? 10 : 5) !== 0) return;

    const loc = itemEntity.location;
    const amount = isSplashing || isSmoking ? 1 : 2;
    for (let i = 0; i < amount; i++) {
        const particleLocation = {
            x: loc.x + (Math.random() - 0.5) * 0.35,
            y: loc.y + 0.12 + Math.random() * 0.18,
            z: loc.z + (Math.random() - 0.5) * 0.35,
        };

        if (isSplashing) spawnWhiteAirFlowParticle(dimension, particleLocation);
        else if (isSmoking) spawnProcessingParticleSet(dimension, ["minecraft:large_smoke_particle", "minecraft:basic_smoke_particle"], particleLocation);
        else spawnProcessingParticleSet(dimension, ["minecraft:basic_smoke_particle"], particleLocation);
    }
}

function spawnWhiteAirFlowParticle(dimension, location) {
    const particleData = new MolangVariableMap();
    particleData.setFloat("speed", 64);
    particleData.setFloat("direction_x", 0);
    particleData.setFloat("direction_y", 0);
    particleData.setFloat("direction_z", 0);
    particleData.setFloat("is_push", 1);
    particleData.setFloat("air_distance", 1);
    particleData.setColorRGBA("color", { red: 1, green: 1, blue: 1, alpha: 1 });
    particleData.setFloat("color_r", 1);
    particleData.setFloat("color_g", 1);
    particleData.setFloat("color_b", 1);
    particleData.setFloat("color_a", 1);
    particleData.setFloat("alpha", 1);
    particleData.setFloat("opacity", 1);

    try {
        dimension.spawnParticle("create:air_flow", location, particleData);
    } catch {
        spawnProcessingParticleSet(dimension, ["minecraft:basic_smoke_particle"], location);
    }
}

function spawnProcessingParticleSet(dimension, particleIds, location) {
    let spawned = false;
    for (const particleId of particleIds) {
        try {
            dimension.spawnParticle(particleId, location);
            spawned = true;
        } catch {}
    }
    return spawned;
}

function getDepotBlockForProcessedItem(itemEntity, dimension) {
    const loc = itemEntity?.location;
    if (!loc || !dimension) return null;

    const candidates = [
        { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) },
        { x: Math.floor(loc.x), y: Math.floor(loc.y - 0.25), z: Math.floor(loc.z) },
        { x: Math.floor(loc.x), y: Math.floor(loc.y - 1), z: Math.floor(loc.z) },
    ];

    for (const pos of candidates) {
        try {
            const block = dimension.getBlock(pos);
            if (block?.typeId === "create:depot") return block;
        } catch {}
    }
    return null;
}

function getRecipesForType(processingType) {
    const builtIn = processingType === "blasting" ? BLASTING_RECIPES
        : processingType === "smoking" ? SMOKING_RECIPES
        : processingType === "splashing" ? SPLASHING_RECIPES
        : processingType === "haunting" ? HAUNTING_RECIPES : null;
    if (!builtIn) return null;
    return Object.fromEntries([...Object.entries(builtIn), ...(compatibilityRecipes[processingType] ?? new Map())]);
}

const MINECRAFT_COLORS = [
    "white", "light_gray", "gray", "black",
    "brown", "red", "orange", "yellow",
    "lime", "green", "cyan", "light_blue",
    "blue", "purple", "magenta", "pink",
];

function sameOutputRecipes(inputs, output) {
    return Object.fromEntries(inputs.map(input => [input, [{ ...output }]]));
}

function colorRecipes(inputSuffix, outputSuffix) {
    return Object.fromEntries(MINECRAFT_COLORS.map(color => [
        `minecraft:${color}_${inputSuffix}`,
        [{ item: `minecraft:${color}_${outputSuffix}`, count: 1 }],
    ]));
}

const BLASTING_BLOCKS = new Set([
    "minecraft:lava", "minecraft:flowing_lava",
    "minecraft:fire", "minecraft:magma",
    "minecraft:campfire",
]);

const HAUNTING_BLOCKS = new Set([
    "minecraft:soul_fire",
    "minecraft:soul_campfire",
    "minecraft:soul_torch",
    "minecraft:soul_lantern",
]);

const SPLASHING_BLOCKS = new Set([
    "minecraft:water", "minecraft:flowing_water",
]);

export const BLASTING_RECIPES = {
    "create:dough": [{ item: "minecraft:bread", count: 1 }],
    "create:crushed_raw_iron": [{ item: "minecraft:iron_ingot", count: 1 }],
    "create:crushed_raw_gold": [{ item: "minecraft:gold_ingot", count: 1 }],
    "create:crushed_raw_copper": [{ item: "minecraft:copper_ingot", count: 1 }],
    "create:crushed_raw_zinc": [{ item: "create:zinc_ingot", count: 1 }],
    "minecraft:raw_iron": [{ item: "minecraft:iron_ingot", count: 1 }],
    "minecraft:raw_gold": [{ item: "minecraft:gold_ingot", count: 1 }],
    "minecraft:raw_copper": [{ item: "minecraft:copper_ingot", count: 1 }],
    "minecraft:iron_ore": [{ item: "minecraft:iron_ingot", count: 1 }],
    "minecraft:gold_ore": [{ item: "minecraft:gold_ingot", count: 1 }],
    "minecraft:copper_ore": [{ item: "minecraft:copper_ingot", count: 1 }],
    "minecraft:deepslate_iron_ore": [{ item: "minecraft:iron_ingot", count: 1 }],
    "minecraft:deepslate_gold_ore": [{ item: "minecraft:gold_ingot", count: 1 }],
    "minecraft:deepslate_copper_ore": [{ item: "minecraft:copper_ingot", count: 1 }],
    "minecraft:nether_gold_ore": [{ item: "minecraft:gold_ingot", count: 1 }],
    "create:zinc_ore": [{ item: "create:zinc_ingot", count: 1 }],
    "create:deepslate_zinc_ore": [{ item: "create:zinc_ingot", count: 1 }],
    "create:raw_zinc": [{ item: "create:zinc_ingot", count: 1 }],
    "minecraft:cobblestone": [{ item: "minecraft:stone", count: 1 }],
    "minecraft:stone": [{ item: "minecraft:smooth_stone", count: 1 }],
    "minecraft:sandstone": [{ item: "minecraft:smooth_sandstone", count: 1 }],
    "minecraft:red_sandstone": [{ item: "minecraft:smooth_red_sandstone", count: 1 }],
    "minecraft:quartz_block": [{ item: "minecraft:smooth_quartz", count: 1 }],
    "minecraft:basalt": [{ item: "minecraft:smooth_basalt", count: 1 }],
    "minecraft:stone_bricks": [{ item: "minecraft:cracked_stone_bricks", count: 1 }],
    "minecraft:deepslate_bricks": [{ item: "minecraft:cracked_deepslate_bricks", count: 1 }],
    "minecraft:deepslate_tiles": [{ item: "minecraft:cracked_deepslate_tiles", count: 1 }],
    "minecraft:nether_bricks": [{ item: "minecraft:cracked_nether_bricks", count: 1 }],
    "minecraft:polished_blackstone_bricks": [{ item: "minecraft:cracked_polished_blackstone_bricks", count: 1 }],
    "minecraft:netherrack": [{ item: "minecraft:nether_brick", count: 1 }],
    "minecraft:clay_ball": [{ item: "minecraft:brick", count: 1 }],
    "minecraft:clay": [{ item: "minecraft:hardened_clay", count: 1 }],
    "minecraft:sand": [{ item: "minecraft:glass", count: 1 }],
    "minecraft:red_sand": [{ item: "minecraft:glass", count: 1 }],
    "minecraft:porkchop": [{ item: "minecraft:cooked_porkchop", count: 1 }],
    "minecraft:beef": [{ item: "minecraft:cooked_beef", count: 1 }],
    "minecraft:chicken": [{ item: "minecraft:cooked_chicken", count: 1 }],
    "minecraft:cod": [{ item: "minecraft:cooked_cod", count: 1 }],
    "minecraft:salmon": [{ item: "minecraft:cooked_salmon", count: 1 }],
    "minecraft:mutton": [{ item: "minecraft:cooked_mutton", count: 1 }],
    "minecraft:rabbit": [{ item: "minecraft:cooked_rabbit", count: 1 }],
    "minecraft:potato": [{ item: "minecraft:baked_potato", count: 1 }],
    "minecraft:kelp": [{ item: "minecraft:dried_kelp", count: 1 }],
    ...sameOutputRecipes([
        "minecraft:oak_log", "minecraft:birch_log", "minecraft:spruce_log", "minecraft:jungle_log",
        "minecraft:acacia_log", "minecraft:dark_oak_log", "minecraft:cherry_log", "minecraft:mangrove_log",
        "minecraft:pale_oak_log", "minecraft:oak_wood", "minecraft:birch_wood", "minecraft:spruce_wood",
        "minecraft:jungle_wood", "minecraft:acacia_wood", "minecraft:dark_oak_wood", "minecraft:cherry_wood",
        "minecraft:mangrove_wood", "minecraft:pale_oak_wood", "minecraft:stripped_oak_log",
        "minecraft:stripped_birch_log", "minecraft:stripped_spruce_log", "minecraft:stripped_jungle_log",
        "minecraft:stripped_acacia_log", "minecraft:stripped_dark_oak_log", "minecraft:stripped_cherry_log",
        "minecraft:stripped_mangrove_log", "minecraft:stripped_pale_oak_log",
    ], { item: "minecraft:charcoal", count: 1 }),
    "minecraft:cactus": [{ item: "minecraft:green_dye", count: 1 }],
    "minecraft:chorus_fruit": [{ item: "minecraft:popped_chorus_fruit", count: 1 }],
    "minecraft:wet_sponge": [{ item: "minecraft:sponge", count: 1 }],
    "minecraft:sea_pickle": [{ item: "minecraft:lime_dye", count: 1 }],
    "minecraft:coal_ore": [{ item: "minecraft:coal", count: 1 }],
    "minecraft:deepslate_coal_ore": [{ item: "minecraft:coal", count: 1 }],
    "minecraft:redstone_ore": [{ item: "minecraft:redstone", count: 1 }],
    "minecraft:deepslate_redstone_ore": [{ item: "minecraft:redstone", count: 1 }],
    "minecraft:lapis_ore": [{ item: "minecraft:lapis_lazuli", count: 1 }],
    "minecraft:deepslate_lapis_ore": [{ item: "minecraft:lapis_lazuli", count: 1 }],
    "minecraft:diamond_ore": [{ item: "minecraft:diamond", count: 1 }],
    "minecraft:deepslate_diamond_ore": [{ item: "minecraft:diamond", count: 1 }],
    "minecraft:emerald_ore": [{ item: "minecraft:emerald", count: 1 }],
    "minecraft:deepslate_emerald_ore": [{ item: "minecraft:emerald", count: 1 }],
    "minecraft:quartz_ore": [{ item: "minecraft:quartz", count: 1 }],
    "minecraft:ancient_debris": [{ item: "minecraft:netherite_scrap", count: 1 }],
    "minecraft:iron_block": [{ item: "minecraft:iron_block", count: 1 }],
};

export const SMOKING_RECIPES = {
    "create:dough": [{ item: "minecraft:bread", count: 1 }],
    "minecraft:porkchop": [{ item: "minecraft:cooked_porkchop", count: 1 }],
    "minecraft:beef": [{ item: "minecraft:cooked_beef", count: 1 }],
    "minecraft:chicken": [{ item: "minecraft:cooked_chicken", count: 1 }],
    "minecraft:cod": [{ item: "minecraft:cooked_cod", count: 1 }],
    "minecraft:salmon": [{ item: "minecraft:cooked_salmon", count: 1 }],
    "minecraft:mutton": [{ item: "minecraft:cooked_mutton", count: 1 }],
    "minecraft:rabbit": [{ item: "minecraft:cooked_rabbit", count: 1 }],
    "minecraft:potato": [{ item: "minecraft:baked_potato", count: 1 }],
    "minecraft:kelp": [{ item: "minecraft:dried_kelp", count: 1 }],
};

export const SPLASHING_RECIPES = {
    "create:wheat_flour": [{ item: "create:dough", count: 1 }],
    "minecraft:sand": [{ item: "minecraft:clay_ball", count: 1, chance: 0.25 }],
    "minecraft:red_sand": [{ item: "minecraft:gold_nugget", count: 3, chance: 0.125 }, { item: "minecraft:deadbush", count: 1, chance: 0.05 }],
    "minecraft:gravel": [{ item: "minecraft:flint", count: 1, chance: 0.25 }, { item: "minecraft:iron_nugget", count: 1, chance: 0.125 }],
    "minecraft:soul_sand": [{ item: "minecraft:quartz", count: 4, chance: 0.125 }, { item: "minecraft:gold_nugget", count: 1, chance: 0.02 }],
    "minecraft:magma": [{ item: "minecraft:obsidian", count: 1 }],
    "minecraft:ice": [{ item: "minecraft:packed_ice", count: 1 }],
    ...sameOutputRecipes(
        MINECRAFT_COLORS.filter(color => color !== "white").map(color => `minecraft:${color}_wool`),
        { item: "minecraft:white_wool", count: 1 }
    ),
    ...sameOutputRecipes(
        MINECRAFT_COLORS.map(color => `minecraft:${color}_stained_glass`),
        { item: "minecraft:glass", count: 1 }
    ),
    ...sameOutputRecipes(
        MINECRAFT_COLORS.map(color => `minecraft:${color}_stained_glass_pane`),
        { item: "minecraft:glass_pane", count: 1 }
    ),
    ...colorRecipes("concrete_powder", "concrete"),
    "create:crushed_raw_iron": [{ item: "minecraft:iron_nugget", count: 9 }, { item: "minecraft:redstone", count: 1, chance: 0.75 }],
    "create:crushed_raw_gold": [{ item: "minecraft:gold_nugget", count: 9 }, { item: "minecraft:quartz", count: 1, chance: 0.5 }],
    "create:crushed_raw_copper": [{ item: "create:copper_nugget", count: 9 }, { item: "minecraft:clay_ball", count: 1, chance: 0.5 }],
    "create:crushed_raw_zinc": [{ item: "create:zinc_nugget", count: 9 }, { item: "minecraft:gunpowder", count: 1, chance: 0.25 }],
};

export const HAUNTING_RECIPES = {
    "minecraft:sand": [{ item: "minecraft:soul_sand", count: 1 }],
    "minecraft:red_sand": [{ item: "minecraft:soul_sand", count: 1 }],
    ...sameOutputRecipes([
        "minecraft:dirt", "minecraft:coarse_dirt", "minecraft:rooted_dirt", "minecraft:grass_block",
        "minecraft:mycelium", "minecraft:podzol", "minecraft:mud",
    ], { item: "minecraft:soul_soil", count: 1 }),
    ...sameOutputRecipes([
        "minecraft:cobblestone", "minecraft:mossy_cobblestone", "minecraft:cobbled_deepslate",
    ], { item: "minecraft:blackstone", count: 1 }),
    "minecraft:red_mushroom": [{ item: "minecraft:crimson_fungus", count: 1 }],
    "minecraft:brown_mushroom": [{ item: "minecraft:warped_fungus", count: 1 }],
    "minecraft:torch": [{ item: "minecraft:soul_torch", count: 1 }],
    "minecraft:lantern": [{ item: "minecraft:soul_lantern", count: 1 }],
    "minecraft:campfire": [{ item: "minecraft:soul_campfire", count: 1 }],
    "minecraft:brick": [{ item: "minecraft:nether_brick", count: 1 }],
    "minecraft:bell": [{ item: "create:haunted_bell", count: 1 }],
    "create:peculiar_bell": [{ item: "create:haunted_bell", count: 1 }],
    "minecraft:lapis_lazuli": [{ item: "minecraft:prismarine_shard", count: 1, chance: 0.75 }, { item: "minecraft:prismarine_crystals", count: 1, chance: 0.125 }],
    "minecraft:potato": [{ item: "minecraft:poisonous_potato", count: 1 }],
    "minecraft:sweet_berries": [{ item: "minecraft:glow_berries", count: 1 }],
    "minecraft:ink_sac": [{ item: "minecraft:glow_ink_sac", count: 1 }],
    "minecraft:stone": [{ item: "minecraft:infested_stone", count: 1 }],
    "minecraft:deepslate": [{ item: "minecraft:infested_deepslate", count: 1 }],
    "minecraft:stone_bricks": [{ item: "minecraft:infested_stone_bricks", count: 1 }],
    "minecraft:mossy_stone_bricks": [{ item: "minecraft:infested_mossy_stone_bricks", count: 1 }],
    "minecraft:cracked_stone_bricks": [{ item: "minecraft:infested_cracked_stone_bricks", count: 1 }],
    "minecraft:chiseled_stone_bricks": [{ item: "minecraft:infested_chiseled_stone_bricks", count: 1 }],
};
