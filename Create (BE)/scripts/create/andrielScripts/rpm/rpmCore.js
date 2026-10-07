import { world, system } from '@minecraft/server';
import { AXIS_SIGN, checkAlignment, getConnectionInfo, rpmConfig } from './rpmConfigs.js';
import { posToKey, keyToPos, resolveBlockFaces, INVERT_FACE, getAxisFromRotation, shouldOffset, DIRECTION_OFFSETS, perpendicularAxis, CARDAN_SECONDARY_FLIP } from './rpmHelpers.js';
import { rotationToFace } from '../xZ-Utils.js';
import { furnaceBlocks, heatSources, onBreakFurnaceEngine } from '../blocks/furnaceEngine.js';
import { onBreakConveyor } from '../blocks/conveyorBelt.js';
import { mechanicalBearingBreak, mechanicalBearingRpmUpdate } from '../blocks/mechanicalBearing.js';

const MAX_RPM = 256;
const MAX_NETWORK_SIZE = 2048; // Limite de seguranÃ§a
const activeHosePulleys = new Map();
const SPEED_CONTROLLER_STATE_PREFIX = 'create:speed_controller_state:';

function speedControllerStateKey(blockOrDimension, location) {
    const dimension = location ? blockOrDimension : blockOrDimension?.dimension;
    const pos = location ?? blockOrDimension?.location;
    if (!dimension || !pos) return undefined;
    return `${SPEED_CONTROLLER_STATE_PREFIX}${dimension.id}:${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
}

function readSpeedControllerState(block) {
    const key = speedControllerStateKey(block);
    if (!key) return {};
    try {
        const raw = world.getDynamicProperty(key);
        return typeof raw === 'string' ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function writeSpeedControllerState(block, patch) {
    if (block?.typeId !== 'create:rotation_speed_controller') return;
    const key = speedControllerStateKey(block);
    if (!key) return;
    const state = { ...readSpeedControllerState(block), ...patch };
    try { world.setDynamicProperty(key, JSON.stringify(state)); } catch {}
}

export function saveSpeedControllerRpm(block, rpm) {
    let cardinalDirection;
    try { cardinalDirection = block.permutation.getState('minecraft:cardinal_direction'); } catch {}
    writeSpeedControllerState(block, { rpm: Number(rpm) || 0, cardinalDirection });
}

function hosePulleyTag(block) {
    return `create:hose_pulley:${block.x}:${block.y}:${block.z}`;
}

function rpmOwnerTag(block) {
    return `create:rpm_owner:${block.x}:${block.y}:${block.z}`;
}

function getHoseAnchor(entity) {
    const tag = entity.getTags().find(value => value.startsWith('create:hose_pulley:'));
    if (!tag) return undefined;
    const parts = tag.split(':');
    const x = Number(parts[2]);
    const y = Number(parts[3]);
    const z = Number(parts[4]);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : undefined;
}

function lockLooseHoseEntities() {
    for (const dimensionId of ['overworld', 'nether', 'the_end']) {
        let dimension;
        try { dimension = world.getDimension(dimensionId); } catch { continue; }
        for (const type of ['create:rope', 'create:rope_half']) {
            for (const entity of dimension.getEntities({ type })) {
                const anchor = getHoseAnchor(entity);
                if (!anchor) continue;
                const property = type === 'create:rope' ? 'create:hose_distance' : 'create:hose_extension';
                let distance = Number(entity.getDynamicProperty(property));
                if (!Number.isFinite(distance)) {
                    distance = type === 'create:rope'
                        ? anchor.y - entity.location.y
                        : Math.max(0, Math.round((anchor.y - entity.location.y) * 1000) / 1000);
                    try { entity.setDynamicProperty(property, distance); } catch {}
                }
                try {
                    entity.clearVelocity();
                    entity.teleport({ x: anchor.x + 0.5, y: anchor.y - distance, z: anchor.z + 0.5 });
                } catch {}
            }
        }
    }
}

system.runInterval(lockLooseHoseEntities, 1);

function canHosePassThrough(block) {
    if (!block) return false;
    if (block.isAir || block.isLiquid) return true;
    const id = block.typeId;
    return id === 'minecraft:water'
        || id === 'minecraft:flowing_water'
        || id === 'minecraft:lava'
        || id === 'minecraft:flowing_lava'
        || id === 'create:honey_fluid'
        || id === 'create:chocolate_fluid'
        || id === 'create:milk_fluid'
        || id.endsWith('_fluid');
}

function getRpmEntityType(blockId, config) {
    return config?.entityType ?? `${blockId}_entity`;
}

function getRpmRotation(block, config) {
    let rawRotation = config?.rotationState ? block.permutation.getState(config.rotationState) : 'south';
    // Algumas versoes da API retornam facing_direction como indice numerico.
    // Converte antes de sincronizar a propriedade enum da entidade visual.
    if (typeof rawRotation === 'number') {
        rawRotation = ({
            0: 'down',
            1: 'up',
            2: 'north',
            3: 'south',
            4: 'west',
            5: 'east'
        })[rawRotation] ?? 'south';
    }
    const rotation = (config?.rotationState === 'minecraft:block_face' ? rawRotation : INVERT_FACE[rawRotation]) ?? 'south';
    return { rawRotation, rotation };
}

function getRpmEntityLocation(block, config) {
    const center = block.center();
    const entityOffset = config?.entityOffset ?? { x: 0, y: 0, z: 0 };
    return {
        x: center.x + entityOffset.x,
        y: center.y + entityOffset.y,
        z: center.z + entityOffset.z
    };
}

function setupRpmEntity(block, entity, config, rawRotation, rotation) {
    if (!entity?.isValid) return;
    try { entity.teleport(getRpmEntityLocation(block, config)); } catch {}
    const visualRotation = config?.perpendicularEntityRotation
        ? ({ north: 'east', south: 'west', east: 'south', west: 'north' }[rotation] ?? rotation)
        : rotation;
    try { entity.setProperty('create:cardinal_rotation', visualRotation); } catch {}
    if (block.typeId === 'create:rotation_speed_controller') {
        const saved = readSpeedControllerState(block);
        if (Number.isFinite(saved.rpm)) {
            try { entity.setDynamicProperty('create:speed_controller', saved.rpm); } catch {}
        }
    }
    // Propriedades auxiliares para modelos que precisam distinguir o eixo Y.
    // Evita falhas de comparacao de enums no Molang em algumas versoes Bedrock.
    try { entity.setProperty('create:is_vertical', visualRotation === 'up' || visualRotation === 'down'); } catch {}
    try { entity.setProperty('create:vertical_up', visualRotation === 'up'); } catch {}
    if (block.typeId === 'create:water_wheel' || block.typeId === 'create:large_water_wheel') {
        try {
            entity.setProperty('create:wood_type', block.permutation.getState('create:wood_type') ?? 0);
        } catch {}
    }

    if (block.typeId === 'create:shaft.steam_engine') {
        const phase = (Math.abs(block.x + block.y + block.z) % 2) === 0
            ? 'up'
            : 'down';
        try { entity.setProperty('create:piston_phase', phase); } catch {}
    }

    if (block.typeId === 'create:furnace_engine') {
        try { furnaceEngineFrame(block, entity, rawRotation); } catch {}
    }

    try {
        const offsetRotation = config.shaftOffsetUsesVisualRotation ? visualRotation : rotation;
        const mainAxis = getAxisFromRotation(offsetRotation);
        // Algumas maquinas precisam manter o encaixe do eixo sempre reto. A
        // propriedade continua existindo, mas fica falsa somente nelas.
        entity.setProperty('create:offset', config.disableShaftOffset
            ? false
            : shouldOffset(mainAxis, block.x, block.y, block.z));
        if (config.horizontalShaft) {
            const perpendicular = perpendicularAxis(mainAxis, 'horizontal');
            entity.setProperty('create:offset_horizontal', shouldOffset(perpendicular, block.x, block.y, block.z));
        };
        if (config.verticalShaft) {
            const vertical = perpendicularAxis(mainAxis, 'vertical');
            entity.setProperty('create:offset_vertical', shouldOffset(vertical, block.x, block.y, block.z));
        };
    } catch {};
}

function isMotorShaft(block) {
    return block?.typeId === 'create:shaft' || block?.typeId === 'create:shaft.steam_engine';
}

const AUTO_ALIGN_SHAFT_MACHINES = new Set([
    'create:creative_motor', 'create:clutch', 'create:gearshift',
    'create:sequenced_gearshift', 'create:rotation_speed_controller',
    'create:mechanical_press', 'create:crushing_wheel',
    'create:water_wheel', 'create:large_water_wheel', 'create:flywheel',
    'create:speedometer', 'create:stressometer', 'create:mechanical_drill',
    'create:hose_pulley', 'create:weighted_ejector', 'create:encased_fan',
    'create:mechanical_saw', 'create:mechanical_harvester', 'create:deployer'
]);

// Machines with a Shaft connection choose the matching block rotation before
// their entity and kinetic network are created. This makes their shaft face
// snap toward an adjacent Shaft at placement, as in Create.
function alignMachineToAdjacentShaft(block, config) {
    if (!AUTO_ALIGN_SHAFT_MACHINES.has(block?.typeId) || !config?.rotationState) return;
    const candidates = config.rotationState === 'minecraft:cardinal_direction'
        ? ['north', 'south', 'east', 'west']
        : ['north', 'south', 'east', 'west', 'up', 'down'];
    const checks = ['north', 'south', 'east', 'west', 'above', 'below'];
    for (const rawFacing of candidates) {
        let permutation;
        try {
            permutation = block.permutation.withState(config.rotationState, rawFacing);
        } catch {}
        if (!permutation) continue;
        const faces = resolveBlockFaces(block, config, permutation);
        for (const worldFace of checks) {
            if (faces?.[worldFace]?.type !== 'shaft') continue;
            let neighbor;
            try { neighbor = block[worldFace](); } catch { continue; }
            if (!isMotorShaft(neighbor)) continue;
            try {
                if (block.permutation.getState(config.rotationState) !== rawFacing) {
                    block.setPermutation(permutation);
                }
            } catch {}
            return;
        }
    }
}

function syncSteamEnginePistonRpm(shaftBlock, rpm) {
    if (shaftBlock?.typeId !== 'create:shaft.steam_engine') return;

    let facing;
    try { facing = shaftBlock.permutation.getState('minecraft:block_face'); } catch {}
    const offset = {
        north: { x: 0, y: 0, z: -1 },
        south: { x: 0, y: 0, z: 1 },
        east: { x: 1, y: 0, z: 0 },
        west: { x: -1, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        down: { x: 0, y: -1, z: 0 }
    }[facing];
    if (!offset) return;

    let engine;
    try {
        engine = shaftBlock.dimension.getBlock({
            x: shaftBlock.x - offset.x * 2,
            y: shaftBlock.y - offset.y * 2,
            z: shaftBlock.z - offset.z * 2
        });
    } catch {}
    if (engine?.typeId !== 'create:steam_engine') return;

    const center = engine.center();
    let piston;
    try {
        piston = engine.dimension.getEntities({
            type: 'create:steam_engine_piston',
            location: center,
            maxDistance: 0.75
        })[0];
    } catch {}
    if (!piston?.isValid) return;

    try {
        piston.setProperty('create:rpm', Number(rpm) || 0);
        piston.setProperty('create:running', Math.abs(Number(rpm) || 0) > 0.001);
    } catch {}
}

function getOrSpawnRpmEntity(block, config) {
    if (!block || !config || config.noEntity) return undefined;
    const entityType = getRpmEntityType(block.typeId, config);
    const { rawRotation, rotation } = getRpmRotation(block, config);
    const location = getRpmEntityLocation(block, config);
    const ownerTag = rpmOwnerTag(block);
    const ownedEntities = block.dimension.getEntities({ type: entityType, tags: [ownerTag] });
    const nearbyEntities = block.dimension.getEntities({
        location,
        maxDistance: 0.45,
        type: entityType
    });
    const candidates = [...ownedEntities];
    const candidateIds = new Set(ownedEntities.map(candidate => candidate.id));
    for (const candidate of nearbyEntities) {
        if (!candidateIds.has(candidate.id)) {
            candidates.push(candidate);
            candidateIds.add(candidate.id);
        }
    }

    let entity = candidates[0];
    for (let index = 1; index < candidates.length; index++) {
        try { candidates[index].remove(); } catch {}
    }

    if (!entity?.isValid) {
        try { entity = block.dimension.spawnEntity(entityType, location); } catch { return undefined; }
    }

    try { entity.addTag(ownerTag); } catch {}
    setupRpmEntity(block, entity, config, rawRotation, rotation);
    return entity;
}

function getAuxiliaryEntityLocation(block, auxiliary) {
    const center = block.center();
    const offset = auxiliary?.offset ?? { x: 0, y: 0, z: 0 };
    return { x: center.x + offset.x, y: center.y + offset.y, z: center.z + offset.z };
}

function getOrSpawnAuxiliaryEntity(block, config) {
    const auxiliary = config?.auxiliaryEntity;
    if (!auxiliary?.type) return;
    const location = getAuxiliaryEntityLocation(block, auxiliary);
    const tag = hosePulleyTag(block);
    let entity;
    if (block.typeId === 'create:hose_pulley') {
        const caps = block.dimension.getEntities({ type: auxiliary.type, tags: [tag] })
            .sort((a, b) => a.location.y - b.location.y);
        entity = caps[0];
        for (let index = 1; index < caps.length; index++) {
            try { caps[index].remove(); } catch {}
        }
    } else {
        entity = block.dimension.getEntities({ location, maxDistance: 0.2, type: auxiliary.type })[0];
    }
    if (!entity?.isValid) {
        try { entity = block.dimension.spawnEntity(auxiliary.type, location); } catch { return; }
    }
    try { entity.addTag(tag); } catch {}
    if (block.typeId !== 'create:hose_pulley' || entity.location.y >= block.y - 0.01) {
        try { entity.teleport(location); } catch {}
    }
}

function getOrSpawnHoseBeltVisual(block, rpm = 0) {
    if (block.typeId !== 'create:hose_pulley') return;
    const tag = hosePulleyTag(block);
    const location = block.center();
    let entity = block.dimension.getEntities({ type: 'create:hose_pulley_belt_visual', tags: [tag] })[0];
    const moving = Math.abs(rpm) > 0.001;
    if (!moving) {
        if (entity?.isValid) {
            try { entity.remove(); } catch {}
        }
        try {
            if (block.permutation.getState('create:hose_moving') !== false) {
                block.setPermutation(block.permutation.withState('create:hose_moving', false));
            }
        } catch {}
        return;
    }
    const facing = block.permutation.getState('minecraft:cardinal_direction') ?? 'north';
    if (!entity?.isValid) {
        try { entity = block.dimension.spawnEntity('create:hose_pulley_belt_visual', location); } catch { return; }
        try { entity.addTag(tag); } catch {}
    }
    // Versoes antigas giravam fisicamente esta entidade. Zera esse yaw para
    // evitar que ele seja somado a rotacao instantanea do bone.
    try {
        const entityRotation = entity.getRotation();
        if (Math.abs(entityRotation.x) > 0.001 || Math.abs(entityRotation.y) > 0.001) {
            entity.setRotation({ x: 0, y: 0 });
        }
    } catch {}
    try { entity.setProperty('create:cardinal_rotation', facing); } catch {}
    try { entity.setProperty('create:rpm', rpm); } catch {}
    try {
        if (block.permutation.getState('create:hose_moving') !== true) {
            block.setPermutation(block.permutation.withState('create:hose_moving', true));
        }
    } catch {}
}

function updateHosePulleyExtension(block, rpm) {
    if (block.typeId !== 'create:hose_pulley') return;
    const key = `${block.dimension.id}:${block.x}:${block.y}:${block.z}`;
    const existing = activeHosePulleys.get(key);
    if (!existing) {
        const tag = hosePulleyTag(block);
        const caps = block.dimension.getEntities({ type: 'create:rope_half', tags: [tag] })
            .sort((a, b) => a.location.y - b.location.y);
        const cap = caps[0];
        for (let index = 1; index < caps.length; index++) {
            try { caps[index].remove(); } catch {}
        }

        const segments = new Map();
        for (const segment of block.dimension.getEntities({ type: 'create:rope', tags: [tag] })) {
            const savedDepth = Number(segment.getDynamicProperty('create:hose_depth'));
            const depth = Number.isFinite(savedDepth)
                ? Math.max(1, Math.round(savedDepth))
                : Math.max(1, Math.round(block.y - segment.location.y));
            if (segments.has(depth)) {
                try { segment.remove(); } catch {}
            } else {
                segments.set(depth, segment);
            }
        }

        const savedExtension = Number(cap?.getDynamicProperty('create:hose_extension'));
        const inferredExtension = cap?.isValid
            ? Math.max(0, block.y - cap.location.y)
            : segments.size;
        activeHosePulleys.set(key, {
            block,
            rpm,
            extension: Number.isFinite(savedExtension) ? savedExtension : inferredExtension,
            cap,
            segments
        });
    }
    activeHosePulleys.get(key).rpm = rpm;
}

function removeHosePulleyEntities(block) {
    const tag = hosePulleyTag(block);
    for (const type of ['create:rope_half', 'create:rope', 'create:hose_pulley_belt_visual']) {
        for (const entity of block.dimension.getEntities({ type, tags: [tag] })) {
            try { entity.remove(); } catch {}
        }
    }
    activeHosePulleys.delete(`${block.dimension.id}:${block.x}:${block.y}:${block.z}`);
}

system.runInterval(() => {
    for (const [key, state] of activeHosePulleys) {
        let block;
        try { block = state.block.dimension.getBlock(state.block.location); } catch {}
        if (!block || block.typeId !== 'create:hose_pulley') {
            try { removeHosePulleyEntities(state.block); } catch {}
            activeHosePulleys.delete(key);
            continue;
        }
        const direction = Math.sign(state.rpm);
        const step = Math.max(0.025, Math.min(0.2, Math.abs(state.rpm) / 640));
        const previousLength = state.extension;
        let nextLength = Math.max(0, Math.min(128, state.extension + direction * step));

        if (direction > 0) {
            const nextBlockDepth = Math.floor(nextLength) + 1;
            let below;
            try { below = block.dimension.getBlock({ x: block.x, y: block.y - nextBlockDepth, z: block.z }); } catch {}
            if (!canHosePassThrough(below)) nextLength = state.extension;
        }

        const ropeIsMoving = Math.abs(nextLength - previousLength) > 0.0001;
        getOrSpawnHoseBeltVisual(block, ropeIsMoving ? state.rpm : 0);
        state.extension = nextLength;
        const tag = hosePulleyTag(block);
        const center = block.center();

        if (!state.cap?.isValid) {
            state.cap = block.dimension.getEntities({ type: 'create:rope_half', tags: [tag] })[0];
            if (!state.cap?.isValid) {
                try { state.cap = block.dimension.spawnEntity('create:rope_half', { x: center.x, y: block.y, z: center.z }); } catch {}
                try { state.cap?.addTag(tag); } catch {}
            }
        }
        try {
            state.cap?.clearVelocity();
            state.cap?.teleport({ x: center.x, y: block.y - state.extension, z: center.z });
            state.cap?.setDynamicProperty('create:hose_extension', state.extension);
        } catch {}

        const completedSegments = Math.floor(state.extension);
        for (const [depth, segment] of state.segments) {
            if (depth >= 1 && depth <= completedSegments) continue;
            try { segment?.remove(); } catch {}
            state.segments.delete(depth);
        }
        // Toda a coluna acompanha a ponta. Assim os trechos entram e saem pelo
        // pulley continuamente, sem saltar entre coordenadas inteiras.
        for (const [depth, segment] of state.segments) {
            if (!segment?.isValid || depth < 1 || depth > completedSegments) continue;
            const distanceFromPulley = state.extension - depth;
            try {
                segment.clearVelocity();
                segment.teleport({ x: center.x, y: block.y - distanceFromPulley, z: center.z });
                segment.setDynamicProperty('create:hose_distance', distanceFromPulley);
            } catch {}
        }
        for (let depth = 1; depth <= completedSegments; depth++) {
            if (state.segments.get(depth)?.isValid) continue;
            let segment;
            const distanceFromPulley = state.extension - depth;
            try { segment = block.dimension.spawnEntity('create:rope', { x: center.x, y: block.y - distanceFromPulley, z: center.z }); } catch {}
            try { segment?.addTag(tag); } catch {}
            try { segment?.setDynamicProperty('create:hose_depth', depth); } catch {}
            try { segment?.setDynamicProperty('create:hose_distance', distanceFromPulley); } catch {}
            if (segment?.isValid) state.segments.set(depth, segment);
            // Cria apenas um trecho por tick para desenrolar em sequencia, como no Create Java.
            break;
        }
    }
}, 1);

function getStressCapacity(block, config, entity) {
    const dynamicCapacity = Number(entity?.getDynamicProperty('create:stress_capacity'));
    if (Number.isFinite(dynamicCapacity) && dynamicCapacity >= 0) return dynamicCapacity;
    return Number(config?.stressCapacity ?? 0);
}

// Inicializa os blocos cinÃ©ticos, quando colocados no chÃ£o
export function initRpmBlock({ block, dimension, previousBlock = undefined }) {
    const blockId = block.typeId;
    const config = rpmConfig.get(blockId);
    if (!config) return;

    alignMachineToAdjacentShaft(block, config);
    if (block.typeId === 'create:rotation_speed_controller') {
        let cardinalDirection;
        try { cardinalDirection = block.permutation.getState('minecraft:cardinal_direction'); } catch {}
        if (cardinalDirection) writeSpeedControllerState(block, { cardinalDirection });
    }
    if (block.permutation?.getState('create:placed') === false) block.setPermutation(block.permutation.withState('create:placed', true));
    const { rotation } = getRpmRotation(block, config);

    if (block.typeId === 'create:large_cogwheel') speedControllerBracket(block, rotation, 'place');

    getOrSpawnRpmEntity(block, config);
    getOrSpawnAuxiliaryEntity(block, config);
    getOrSpawnHoseBeltVisual(block, 0);

    system.runJob(recalculateNetwork(block, dimension, { eventType: 'place' }));
};

function speedControllerBracket(block, rotation, eventType) {
    // Large cogwheel vertical nÃ£o conecta com speed controller
    if (rotation === 'up' || rotation === 'down') return;

    const belowBlock = block.below();
    if (belowBlock?.typeId !== 'create:rotation_speed_controller') return;

    if (eventType === 'break') {
        belowBlock.setPermutation(belowBlock.permutation.withState('create:bracket', false));
        return;
    };

    // Checa se sÃ£o perpendiculares
    const cogAxis = (rotation === 'north' || rotation === 'south') ? 'Z' : 'X';
    const ctrlRotation = belowBlock.permutation.getState('minecraft:cardinal_direction');
    const ctrlAxis = (ctrlRotation === 'north' || ctrlRotation === 'south') ? 'Z' : 'X';

    if (cogAxis !== ctrlAxis) {
        belowBlock.setPermutation(belowBlock.permutation.withState('create:bracket', true));
    };
};

export function furnaceEngineFrame(block, entity, rotation) {
    const behindFace = block[rotation]();
    const hasFurnace = furnaceBlocks.has(behindFace.typeId);

    entity.setProperty('create:has_furnace', hasFurnace);
};


// Recalcula toda a rede cinÃ©tica conectada ao bloco
export function* recalculateNetwork(block, dimension, options = {}) {
    const { eventType = 'place', protectedPos = null } = options;

    // procura todos os blocos cinÃ©ticos conectados e identifica os geradores ativos
    const network = yield* discoverNetwork(block, dimension);
    if (network?.blocks.size === 0) return;
    
    // BFS a partir de cada gerador, calcula o RPM de cada bloco da rede
    const propagationData = yield* propagateSpeed(network, { placedPos: eventType === 'place' ? block.location : null, protectedPos });

    // Se tiver blocos com conflitos eles serÃ£o quebrados (auto-break)
    if (propagationData.blocksToBreak.length > 0) {
        for (const breakPosKey of propagationData.blocksToBreak) {
            const breakPos = keyToPos(breakPosKey);
            try { 
                dimension.runCommand(`setblock ${breakPos.x} ${breakPos.y} ${breakPos.z} air destroy`);
            } catch (e) {};
        };
        return;
    };

    // aplica os RPMs calculados nas entidades
    yield* applyStates(network, propagationData, dimension);
};


// Primeiro Passo - BFS
// Percorre todos os blocos conectados e retorna um mapa da rede e os geradores ativos.
function* discoverNetwork(startBlock, dimension) {
    if (dimension === undefined) dimension = startBlock.dimension;

    const networkBlocks = new Map();  // posKey â†’ dados do bloco
    const networkConnections = new Map(); // posKey â†’ [{ neighborKey, faceData, neighborFaceData }]
    const pendingBlocks = [];
    const generators = [];

    // Inicia BFS a partir do bloco
    const startBlockData = getBlockData(startBlock);
    if (startBlockData) {
        const key = posToKey(startBlockData.pos.x, startBlockData.pos.y, startBlockData.pos.z);
        networkBlocks.set(key, startBlockData);
        pendingBlocks.push(startBlockData);

        if (startBlockData.config.isGenerator && startBlockData.block.permutation.getState('create:active_generator')) generators.push(startBlockData);
    };

    while (pendingBlocks.length > 0) {
        const currentData = pendingBlocks.shift();
        const currentKey = posToKey(currentData.pos.x, currentData.pos.y, currentData.pos.z);
        const currentConnections = [];
        
        for (const [worldFace, faceData] of Object.entries(currentData.faces)) {
            const offset = DIRECTION_OFFSETS[worldFace];
            if (!offset) continue;
            let neighborBlock;
            try { neighborBlock = currentData.block.offset(offset); } catch { continue; }
            if (!neighborBlock) continue;
            const neighborKey = posToKey(neighborBlock.x, neighborBlock.y, neighborBlock.z);

            // Se o bloco vizinho ja estÃ¡ na rede, registra conexÃ£o mas nÃ£o re-processa
            if (networkBlocks.has(neighborKey)) {
                const neighborData = networkBlocks.get(neighborKey);
                const invertedFace = INVERT_FACE[worldFace];
                const neighborFaceData = neighborData.faces[invertedFace];
                if (!neighborFaceData) continue;

                const connInfo = getConnectionInfo(faceData, neighborFaceData);
                if (!connInfo) continue;

                const validAlignment = checkAlignment(faceData, neighborFaceData, currentData.effectiveRotation, neighborData.effectiveRotation);
                if (!validAlignment) continue;

                currentConnections.push({ neighborKey, faceData, worldFace, neighborFaceData });
                continue;
            };

            const neighborData = getBlockData(neighborBlock);
            if (!neighborData) continue;

            // O bloco vizinho tem conexÃµes na direÃ§Ã£o oposta?
            const invertedFace = INVERT_FACE[worldFace];
            const neighborFaceData = neighborData.faces[invertedFace];
            if (!neighborFaceData) continue;

            // Verifica compatibilidade de tipo
            const connInfo = getConnectionInfo(faceData, neighborFaceData);
            if (!connInfo) continue;

            // Alinhamento: se algum dos dois exige, as rotaÃ§Ãµes devem ser iguais
            const validAlignment = checkAlignment(faceData, neighborFaceData, currentData.effectiveRotation, neighborData.effectiveRotation);
            if (!validAlignment) continue;

            currentConnections.push({ neighborKey, faceData, worldFace, neighborFaceData });
            networkBlocks.set(neighborKey, neighborData);
            
            pendingBlocks.push(neighborData);

            // Marca se Ã© gerador
            if (neighborData.config.isGenerator && neighborBlock.permutation.getState('create:active_generator')) generators.push(neighborData);
        };

        networkConnections.set(currentKey, currentConnections);
        yield;

        if (networkBlocks.size >= MAX_NETWORK_SIZE) break;
    };

    return { blocks: networkBlocks, connections: networkConnections, generators };
};


// Segundo Passo - PropagaÃ§Ã£o de velocidade
// Percorre toda a rede a partir dos geradores, calcula o RPM de cada bloco, detecta conflitos e decide auto-breaks
function* propagateSpeed(network, options = {}) {
    const { placedPos, protectedPos } = options;
    const placedBlockKey = placedPos ? posToKey(placedPos.x, placedPos.y, placedPos.z) : null;
    const protectedBlockKey = protectedPos ? posToKey(protectedPos.x, protectedPos.y, protectedPos.z) : null;

    const calculatedStates = new Map();
    const blocksToBreak = [];
    const pendingBlocks = [];
    let totalStress = 0;
    let totalCapacity = 0;

    // Se nÃ£o tiver geradores entÃ£o seta toda a rede com rpm zerado 
    if (network.generators.length === 0) {
        for (const [key, data] of network.blocks) {
            calculatedStates.set(key, { rpm: 0, config: data.config });
        };
        return { calculatedStates, blocksToBreak };
    };

    // Pega velocidade de cada gerador e guarda na prÃ³pria data dos geradores
    for (const generatorData of network.generators) {
        const { block, config } = generatorData;
        const entity = getOrSpawnRpmEntity(block, config);

        const currentRpm = entity?.getDynamicProperty('create:generator_rpm');
        const visualRpm = entity?.getProperty('create:rpm');

        if (currentRpm == null && entity?.isValid) {
            try { entity.setDynamicProperty('create:generator_rpm', visualRpm ?? 0); } catch {}
        }
        generatorData.entity = entity;
        generatorData.currentRpm = currentRpm ?? visualRpm ?? 0;
    };

    // Organiza a lista de geradores do mais rÃ¡pido para o mais lento.
    const sortedGenerators = [...network.generators].sort((a, b) => {
        return Math.abs(b.currentRpm) - Math.abs(a.currentRpm);
    });

    for (const generatorData of sortedGenerators) {
        const generatorKey = posToKey(generatorData.pos.x, generatorData.pos.y, generatorData.pos.z);
        if (calculatedStates.has(generatorKey)) continue;

        totalCapacity += getStressCapacity(generatorData.block, generatorData.config, generatorData.entity) * Math.abs(generatorData.currentRpm ?? 0);

        calculatedStates.set(generatorKey, { rpm: generatorData.currentRpm, config: generatorData.config, source: null, receivedOnFace: null });
        pendingBlocks.push({ posKey: generatorKey, rpm: generatorData.currentRpm });
    };

    // Percorre a rede calculando o RPM de cada bloco a partir dos geradores
    while (pendingBlocks.length > 0) {
        const { posKey: currentKey, rpm: currentRpm } = pendingBlocks.shift();
        const currentConns = network.connections.get(currentKey) ?? [];
        const currentData = calculatedStates.get(currentKey);

        for (const { neighborKey, faceData, worldFace, neighborFaceData } of currentConns) {
            // Speed controller: face above sÃ³ envia, nÃ£o recebe
            if (neighborFaceData.isRpm2) {
                const nb = network.blocks.get(neighborKey);
                if (nb?.block?.typeId === 'create:rotation_speed_controller') continue;
            };

            // Calcula RPM
            const connInfo = getConnectionInfo(faceData, neighborFaceData);
            if (!connInfo) continue;

            let newRpm = currentRpm;
            let locked = false;

            if (connInfo.sense === 'invert') newRpm *= -1;
            if (connInfo.sense === 'cross') {
                // Largeâ†”Large: sinais opostos no offset â†’ inverte
                const offset = DIRECTION_OFFSETS[worldFace];
                const nonZero = [offset.x, -offset.y, offset.z].filter(v => v !== 0);
                if (nonZero.length === 2 && Math.sign(nonZero[0]) !== Math.sign(nonZero[1])) { newRpm *= -1; };
            };
            newRpm *= connInfo.ratio;

            // Gearbox: modifica baseado na direÃ§Ã£o de entrada e saÃ­da
            if (currentData.config.getTransferRatio && currentData.receivedDirection) {
                newRpm = currentRpm * currentData.config.getTransferRatio(currentData.receivedDirection, worldFace);
            };

            // SplitShaft 
            if (currentData.config.hasRpm2) {
                const currentBlock = network.blocks.get(currentKey)?.block;
                const powered = currentBlock.permutation.getState('create:powered');

                const shouldSplit = powered || currentData.config.transformRpm2Always === true;
                if (shouldSplit && currentData?.receivedOnFace && currentData.receivedOnFace !== faceData) {
                    newRpm = currentData.config.getRpm2(newRpm, powered, currentBlock);
                    if (newRpm === 0) locked = true;
                };

                if (currentBlock.typeId === 'create:rotation_speed_controller') {
                    if (faceData.type !== neighborFaceData.type) continue;
                    if (currentData?.receivedOnFace && currentData.receivedOnFace !== faceData && (faceData.isRpm2 || currentData.receivedOnFace.isRpm2)) {
                        const block = network.blocks.get(currentKey).block;
                        const entity = getOrSpawnRpmEntity(block, currentData.config);
                        const speedController = entity?.getDynamicProperty('create:speed_controller');
                        newRpm = speedController ?? newRpm;
                        if (newRpm === 0) locked = true;
                    };
                };
            };

            if (Math.abs(newRpm) > MAX_RPM) {
                blocksToBreak.push(neighborKey);
                continue; // NÃ£o propaga a partir de um bloco quebrado
            };
 
            newRpm = Math.round(newRpm * 10000) / 10000; // arredonda pra evitar imprecisÃ£o de floats

            // Verifica se existe um conflito
            if (calculatedStates.has(neighborKey)) {
                const existing = calculatedStates.get(neighborKey);

                // Se o RPM Ã© diferente (dois caminhos tentam girar diferente) entÃ£o ha um conflito
                if (existing.rpm !== 0 && newRpm !== 0 && Math.abs(existing.rpm - newRpm) > 0.01) {

                    // SplitShaft: RPMs de lados opostos parecem diferentes mas podem ser compatÃ­veis
                    const neighborBlockData = network.blocks.get(neighborKey);
                    if (neighborBlockData?.config.hasRpm2) {
                        const powered = neighborBlockData.block.permutation.getState('create:powered');
                        if (powered) {
                            const transformed = neighborBlockData.config.getRpm2(newRpm, true, neighborBlockData.block);
                            if (transformed === existing.rpm) continue;
                        };
                        if (neighborBlockData.block.typeId === 'create:rotation_speed_controller') {
                            const entity = getOrSpawnRpmEntity(neighborBlockData.block, neighborBlockData.config);
                            const speedController = entity?.getDynamicProperty('create:speed_controller');
                            const transformed = speedController ?? existing.rpm;
                            if (transformed === newRpm) continue;
                        };
                    };

                    // Gearbox: RPMs de faces diferentes parecem conflitar mas podem ser compatÃ­veis
                    if (neighborBlockData?.config.getTransferRatio && existing.receivedDirection) {
                        const modifier = neighborBlockData.config.getTransferRatio(INVERT_FACE[worldFace], existing.receivedDirection);
                        if (Math.round(existing.rpm * modifier * 10000) / 10000 === newRpm) continue;
                    };

                    if (currentData.config.getTransferRatio && currentData.source === neighborKey) continue;

                    if (placedBlockKey) blocksToBreak.push(placedBlockKey);
                    else {
                        const breakKey = neighborKey !== protectedBlockKey ? neighborKey : currentKey;
                        if (breakKey !== protectedBlockKey) blocksToBreak.push(breakKey);
                    };
                };

                // Conflito de trava: um lado Ã© locked=0 e o outro tenta girar
                if ((existing.locked && newRpm !== 0) || (locked && existing.rpm !== 0)) {
                    if (placedBlockKey) blocksToBreak.push(placedBlockKey);
                    else {
                        const breakKey = neighborKey !== protectedBlockKey ? neighborKey : currentKey;
                        if (breakKey !== protectedBlockKey) blocksToBreak.push(breakKey);
                    };
                };

                continue;
            };

            const neighborData = network.blocks.get(neighborKey);
            calculatedStates.set(neighborKey, {
                rpm: newRpm,
                source: currentKey,
                receivedOnFace: neighborFaceData, // qual face do neighbor recebeu
                receivedDirection: INVERT_FACE[worldFace],  // direÃ§Ã£o-mundo pela qual o vizinho recebeu
                config: neighborData.config,
                locked
            });

            // Acumula stressImpact e stressCapacity pra calcular o stress total da rede
            if (neighborData.config.stressImpact > 0) totalStress += neighborData.config.stressImpact * Math.abs(newRpm);
            if (!neighborData.config.isGenerator && neighborData.config.stressCapacity > 0) {
                const neighborEntity = getOrSpawnRpmEntity(neighborData.block, neighborData.config);
                totalCapacity += getStressCapacity(neighborData.block, neighborData.config, neighborEntity) * Math.abs(newRpm);
            }

            pendingBlocks.push({ posKey: neighborKey, rpm: newRpm });
        };
        
        yield;
    };

    for (const [key, data] of network.blocks) {
        if (!calculatedStates.has(key)) calculatedStates.set(key, { rpm: 0, config: data.config });
    };

    return { 
        calculatedStates,
        blocksToBreak,
        totalStress,
        totalCapacity,
        isOverstressed: totalStress > totalCapacity 
    };
};


// Terceiro Passo - AplicaÃ§Ã£o do RPM
// Aplica o RPM calculado em cada bloco/entidade da rede
function* applyStates(network, propagationData, dimension) {
    let iterations = 0;
    
    for (const [blockKey, state] of propagationData.calculatedStates) {
        const blockData = network.blocks.get(blockKey);
        const block = blockData.block;
        
        if (blockData.config.noEntity) continue;

        const entity = getOrSpawnRpmEntity(block, blockData.config);
        if (!entity) { iterations++; continue; }

        const finalRpm = propagationData.isOverstressed ? 0 : state.rpm;
        try { 
            const prevRpm = entity.getProperty('create:rpm') ?? 0;
            const visualRpm = block.typeId === 'create:mechanical_pump'
                && block.permutation.getState('create:reversed') === true
                ? -finalRpm
                : finalRpm;
            entity.setProperty('create:rpm', visualRpm);
            syncSteamEnginePistonRpm(block, finalRpm);
            updateHosePulleyExtension(block, finalRpm);
            if (blockData.config.hasSpinningState) block.setPermutation(block.permutation.withState('create:is_spinning', finalRpm !== 0));
            if (block.typeId === 'create:mechanical_bearing') mechanicalBearingRpmUpdate(block, finalRpm);

            if (blockData.config.onRpmUpdate) {
                blockData.config.onRpmUpdate(block, entity, finalRpm, prevRpm);
            };
        } catch {}

        if (blockData.config.hasRpm2) {
            if (block.typeId === 'create:rotation_speed_controller') continue;
            const powered = block.permutation.getState('create:powered');
            const rpmAlt = blockData.config.getRpm2(finalRpm, powered, block);

            const shouldSplit = powered || blockData.config.transformRpm2Always === true;
            if (shouldSplit && state.receivedOnFace) {
                if (state.receivedOnFace.isRpm2) {
                    // RPM entrou pelo lado rpm2 â†’ rpm2 gira, rpm recebe valor modificado
                    entity.setProperty('create:rpm', rpmAlt);
                    entity.setProperty('create:rpm2', finalRpm);
                } else {
                    // RPM entrou pelo lado rpm â†’ rpm gira, rpm2 recebe valor modificado
                    entity.setProperty('create:rpm2', rpmAlt);
                }
            } else {
                // Sem powered ou sem source â†’ ambos giram
                try { entity.setProperty('create:rpm2', rpmAlt); } catch { }
            }
        };

        // Gearbox: salva a direÃ§Ã£o de entrada pra o Molang calcular os 4 shafts
        if ((block.typeId === 'create:gearbox' || block.typeId === 'create:vertical_gearbox') && state.receivedDirection) {
            entity.setProperty('create:source_direction', state.receivedDirection);
        };

        // Stressometer: salva dados de stress da rede
        if (block.typeId === 'create:stressometer') {
            const capacity = propagationData.totalCapacity || 0;
            const stressPercent = capacity > 0 ? Math.min(100, Math.round((propagationData.totalStress / capacity) * 100)) : 0;
            
            entity.setProperty('create:stress_impact', propagationData.isOverstressed ? 100 : stressPercent);
            entity.setDynamicProperty('create:network_stress', propagationData.totalStress);
            entity.setDynamicProperty('create:network_capacity', propagationData.totalCapacity);
        };

        // Speedometer
        if (block.typeId === 'create:speedometer') {
            entity.setDynamicProperty('create:is_overstressed', propagationData.isOverstressed);
        };

        if (block.typeId === 'create:rotation_speed_controller') {
            writeSpeedControllerState(block, { sourceDirection: state.receivedDirection ?? null });
        }

        // Para o Double Shaft Cardan, o visual flip do eixo secundÃ¡rio depende da direÃ§Ã£o pela qual ele recebeu a rotaÃ§Ã£o e do Ã¢ngulo atual do cardan
        if (block.typeId === 'create:double_shaft_cardan') {
            const blockFace = block.permutation.getState('minecraft:block_face');
            const primaryFace = rotationToFace[INVERT_FACE[blockFace]];
            const receivedOnSecondary = state.receivedDirection !== primaryFace;

            const rotation = entity.getProperty('create:cardinal_rotation');
            const visualSign = ['down', 'east', 'south'].includes(rotation) ? 1 : -1;

            let visualFlip;
            if (!receivedOnSecondary) visualFlip = visualSign;
            else {
                const angle = block.permutation.getState('create:cardan_angle') ?? 0;
                visualFlip = CARDAN_SECONDARY_FLIP[angle]?.[rotation] ?? 1;
            };

            entity.setProperty('create:visual_flip', visualFlip);
        };

        // Define se estÃ¡ engrenada ou nÃ£o (para aplica os sons)
        if (blockData.config.soundType === 'gear') {
            const connections = network.connections.get(blockKey) ?? [];
            const isMeshing = connections.some(c => c.faceData.type === 'gear' || c.faceData.type === 'large_gear');
            try { entity.setProperty('create:meshed', isMeshing); }
            catch { throw new Error(`[${entity.typeId}] nÃ£o tem a propriedade 'create:meshed'`); };
        };

        iterations++;
        if (iterations % 16 === 0) yield;
    };

    return;
};


// Remove a entidade do bloco quebrado, recalcula a rede
export function onBreakRpmBlock({block, dimension, brokenBlockPermutation}) {
    const blockId = brokenBlockPermutation.type.id;
    const config = rpmConfig.get(blockId);
    if (!config) return;
    if (blockId === 'create:rotation_speed_controller') {
        const key = speedControllerStateKey(dimension, block.location);
        try { if (key) world.setDynamicProperty(key, undefined); } catch {}
    }

    if (blockId === 'create:large_cogwheel') speedControllerBracket(block, brokenBlockPermutation.getState(config?.rotationState), 'break');
    if (blockId === 'create:furnace_engine') onBreakFurnaceEngine(block, dimension, brokenBlockPermutation);
    if (blockId === 'create:mechanical_belt') onBreakConveyor(block, dimension, brokenBlockPermutation);
    if (blockId === 'create:mechanical_bearing') mechanicalBearingBreak(block, dimension);
    if (blockId === 'create:hose_pulley') removeHosePulleyEntities(block);

    if (!config.noEntity) {
        const entityType = getRpmEntityType(blockId, config);
        const ownerTag = rpmOwnerTag(block);
        const entities = dimension.getEntities({ type: entityType, tags: [ownerTag] });
        const entityIds = new Set(entities.map(entity => entity.id));
        for (const entity of dimension.getEntities({
            location: getRpmEntityLocation(block, config),
            maxDistance: 0.45,
            type: entityType
        })) {
            if (!entityIds.has(entity.id)) {
                entities.push(entity);
                entityIds.add(entity.id);
            }
        }
        for (const entity of entities) {
            try { entity.remove(); } catch {}
        }
    };

    const auxiliary = config?.auxiliaryEntity;
    if (auxiliary?.type) {
        const location = getAuxiliaryEntityLocation(block, auxiliary);
        for (const entity of dimension.getEntities({ location, maxDistance: 0.25, type: auxiliary.type })) {
            try { entity.remove(); } catch {}
        }
    }

    const faces = resolveBlockFaces(block, config, brokenBlockPermutation);
    if (!faces || Object.keys(faces).length === 0) return;

    // Recalcula vizinhos que tinham conexÃ£o
    for (const worldFace of Object.keys(faces)) {
        const offset = DIRECTION_OFFSETS[worldFace];
        if (!offset) continue;

        let neighborBlock;
        try { neighborBlock = block.offset(offset); } catch { continue; }
        if (!neighborBlock) continue;

        if (rpmConfig.has(neighborBlock.typeId)) system.runJob(recalculateNetwork(neighborBlock, dimension, { eventType: 'break' }));
    };
};

export function restoreLoadedSpeedControllers() {
    let ids = [];
    try { ids = world.getDynamicPropertyIds(); } catch { return; }
    for (const id of ids) {
        if (!id.startsWith(SPEED_CONTROLLER_STATE_PREFIX)) continue;
        const match = id.match(/^create:speed_controller_state:(.+):(-?\d+),(-?\d+),(-?\d+)$/);
        if (!match) continue;
        let dimension;
        try { dimension = world.getDimension(match[1].replace(/^minecraft:/, '')); } catch { continue; }
        let block;
        try {
            block = dimension.getBlock({ x: Number(match[2]), y: Number(match[3]), z: Number(match[4]) });
        } catch { continue; }
        if (block?.typeId !== 'create:rotation_speed_controller') {
            try { world.setDynamicProperty(id, undefined); } catch {}
            continue;
        }
        const saved = readSpeedControllerState(block);
        if (saved.cardinalDirection) {
            try {
                block.setPermutation(block.permutation.withState('minecraft:cardinal_direction', saved.cardinalDirection));
            } catch {}
        }
        initRpmBlock({ block, dimension });
    }
}

// Pistons move blocks without invoking the custom kinetic onBreak/onPlace
// components. Clean up visuals left at the old coordinates and rebuild every
// kinetic network touched by the moved blocks.
export function repairRpmAfterPiston({ block, dimension, piston }) {
    const pistonLocation = block?.location;
    if (!pistonLocation || !dimension) return;

    const movedLocations = [];
    try {
        for (const attached of piston?.getAttachedBlocks?.() ?? []) {
            if (attached?.location) movedLocations.push({ ...attached.location });
        }
    } catch {}
    try {
        for (const location of piston?.getAttachedBlocksLocations?.() ?? []) {
            if (location) movedLocations.push({ ...location });
        }
    } catch {}

    system.run(() => {
        const starts = new Map();
        const addStart = (candidate) => {
            if (!candidate || !rpmConfig.has(candidate.typeId)) return;
            starts.set(posToKey(candidate.x, candidate.y, candidate.z), candidate);
        };

        // Include both sides of every reported position because API versions
        // differ on whether attached positions are reported before or after
        // the one-block piston movement.
        const positions = [pistonLocation, ...movedLocations];
        for (const position of positions) {
            try { addStart(dimension.getBlock(position)); } catch {}
            for (const offset of Object.values(DIRECTION_OFFSETS)) {
                try {
                    addStart(dimension.getBlock({
                        x: position.x + offset.x,
                        y: position.y + offset.y,
                        z: position.z + offset.z
                    }));
                } catch {}
            }
        }

        // A moved generator can leave its display entity at the source block.
        // Owner tags give us the exact block coordinate without knowing which
        // kind of generator the piston moved.
        let nearbyEntities = [];
        try {
            nearbyEntities = dimension.getEntities({
                location: { x: pistonLocation.x + 0.5, y: pistonLocation.y + 0.5, z: pistonLocation.z + 0.5 },
                maxDistance: 16
            });
        } catch {}
        for (const entity of nearbyEntities) {
            let ownerTag;
            try { ownerTag = entity.getTags().find(tag => tag.startsWith('create:rpm_owner:')); } catch {}
            if (!ownerTag) continue;
            const parts = ownerTag.split(':');
            const owner = { x: Number(parts[2]), y: Number(parts[3]), z: Number(parts[4]) };
            if (!Number.isFinite(owner.x) || !Number.isFinite(owner.y) || !Number.isFinite(owner.z)) continue;

            let ownerBlock;
            try { ownerBlock = dimension.getBlock(owner); } catch {}
            const ownerConfig = ownerBlock && rpmConfig.get(ownerBlock.typeId);
            if (ownerConfig && getRpmEntityType(ownerBlock.typeId, ownerConfig) === entity.typeId) continue;

            try { entity.remove(); } catch {}
            for (const offset of Object.values(DIRECTION_OFFSETS)) {
                try {
                    addStart(dimension.getBlock({
                        x: owner.x + offset.x,
                        y: owner.y + offset.y,
                        z: owner.z + offset.z
                    }));
                } catch {}
            }
        }

        for (const start of starts.values()) {
            system.runJob(recalculateNetwork(start, dimension, { eventType: 'piston' }));
        }
    });
}


// Retorna dados completos de um bloco, incluindo as faces ao qual ele conecta
function getBlockData(block) {
    if (!block) return null;
    const config = rpmConfig.get(block.typeId);
    if (!config) return null;

    // Pega as faces reais (no mundo) a qual o bloco conecta
    const faces = resolveBlockFaces(block, config, block.permutation);
    if (!faces || Object.keys(faces).length === 0) return null;

    const rawRotation = config?.rotationState ? block.permutation.getState(config?.rotationState) : 'south';
    const rotation = config?.rotationState === 'minecraft:block_face' ? rawRotation : INVERT_FACE[rawRotation];
    const effectiveRotation = config?.effectiveRotation || rotation;

    return {
        pos: { x: block.x, y: block.y, z: block.z },
        block,
        config,
        faces,
        effectiveRotation
    };
};
