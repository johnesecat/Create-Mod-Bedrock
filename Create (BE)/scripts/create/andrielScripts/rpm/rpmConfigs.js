import { rotationToFace } from "../xZ-Utils";
import { CORRECT_DIRECTIONS, INVERT_FACE } from "./rpmHelpers";

export const rpmConfig = new Map();

// ================= GERADORES =================
registerRpmBlock('create:creative_motor', {
    rotationState: 'minecraft:facing_direction',
    isGenerator: true, stressCapacity: 16384,
    faces: { 'north': shaft() }
});
registerRpmBlock('create:shaft', {
    rotationState: 'minecraft:block_face',
    faces: {
        'north': shaft({ accepts: ['shaft', 'steam_engine_shaft'], ratios: { steam_engine_shaft: 1 } }),
        'south': shaft({ accepts: ['shaft', 'steam_engine_shaft'], ratios: { steam_engine_shaft: 1 } })
    }
});
registerRpmBlock('create:shaft.steam_engine', {
    rotationState: 'minecraft:block_face',
    entityType: 'create:shaft_steam_engine_entity',
    isGenerator: true,
    stressCapacity: 512,
    faces: {
        'north': { type: 'steam_engine_shaft', accepts: ['shaft'], sense: 'invert', ratios: { shaft: 1 } },
        'south': { type: 'steam_engine_shaft', accepts: ['shaft'], sense: 'invert', ratios: { shaft: 1 } }
    }
});
registerRpmBlock('create:cogwheel', {
    rotationState: 'minecraft:facing_direction',
    faces: {
        'north': shaft(),
        'south': shaft(),
        'east': cogwheel(),
        'west': cogwheel(),
        'above': cogwheel(),
        'below': cogwheel(),
        'aboveEast': cogwheel({ accepts: ['large_cogwheel'] }),
        'aboveWest': cogwheel({ accepts: ['large_cogwheel'] }),
        'belowEast': cogwheel({ accepts: ['large_cogwheel'] }),
        'belowWest': cogwheel({ accepts: ['large_cogwheel'] })
    }
});
registerRpmBlock('create:large_cogwheel', {
    rotationState: 'minecraft:facing_direction',
    faces: {
        'north': shaft(),
        'south': shaft(),
        'below': speedController({ accepts: ['speed_controller'] }),
        'aboveEast': largeCogwheel({ accepts: ['cogwheel'] }),
        'aboveWest': largeCogwheel({ accepts: ['cogwheel'] }),
        'belowEast': largeCogwheel({ accepts: ['cogwheel'] }),
        'belowWest': largeCogwheel({ accepts: ['cogwheel'] }),
        'eastNorth': largeCogwheel({ sense: 'cross', alignment: 'perpendicular', accepts: ['large_cogwheel'] }),
        'westNorth': largeCogwheel({ sense: 'cross', alignment: 'perpendicular', accepts: ['large_cogwheel'] }),
        'eastSouth': largeCogwheel({ sense: 'cross', alignment: 'perpendicular', accepts: ['large_cogwheel'] }),
        'westSouth': largeCogwheel({ sense: 'cross', alignment: 'perpendicular', accepts: ['large_cogwheel'] }),
        'aboveNorth': largeCogwheel({ sense: 'cross', alignment: 'perpendicular', accepts: ['large_cogwheel'] }),
        'belowNorth': largeCogwheel({ sense: 'cross', alignment: 'perpendicular', accepts: ['large_cogwheel'] }),
        'aboveSouth': largeCogwheel({ sense: 'cross', alignment: 'perpendicular', accepts: ['large_cogwheel'] }),
        'belowSouth': largeCogwheel({ sense: 'cross', alignment: 'perpendicular', accepts: ['large_cogwheel'] }),
    }
});
registerRpmBlock('create:clutch', {
    rotationState: 'minecraft:facing_direction',
    hasRpm2: true, 
    getRpm2(rpm, powered) { return powered ? 0 : rpm; },
    faces: {
        'north': shaft({ isRpm2: true }),
        'south': shaft(),
    }
});
registerRpmBlock('create:gearbox', {
    horizontalShaft: true,
    getTransferRatio(sourceDir, outputDir) {
        if (INVERT_FACE[sourceDir] === outputDir) return -1;
        return AXIS_SIGN[sourceDir] === AXIS_SIGN[outputDir] ? -1 : 1;
    },
    faces: {
        'north': shaft(),
        'south': shaft(),
        'east': shaft(),
        'west': shaft(),
    }
});
registerRpmBlock('create:vertical_gearbox', {
    rotationState: 'minecraft:cardinal_direction',
    verticalShaft: true,
    getTransferRatio(sourceDir, outputDir) {
        if (INVERT_FACE[sourceDir] === outputDir) return -1;
        return AXIS_SIGN[sourceDir] === AXIS_SIGN[outputDir] ? -1 : 1;
    },
    faces: {
        'north': shaft(),
        'south': shaft(),
        'above': shaft(),
        'below': shaft(),
    }
});
registerRpmBlock('create:gearshift', {
    rotationState: 'minecraft:facing_direction',
    hasRpm2: true, 
    getRpm2(rpm, powered) { return powered ? -rpm : rpm; },
    faces: {
        'north': shaft({ isRpm2: true }),
        'south': shaft(),
    }
});
registerRpmBlock('create:sequenced_gearshift', {
    rotationState: 'minecraft:facing_direction',
    hasRpm2: true,
    // A entrada gira sempre; o eixo oposto só recebe RPM durante a sequência ativa.
    transformRpm2Always: true,
    getRpm2(rpm, powered, block) {
        if (!powered) return 0;
        let facing = 'south';
        try { facing = block?.permutation?.getState('minecraft:facing_direction') ?? facing; } catch {}
        if (typeof facing === 'number') {
            facing = ({ 0: 'down', 1: 'up', 2: 'north', 3: 'south', 4: 'west', 5: 'east' })[facing] ?? 'south';
        }
        return ['north', 'west', 'up'].includes(facing) ? -rpm : rpm;
    },
    faces: {
        'north': shaft({
            isRpm2: true,
            accepts: ['shaft', 'steam_engine_shaft'],
            ratios: { steam_engine_shaft: 1 }
        }),
        'south': shaft({
            accepts: ['shaft', 'steam_engine_shaft'],
            ratios: { steam_engine_shaft: 1 }
        }),
    }
});
registerRpmBlock('create:rotation_speed_controller', {
    rotationState: 'minecraft:cardinal_direction',
    hasRpm2: true, 
    faces: {
        'north': shaft(),
        'south': shaft(),
        'above': speedController({ isRpm2: true }),
    }
});
registerRpmBlock('create:mechanical_arm', {
    rotationState: 'minecraft:cardinal_direction',
    hasSpinningState: true,
    effectiveRotation: 'up',
    verticalShaft: true,
    stressImpact: 2,
    faces: {
        'east': cogwheel(),
        'west': cogwheel(),
        'above': cogwheel(),
        'below': cogwheel(),
        'aboveEast': cogwheel({ accepts: ['large_cogwheel'] }),
        'aboveWest': cogwheel({ accepts: ['large_cogwheel'] }),
        'belowEast': cogwheel({ accepts: ['large_cogwheel'] }),
        'belowWest': cogwheel({ accepts: ['large_cogwheel'] })
    }
});
registerRpmBlock('create:millstone', {
    effectiveRotation: 'up',
    hasSpinningState: true,
    verticalShaft: true,
    stressImpact: 4,
    faces: {
        'south': shaft(),
        'east': cogwheel(),
        'west': cogwheel(),
        'above': cogwheel(),
        'below': cogwheel(),
        'aboveEast': cogwheel({ accepts: ['large_cogwheel'] }),
        'aboveWest': cogwheel({ accepts: ['large_cogwheel'] }),
        'belowEast': cogwheel({ accepts: ['large_cogwheel'] }),
        'belowWest': cogwheel({ accepts: ['large_cogwheel'] })
    }
});
registerRpmBlock('create:mechanical_press', {
    rotationState: 'minecraft:cardinal_direction',
    hasSpinningState: true,
    stressImpact: 8,
    faces: {
        'north': shaft(),
        'south': shaft(),
    }
});
registerRpmBlock('create:mechanical_mixer', {
    effectiveRotation: 'up',
    hasSpinningState: true,
    verticalShaft: true,
    stressImpact: 2,
    faces: {
        'east': cogwheel(),
        'west': cogwheel(),
        'above': cogwheel(),
        'below': cogwheel(),
        'aboveEast': cogwheel({ accepts: ['large_cogwheel'] }),
        'aboveWest': cogwheel({ accepts: ['large_cogwheel'] }),
        'belowEast': cogwheel({ accepts: ['large_cogwheel'] }),
        'belowWest': cogwheel({ accepts: ['large_cogwheel'] })
    }
});
registerRpmBlock('create:mechanical_crafter', {
    rotationState: 'minecraft:cardinal_direction',
    hasSpinningState: true,
    stressImpact: 2,
    faces: {
        'north': cogwheel(),
        'south': cogwheel(),
        'east': cogwheel(),
        'west': cogwheel(),
        'above': cogwheel(),
        'below': cogwheel()
    }
});
registerRpmBlock('create:mechanical_pump', {
    rotationState: 'minecraft:facing_direction',
    entityType: 'create:pump_cog',
    hasSpinningState: true,
    horizontalShaft: true,
    stressImpact: 4,
    getFaces(block, permutation) {
        const facing = (permutation ?? block.permutation).getState('minecraft:facing_direction');
        // A orientacao vertical nao armazena um yaw. Nesse caso, aceite RPM
        // pelos quatro lados horizontais, mas nunca pelo tubo acima/abaixo.
        if (facing === 'up' || facing === 'down') {
            return {
                'east': cogwheel(),
                'west': cogwheel(),
                'above': cogwheel(),
                'below': cogwheel()
            };
        }
        // Na horizontal, east/west sao faces locais e giram junto com a pump:
        // ficam perpendiculares ao tubo, sem conexao pela frente ou por tras.
        return {
            'east': cogwheel(),
            'west': cogwheel()
        };
    }
});
registerRpmBlock('create:crushing_wheel', {
    rotationState: 'minecraft:facing_direction',
    hasSpinningState: true,
    stressImpact: 8,
    faces: {
        'north': shaft(),
        'south': shaft()
    }
});
registerRpmBlock('create:hand_crank', {
    rotationState: 'minecraft:block_face',
    isGenerator: true, stressCapacity: 8,
    faces: { 'south': shaft(), }
});
registerRpmBlock('create:water_wheel', {
    rotationState: 'minecraft:facing_direction',
    isGenerator: true, stressCapacity: 32,
    faces: {
        'north': shaft(),
        'south': shaft()
    }
});
registerRpmBlock('create:large_water_wheel', {
    rotationState: 'minecraft:facing_direction',
    isGenerator: true, stressCapacity: 128,
    faces: {
        'north': shaft(),
        'south': shaft()
    }
});
registerRpmBlock('create:furnace_engine', {
    rotationState: 'minecraft:cardinal_direction',
    faces: {}
});
registerRpmBlock('create:flywheel', {
    rotationState: 'minecraft:cardinal_direction',
    isGenerator: true, stressCapacity: 512,
    faces: { 'north': shaft() }
});
registerRpmBlock('create:speedometer', {
    rotationState: 'minecraft:facing_direction',
    faces: {
        'north': shaft(),
        'south': shaft()
    }
});
registerRpmBlock('create:stressometer', {
    rotationState: 'minecraft:facing_direction',
    faces: {
        'north': shaft(),
        'south': shaft()
    }
});
registerRpmBlock('create:mechanical_drill', {
    rotationState: 'minecraft:facing_direction',
    hasSpinningState: true,
    stressImpact: 4,
    faces: { 'south': shaft() }
});
registerRpmBlock('create:mechanical_bearing', {
    effectiveRotation: 'north',
    entityOffset: { x: 0, y: -0.13, z: 0 },
    hasSpinningState: true,
    stressImpact: 4,
    faces: { 'below': shaft() }
});
registerRpmBlock('create:hose_pulley', {
    rotationState: 'minecraft:cardinal_direction',
    entityType: 'create:shaft_entity',
    perpendicularEntityRotation: true,
    auxiliaryEntity: {
        type: 'create:rope_half',
        offset: { x: 0, y: -0.5, z: 0 }
    },
    hasSpinningState: true,
    stressImpact: 4,
    faces: {
        'east': shaft(),
        'west': shaft()
    }
});
registerRpmBlock('create:weighted_ejector', {
    rotationState: 'minecraft:cardinal_direction',
    // Mesmo sistema de eixo da Mechanical Press, usando a entidade de shaft
    // compartilhada do addon no centro do bloco.
    entityType: 'create:shaft_entity',
    entityOffset: { x: 0, y: 0, z: 0 },
    // O bone rpm do Weighted Ejector atravessa as laterais, 90 graus em
    // relacao ao eixo frontal/traseiro usado pela Press.
    perpendicularEntityRotation: true,
    shaftOffsetUsesVisualRotation: true,
    hasSpinningState: true,
    stressImpact: 2,
    faces: {
        'east': shaft(),
        'west': shaft()
    }
});
registerRpmBlock('create:windmill_bearing', {
    rotationState: 'minecraft:cardinal_direction',
    entityType: 'create:windmill_bearing_entity',
    entityOffset: { x: 0, y: 0, z: 0 },
    isGenerator: true,
    stressCapacity: 512,
    hasSpinningState: true,
    faces: {
        'north': shaft(),
        'south': shaft(),
        'east': shaft(),
        'west': shaft()
    }
});
registerRpmBlock('create:encased_fan', {
    rotationState: 'minecraft:facing_direction',
    hasSpinningState: true,
    stressImpact: 2,
    faces: { 'south': shaft() }
});
registerRpmBlock('create:mechanical_saw', {
    rotationState: 'minecraft:cardinal_direction',
    hasSpinningState: true,
    stressImpact: 4,
    faces: { 'south': shaft() }
});
registerRpmBlock('create:mechanical_harvester', {
    rotationState: 'minecraft:cardinal_direction',
    hasSpinningState: true,
    stressImpact: 4,
    faces: { 'south': shaft() }
});
registerRpmBlock('create:deployer', {
    rotationState: 'minecraft:facing_direction',
    hasSpinningState: true,
    horizontalShaft: true,
    stressImpact: 4,
    faces: {
        'east': shaft(),
        'west': shaft(),
    }
});
registerRpmBlock('create:mechanical_belt', {
    rotationState: 'minecraft:block_face',
    skipFaceMapping: true,
    getFaces(block, permutation) {
    const perm = permutation ?? block.permutation;
    const face = perm.getState('minecraft:block_face');
    const part = perm.getState('create:part');
    const slope = perm.getState('create:slope');

    const axis = (face === 'north' || face === 'south') ? 'Z' : (face === 'east' || face === 'west') ? 'X' : 'Y';
    const hasPulley = part === 'start' || part === 'end' || perm.getState('create:has_pulley');
    const diagonalFlip = perm.getState('create:diagonal_flip') ?? false;
    const faces = {};

    if (slope === 'horizontal') {
        if (axis === 'Z') {
            if (part !== 'end')   faces['west'] = conveyor();
            if (part !== 'start') faces['east'] = conveyor();
            if (hasPulley) { faces['north'] = shaft(); faces['south'] = shaft(); }
        } else if (axis === 'X') {
            if (part !== 'end')   faces['south'] = conveyor();
            if (part !== 'start') faces['north'] = conveyor();
            if (hasPulley) { faces['east'] = shaft(); faces['west'] = shaft(); }
        } else { // Y horizontal = movement in X
            if (part !== 'end')   faces['west'] = conveyor();
            if (part !== 'start') faces['east'] = conveyor();
            if (hasPulley) { faces['above'] = shaft(); faces['below'] = shaft(); }
        }
    }

    else if (slope === 'vertical') {
        if (axis === 'Z' || axis === 'X') {
            // Vertical real: movement in Y
            if (part !== 'end')   faces['above'] = conveyor();  // start → sobe
            if (part !== 'start') faces['below'] = conveyor();  // end → desce
            if (hasPulley) {
                if (axis === 'Z') { faces['north'] = shaft(); faces['south'] = shaft(); }
                else              { faces['east'] = shaft(); faces['west'] = shaft(); }
            }
        } else { // Y vertical = movement in Z
            if (part !== 'end')   faces['south'] = conveyor();
            if (part !== 'start') faces['north'] = conveyor();
            if (hasPulley) { faces['above'] = shaft(); faces['below'] = shaft(); }
        }
    }

    else if (slope === 'diagonal') {
    // Diagonal: conecta em diagonal (aboveEast, belowWest, etc)
        if (axis === 'Z') {
            const upFace   = diagonalFlip ? 'above.west' : 'above.east';
            const downFace = diagonalFlip ? 'below.east' : 'below.west';

            if (part !== 'end')   faces[upFace] = conveyor();
            if (part !== 'start') faces[downFace] = conveyor();
            if (hasPulley) { faces['north'] = shaft(); faces['south'] = shaft(); }
        } else if (axis === 'X') {
            const upFace   = diagonalFlip ? 'above.south' : 'above.north';
            const downFace = diagonalFlip ? 'below.north' : 'below.south';
                
            if (part !== 'end')   faces[upFace] = conveyor();
            if (part !== 'start') faces[downFace] = conveyor();
            if (hasPulley) { faces['east'] = shaft(); faces['west'] = shaft(); }
        }
    }

    return faces;
}
});

export function registerRpmBlock(blockId, config) {
    if (!config.faces && !config.getFaces) {
        throw new Error(`[${blockId}] precisa de 'faces' ou 'getActiveFaces'`);
    }
    rpmConfig.set(blockId, {
        isGenerator: false,
        rotationState: null,
        stressCapacity: 0,
        stressImpact: 0,
        ...config
    });
};

export const KINETIC_TYPES = {
    cogwheel: { sense: 'invert', alignment: 'sameAxis', ratios: { 'large_cogwheel': 0.5 } },
    large_cogwheel: { sense: 'invert', alignment: 'sameAxis', ratios: { 'cogwheel': 2 } },
};

function shaft(opts = {}) { return { type: 'shaft', ...opts }; };
function cogwheel(opts = {}) { return { type: 'cogwheel', sense: 'invert', alignment: 'sameAxis', ratios: { large_cogwheel: 0.5 }, ...opts }; }
function largeCogwheel(opts = {}) { return { type: 'large_cogwheel', sense: 'invert', alignment: 'sameAxis', ratios: { cogwheel: 2, large_cogwheel: 1}, ...opts }; }
function boiler_chamber(opts = {}) { return { type: 'boiler_chamber', ...opts }; };
function conveyor(opts = {}) { return { type: 'conveyor', ...opts }; };
function speedController(opts = {}) { return { type: 'speed_controller', alignment: 'perpendicular', ...opts }; };
function furnaceEngine(opts = {}) { return { type: 'furnace_engine', alignment: 'equal', ...opts }; };

export function getConnectionInfo(senderFace, receiverFace) {
    const senderType = senderFace.type;
    const receiverType = receiverFace.type;

    if (receiverFace.accepts && !receiverFace.accepts.includes(senderType)) return null;
    if (senderFace.accepts && !senderFace.accepts.includes(receiverType)) return null;

    const sense = senderFace.sense ?? receiverFace.sense ?? 'equal';
    if (senderType === receiverType) return { sense, ratio: 1 };

    const ratio = senderFace.ratios?.[receiverType] ?? receiverFace.ratios?.[senderType];
    if (ratio === undefined) return null;

    return { sense: sense, ratio };
};

// Verifica se as rotações dos 2 blocos são compatíveis
export function checkAlignment(faceData, neighborFaceData, rotationA, rotationB) {
    // Per-face alignment tem prioridade
    const alignment = faceData.alignment ?? neighborFaceData.alignment;
    if (!alignment) return true;

    const axisA = rotationToAxis(rotationA);
    const axisB = rotationToAxis(rotationB);

    switch (alignment) {
        case 'equal': return rotationA === rotationB;
        case 'sameAxis': return axisA === axisB;
        case 'perpendicular': return axisA !== axisB;
    };
    return true;
};

export function rotationToAxis(rotation) {
    switch (rotation) {
        case 'north': case 'south': return 'Z';
        case 'east': case 'west': return 'X';
        case 'up': case 'down': return 'Y';
        case 'above': case 'below': return 'Y';
    };
    return 'Z';
};

export const AXIS_SIGN = {
    'north': -1, 'south': 1,
    'east': 1, 'west': -1,
    'above': -1, 'below': 1,
};

// ============================================================
// CONFIGURAÇÕES
// ============================================================
