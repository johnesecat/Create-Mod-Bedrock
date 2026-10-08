import { BlockPermutation, world, system, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { rpmConfig } from "../rpm/rpmConfigs";
import { initRpmBlock, recalculateNetwork, saveSpeedControllerRpm } from "../rpm/rpmCore";
import { clearMainhand } from "../../racoScripts/raco-API.js";
import { snapMechanicalBearingToQuarterTurn } from "./mechanicalBearing.js";

// import { DIRECTION_OFFSETS, INVERT_FACE, resolveBlockFaces } from "./rpmHelpers";
// import { recalculateNetwork } from "./rpmCore";
// import { correctFaceLoc, rotationToFace } from "../xZ-Utils";

const EXTENDABLE_KINETIC_BLOCKS = new Set([
    'create:shaft'
]);

const ROTATION_PARTICLE_BLOCKS = new Set([
    'create:shaft',
    'create:cogwheel'
]);

const END_ROD_PARTICLES = [
    'create:shaft_rotation',
    'minecraft:endrod',
    'minecraft:end_rod_particle',
    'minecraft:endrod_particle',
    'create:air_flow'
];

export function extendKineticBlock(data) {
    const { block, itemStack, player } = data;
    if (!block || !player) return false;
    if (player.isSneaking) return false;
    if (placeGearOnLargeCogwheel(data)) return true;
    if (!EXTENDABLE_KINETIC_BLOCKS.has(block.typeId)) return false;
    if (itemStack?.typeId !== block.typeId) return false;
    if (isFaceOnKineticAxis(block, data.blockFace)) return false;

    data.cancel = true;
    system.run(() => placeKineticExtension(player, block, data.blockFace));
    return true;
}

function placeGearOnLargeCogwheel(data) {
    const { block, itemStack, player } = data;
    if (block.typeId !== 'create:large_cogwheel') return false;
    if (itemStack?.typeId !== 'create:cogwheel') return false;

    data.cancel = true;
    system.run(() => placeLargeCogwheelDiagonalGear(player, block, itemStack.typeId, data.blockFace, data.faceLocation));
    return true;
}

function placeLargeCogwheelDiagonalGear(player, block, itemId, clickedFace, faceLocation) {
    if (!isValidBlock(block)) return false;

    const mainhand = player.getComponent('minecraft:equippable')?.getEquipment('Mainhand');
    if (mainhand?.typeId !== itemId) return false;

    const targetOffset = getLargeCogwheelDiagonalOffset(block, player, faceLocation);
    const targetBlock = block.dimension.getBlock({
        x: block.x + targetOffset.x,
        y: block.y + targetOffset.y,
        z: block.z + targetOffset.z
    });
    if (!isValidBlock(targetBlock) || (!targetBlock.isAir && !targetBlock.isLiquid)) return false;

    const states = getGearPlacementStates(block, itemId);
    try {
        targetBlock.setPermutation(BlockPermutation.resolve(itemId, states));
        initRpmBlock({ block: targetBlock, dimension: block.dimension, previousBlock: undefined });
        clearMainhand(player, 1);
        if (ROTATION_PARTICLE_BLOCKS.has(itemId)) {
            system.runTimeout(() => spawnKineticRotationParticles(block.dimension, targetBlock, block), 2);
        }
        return true;
    } catch {
        return false;
    }
}

function getLargeCogwheelDiagonalOffset(block, player, faceLocation) {
    const axis = getKineticAxis(block);
    const candidates = axis === 'X'
        ? [{ x: 0, y: 1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: -1, z: -1 }]
        : axis === 'Y'
            ? [{ x: 1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: 1 }, { x: -1, y: 0, z: -1 }]
            : [{ x: 1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: -1, y: -1, z: 0 }];

    // Escolhe a diagonal cujo centro fica mais perto da linha da mira. Isso
    // continua correto quando o jogador olha a engrenagem de lado, situação em
    // que os sinais de faceLocation não representam bem o quadrante visual.
    try {
        const eye = player.getHeadLocation();
        const view = player.getViewDirection();
        const center = block.center();
        let closest = candidates[0];
        let bestScore = -Infinity;

        for (const offset of candidates) {
            const dx = center.x + offset.x - eye.x;
            const dy = center.y + offset.y - eye.y;
            const dz = center.z + offset.z - eye.z;
            const distance = Math.hypot(dx, dy, dz);
            if (distance <= 0.001) continue;
            const score = (dx * view.x + dy * view.y + dz * view.z) / distance;
            if (score > bestScore) {
                bestScore = score;
                closest = offset;
            }
        }
        return closest;
    } catch {}

    // Compatibilidade para versões da API sem getHeadLocation().
    const view = player.getViewDirection();
    const localX = (faceLocation?.x ?? 0.5) - 0.5;
    const localY = (faceLocation?.y ?? 0.5) - 0.5;
    const localZ = (faceLocation?.z ?? 0.5) - 0.5;

    if (axis === 'Z') {
        return {
            x: getSignedAxisOffset(localX, view.x),
            y: getSignedAxisOffset(localY, view.y),
            z: 0
        };
    }

    if (axis === 'X') {
        return {
            x: 0,
            y: getSignedAxisOffset(localY, view.y),
            z: getSignedAxisOffset(localZ, view.z)
        };
    }

    return {
        x: getSignedAxisOffset(localX, view.x),
        y: 0,
        z: getSignedAxisOffset(localZ, view.z)
    };
}

function getSignedAxisOffset(localAxis, viewAxis) {
    return Math.abs(localAxis) > 0.08
        ? (localAxis >= 0 ? 1 : -1)
        : (viewAxis >= 0 ? 1 : -1);
}

function getGearPlacementStates(sourceBlock, itemId) {
    const sourceStates = sourceBlock.permutation.getAllStates();
    if (itemId === 'create:shaft') return { 'minecraft:block_face': sourceStates['minecraft:block_face'] };
    return { 'minecraft:facing_direction': sourceStates['minecraft:facing_direction'] };
}

function placeKineticExtension(player, block, clickedFace) {
    if (!isValidBlock(block)) return false;

    const mainhand = player.getComponent('minecraft:equippable')?.getEquipment('Mainhand');
    if (mainhand?.typeId !== block.typeId) return false;

    const extensionFace = getExtensionFace(block, player, clickedFace);
    const targetBlock = getBlockAtFace(block, extensionFace);
    if (!isValidBlock(targetBlock) || (!targetBlock.isAir && !targetBlock.isLiquid)) return false;

    const states = block.permutation.getAllStates();
    try {
        targetBlock.setPermutation(BlockPermutation.resolve(block.typeId, states));
        initRpmBlock({ block: targetBlock, dimension: block.dimension, previousBlock: undefined });
        clearMainhand(player, 1);
        if (!ROTATION_PARTICLE_BLOCKS.has(block.typeId)) {
            try { block.dimension.playSound('use.wood', targetBlock.center(), { volume: 0.6, pitch: 1.1 }); } catch {}
        }
        if (ROTATION_PARTICLE_BLOCKS.has(block.typeId)) {
            system.runTimeout(() => spawnKineticRotationParticles(block.dimension, targetBlock, block), 2);
        }
        return true;
    } catch {
        return false;
    }
}

export function spawnKineticRotationParticles(dimension, block, sourceBlock = block, forcedRpm = undefined) {
    if (!ROTATION_PARTICLE_BLOCKS.has(block?.typeId)) return;

    const rpm = forcedRpm ?? (getKineticBlockRpm(block) || getKineticBlockRpm(sourceBlock));
    if (Math.abs(rpm) <= 0.001) return;

    const center = block.center();
    const rotation = normalizeKineticRotation(getKineticBlockRotation(block));
    const basis = getKineticParticleBasis(rotation);
    const rotationSign = getKineticVisualRotationSign(rpm, rotation);
    const particleSize = getKineticParticleSize(block);
    const frames = 12;
    const pointsPerFrame = 5;
    const trailSpacing = 0.045;
    const radius = getKineticParticleRadius(block);

    for (let frame = 0; frame < frames; frame++) {
        system.runTimeout(() => {
            for (let point = 0; point < pointsPerFrame; point++) {
                const progress = (frame / frames) - point * trailSpacing;
                const angle = progress * Math.PI * 1.85 * rotationSign;
                const waveA = Math.cos(angle) * radius;
                const waveB = Math.sin(angle) * radius;

                spawnEndRodParticle(dimension, getShaftParticleLocation(center, basis, waveA, waveB), angle, rotationSign, particleSize);
            }
        }, frame);
    }
}

function getKineticBlockRpm(block) {
    return getEntityRpm(getKineticEntity(block));
}

function getKineticEntity(block) {
    try {
        return block.dimension.getEntities({
            location: block.center(),
            maxDistance: 0.25,
            type: `${block.typeId}_entity`
        })[0];
    } catch {
        return undefined;
    }
}

function getEntityRpm(entity) {
    try {
        const rpm = entity?.getProperty('create:rpm') ?? 0;
        return Math.abs(rpm) > 0.001 ? rpm : 0;
    } catch {
        return 0;
    }
}

function getEntityRotation(entity) {
    try {
        return entity?.getProperty('create:cardinal_rotation');
    } catch {
        return undefined;
    }
}

function getKineticBlockRotation(block) {
    const entityRotation = getEntityRotation(getKineticEntity(block));
    if (entityRotation) return entityRotation;

    try {
        if (block.typeId === 'create:cogwheel' || block.typeId === 'create:large_cogwheel') {
            return block.permutation.getState('minecraft:facing_direction');
        }
        return block.permutation.getState('minecraft:block_face');
    } catch {
        return 'south';
    }
}

function getKineticVisualRotationSign(rpm, rotation) {
    // Os modelos cinéticos usam -q.property('create:rpm') no RP; a partícula precisa seguir esse mesmo sentido visual.
    return (rpm < 0 ? 1 : -1) * getKineticVisualFaceSign(rotation);
}

function getKineticVisualFaceSign(rotation) {
    const face = normalizeKineticRotation(rotation);
    return face === 'north' || face === 'west' || face === 'down' ? -1 : 1;
}

function getKineticParticleSize(block) {
    if (block.typeId === 'create:large_cogwheel') return { width: 0.95, height: 0.72 };
    if (block.typeId === 'create:cogwheel') return { width: 0.48, height: 0.46 };
    return { width: 0.38, height: 0.3 };
}

function getKineticParticleRadius(block) {
    if (block.typeId === 'create:cogwheel') return 0.58;
    return 0.5;
}

function normalizeKineticRotation(rotation) {
    const face = normalizeFace(rotation);
    if (face === 'above') return 'up';
    if (face === 'below') return 'down';
    return face;
}

function getKineticParticleBasis(rotation) {
    switch (rotation) {
        case 'east':
            return { a: { x: 0, y: 1, z: 0 }, b: { x: 0, y: 0, z: 1 } };
        case 'west':
            return { a: { x: 0, y: 1, z: 0 }, b: { x: 0, y: 0, z: -1 } };
        case 'up':
            return { a: { x: 1, y: 0, z: 0 }, b: { x: 0, y: 0, z: 1 } };
        case 'down':
            return { a: { x: 1, y: 0, z: 0 }, b: { x: 0, y: 0, z: -1 } };
        case 'north':
            return { a: { x: 1, y: 0, z: 0 }, b: { x: 0, y: -1, z: 0 } };
        case 'south':
        default:
            return { a: { x: 1, y: 0, z: 0 }, b: { x: 0, y: 1, z: 0 } };
    }
}

function getShaftParticleLocation(center, basis, waveA, waveB) {
    return {
        x: center.x + basis.a.x * waveA + basis.b.x * waveB,
        y: center.y + basis.a.y * waveA + basis.b.y * waveB,
        z: center.z + basis.a.z * waveA + basis.b.z * waveB,
    };
}

function spawnEndRodParticle(dimension, location, angle, rotationSign, particleSize) {
    const particleData = new MolangVariableMap();
    particleData.setColorRGBA('color', { red: 0, green: 0.85, blue: 1, alpha: 1 });
    particleData.setFloat('rotation_angle', angle * 180 / Math.PI);
    particleData.setFloat('rotation_rate', 180 * rotationSign);
    particleData.setFloat('particle_width', particleSize.width);
    particleData.setFloat('particle_height', particleSize.height);
    particleData.setFloat('speed', 0);
    particleData.setFloat('direction_x', 0);
    particleData.setFloat('direction_y', 0);
    particleData.setFloat('direction_z', 0);
    particleData.setFloat('is_push', 1);
    particleData.setFloat('air_distance', 1);
    particleData.setFloat('color_r', 0);
    particleData.setFloat('color_g', 0.85);
    particleData.setFloat('color_b', 1);
    particleData.setFloat('color_a', 1);

    for (const particleId of END_ROD_PARTICLES) {
        try {
            dimension.spawnParticle(particleId, location, particleData);
            return;
        } catch {}
    }
}

function isValidBlock(block) {
    if (!block) return false;
    if (typeof block.isValid === 'function') return block.isValid();
    if (typeof block.isValid === 'boolean') return block.isValid;
    return true;
}

function getExtensionFace(block, player, clickedFace) {
    const axis = getKineticAxis(block);
    const view = player.getViewDirection();
    const clicked = normalizeFace(clickedFace);

    if (axis === 'X') {
        if ((clicked === 'east' || clicked === 'west') && Math.abs(view.x) < 0.15) return clicked;
        return view.x >= 0 ? 'east' : 'west';
    }
    if (axis === 'Y') {
        if ((clicked === 'above' || clicked === 'below') && Math.abs(view.y) < 0.15) return clicked;
        return view.y >= 0 ? 'above' : 'below';
    }
    if ((clicked === 'north' || clicked === 'south') && Math.abs(view.z) < 0.15) return clicked;
    return view.z >= 0 ? 'south' : 'north';
}

function getKineticAxis(block) {
    const state = block.typeId === 'create:shaft'
        ? block.permutation.getState('minecraft:block_face')
        : block.permutation.getState('minecraft:facing_direction');

    const face = normalizeFace(state);
    if (face === 'east' || face === 'west') return 'X';
    if (face === 'above' || face === 'below') return 'Y';
    return 'Z';
}

function isFaceOnKineticAxis(block, face) {
    const axis = getKineticAxis(block);
    const normalizedFace = normalizeFace(face);

    if (axis === 'X') return normalizedFace === 'east' || normalizedFace === 'west';
    if (axis === 'Y') return normalizedFace === 'above' || normalizedFace === 'below';
    return normalizedFace === 'north' || normalizedFace === 'south';
}

function normalizeFace(face) {
    switch (`${face}`.toLowerCase()) {
        case 'up': return 'above';
        case 'down': return 'below';
        default: return `${face}`.toLowerCase();
    }
}

function getBlockAtFace(block, face) {
    switch (face) {
        case 'north': return block.north();
        case 'south': return block.south();
        case 'east': return block.east();
        case 'west': return block.west();
        case 'above': return block.above();
        case 'below': return block.below();
        default: return undefined;
    }
}


export function clutchAndGearshift(block, dimension, powerLevel) {
    const hasPower = powerLevel > 0;
    const blockState = block.permutation.getState('create:powered');
    const blockCenter = block.center(); 

    const entity = dimension?.getEntities({location: blockCenter, maxDistance: 0.25, type: `${block?.typeId}_entity`})[0];
    if (entity?.getProperty('create:powered') != hasPower) entity?.setProperty('create:powered', hasPower);

    if (hasPower && !blockState || !hasPower && blockState) {
        dimension.playSound('random.click', blockCenter, { pitch: 1.35});
        block.setPermutation(block.permutation.withState('create:powered', hasPower));
        system.runJob(recalculateNetwork(block, dimension, { eventType: 'redstone', protectedPos: block.location }));
    }; 
};

export function sequencedGearshiftRedstone(block, dimension, powerLevel) {
    if (block?.typeId !== 'create:sequenced_gearshift') return;
    const hasSignal = powerLevel > 0;
    const hadSignal = block.permutation.getState('create:redstone_signal') === true;
    if (hasSignal === hadSignal) return;

    let permutation = block.permutation.withState('create:redstone_signal', hasSignal);
    const entity = dimension.getEntities({
        location: block.center(),
        maxDistance: 0.25,
        type: 'create:sequenced_gearshift_entity'
    })[0];

    if (hasSignal && !hadSignal) {
        permutation = permutation.withState('create:powered', true);
        try { entity?.setDynamicProperty('create:sequence_degrees', 0); } catch {}
        try { entity?.setDynamicProperty('create:sequence_target_degrees', 90); } catch {}
        try { entity?.setDynamicProperty('create:sequence_last_tick', system.currentTick); } catch {}
        try { entity?.setProperty('create:powered', true); } catch {}
        try { dimension.playSound('random.click', block.center(), { pitch: 1.35 }); } catch {}
    }

    block.setPermutation(permutation);
    system.runJob(recalculateNetwork(block, dimension, { eventType: 'redstone', protectedPos: block.location }));
}

export function sequencedGearshiftTick(block, dimension) {
    if (block?.typeId !== 'create:sequenced_gearshift') return;
    if (block.permutation.getState('create:powered') !== true) return;

    const entity = dimension.getEntities({
        location: block.center(),
        maxDistance: 0.25,
        type: 'create:sequenced_gearshift_entity'
    })[0];
    if (!entity?.isValid) return;

    const tick = system.currentTick;
    const lastTick = Number(entity.getDynamicProperty('create:sequence_last_tick') ?? tick);
    const deltaTicks = Math.max(1, tick - lastTick);
    const rpm = Math.abs(Number(entity.getProperty('create:rpm') ?? 0));
    // Usa exatamente a mesma velocidade angular do mechanical bearing.
    // Assim RPM maior reduz o tempo do ciclo sem alterar os 90 graus finais.
    const degrees = Number(entity.getDynamicProperty('create:sequence_degrees') ?? 0)
        + (rpm / (3.33 * 20)) * deltaTicks;
    try { entity.setDynamicProperty('create:sequence_last_tick', tick); } catch {}

    const targetDegrees = Number(entity.getDynamicProperty('create:sequence_target_degrees') ?? 90);
    if (rpm <= 0.001 || degrees < targetDegrees) {
        try { entity.setDynamicProperty('create:sequence_degrees', degrees); } catch {}
        return;
    }

    try { entity.setDynamicProperty('create:sequence_degrees', targetDegrees); } catch {}
    try {
        const bearing = block.above();
        if (bearing?.typeId === 'create:mechanical_bearing') {
            snapMechanicalBearingToQuarterTurn(bearing);
        }
    } catch {}
    try { entity.setProperty('create:powered', false); } catch {}
    block.setPermutation(block.permutation.withState('create:powered', false));
    try { dimension.playSound('random.click', block.center(), { pitch: 0.9 }); } catch {}
    system.runJob(recalculateNetwork(block, dimension, { eventType: 'update', protectedPos: block.location }));
}

export function speedControllerInteract(player, block, dimension, face, faceLocation) {
    const entity = dimension.getEntities({ location: block.center(), type: `${block.typeId}_entity`, maxDistance: 0.5 })[0]; if (!entity) return;
    const form = new ModalFormData();

    const storedSpeed = entity.getDynamicProperty('create:speed_controller') ?? entity.getProperty('create:rpm');
    const currentSpeed = typeof storedSpeed === 'number' && Number.isFinite(storedSpeed) ? storedSpeed : 1;
    const blockLocation = { x: block.location.x, y: block.location.y, z: block.location.z };
    const blockTypeId = block.typeId;
    const entityTypeId = `${blockTypeId}_entity`;
    form.title({ rawtext: [{ text: 'create:rpm.' }, { translate: 'speed_controller.title' }] });
    form.toggle({ translate: 'creative_motor.reverse_rotation.text' }, { defaultValue: currentSpeed >= 0 ? false : true });
    form.slider({ translate: 'creative_motor.speed.text' }, 1, 256, { defaultValue: Math.min(256, Math.max(1, Math.abs(currentSpeed))) });
    form.submitButton({ translate: 'creative_motor.confirm.text' });
    form.show(player).then(async resp => {
        if (resp.canceled || !resp.formValues) return;
        const [invert, speed] = resp.formValues;
        if (typeof invert !== 'boolean' || typeof speed !== 'number' || !Number.isFinite(speed) || speed < 1 || speed > 256) return;
        const rpm = invert ? -speed : speed;

        const currentBlock = dimension.getBlock(blockLocation);
        if (!currentBlock || currentBlock.typeId !== blockTypeId) return;

        const currentEntity = dimension.getEntities({
            location: currentBlock.center(),
            type: entityTypeId,
            maxDistance: 0.5
        })[0];
        if (!currentEntity?.isValid) return;

        currentEntity.setDynamicProperty('create:speed_controller', rpm);
        saveSpeedControllerRpm(currentBlock, rpm);
        if (resp.formValues) {
            system.runJob(recalculateNetwork(currentBlock, dimension, { eventType: 'update' }));
        };
    }).catch(error => console.warn(`[Create] Speed controller form failed: ${error}`));
}
