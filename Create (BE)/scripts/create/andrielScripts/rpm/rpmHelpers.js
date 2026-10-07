/** @typedef {'north' | 'south' | 'east' | 'west' | 'up' | 'down'} Rotation
 * @typedef {'X' | 'Y' | 'Z'} Axis
 * @typedef {{ type: string, accepts?: string[], sense?: string, alignment?: string, ratios?: Record<string, number>, isRpm2?: boolean }} KineticFace
 * @typedef {{ faces?: Record<string, KineticFace>, getFaces?: (block: import('@minecraft/server').Block, permutation: import('@minecraft/server').BlockPermutation) => Record<string, KineticFace>, skipFaceMapping?: boolean, rotationState?: keyof import('@minecraft/vanilla-data').BlockStateSuperset | null, effectiveRotation?: Rotation }} FaceConfig
 */
/** @type {Readonly<Record<string, string>>} */
export const INVERT_FACE = {
    'north': 'south', 'south': 'north',
    'east': 'west', 'west': 'east',
    'above': 'below', 'below': 'above',
    'up': 'down', 'down': 'up',

    'above.north': 'below.south', 'below.south': 'above.north',
    'above.south': 'below.north', 'below.north': 'above.south',
    'above.east': 'below.west', 'below.west': 'above.east',
    'above.west': 'below.east', 'below.east': 'above.west',

    'east.north': 'west.south', 'west.south': 'east.north',
    'east.south': 'west.north', 'west.north': 'east.south',
};


/** @type {Readonly<Record<Rotation, Readonly<Record<string, string>>>>} */
export const CORRECT_DIRECTIONS = {
    'north': {
        north: 'north', south: 'south', east: 'east', west: 'west', above: 'above', below: 'below',
        aboveEast: 'above.east', aboveWest: 'above.west', belowEast: 'below.east', belowWest: 'below.west',
        aboveNorth: 'above.north', belowNorth: 'below.north', aboveSouth: 'above.south', belowSouth: 'below.south',
        eastNorth: 'east.north', eastSouth: 'east.south', westNorth: 'west.north', westSouth: 'west.south'
    },
    'south': {
        north: 'south', south: 'north', east: 'west', west: 'east', above: 'above', below: 'below',
        aboveEast: 'above.west', aboveWest: 'above.east', belowEast: 'below.west', belowWest: 'below.east',
        aboveNorth: 'above.south', belowNorth: 'below.south', aboveSouth: 'above.north', belowSouth: 'below.north',
        eastNorth: 'west.south', eastSouth: 'west.north', westNorth: 'east.south', westSouth: 'east.north'
    },
    'east': {
        north: 'east', south: 'west', east: 'south', west: 'north', above: 'above', below: 'below',
        aboveEast: 'above.south', aboveWest: 'above.north', belowEast: 'below.south', belowWest: 'below.north',
        aboveNorth: 'above.east', belowNorth: 'below.east', aboveSouth: 'above.west', belowSouth: 'below.west',
        eastNorth: 'east.south', eastSouth: 'west.south', westNorth: 'east.north', westSouth: 'west.north'
    },
    'west': {
        north: 'west', south: 'east', east: 'north', west: 'south', above: 'above', below: 'below',
        aboveEast: 'above.north', aboveWest: 'above.south', belowEast: 'below.north', belowWest: 'below.south',
        aboveNorth: 'above.west', belowNorth: 'below.west', aboveSouth: 'above.east', belowSouth: 'below.east',
        eastNorth: 'west.north', eastSouth: 'east.north', westNorth: 'west.south', westSouth: 'east.south'
    },
    'up': {
        north: 'above', south: 'below', east: 'east', west: 'west', above: 'south', below: 'north',
        aboveEast: 'east.south', aboveWest: 'west.south', belowEast: 'east.north', belowWest: 'west.north',
        aboveNorth: 'above.south', belowNorth: 'above.north', aboveSouth: 'below.south', belowSouth: 'below.north',
        eastNorth: 'above.east', eastSouth: 'below.east', westNorth: 'above.west', westSouth: 'below.west'
    },
    'down': {
        north: 'below', south: 'above', east: 'east', west: 'west', above: 'north', below: 'south',
        aboveEast: 'east.north', aboveWest: 'west.north', belowEast: 'east.south', belowWest: 'west.south',
        aboveNorth: 'below.north', belowNorth: 'below.south', aboveSouth: 'above.north', belowSouth: 'above.south',
        eastNorth: 'below.east', eastSouth: 'above.east', westNorth: 'below.west', westSouth: 'above.west'
    }
};


export const DIRECTION_OFFSETS = {
    'north':  { x:  0, y:  0, z: -1 },
    'south':  { x:  0, y:  0, z:  1 },
    'east':   { x:  1, y:  0, z:  0 },
    'west':   { x: -1, y:  0, z:  0 },
    'above':  { x:  0, y:  1, z:  0 },
    'below':  { x:  0, y: -1, z:  0 },

    'above.east':  { x:  1, y:  1, z:  0 },
    'above.west':  { x: -1, y:  1, z:  0 },
    'above.north': { x:  0, y:  1, z: -1 },
    'above.south': { x:  0, y:  1, z:  1 },
    'below.east':  { x:  1, y: -1, z:  0 },
    'below.west':  { x: -1, y: -1, z:  0 },
    'below.north': { x:  0, y: -1, z: -1 },
    'below.south': { x:  0, y: -1, z:  1 },
    'east.north':  { x:  1, y:  0, z: -1 },
    'east.south':  { x:  1, y:  0, z:  1 },
    'west.north':  { x: -1, y:  0, z: -1 },
    'west.south':  { x: -1, y:  0, z:  1 },
};

/** @param {number} x
 * @param {number} y
 * @param {number} z
 */
export function posToKey(x, y, z) { return `${x},${y},${z}`; };
/** @param {string} key
 * @returns {import('@minecraft/server').Vector3}
 */
export function keyToPos(key) {
    const parts = key.split(',');
    if (parts.length !== 3 || parts.some(part => !part.trim())) throw new Error(`Invalid block position key: ${key}`);
    const [x, y, z] = parts.map(Number);
    if (![x, y, z].every(Number.isFinite)) throw new Error(`Invalid block position key: ${key}`);
    return { x, y, z };
};

// Retorna o eixo de rotação baseado na rotação cardinal do bloco
// Se horizontalOrVertical for 'horizontal', troca X por Z (pra maquinas com eixo perpendicular ao norte do bloco)
// Se horizontalOrVertical for 'vertical', troca X ou Z por Y (pra maquinas com eixo vertical)
/** @param {string | undefined} rotation
 * @returns {'X' | 'Y' | 'Z'}
 */
export function getAxisFromRotation(rotation) {
    if (rotation === 'east' || rotation === 'west') return 'X';
    if (rotation === 'up' || rotation === 'down') return 'Y';
    return 'Z'; // north/south default
};

/** @param {'X' | 'Y' | 'Z'} axis
 * @param {'horizontal' | 'vertical' | undefined} mode
 */
export function perpendicularAxis(axis, mode) {
    if (mode === 'horizontal') return axis === 'X' ? 'Z' : 'X'; // X<->Z
    if (mode === 'vertical') return axis === 'Y' ? 'X' : 'Y';   // (exemplo) ajuste como você quer
    return axis;
}

// Retorna se o bloco deve rotaciona o eixo ou não
/** @param {'X' | 'Y' | 'Z'} axis
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
export function shouldOffset(axis, x, y, z) {
    switch (axis) {
        case 'X': return ((y + z) % 2) === 0;
        case 'Y': return ((x + z) % 2) === 0;
        case 'Z': return ((x + y) % 2) === 0;
    };
    return false;
};

// Para grandes engrenagens, o offset é diferente pra criar um padrão quadriculado
/** @param {'X' | 'Y' | 'Z'} axis
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
export function shouldOffsetLarge(axis, x, y, z) {
    switch (axis) {
        case 'X': return (y % 2) === 0;
        case 'Y': return (x % 2) === 0;
        case 'Z': return (x % 2) === 0;
    };
    return false;
};


// Transforma as faces das configs (que são definidas localmente pro bloco) em faces do mundo real, considerando a rotação do bloco
/** @param {import('@minecraft/server').Block} block
 * @param {FaceConfig} config
 * @param {import('@minecraft/server').BlockPermutation} [permutation]
 * @returns {Record<string, KineticFace>}
 */
export function resolveBlockFaces(block, config, permutation) {
    if (!permutation) permutation = block.permutation;

    // getFaces pode retornar faces dinâmicas
    const localFaces = typeof config.getFaces === 'function' ? config.getFaces(block, permutation) : config.faces ?? {};
    if (config.skipFaceMapping) return { ...localFaces };

    // Converte a rotação definida nas configs para a rotação real do mundo
    const rawRotation = config?.rotationState ? permutation.getState(config?.rotationState) : 'south';
    if (typeof rawRotation !== 'string') return {};
    const rotation = config.rotationState === 'minecraft:block_face' ? rawRotation : INVERT_FACE[rawRotation];
    const effectiveRotation = config.effectiveRotation || rotation;
    if (!isRotation(effectiveRotation)) return {};
    const dirMap = CORRECT_DIRECTIONS[effectiveRotation];

    // Recria a config de faces com as direções corrigidas pro mundo real 
    /** @type {Record<string, KineticFace>} */
    const result = {};
    for (const [localFace, faceData] of Object.entries(localFaces)) {
        const worldFace = dirMap[localFace];
        if (worldFace) result[worldFace] = faceData;
    };

    return result;
};

/** @param {string | undefined} value
 * @returns {value is Rotation}
 */
function isRotation(value) {
    return value !== undefined && ['north', 'south', 'east', 'west', 'up', 'down'].includes(value);
}

export const CARDAN_SECONDARY_FLIP = {
    0: { north: 1, south: 1, east: 1, west: 1, up: 1, down: -1 },
    1: { north: 1, south: -1, east: 1, west: -1, up: -1, down: -1 },
    2: { north: -1, south: -1, east: -1, west: -1, up: -1, down: 1 },
    3: { north: -1, south: 1, east: -1, west: 1, up: 1, down: 1 },
};