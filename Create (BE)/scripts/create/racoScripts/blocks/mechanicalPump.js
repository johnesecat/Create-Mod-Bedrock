import * as mc from "@minecraft/server";
import { receiveSpoutFluid } from "./spout.js";
import { peekItemDrainFluid, receiveItemDrainFluid, takeItemDrainFluid } from "./itemDrain.js";
import { smartFluidPipeAllows } from "./smartFluidPipe.js";
import { showPipeFluidVisual } from "./pipe.js";
import { peekFluidTankFluid, receiveFluidTankFluid, takeFluidTankFluid } from "../../tank/fluidTank.js";
import { compatibilityFluids } from "../../compatibility/registries.js";
import { recalculateNetwork } from "../../andrielScripts/rpm/rpmCore.js";

const PIPE_TYPE = "create:pipe";
const GLASS_PIPE_TYPE = "create:glass_pipe";
const SMART_FLUID_PIPE_TYPE = "create:smart_fluid_pipe";
const PUMP_TYPE = "create:mechanical_pump";
const SPOUT_TYPE = "create:spout";
const ITEM_DRAIN_TYPE = "create:item_drain";
const BASIN_TYPE = "create:basin";
const HOSE_PULLEY_TYPE = "create:hose_pulley";
const FLUID_TANK_TYPE = "create:fluid_tank";
const CREATIVE_FLUID_TANK_TYPE = "create:creative_fluid_tank";
const CAULDRON_TYPE = "minecraft:cauldron";
const HONEY_SOURCE_BLOCKS = new Set(["minecraft:bee_nest", "minecraft:beehive"]);
const MAX_PIPE_SEARCH = 96;
const MIN_FLOW_INTERVAL = 4;
const MAX_FLOW_INTERVAL = 80;
const FLOW_RPM_SCALE = 120;
const LEAK_PLACE_DELAY = 10;
const FLUID_UPDATE_DELAY = 2;
const HOSE_POOL_SEARCH_LIMIT = 384;
const HOSE_INFINITE_POOL_SIZE = 10000;
const HOSE_INFINITE_SCAN_INTERVAL = 100;
const HOSE_INFINITE_ANNOUNCEMENT_VERSION = "translated_v1";
const hoseInfiniteScanTicks = new Map();

const DIRECTIONS = {
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    west: { x: -1, y: 0, z: 0 },
    east: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    down: { x: 0, y: -1, z: 0 }
};

const OPPOSITE = {
    north: "south",
    south: "north",
    west: "east",
    east: "west",
    up: "down",
    down: "up"
};

const pumpCooldowns = new Map();
const pumpRpmCache = new Map();
const activePumpJets = new Map();
const pumpWrenchClicks = new Map();

const FLUIDS = {
    "minecraft:water_bucket": {
        sourceBlocks: new Set(["minecraft:water", "minecraft:flowing_water"]),
        block: "minecraft:water",
        particle: "minecraft:water_drip_particle",
        jetParticle: "create:pump_water_jet",
        sound: "bucket.empty_water"
    },
    "minecraft:lava_bucket": {
        sourceBlocks: new Set(["minecraft:lava", "minecraft:flowing_lava"]),
        block: "minecraft:lava",
        particle: "minecraft:lava_drip_particle",
        jetParticle: "create:pump_lava_jet",
        placeDelay: 80,
        sound: "bucket.empty_lava"
    },
    "create:honey_bucket": {
        sourceBlocks: new Set(["create:honey_fluid"]),
        block: "create:honey_fluid",
        particle: "minecraft:honey_drip_particle",
        jetParticle: "create:pump_honey_jet",
        sound: "place.honey_block"
    },
    "create:chocolate_bucket": {
        sourceBlocks: new Set(["create:chocolate_fluid"]),
        block: "create:chocolate_fluid",
        particle: "minecraft:water_drip_particle",
        jetParticle: "create:pump_chocolate_jet",
        sound: "place.honey_block"
    },
    "minecraft:milk_bucket": {
        sourceBlocks: new Set(["create:milk_fluid"]),
        block: "create:milk_fluid",
        particle: "minecraft:water_drip_particle",
        jetParticle: "create:pump_milk_jet",
        sound: "bucket.empty_water"
    }
};

function getFluid(fluidId) {
    return FLUIDS[fluidId] ?? compatibilityFluids.get(fluidId);
}

const FLUID_BY_SOURCE_BLOCK = new Map();
for (const [fluidId, config] of Object.entries(FLUIDS)) {
    for (const blockId of config.sourceBlocks) FLUID_BY_SOURCE_BLOCK.set(blockId, fluidId);
}

function key(location) {
    return `${location.x},${location.y},${location.z}`;
}

function offset(location, direction) {
    const vector = DIRECTIONS[direction] ?? DIRECTIONS.south;
    return {
        x: location.x + vector.x,
        y: location.y + vector.y,
        z: location.z + vector.z
    };
}

function getBlock(dimension, location) {
    try { return dimension.getBlock(location); }
    catch { return undefined; }
}

function getState(block, stateId) {
    try { return block.permutation.getState(stateId); }
    catch { return undefined; }
}

function getHoneyLevelState(block) {
    for (const stateId of ["honey_level", "minecraft:honey_level"]) {
        const value = getState(block, stateId);
        if (value !== undefined) return { stateId, value: Number(value) };
    }
    return undefined;
}

function getCauldronState(block, stateNames) {
    for (const stateId of stateNames) {
        const value = getState(block, stateId);
        if (value !== undefined) return { stateId, value };
    }
    return undefined;
}

function getCauldronFluid(block) {
    if (block?.typeId !== CAULDRON_TYPE) return undefined;

    const liquid = getCauldronState(block, ["cauldron_liquid", "minecraft:cauldron_liquid"]);
    const level = getCauldronState(block, ["fill_level", "minecraft:fill_level"]);
    const fillLevel = Number(level?.value ?? 0);

    // A bomba transfere um balde inteiro por ciclo. Caldeirões parciais
    // permanecem intactos para não criar fluido adicional.
    if (!Number.isFinite(fillLevel) || fillLevel < 6) return undefined;
    if (liquid?.value === "water") return "minecraft:water_bucket";
    if (liquid?.value === "lava") return "minecraft:lava_bucket";
    return undefined;
}

function emptyCauldron(block) {
    if (block?.typeId !== CAULDRON_TYPE) return false;

    const level = getCauldronState(block, ["fill_level", "minecraft:fill_level"]);
    if (level) {
        try {
            block.setPermutation(block.permutation.withState(level.stateId, 0));
            return true;
        } catch {}
    }

    try {
        block.dimension.runCommand(`setblock ${block.x} ${block.y} ${block.z} cauldron`);
        return true;
    } catch {
        return false;
    }
}

function isSpinning(block) {
    return getState(block, "create:is_spinning") === true;
}

function getPumpFront(block) {
    return getState(block, "minecraft:facing_direction")
        ?? getState(block, "minecraft:cardinal_direction")
        ?? "south";
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getPumpRpm(block) {
    const id = key(block.location);
    const now = mc.system.currentTick;
    const cached = pumpRpmCache.get(id);
    if (cached && now < cached.expires) return cached.rpm;

    const entity = block.dimension.getEntities({
        type: "create:pump_cog",
        location: block.center(),
        maxDistance: 0.85,
        closest: 1
    })[0];
    const rpm = Math.abs(Number(entity?.getProperty("create:rpm") ?? 0));
    const safeRpm = Number.isFinite(rpm) ? rpm : 0;
    pumpRpmCache.set(id, { rpm: safeRpm, expires: now + 20 });
    return safeRpm;
}

function getFlowIntervalFromRpm(block) {
    const rpm = getPumpRpm(block);
    if (rpm <= 0) return MAX_FLOW_INTERVAL;
    return clamp(Math.ceil(FLOW_RPM_SCALE / rpm), MIN_FLOW_INTERVAL, MAX_FLOW_INTERVAL);
}

function isFullFluidSourceBlock(block) {
    if (!block) return false;
    if (block.typeId === "minecraft:flowing_water" || block.typeId === "minecraft:flowing_lava") return false;

    // Nos fluidos vanilla, liquid_depth 0 representa uma fonte completa.
    // A verificacao generica tambem protege fluidos de compatibilidade que
    // exponham esse mesmo estado.
    const liquidDepth = getState(block, "liquid_depth");
    if (liquidDepth !== undefined && Number(liquidDepth) !== 0) return false;
    return true;
}

function getSourceFluid(block) {
    if (!block) return undefined;
    if (block.typeId === FLUID_TANK_TYPE || block.typeId === CREATIVE_FLUID_TANK_TYPE) return peekFluidTankFluid(block);
    if (block.typeId === CAULDRON_TYPE) return getCauldronFluid(block);
    if (HONEY_SOURCE_BLOCKS.has(block.typeId) && (getHoneyLevelState(block)?.value ?? 0) >= 5) return "create:honey_bucket";
    const worldFluid = FLUID_BY_SOURCE_BLOCK.get(block.typeId);
    if (worldFluid) return isFullFluidSourceBlock(block) ? worldFluid : undefined;
    return peekItemDrainFluid(block);
}

function getHoseSourceFluid(block) {
    if (!block) return undefined;
    if (!isFullFluidSourceBlock(block)) return undefined;
    return getSourceFluid(block);
}

function getHosePulleyIntakeBlock(hosePulley) {
    if (!hosePulley || hosePulley.typeId !== HOSE_PULLEY_TYPE) return undefined;
    const tag = `create:hose_pulley:${hosePulley.x}:${hosePulley.y}:${hosePulley.z}`;
    const cap = hosePulley.dimension.getEntities({
        type: "create:rope_half",
        tags: [tag]
    }).sort((a, b) => a.location.y - b.location.y)[0];
    if (!cap?.isValid) return undefined;

    return getBlock(hosePulley.dimension, {
        x: hosePulley.x,
        y: Math.floor(cap.location.y - 0.05),
        z: hosePulley.z
    });
}

function getPoolFluidId(block) {
    if (!block) return undefined;
    return FLUID_BY_SOURCE_BLOCK.get(block.typeId);
}

function hoseInfiniteFluidKey(hosePulley) {
    return `create:hose_infinite_fluid:${hosePulley.dimension.id}:${hosePulley.x}:${hosePulley.y}:${hosePulley.z}`;
}

function hoseInfiniteAnnouncedKey(hosePulley) {
    return `${hoseInfiniteFluidKey(hosePulley)}:announced`;
}

function getInfiniteHoseFluid(hosePulley) {
    try {
        const stored = mc.world.getDynamicProperty(hoseInfiniteFluidKey(hosePulley));
        return typeof stored === "string" && getFluid(stored) ? stored : undefined;
    } catch { return undefined; }
}

function markInfiniteHosePool(hosePulley, fluidId) {
    try { mc.world.setDynamicProperty(hoseInfiniteFluidKey(hosePulley), fluidId); } catch {}
    try {
        // A versao permite que uma pulley que ja tinha detectado a fonte antes
        // da traducao receba o novo aviso uma unica vez.
        if (mc.world.getDynamicProperty(hoseInfiniteAnnouncedKey(hosePulley)) === HOSE_INFINITE_ANNOUNCEMENT_VERSION) return;
        mc.world.setDynamicProperty(hoseInfiniteAnnouncedKey(hosePulley), HOSE_INFINITE_ANNOUNCEMENT_VERSION);
        for (const player of hosePulley.dimension.getPlayers()) {
            player.sendMessage({ translate: "create.text.mechanical_pump.infinite_fluid_source" });
        }
    } catch {}
}

function isLargeHoseFluidPool(hosePulley, firstFluidBlock, fluidId) {
    const scanKey = `${hosePulley.dimension.id}:${hosePulley.x}:${hosePulley.y}:${hosePulley.z}`;
    const now = mc.system.currentTick;
    if (now < (hoseInfiniteScanTicks.get(scanKey) ?? 0)) return false;
    hoseInfiniteScanTicks.set(scanKey, now + HOSE_INFINITE_SCAN_INTERVAL);

    const queue = [firstFluidBlock.location];
    const visited = new Set();
    while (queue.length && visited.size < HOSE_INFINITE_POOL_SIZE) {
        const location = queue.shift();
        const locationKey = key(location);
        if (visited.has(locationKey)) continue;
        visited.add(locationKey);
        const current = getBlock(hosePulley.dimension, location);
        if (getPoolFluidId(current) !== fluidId) continue;
        for (const direction of Object.keys(DIRECTIONS)) {
            const next = offset(location, direction);
            if (!visited.has(key(next))) queue.push(next);
        }
    }
    return visited.size >= HOSE_INFINITE_POOL_SIZE;
}

// Depois que a ponta suga o bloco logo abaixo dela, ela precisa continuar
// procurando a mesma poça pelos blocos de fluido conectados. Sem isso a Hose
// Pulley parava depois de retirar somente o primeiro bloco.
function findHosePulleyPoolSource(hosePulley) {
    const intake = getHosePulleyIntakeBlock(hosePulley);
    if (!intake) return { block: undefined, fluidId: undefined };

    const directFluid = getHoseSourceFluid(intake);
    const infiniteFluid = getInfiniteHoseFluid(hosePulley);
    if (directFluid) {
        const isInfinite = infiniteFluid === directFluid || isLargeHoseFluidPool(hosePulley, intake, directFluid);
        if (isInfinite && infiniteFluid !== directFluid) markInfiniteHosePool(hosePulley, directFluid);
        return { block: intake, fluidId: directFluid, infinite: isInfinite };
    }

    const dimension = hosePulley.dimension;
    const initialLocations = [intake.location];
    for (const direction of Object.keys(DIRECTIONS)) initialLocations.push(offset(intake.location, direction));

    let fluidId;
    let firstFluidBlock;
    for (const location of initialLocations) {
        const candidate = getBlock(dimension, location);
        const candidateFluid = getPoolFluidId(candidate);
        if (!candidateFluid) continue;
        fluidId = candidateFluid;
        firstFluidBlock = candidate;
        break;
    }
    if (!fluidId || !firstFluidBlock) return { block: undefined, fluidId: undefined };

    const queue = [firstFluidBlock.location];
    const visited = new Set();
    while (queue.length && visited.size < HOSE_POOL_SEARCH_LIMIT) {
        const location = queue.shift();
        const locationKey = key(location);
        if (visited.has(locationKey)) continue;
        visited.add(locationKey);

        const current = getBlock(dimension, location);
        if (getPoolFluidId(current) !== fluidId) continue;
        if (getHoseSourceFluid(current) === fluidId) {
            const isInfinite = infiniteFluid === fluidId || isLargeHoseFluidPool(hosePulley, firstFluidBlock, fluidId);
            if (isInfinite && infiniteFluid !== fluidId) markInfiniteHosePool(hosePulley, fluidId);
            return { block: current, fluidId, infinite: isInfinite };
        }

        for (const direction of Object.keys(DIRECTIONS)) {
            const next = offset(location, direction);
            if (!visited.has(key(next))) queue.push(next);
        }
    }

    return { block: undefined, fluidId: undefined, infinite: false };
}

function resolvePumpSource(block) {
    if (!block) return { block: undefined, fluidId: undefined };
    if (block.typeId === HOSE_PULLEY_TYPE) {
        return findHosePulleyPoolSource(block);
    }
    return { block, fluidId: getSourceFluid(block) };
}

function resolvePumpSourceThroughPipes(startBlock) {
    const direct = resolvePumpSource(startBlock);
    if (direct.fluidId || !isPipeNetworkNode(startBlock)) return { ...direct, pipes: [] };

    const queue = [{ block: startBlock, path: [] }];
    const visited = new Set();
    while (queue.length > 0 && visited.size < MAX_PIPE_SEARCH) {
        const { block, path } = queue.shift();
        if (!block) continue;
        const blockKey = key(block.location);
        if (visited.has(blockKey)) continue;
        visited.add(blockKey);

        const nextPath = [...path, block];
        for (const direction of Object.keys(DIRECTIONS)) {
            const nextBlock = getBlock(block.dimension, offset(block.location, direction));
            if (!nextBlock) continue;
            if (isPipeNetworkNode(nextBlock)) {
                if (!visited.has(key(nextBlock.location))) queue.push({ block: nextBlock, path: nextPath });
                continue;
            }

            const source = resolvePumpSource(nextBlock);
            if (!source.fluidId) continue;
            const allowed = nextPath.every((pipe) =>
                pipe.typeId !== SMART_FLUID_PIPE_TYPE || smartFluidPipeAllows(pipe, source.fluidId)
            );
            if (allowed) return { ...source, pipes: nextPath };
        }
    }

    return { block: undefined, fluidId: undefined, infinite: false, pipes: [] };
}

function isFluidNode(block) {
    return block?.typeId === PIPE_TYPE || block?.typeId === GLASS_PIPE_TYPE || block?.typeId === SMART_FLUID_PIPE_TYPE || block?.typeId === SPOUT_TYPE;
}

function isFluidConnector(block) {
    return block?.typeId === PIPE_TYPE
        || block?.typeId === GLASS_PIPE_TYPE
        || block?.typeId === SMART_FLUID_PIPE_TYPE
        || block?.typeId === SPOUT_TYPE
        || block?.typeId === PUMP_TYPE
        || block?.typeId === ITEM_DRAIN_TYPE
        || block?.typeId === BASIN_TYPE
        || block?.typeId === HOSE_PULLEY_TYPE
        || block?.typeId === FLUID_TANK_TYPE
        || block?.typeId === CREATIVE_FLUID_TANK_TYPE;
}

function isStoredFluidSource(block) {
    return block?.typeId === ITEM_DRAIN_TYPE
        || block?.typeId === BASIN_TYPE
        || block?.typeId === FLUID_TANK_TYPE
        || block?.typeId === CREATIVE_FLUID_TANK_TYPE;
}

function particleFor(fluidId) {
    return getFluid(fluidId)?.particle ?? "minecraft:water_drip_particle";
}

function soundFor(fluidId) {
    return getFluid(fluidId)?.sound ?? "bucket.empty_water";
}

function placeDelayFor(fluidId) {
    return getFluid(fluidId)?.placeDelay ?? LEAK_PLACE_DELAY;
}

function spawnLeak(block, fluidId) {
    // O jato visual da bomba usa apenas as partículas direcionais do Create.
}

function spawnPumpJet(block, direction, fluidId) {
    const vector = DIRECTIONS[direction];
    const particle = getFluid(fluidId)?.jetParticle;
    if (!vector || !particle) return;
    const center = block.center();
    const variables = new mc.MolangVariableMap();
    variables.setFloat("variable.direction_x", vector.x);
    variables.setFloat("variable.direction_y", vector.y);
    variables.setFloat("variable.direction_z", vector.z);
    try {
        block.dimension.spawnParticle(particle, {
            x: center.x + vector.x * 0.62,
            y: center.y + vector.y * 0.62,
            z: center.z + vector.z * 0.62
        }, variables);
    } catch {}
}

function startPumpJetUntilPlaced(block, direction, fluidId) {
    if (!block?.isValid) return;
    const jetKey = `${block.dimension.id}:${key(block.location)}:${direction}:${fluidId}`;
    const endTick = mc.system.currentTick + placeDelayFor(fluidId);
    const previousEnd = activePumpJets.get(jetKey) ?? 0;
    activePumpJets.set(jetKey, Math.max(previousEnd, endTick));
    if (previousEnd > mc.system.currentTick) return;

    const emit = () => {
        const activeUntil = activePumpJets.get(jetKey) ?? 0;
        const outputBlock = getBlock(block.dimension, offset(block.location, direction));
        const fluidAppeared = outputBlock?.typeId === fluidBlockId(fluidId);
        if (!block?.isValid || fluidAppeared || mc.system.currentTick >= activeUntil) {
            activePumpJets.delete(jetKey);
            return;
        }
        spawnPumpJet(block, direction, fluidId);
        mc.system.runTimeout(emit, 3);
    };
    emit();
}

function distanceBetween(a, b) {
    if (!a || !b) return 999999;
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

function canPlaceFluid(block) {
    return !block
        || block.typeId === "minecraft:air"
        || block.typeId === "minecraft:water"
        || block.typeId === "minecraft:flowing_water"
        || block.typeId === "minecraft:lava"
        || block.typeId === "minecraft:flowing_lava";
}

function fluidBlockId(fluidId) {
    return getFluid(fluidId)?.block;
}

function isVanillaFluid(fluidId) {
    return fluidId === "minecraft:water_bucket" || fluidId === "minecraft:lava_bucket";
}

function flowingFluidBlockId(fluidId) {
    if (fluidId === "minecraft:water_bucket") return "minecraft:flowing_water";
    if (fluidId === "minecraft:lava_bucket") return "minecraft:flowing_lava";
    return fluidBlockId(fluidId);
}

function runSetBlock(dimension, location, blockArgs) {
    try {
        const result = dimension.runCommand(`setblock ${location.x} ${location.y} ${location.z} ${blockArgs}`);
        return (result?.successCount ?? 0) > 0;
    } catch {
        return false;
    }
}

function canFlowInto(block) {
    return !block || block.typeId === "minecraft:air";
}

function setVanillaFlowBlock(dimension, location, fluidId, depth) {
    const blockId = flowingFluidBlockId(fluidId);
    const commands = [
        `${blockId} ["liquid_depth"=${depth}] replace`,
        `${blockId} ["liquid_depth"=${depth}]`,
        `${blockId} replace`,
        blockId
    ];

    for (const command of commands) {
        if (runSetBlock(dimension, location, command)) return true;
    }

    return false;
}

function updateVanillaFluidBlock(block, fluidId) {
    if (!isVanillaFluid(fluidId) || !block) return;

    const dimension = block.dimension;
    const source = { x: block.x, y: block.y, z: block.z };
    const horizontalDirections = ["north", "south", "west", "east"];

    mc.system.runTimeout(() => {
        const belowLocation = offset(source, "down");
        const belowBlock = getBlock(dimension, belowLocation);
        if (canFlowInto(belowBlock)) {
            setVanillaFlowBlock(dimension, belowLocation, fluidId, 8);
            return;
        }

        for (const direction of horizontalDirections) {
            const flowLocation = offset(source, direction);
            const flowBlock = getBlock(dimension, flowLocation);
            if (canFlowInto(flowBlock)) setVanillaFlowBlock(dimension, flowLocation, fluidId, 1);
        }
    }, FLUID_UPDATE_DELAY);
}

function setVanillaFluidBlock(block, fluidId) {
    const blockId = fluidBlockId(fluidId);
    if (!blockId) return false;
    const location = { x: block.x, y: block.y, z: block.z };
    const commands = [
        `${blockId} ["liquid_depth"=0] replace`,
        `${blockId} ["liquid_depth"=0]`,
        `${blockId} replace`,
        blockId
    ];

    for (const command of commands) {
        if (runSetBlock(block.dimension, location, command)) {
            updateVanillaFluidBlock(block, fluidId);
            return true;
        }
    }

    return false;
}

function setFluidBlock(block, fluidId) {
    if (!block) return false;
    const blockId = fluidBlockId(fluidId);
    if (!blockId) return false;

    if (isVanillaFluid(fluidId)) return setVanillaFluidBlock(block, fluidId);

    try {
        block.setType(blockId);
        return true;
    } catch {
        try {
            block.dimension.runCommand(`setblock ${block.x} ${block.y} ${block.z} ${blockId}`);
            return true;
        } catch {
            return false;
        }
    }
}

function removeSourceFluid(block) {
    if (!block) return;
    if (block.typeId === CAULDRON_TYPE) {
        emptyCauldron(block);
        return;
    }
    if (HONEY_SOURCE_BLOCKS.has(block.typeId)) {
        const honeyState = getHoneyLevelState(block);
        if (honeyState) {
            try {
                block.setPermutation(block.permutation.withState(honeyState.stateId, 0));
                return;
            } catch {}
        }
    }
    try { block.setType("minecraft:air"); }
    catch {
        try { block.dimension.runCommand(`setblock ${block.x} ${block.y} ${block.z} air`); } catch {}
    }
}

function placeLeakFluid(block, direction, fluidId) {
    const leakBlock = getBlock(block.dimension, offset(block.location, direction));
    if (!canPlaceFluid(leakBlock)) {
        spawnLeak(block, fluidId);
        return false;
    }

    if (!setFluidBlock(leakBlock, fluidId)) {
        spawnLeak(block, fluidId);
        return false;
    }
    spawnLeak(leakBlock, fluidId);
    return true;
}

function scheduleLeakFluid(block, direction, fluidId) {
    spawnLeak(block, fluidId);
    mc.system.runTimeout(() => {
        if (!block?.isValid) return;
        placeLeakFluid(block, direction, fluidId);
    }, placeDelayFor(fluidId));
    return true;
}

function getHosePulleyOutlet(hosePulley) {
    if (!hosePulley || hosePulley.typeId !== HOSE_PULLEY_TYPE) return undefined;
    const tag = `create:hose_pulley:${hosePulley.x}:${hosePulley.y}:${hosePulley.z}`;
    const cap = hosePulley.dimension.getEntities({
        type: "create:rope_half",
        tags: [tag]
    }).sort((a, b) => a.location.y - b.location.y)[0];
    if (!cap?.isValid) return undefined;

    const location = {
        x: hosePulley.x,
        y: Math.floor(cap.location.y - 0.05),
        z: hosePulley.z
    };
    return {
        cap,
        block: getBlock(hosePulley.dimension, location),
        location
    };
}

function spawnHosePulleyJet(hosePulley, fluidId) {
    const outlet = getHosePulleyOutlet(hosePulley);
    const particle = getFluid(fluidId)?.jetParticle;
    if (!outlet || !particle) return;

    const variables = new mc.MolangVariableMap();
    variables.setFloat("variable.direction_x", 0);
    variables.setFloat("variable.direction_y", -1);
    variables.setFloat("variable.direction_z", 0);
    try {
        hosePulley.dimension.spawnParticle(particle, {
            x: hosePulley.x + 0.5,
            y: outlet.cap.location.y - 0.42,
            z: hosePulley.z + 0.5
        }, variables);
    } catch {}
}

function receiveHosePulleyFluid(hosePulley, fluidId) {
    const outlet = getHosePulleyOutlet(hosePulley);
    if (!outlet || !canPlaceFluid(outlet.block)) return false;

    const pourKey = `${hosePulley.dimension.id}:${key(hosePulley.location)}:hose:${fluidId}`;
    if ((activePumpJets.get(pourKey) ?? 0) > mc.system.currentTick) return false;

    const endTick = mc.system.currentTick + placeDelayFor(fluidId);
    activePumpJets.set(pourKey, endTick);

    const emit = () => {
        const currentOutlet = getHosePulleyOutlet(hosePulley);
        if (!hosePulley?.isValid || !currentOutlet || mc.system.currentTick >= endTick) {
            activePumpJets.delete(pourKey);
            return;
        }
        if (currentOutlet.block?.typeId === fluidBlockId(fluidId)) {
            activePumpJets.delete(pourKey);
            return;
        }
        spawnHosePulleyJet(hosePulley, fluidId);
        mc.system.runTimeout(emit, 3);
    };
    emit();

    mc.system.runTimeout(() => {
        const currentOutlet = getHosePulleyOutlet(hosePulley);
        activePumpJets.delete(pourKey);
        if (!currentOutlet || !canPlaceFluid(currentOutlet.block)) return;
        if (!setFluidBlock(currentOutlet.block, fluidId)) return;
        try {
            hosePulley.dimension.playSound(soundFor(fluidId), currentOutlet.cap.location, {
                volume: 0.45,
                pitch: 1.05
            });
        } catch {}
    }, placeDelayFor(fluidId));
    return true;
}

function spawnPipeFlow(block, fluidId) {
    if (mc.system.currentTick % 4 !== 0) return;
    const center = block?.center?.();
    if (!center) return;
    try {
        block.dimension.spawnParticle(particleFor(fluidId), {
            x: center.x + (Math.random() - 0.5) * 0.18,
            y: center.y + (Math.random() - 0.5) * 0.18,
            z: center.z + (Math.random() - 0.5) * 0.18
        });
    } catch {}
}

function getPipeConnectionDirections(block) {
    const connections = [];
    for (const direction of Object.keys(DIRECTIONS)) {
        const nextBlock = getBlock(block.dimension, offset(block.location, direction));
        if (isFluidConnector(nextBlock)) connections.push(direction);
    }
    return connections;
}

function isPipeNetworkNode(block) {
    return block?.typeId === PIPE_TYPE || block?.typeId === GLASS_PIPE_TYPE || block?.typeId === SMART_FLUID_PIPE_TYPE;
}

function getLeakDirection(block, connections) {
    const pipeDirection = getState(block, "minecraft:cardinal_direction") ?? "south";
    if (connections.length === 1) return OPPOSITE[connections[0]] ?? pipeDirection;
    return pipeDirection;
}

function hasFluidTargetConnection(block, connections) {
    return connections.some((direction) =>
        [SPOUT_TYPE, ITEM_DRAIN_TYPE, BASIN_TYPE, HOSE_PULLEY_TYPE, FLUID_TANK_TYPE, CREATIVE_FLUID_TANK_TYPE].includes(
            getBlock(block.dimension, offset(block.location, direction))?.typeId
        )
    );
}

function closestTarget(targets, sourceLocation) {
    let closest = undefined;
    let closestDistance = 999999;
    for (const target of targets) {
        const location = target.block?.location;
        const distance = distanceBetween(sourceLocation, location);
        if (distance < closestDistance) {
            closest = target;
            closestDistance = distance;
        }
    }
    return closest;
}

function scanPipeNetwork(startBlock, fluidId) {
    const result = {
        spouts: [],
        drains: [],
        basins: [],
        hosePulleys: [],
        tanks: [],
        leaks: [],
        pipes: []
    };

    if (!startBlock) return result;
    if (startBlock.typeId === SPOUT_TYPE) {
        result.spouts.push(startBlock);
        return result;
    }
    if (startBlock.typeId === ITEM_DRAIN_TYPE) {
        result.drains.push(startBlock);
        return result;
    }
    if (startBlock.typeId === BASIN_TYPE) {
        result.basins.push(startBlock);
        return result;
    }
    if (startBlock.typeId === HOSE_PULLEY_TYPE) {
        result.hosePulleys.push(startBlock);
        return result;
    }
    if (startBlock.typeId === FLUID_TANK_TYPE || startBlock.typeId === CREATIVE_FLUID_TANK_TYPE) {
        result.tanks.push(startBlock);
        return result;
    }
    if (startBlock.typeId === SMART_FLUID_PIPE_TYPE && !smartFluidPipeAllows(startBlock, fluidId)) return result;
    if (!isPipeNetworkNode(startBlock)) {
        result.leaks.push({ block: startBlock, direction: "up", direct: true });
        return result;
    }

    const queue = [{ block: startBlock, from: undefined }];
    const visited = new Set();

    while (queue.length > 0 && visited.size < MAX_PIPE_SEARCH) {
        const { block, from } = queue.shift();
        if (!block || visited.has(key(block.location))) continue;
        visited.add(key(block.location));
        if (block.typeId === PIPE_TYPE || block.typeId === GLASS_PIPE_TYPE) result.pipes.push(block);

        for (const direction of Object.keys(DIRECTIONS)) {
            if (from && direction === from) continue;

            const nextBlock = getBlock(block.dimension, offset(block.location, direction));
            if (nextBlock?.typeId === SPOUT_TYPE) result.spouts.push(nextBlock);
            if (nextBlock?.typeId === ITEM_DRAIN_TYPE) result.drains.push(nextBlock);
            if (nextBlock?.typeId === BASIN_TYPE) result.basins.push(nextBlock);
            if (nextBlock?.typeId === HOSE_PULLEY_TYPE) result.hosePulleys.push(nextBlock);
            if (nextBlock?.typeId === FLUID_TANK_TYPE || nextBlock?.typeId === CREATIVE_FLUID_TANK_TYPE) result.tanks.push(nextBlock);
            if (isPipeNetworkNode(nextBlock) && !visited.has(key(nextBlock.location)) && smartFluidPipeAllows(nextBlock, fluidId)) {
                queue.push({ block: nextBlock, from: OPPOSITE[direction] });
            }
        }

        const connections = getPipeConnectionDirections(block);
        if (connections.length <= 1 && !hasFluidTargetConnection(block, connections)) {
            result.leaks.push({
                block,
                direction: getLeakDirection(block, connections)
            });
        }
    }

    return result;
}

function tickAllowed(block) {
    const id = key(block.location);
    const now = mc.system.currentTick;
    const nextTick = pumpCooldowns.get(id) ?? 0;
    if (now < nextTick) return false;

    pumpCooldowns.set(id, now + getFlowIntervalFromRpm(block));
    return true;
}

function movePumpFluid(block, sourceDirection, outputDirection) {
    const adjacentSourceBlock = getBlock(block.dimension, offset(block.location, sourceDirection));
    const source = resolvePumpSourceThroughPipes(adjacentSourceBlock);
    const sourceBlock = source.block;
    const fluidId = source.fluidId;
    if (!fluidId) return false;

    const outputBlock = getBlock(block.dimension, offset(block.location, outputDirection));

    const network = scanPipeNetwork(outputBlock, fluidId);
    let movedFluid = false;
    const spoutTargets = network.spouts.map((spout) => ({ type: "spout", block: spout }));
    const drainTargets = network.drains.map((drain) => ({ type: "drain", block: drain }));
    const basinTargets = network.basins
        .filter((basin) => !peekItemDrainFluid(basin))
        .map((basin) => ({ type: "basin", block: basin }));
    const hoseTargets = network.hosePulleys
        .filter((hosePulley) => {
            const outlet = getHosePulleyOutlet(hosePulley);
            return outlet && canPlaceFluid(outlet.block);
        })
        .map((hosePulley) => ({ type: "hose_pulley", block: hosePulley }));
    const tankTargets = network.tanks
        .filter((tank) => {
            const stored = peekFluidTankFluid(tank);
            return !stored || stored === fluidId;
        })
        .map((tank) => ({ type: "tank", block: tank }));
    const leakTargets = network.leaks.map((leak) => ({ type: "leak", ...leak }));
    const target = closestTarget(
        [...spoutTargets, ...drainTargets, ...basinTargets, ...hoseTargets, ...tankTargets, ...leakTargets],
        outputBlock?.location ?? block.location
    );
    if (!target) return false;

    if (target.type === "spout") {
        movedFluid = receiveSpoutFluid(target.block, fluidId);
    } else if (target.type === "drain") {
        movedFluid = receiveItemDrainFluid(target.block, fluidId);
    } else if (target.type === "basin") {
        if (peekItemDrainFluid(target.block)) return false;
        movedFluid = receiveItemDrainFluid(target.block, fluidId);
    } else if (target.type === "hose_pulley") {
        movedFluid = receiveHosePulleyFluid(target.block, fluidId);
    } else if (target.type === "tank") {
        movedFluid = receiveFluidTankFluid(target.block, fluidId, 1000);
    } else if (target.type === "leak") {
        if (target.direct) {
            if (!canPlaceFluid(target.block)) return false;
            spawnLeak(target.block, fluidId);
            mc.system.runTimeout(() => {
                if (!target.block?.isValid || !canPlaceFluid(target.block)) return;
                if (!setFluidBlock(target.block, fluidId)) return;
                spawnLeak(target.block, fluidId);
            }, placeDelayFor(fluidId));
            movedFluid = true;
        } else {
            movedFluid = scheduleLeakFluid(target.block, target.direction, fluidId);
        }
    }

    if (!movedFluid) return false;

    for (const pipeBlock of source.pipes ?? []) showPipeFluidVisual(pipeBlock, fluidId);
    for (const pipeBlock of network.pipes) showPipeFluidVisual(pipeBlock, fluidId);

    if (target.type === "leak") {
        if (target.direct) startPumpJetUntilPlaced(block, outputDirection, fluidId);
        else startPumpJetUntilPlaced(target.block, target.direction, fluidId);
    }

    if (!source.infinite) {
        if (sourceBlock?.typeId === FLUID_TANK_TYPE || sourceBlock?.typeId === CREATIVE_FLUID_TANK_TYPE) takeFluidTankFluid(sourceBlock, fluidId, 1000);
        else if (isStoredFluidSource(sourceBlock)) takeItemDrainFluid(sourceBlock, fluidId);
        else removeSourceFluid(sourceBlock);
    }
    try { block.dimension.playSound(soundFor(fluidId), block.center(), { volume: 0.35, pitch: 1.15 }); } catch {}
    if (isFluidNode(outputBlock)) spawnPipeFlow(outputBlock, fluidId);
    return true;
}

export function mechanicalPumpTick(block) {
    if (!block || block.typeId !== PUMP_TYPE || !isSpinning(block)) return;
    if (!tickAllowed(block)) return;

    const front = getPumpFront(block);
    const back = OPPOSITE[front] ?? "north";
    const reversed = getState(block, "create:reversed") === true;
    movePumpFluid(block, reversed ? back : front, reversed ? front : back);
}

export function mechanicalPumpWrenchInteract(block, player, item) {
    if (block?.typeId !== PUMP_TYPE || item?.typeId !== "create:wrench" || player?.isSneaking) return false;
    const clickId = `${player?.id ?? "unknown"}:${block.dimension.id}:${key(block.location)}`;
    const now = mc.system.currentTick;
    if (now - (pumpWrenchClicks.get(clickId) ?? -100) <= 2) return true;
    const current = getPumpFront(block);
    const opposite = OPPOSITE[current];
    if (!opposite) return false;
    try {
        block.setPermutation(block.permutation.withState("minecraft:facing_direction", opposite));
    } catch { return false; }
    pumpWrenchClicks.set(clickId, now);

    try {
        const visual = block.dimension.getEntities({
            type: "create:pump_cog",
            location: block.center(),
            maxDistance: 0.85,
            closest: 1
        })[0];
        if (visual?.isValid) {
            // rpmCore renders facing_direction through its opposite visual
            // direction, so keep the entity aligned immediately after click.
            visual.setProperty("create:cardinal_rotation", current);
        }
    } catch {}

    const id = key(block.location);
    pumpCooldowns.delete(id);
    pumpRpmCache.delete(id);
    const location = { ...block.location };
    const dimension = block.dimension;
    mc.system.run(() => {
        let currentBlock;
        try { currentBlock = dimension.getBlock(location); } catch {}
        if (currentBlock?.typeId === PUMP_TYPE) {
            mc.system.runJob(recalculateNetwork(currentBlock, dimension, {
                eventType: "update",
                protectedPos: location
            }));
        }
    });
    try { block.dimension.playSound("random.click", block.center(), { volume: 0.7, pitch: 1.35 }); } catch {}
    return true;
}

export function mechanicalPumpBreak(block) {
    if (!block) return;
    const id = key(block.location);
    pumpCooldowns.delete(id);
    pumpRpmCache.delete(id);
    const prefix = `${block.dimension.id}:${id}:`;
    for (const jetKey of activePumpJets.keys()) {
        if (jetKey.startsWith(prefix)) activePumpJets.delete(jetKey);
    }
}
