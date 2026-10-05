import { BlockPermutation, MolangVariableMap, system, world } from "@minecraft/server";
import { initRpmBlock } from "../../andrielScripts/rpm/rpmCore.js";
import {
    getConnectedFluidTankBlocks,
    getFluidTankInfo,
    setFluidTankBoilerClosed
} from "../../tank/fluidTank.js";
import { isBlazeBurnerBlockActive } from "./blazeBurner.js";

const STEAM_ENGINE = "create:steam_engine";
const FLUID_TANK = "create:fluid_tank";
const SHAFT = "create:shaft";
const STEAM_ENGINE_SHAFT = "create:shaft.steam_engine";
const PISTON_ENTITY = "create:steam_engine_piston";
const STEAM_JET_PARTICLE = "create:steam_jet";
const STEAM_JET_CROSS_NS_PARTICLE = "create:steam_jet_cross_ns";
const STEAM_JET_CROSS_EW_PARTICLE = "create:steam_jet_cross_ew";
const STEAM_SOUND = "create:steam";
const WATER_FLUID = "minecraft:water_bucket";
const BLAZE_BURNER = "create:blaze_burner";
const ADJACENT = [
    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
];

const OUTPUTS = {
    north: { x: 0, y: 0, z: -1, blockFace: "east" },
    south: { x: 0, y: 0, z: 1, blockFace: "east" },
    east: { x: 1, y: 0, z: 0, blockFace: "north" },
    west: { x: -1, y: 0, z: 0, blockFace: "north" },
    // Quando o motor aponta para cima, o eixo de saída continua deitado,
    // como o virabrequim horizontal do Steam Engine do Create.
    up: { x: 0, y: 1, z: 0, blockFace: "north" },
    down: { x: 0, y: -1, z: 0, blockFace: "down" }
};

const SUPPORT_DIRECTIONS = [
    { offset: { x: 0, y: 0, z: 1 }, facing: "north" },
    { offset: { x: 0, y: 0, z: -1 }, facing: "south" },
    { offset: { x: 1, y: 0, z: 0 }, facing: "west" },
    { offset: { x: -1, y: 0, z: 0 }, facing: "east" },
    { offset: { x: 0, y: 1, z: 0 }, facing: "down" },
    { offset: { x: 0, y: -1, z: 0 }, facing: "up" }
];

export function steamEnginePlaced(block) {
    if (block?.typeId !== STEAM_ENGINE) return;

    const origin = block.location;
    if (!origin) return;

    for (const entry of SUPPORT_DIRECTIONS) {
        let support;
        try {
            support = block.dimension.getBlock({
                x: origin.x + entry.offset.x,
                y: origin.y + entry.offset.y,
                z: origin.z + entry.offset.z
            });
        } catch {}
        if (support?.typeId !== FLUID_TANK) continue;

        try {
            block.setPermutation(
                block.permutation.withState("minecraft:facing_direction", entry.facing)
            );
        } catch {}
        refreshFluidTankBoiler(support);
        return;
    }
}

function adjacentBlock(block, offset) {
    try {
        return block.dimension.getBlock({
            x: block.x + offset.x,
            y: block.y + offset.y,
            z: block.z + offset.z
        });
    } catch {}
}

function findPistonEngine(piston) {
    const location = piston?.location;
    const dimension = piston?.dimension;
    if (!location || !dimension) return undefined;

    let centerBlock;
    try {
        centerBlock = dimension.getBlock({
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z)
        });
    } catch {}
    if (centerBlock?.typeId === STEAM_ENGINE) return centerBlock;

    for (const offset of ADJACENT) {
        const candidate = adjacentBlock(centerBlock, offset);
        if (candidate?.typeId === STEAM_ENGINE) return candidate;
    }
    return undefined;
}

const STEAM_JET_DIAGONALS = [
    { side: -0.72, vertical: 0.72 },
    { side: 0.72, vertical: 0.72 },
    { side: 0.72, vertical: -0.72 },
    { side: -0.72, vertical: -0.72 }
];

function emitSteamJet(engine, facing, diagonalIndex, withSound) {
    const output = OUTPUTS[facing] ?? OUTPUTS.north;
    // O vapor sempre percorre um eixo horizontal. Nos motores apontados
    // para cima/baixo, usa o eixo X para não criar um jato vertical.
    const horizontalX = output.y !== 0 ? 1 : output.x;
    const horizontalZ = output.y !== 0 ? 0 : output.z;
    const diagonal = STEAM_JET_DIAGONALS[diagonalIndex % STEAM_JET_DIAGONALS.length];
    // Vetor lateral perpendicular ao sentido da frente. A soma cria quatro
    // diagonais diferentes, mas todas continuam avançando para a frente.
    const lateralX = -horizontalZ;
    const lateralZ = horizontalX;
    const directionX = horizontalX + lateralX * diagonal.side;
    const directionY = diagonal.vertical;
    const directionZ = horizontalZ + lateralZ * diagonal.side;
    const directionLength = Math.hypot(directionX, directionY, directionZ) || 1;
    const location = {
        x: engine.location.x + 0.5 + output.x * 0.58 + lateralX * diagonal.side * 0.08,
        y: engine.location.y + 0.5 + output.y * 0.58 + diagonal.vertical * 0.08,
        z: engine.location.z + 0.5 + output.z * 0.58 + lateralZ * diagonal.side * 0.08
    };
    const variables = new MolangVariableMap();
    variables.setFloat("variable.direction_x", directionX / directionLength);
    variables.setFloat("variable.direction_y", directionY / directionLength);
    variables.setFloat("variable.direction_z", directionZ / directionLength);

    try {
    engine.dimension.spawnParticle(STEAM_JET_PARTICLE, location, variables);
    const crossParticle = Math.abs(horizontalX) >= Math.abs(horizontalZ)
        ? STEAM_JET_CROSS_EW_PARTICLE
        : STEAM_JET_CROSS_NS_PARTICLE;
    engine.dimension.spawnParticle(crossParticle, location, variables);
    } catch {}

    if (!withSound) return;
    try {
        engine.dimension.playSound(STEAM_SOUND, location, {
            volume: 1.25,
            pitch: 0.92 + Math.random() * 0.16
        });
    } catch {}
}

function structureEngines(blocks) {
    const engines = new Map();
    for (const tank of blocks) {
        for (const offset of ADJACENT) {
            const candidate = adjacentBlock(tank, offset);
            if (candidate?.typeId !== STEAM_ENGINE) continue;
            const key = `${candidate.x},${candidate.y},${candidate.z}`;
            engines.set(key, candidate);
        }
    }
    return [...engines.values()];
}

function isLitSteamCampfire(block) {
    if (block?.typeId !== "minecraft:campfire" && block?.typeId !== "minecraft:soul_campfire") return false;
    try { return block.permutation.getState("extinguished") !== true; } catch {}
    return true;
}

function structureHeat(blocks) {
    if (!blocks.length) return 0;
    const minY = Math.min(...blocks.map((block) => block.y));
    let burners = 0;
    let passiveHeat = false;
    for (const tank of blocks) {
        if (tank.y !== minY) continue;
        const below = adjacentBlock(tank, { x: 0, y: -1, z: 0 });
        if (below?.typeId === BLAZE_BURNER && isBlazeBurnerBlockActive(below)) burners++;
        if (
            below?.typeId === "minecraft:fire"
            || isLitSteamCampfire(below)
            || below?.typeId === "minecraft:lava"
            || below?.typeId === "minecraft:magma_block"
        ) {
            passiveHeat = true;
        }
    }
    return burners + (burners === 0 && passiveHeat ? 1 : 0);
}

function level(value, maximum) {
    if (maximum <= 0) return 0;
    return Math.max(0, Math.min(1, value / maximum));
}

function getSteamBoilerInfoFromBlocks(tankBlock, blocks) {
    if (tankBlock?.typeId !== FLUID_TANK) return undefined;
    if (!blocks.length) return undefined;

    const tank = getFluidTankInfo(tankBlock, blocks);
    const engines = structureEngines(blocks);
    if (!engines.length) return undefined;

    const heatSources = structureHeat(blocks);
    const waterAmount = tank?.fluid === WATER_FLUID ? tank.amount : 0;
    const waterLevel = level(waterAmount, tank?.capacity ?? 0);
    const sizeLevel = level(blocks.length, 27);
    const heatLevel = level(heatSources, Math.max(1, Math.min(9, blocks.length)));
    const active = waterAmount > 0 && heatSources > 0;
    const stressCapacity = active
        ? Math.round(engines.length * 2048 * Math.max(0.25, sizeLevel) * Math.max(0.25, heatLevel))
        : 0;

    return {
        active,
        engines: engines.length,
        heatSources,
        blockCount: blocks.length,
        sizeLevel,
        waterLevel,
        heatLevel,
        stressCapacity
    };
}

export function getSteamBoilerInfo(tankBlock) {
    if (tankBlock?.typeId !== FLUID_TANK) return undefined;
    return getSteamBoilerInfoFromBlocks(
        tankBlock,
        getConnectedFluidTankBlocks(tankBlock)
    );
}

function updateEngineGenerator(engine, boiler) {
    const facing = engine?.permutation?.getState("minecraft:facing_direction") ?? "north";
    const shaft = getOutputBlock(engine, facing);
    if (shaft?.typeId !== STEAM_ENGINE_SHAFT) return;

    const active = Boolean(boiler?.active);
    let stateChanged = false;
    try {
        if (shaft.permutation.getState("create:active_generator") !== active) {
            shaft.setPermutation(shaft.permutation.withState("create:active_generator", active));
            stateChanged = true;
        }
    } catch {}

    const rpm = active ? Math.round(16 + boiler.heatLevel * 48) : 0;
    let piston;
    try {
        piston = engine.dimension.getEntities({
            type: PISTON_ENTITY,
            location: engine.center(),
            maxDistance: 0.75
        })[0];
    } catch {}
    const capacity = active
        ? Math.max(512, Math.round(boiler.stressCapacity / Math.max(1, boiler.engines)))
        : 0;
    let entity;
    try {
        entity = shaft.dimension.getEntities({
            type: "create:shaft_steam_engine_entity",
            location: shaft.center(),
            maxDistance: 0.3
        })[0];
    } catch {}

    if (!entity?.isValid) {
        initRpmBlock({
            block: shaft,
            dimension: shaft.dimension,
            previousBlock: undefined
        });
        try {
            entity = shaft.dimension.getEntities({
                type: "create:shaft_steam_engine_entity",
                location: shaft.center(),
                maxDistance: 0.3
            })[0];
        } catch {}
    }
    if (!entity?.isValid) return;

    let valuesChanged = stateChanged;
    try {
        if (Number(entity.getDynamicProperty("create:generator_rpm")) !== rpm) valuesChanged = true;
        if (Number(entity.getDynamicProperty("create:stress_capacity")) !== capacity) valuesChanged = true;
    } catch {
        valuesChanged = true;
    }
    if (valuesChanged) {
        try {
            entity.setDynamicProperty("create:generator_rpm", rpm);
            entity.setDynamicProperty("create:stress_capacity", capacity);
        } catch {}
        initRpmBlock({
            block: shaft,
            dimension: shaft.dimension,
            previousBlock: undefined
        });
    }

    // Use the shaft entity's final network RPM, including its direction and
    // stress state, so both models share exactly the same angular clock.
    let shaftRpm = 0;
    try {
        shaftRpm = Number(entity.getProperty("create:rpm")) || 0;
    } catch {}
    try {
        if (piston?.isValid) {
            const pistonRunning = active && shaftRpm !== 0;
            if (piston.getProperty("create:running") !== pistonRunning) {
                piston.setProperty("create:running", pistonRunning);
            }
            if (Number(piston.getProperty("create:rpm")) !== shaftRpm) {
                piston.setProperty("create:rpm", shaftRpm);
            }
        }
    } catch {}
}

export function refreshFluidTankBoiler(tankBlock, knownBlocks) {
    if (tankBlock?.typeId !== FLUID_TANK) return false;
    const blocks = knownBlocks ?? getConnectedFluidTankBlocks(tankBlock);
    if (!blocks.length) return false;
    const engines = structureEngines(blocks);
    const closed = engines.length > 0;
    const changed = setFluidTankBoilerClosed(tankBlock, closed);
    const boiler = closed
        ? getSteamBoilerInfoFromBlocks(tankBlock, blocks)
        : undefined;
    for (const engine of engines) updateEngineGenerator(engine, boiler);
    return changed;
}

export function refreshBoilersNear(dimension, location) {
    if (!dimension || !location) return;
    const checked = new Set();
    for (const offset of ADJACENT) {
        let tank;
        try {
            tank = dimension.getBlock({
                x: location.x + offset.x,
                y: location.y + offset.y,
                z: location.z + offset.z
            });
        } catch {}
        if (tank?.typeId !== FLUID_TANK) continue;
        const key = `${tank.x},${tank.y},${tank.z}`;
        if (checked.has(key)) continue;
        checked.add(key);
        refreshFluidTankBoiler(tank);
    }
}

// Mantém água, calor e RPM sincronizados mesmo quando o fluido ou os queimadores mudam.
system.runInterval(() => {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        let dimension;
        try { dimension = world.getDimension(dimensionId); } catch {}
        if (!dimension) continue;

        let pistons = [];
        try { pistons = dimension.getEntities({ type: PISTON_ENTITY }); } catch {}
        const checked = new Set();
        for (const piston of pistons) {
            let engine;
            try {
                engine = dimension.getBlock({
                    x: Math.floor(piston.location.x),
                    y: Math.floor(piston.location.y),
                    z: Math.floor(piston.location.z)
                });
            } catch {}
            // Corrige entidades antigas que foram salvas meio bloco atrás da
            // máquina. Essa posição também fazia a iluminação ficar preta.
            if (engine?.typeId !== STEAM_ENGINE) {
                const pistonBlock = engine;
                for (const offset of ADJACENT) {
                    const candidate = adjacentBlock(pistonBlock, offset);
                    if (candidate?.typeId !== STEAM_ENGINE) continue;
                    engine = candidate;
                    break;
                }
            }
            if (engine?.typeId !== STEAM_ENGINE) continue;
            const facing = engine.permutation.getState("minecraft:facing_direction") ?? "north";
            const pistonCenter = getPistonLocation(engine, facing);
            try {
                const location = piston.location;
                if (
                    Math.abs(location.x - pistonCenter.x) > 0.001
                    || Math.abs(location.y - pistonCenter.y) > 0.001
                    || Math.abs(location.z - pistonCenter.z) > 0.001
                ) {
                    piston.teleport(pistonCenter, { rotation: { x: 0, y: 0 } });
                }
            } catch {}
            for (const entry of SUPPORT_DIRECTIONS) {
                const tank = adjacentBlock(engine, entry.offset);
                if (tank?.typeId !== FLUID_TANK) continue;
                const key = `${dimensionId}:${tank.x},${tank.y},${tank.z}`;
                if (checked.has(key)) break;
                checked.add(key);
                const connectedBlocks = getConnectedFluidTankBlocks(tank);
                for (const connected of connectedBlocks) {
                    checked.add(`${dimensionId}:${connected.x},${connected.y},${connected.z}`);
                }
                refreshFluidTankBoiler(tank, connectedBlocks);
                break;
            }
        }
    }
}, 40);

// Jato visual do motor: nasce na frente fixa do bloco e só existe enquanto
// o pistão estiver recebendo RPM. O som toca em pulsos para não sobrepor.
let steamJetPulse = 0;
system.runInterval(() => {
    steamJetPulse++;
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        let dimension;
        try { dimension = world.getDimension(dimensionId); } catch {}
        if (!dimension) continue;

        let pistons = [];
        try { pistons = dimension.getEntities({ type: PISTON_ENTITY }); } catch {}
        for (const piston of pistons) {
            let running = false;
            try { running = piston.getProperty("create:running") === true; } catch {}
            if (!running) continue;

            const engine = findPistonEngine(piston);
            if (engine?.typeId !== STEAM_ENGINE) continue;
            const facing = engine.permutation.getState("minecraft:facing_direction") ?? "north";
            const diagonalIndex = (steamJetPulse - 1) % STEAM_JET_DIAGONALS.length;
            emitSteamJet(engine, facing, diagonalIndex, steamJetPulse % 3 === 0);
        }
    }
}, 8);

function consumeShaft(player, item) {
    if (!player || player.getGameMode?.() === "Creative") return;

    const equippable = player.getComponent("equippable");
    if (!equippable || !item) return;

    if (item.amount > 1) {
        item.amount -= 1;
        equippable.setEquipment("Mainhand", item);
    } else {
        equippable.setEquipment("Mainhand", undefined);
    }
}

function pistonPhase(block) {
    const location = block?.location;
    if (!location) return "up";
    return (Math.abs(location.x + location.y + location.z) % 2) === 0
        ? "up"
        : "down";
}

function getPistonLocation(block, facing) {
    const output = OUTPUTS[facing] ?? OUTPUTS.north;
    return {
        x: block.location.x + 0.5 - output.x * 0.4375,
        y: block.location.y + 0.5 - output.y * 0.4375,
        z: block.location.z + 0.5 - output.z * 0.4375
    };
}

function getOutputBlock(block, facing) {
    const output = OUTPUTS[facing];
    if (!output) return undefined;

    try {
        return block.dimension.getBlock({
            x: block.location.x + output.x * 2,
            y: block.location.y + output.y * 2,
            z: block.location.z + output.z * 2
        });
    } catch {}
}

function placeOutputShaft(block, facing, allowCreate = false) {
    const output = OUTPUTS[facing];
    const target = getOutputBlock(block, facing);
    const canCreate = allowCreate && target && (target.isAir || target.isLiquid);
    if (
        !output
        || !target
        || (!canCreate && target.typeId !== SHAFT && target.typeId !== STEAM_ENGINE_SHAFT)
    ) {
        return false;
    }

    try {
        const currentFace = target.typeId === STEAM_ENGINE_SHAFT
            ? target.permutation.getState("minecraft:block_face")
            : undefined;
        const activeGenerator = target.typeId === STEAM_ENGINE_SHAFT
            ? Boolean(target.permutation.getState("create:active_generator"))
            : false;
        if (
            target.typeId !== STEAM_ENGINE_SHAFT
            || currentFace !== output.blockFace
        ) {
            target.setPermutation(BlockPermutation.resolve(STEAM_ENGINE_SHAFT, {
                "minecraft:block_face": output.blockFace,
                "create:active_generator": activeGenerator
            }));
        }
        initRpmBlock({
            block: target,
            dimension: block.dimension,
            previousBlock: undefined
        });
        return true;
    } catch {
        return false;
    }
}

function spawnOrUpdatePiston(block, facing) {
    const center = getPistonLocation(block, facing);
    const phase = pistonPhase(block);
    let piston = block.dimension.getEntities({
        type: PISTON_ENTITY,
        location: center,
        maxDistance: 0.75
    })[0];

    try {
        const created = !piston?.isValid;
        if (created) piston = block.dimension.spawnEntity(PISTON_ENTITY, center);
        piston.setProperty("create:cardinal_rotation", facing);
        piston.setProperty("create:piston_phase", phase);

        // A entity já nasce no mesmo estado angular do shaft. Antes ela
        // começava em RPM 0 e aguardava a próxima atualização do boiler.
        let currentRpm = 0;
        const shaft = getOutputBlock(block, facing);
        if (shaft?.typeId === STEAM_ENGINE_SHAFT) {
            try {
                const shaftEntity = shaft.dimension.getEntities({
                    type: "create:shaft_steam_engine_entity",
                    location: shaft.center(),
                    maxDistance: 0.3
                })[0];
                if (shaftEntity?.isValid) {
                    currentRpm = Number(shaftEntity.getProperty("create:rpm")) || 0;
                }
            } catch {}
        }
        piston.setProperty("create:rpm", currentRpm);
        piston.setProperty("create:running", Math.abs(currentRpm) > 0.001);
        // A entity permanece com rotação neutra. Toda a orientação visual é
        // aplicada por um único bone no resource pack, evitando rotação dupla.
        piston.teleport(center, { rotation: { x: 0, y: 0 } });
        return true;
    } catch {
        try {
            if (piston?.isValid) piston.remove();
        } catch {}
        return false;
    }
}

export function syncSteamEngine(block) {
    if (block?.typeId !== STEAM_ENGINE) return false;
    const facing = block.permutation.getState("minecraft:facing_direction") ?? "north";
    if (!placeOutputShaft(block, facing)) return false;
    return spawnOrUpdatePiston(block, facing);
}

export function syncSteamEngineNearShaft(shaftBlock) {
    if (shaftBlock?.typeId !== SHAFT && shaftBlock?.typeId !== STEAM_ENGINE_SHAFT) return false;

    for (const output of Object.values(OUTPUTS)) {
        let engine;
        try {
            engine = shaftBlock.dimension.getBlock({
                x: shaftBlock.location.x - output.x * 2,
                y: shaftBlock.location.y - output.y * 2,
                z: shaftBlock.location.z - output.z * 2
            });
        } catch {}
        if (engine?.typeId !== STEAM_ENGINE) continue;

        const facing = engine.permutation.getState("minecraft:facing_direction") ?? "north";
        if (OUTPUTS[facing] !== output) continue;
        return syncSteamEngine(engine);
    }
    return false;
}

function removeSteamEngineShaftVisual(dimension, location) {
    if (!dimension || !location) return;
    const center = {
        x: location.x + 0.5,
        y: location.y + 0.5,
        z: location.z + 0.5
    };
    let visuals = [];
    try {
        visuals = dimension.getEntities({
            type: "create:shaft_steam_engine_entity",
            location: center,
            maxDistance: 0.55
        });
    } catch {}
    for (const visual of visuals) {
        try {
            if (visual.isValid) visual.remove();
        } catch {}
    }
}

function restoreShaft(target) {
    if (target?.typeId !== STEAM_ENGINE_SHAFT) return false;
    const blockFace = target.permutation.getState("minecraft:block_face") ?? "north";
    try {
        // A visual do eixo do motor usa outra entidade da visual normal do
        // Shaft. Remova-a antes de voltar o bloco para não deixar um eixo
        // fantasma girando no ar.
        removeSteamEngineShaftVisual(target.dimension, target.location);
        target.setPermutation(BlockPermutation.resolve(SHAFT, {
            "minecraft:block_face": blockFace
        }));
        initRpmBlock({
            block: target,
            dimension: target.dimension,
            previousBlock: undefined
        });
        return true;
    } catch {
        return false;
    }
}

export function removeSteamEngineConnection(dimension, location, brokenPermutation) {
    if (!dimension || !location) return;
    const facing = brokenPermutation?.getState?.("minecraft:facing_direction");

    if (facing && OUTPUTS[facing]) {
        const output = OUTPUTS[facing];
        let target;
        try {
            target = dimension.getBlock({
                x: location.x + output.x * 2,
                y: location.y + output.y * 2,
                z: location.z + output.z * 2
            });
        } catch {}
        restoreShaft(target);
    } else {
        // Fallback para mundos antigos em que o estado de direção não foi salvo.
        for (const output of Object.values(OUTPUTS)) {
            let target;
            try {
                target = dimension.getBlock({
                    x: location.x + output.x * 2,
                    y: location.y + output.y * 2,
                    z: location.z + output.z * 2
                });
            } catch {}
            restoreShaft(target);
        }
    }

    const center = { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 };
    for (const piston of dimension.getEntities({
        type: PISTON_ENTITY,
        location: center,
        maxDistance: 0.9
    })) {
        try {
            if (piston.isValid) piston.remove();
        } catch {}
    }
    refreshBoilersNear(dimension, location);
}

export function steamEnginePistonRemoved(dimension, location) {
    if (!dimension || !location) return;
    const engineLocation = {
        x: Math.floor(location.x),
        y: Math.floor(location.y),
        z: Math.floor(location.z)
    };
    let engine;
    try {
        engine = dimension.getBlock(engineLocation);
    } catch {}
    if (engine?.typeId !== STEAM_ENGINE) return;

    const facing = engine.permutation.getState("minecraft:facing_direction") ?? "north";
    restoreShaft(getOutputBlock(engine, facing));
}

export function steamEngineShaftBroken(dimension, location) {
    if (!dimension || !location) return;

    // Também cobre a quebra com Wrench, que troca o bloco diretamente para ar
    // e por isso não reaproveita o caminho normal de restauração do eixo.
    removeSteamEngineShaftVisual(dimension, location);

    for (const output of Object.values(OUTPUTS)) {
        let engine;
        try {
            engine = dimension.getBlock({
                x: location.x - output.x * 2,
                y: location.y - output.y * 2,
                z: location.z - output.z * 2
            });
        } catch {}
        if (engine?.typeId !== STEAM_ENGINE) continue;

        const facing = engine.permutation.getState("minecraft:facing_direction") ?? "north";
        if (OUTPUTS[facing] !== output) continue;

        const center = {
            x: engine.location.x + 0.5,
            y: engine.location.y + 0.5,
            z: engine.location.z + 0.5
        };
        for (const piston of dimension.getEntities({
            type: PISTON_ENTITY,
            location: center,
            maxDistance: 0.9
        })) {
            try {
                if (piston.isValid) piston.remove();
            } catch {}
        }
        return;
    }
}

export function steamEngineInteract(block, player, item) {
    if (block?.typeId !== STEAM_ENGINE || item?.typeId !== SHAFT) return false;
    const facing = block.permutation.getState("minecraft:facing_direction") ?? "north";
    const connected = placeOutputShaft(block, facing, true);
    if (connected) spawnOrUpdatePiston(block, facing);
    if (connected) consumeShaft(player, item);
    return true;
}
