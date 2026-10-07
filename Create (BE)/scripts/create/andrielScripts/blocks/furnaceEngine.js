import { BlockPermutation, system } from "@minecraft/server";
import { recalculateNetwork } from "../rpm/rpmCore";
import { INVERT_FACE } from "../rpm/rpmHelpers";

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {'north' | 'south' | 'east' | 'west'} HorizontalDirection */

/** @param {unknown} value @returns {value is HorizontalDirection} */
function isHorizontalDirection(value) {
    return value === 'north' || value === 'south' || value === 'east' || value === 'west';
}

/** @param {Block} block @param {boolean} active */
function setFlywheelActive(block, active) {
    block.setPermutation(BlockPermutation.resolve(block.typeId, {
        ...block.permutation.getAllStates(),
        'create:active_generator': active
    }));
}

// Blocos que alimentam o furnace engine
/** @type {Readonly<Record<string, number | undefined>>} */
export const heatSources = {
    'minecraft:lit_furnace': 16,
    'minecraft:lit_blast_furnace': 32,
    'minecraft:lit_smoker': 16,
};

export const furnaceBlocks = new Set([
    'minecraft:furnace', 'minecraft:lit_furnace',
    'minecraft:blast_furnace', 'minecraft:lit_blast_furnace',
    'minecraft:smoker', 'minecraft:lit_smoker',
]);


const flywheelRightConn = {
    north: 'east',
    south: 'west',
    east: 'south',
    west: 'north',
};

/**
 * Chamado no tick do bloco furnace_engine.
 * Checa se a fornalha atrás está acesa e gera RPM.
 */
/** @param {Block} block @param {Dimension} dimension */
export function furnaceEngineTick(block, dimension) {
    const entity = dimension.getEntities({ location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity` })[0];
    if (!entity) return;

    const rotation = block.permutation.getState('minecraft:cardinal_direction');
    if (!isHorizontalDirection(rotation)) return;

    // Checa fornalha atrás
    let furnaceBlock;
    try { furnaceBlock = block[rotation](); } catch { return; }
    entity.setProperty('create:has_furnace', furnaceBlock !== undefined && furnaceBlocks.has(furnaceBlock.typeId));

    // Checa flywheel 2 blocos na frente
    const targetFace = INVERT_FACE[rotation];
    if (!isHorizontalDirection(targetFace)) return;
    let flywheelBlock;
    try { flywheelBlock = block[targetFace](2); } catch { return; }

    const controllerKey = `${block.x},${block.y},${block.z}`;

    if (flywheelBlock?.typeId !== 'create:flywheel') {
        entity.setProperty('create:has_flywheel', false);
        return;
    };

    const flywheelEntity = dimension.getEntities({ location: flywheelBlock.center(), maxDistance: 0.25, type: `${flywheelBlock.typeId}_entity` })[0];
    if (!flywheelEntity) { entity.setProperty('create:has_flywheel', false); return; };

    // Flywheel precisa ser perpendicular ao engine
    const flywheelRotation = flywheelBlock.permutation.getState('minecraft:cardinal_direction');
    if (!isHorizontalDirection(flywheelRotation)) {
        entity.setProperty('create:has_flywheel', false);
        return;
    }
    const engineAxis = (rotation === 'north' || rotation === 'south') ? 'Z' : 'X';
    const flywheelAxis = (flywheelRotation === 'north' || flywheelRotation === 'south') ? 'Z' : 'X';
    if (engineAxis === flywheelAxis) { entity.setProperty('create:has_flywheel', false); return; };
    

    const currentController = flywheelEntity.getDynamicProperty('create:engine_source') ?? '';

    // Vincula sempre — se já tem outro engine, não sobrescreve
    if (currentController && currentController !== controllerKey) {
        entity.setProperty('create:has_flywheel', false);
        return;
    };

    // Vincula a flywheel a este engine
    flywheelEntity.setDynamicProperty('create:engine_source', controllerKey);
    entity.setProperty('create:has_flywheel', true);
    entity.setProperty('create:flywheel_right_conn', flywheelRightConn[rotation] === flywheelRotation);

    // RPM baseado na fornalha
    const rpm = furnaceBlock ? (heatSources[furnaceBlock.typeId] ?? 0) : 0;
    const currentRpm = flywheelEntity.getDynamicProperty('create:generator_rpm') ?? 0;
    if (currentRpm === rpm) return;

    entity.setProperty('create:rpm', rpm);
    flywheelEntity.setDynamicProperty('create:generator_rpm', rpm);

    setFlywheelActive(flywheelBlock, rpm !== 0);

    system.runJob(recalculateNetwork(flywheelBlock, dimension, { eventType: 'generator' }));
};

/** @param {Block} block @param {Dimension} dimension @param {import('@minecraft/server').BlockPermutation} brokenBlockPermutation */
export function onBreakFurnaceEngine(block, dimension, brokenBlockPermutation) {
    const rotation = brokenBlockPermutation.getState('minecraft:cardinal_direction');
    if (!isHorizontalDirection(rotation)) return;
    const targetFace = INVERT_FACE[rotation];
    if (!isHorizontalDirection(targetFace)) return;

    let flywheelBlock;
    try { flywheelBlock = block[targetFace](2); } catch { return; }
    if (flywheelBlock?.typeId !== 'create:flywheel') return;

    const flywheelEntity = dimension.getEntities({ location: flywheelBlock.center(), maxDistance: 0.25, type: `${flywheelBlock.typeId}_entity` })[0];
    if (!flywheelEntity) return;

    const controllerKey = `${block.x},${block.y},${block.z}`;
    if ((flywheelEntity.getDynamicProperty('create:engine_source') ?? '') !== controllerKey) return;

    // Libera e desliga
    flywheelEntity.setDynamicProperty('create:engine_source', '');
    flywheelEntity.setDynamicProperty('create:generator_rpm', 0);
    setFlywheelActive(flywheelBlock, false);
    system.runJob(recalculateNetwork(flywheelBlock, dimension, { eventType: 'generator' }));
};

/** @param {Block} block @param {Dimension} dimension */
export function furnaceEngineFrame(block, dimension) {
    const rotation = block.permutation.getState('minecraft:cardinal_direction');
    if (!isHorizontalDirection(rotation)) return;

    let entity;
    entity = dimension.getEntities({ location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity` })[0];
    if (!entity) entity = dimension.spawnEntity(`${block.typeId}_entity`, block.center());
    entity.setProperty('create:cardinal_rotation', INVERT_FACE[rotation]);

    const behindFace = block[rotation]();
    const hasFurnace = behindFace !== undefined && furnaceBlocks.has(behindFace.typeId);

    entity.setProperty('create:has_furnace', hasFurnace);
};
