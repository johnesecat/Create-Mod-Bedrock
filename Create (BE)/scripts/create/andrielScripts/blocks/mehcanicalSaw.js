import { system, MolangVariableMap } from "@minecraft/server";
import { DIRECTION_OFFSETS, INVERT_FACE, posToKey } from "../rpm/rpmHelpers";
import { getBlockHardness } from "../xZDefinitions";
import { rotationToFace } from "../xZ-Utils";
import { spawnCrackParticles } from "./mechanicalDrill";

const sawData = new Map();
const ENTITY_SAW_FRONT_DISTANCE = 0.85;
const ENTITY_SAW_DROP_COLLECT_RADIUS = 1.4;

const sawableBlocks = new Set([
    // Logs
    'minecraft:oak_log', 'minecraft:birch_log', 'minecraft:spruce_log', 'minecraft:jungle_log',
    'minecraft:acacia_log', 'minecraft:dark_oak_log', 'minecraft:cherry_log', 'minecraft:mangrove_log',
    'minecraft:pale_oak_log', 'minecraft:crimson_stem', 'minecraft:warped_stem',

    // Stripped logs
    'minecraft:stripped_oak_log', 'minecraft:stripped_birch_log', 'minecraft:stripped_spruce_log',
    'minecraft:stripped_jungle_log', 'minecraft:stripped_acacia_log', 'minecraft:stripped_dark_oak_log',
    'minecraft:stripped_cherry_log', 'minecraft:stripped_mangrove_log', 'minecraft:stripped_pale_oak_log',
    'minecraft:stripped_crimson_stem', 'minecraft:stripped_warped_stem',

    // Wood (bark blocks)
    'minecraft:oak_wood', 'minecraft:birch_wood', 'minecraft:spruce_wood', 'minecraft:jungle_wood',
    'minecraft:acacia_wood', 'minecraft:dark_oak_wood', 'minecraft:cherry_wood', 'minecraft:mangrove_wood',
    'minecraft:pale_oak_wood', 'minecraft:crimson_hyphae', 'minecraft:warped_hyphae',
    'minecraft:stripped_oak_wood', 'minecraft:stripped_birch_wood', 'minecraft:stripped_spruce_wood',
    'minecraft:stripped_jungle_wood', 'minecraft:stripped_acacia_wood', 'minecraft:stripped_dark_oak_wood',
    'minecraft:stripped_cherry_wood', 'minecraft:stripped_mangrove_wood', 'minecraft:stripped_pale_oak_wood',
    'minecraft:stripped_crimson_hyphae', 'minecraft:stripped_warped_hyphae',

    // Mushroom stem
    'minecraft:mushroom_stem',

    // Leaves
    'minecraft:oak_leaves', 'minecraft:birch_leaves', 'minecraft:spruce_leaves', 'minecraft:jungle_leaves',
    'minecraft:acacia_leaves', 'minecraft:dark_oak_leaves', 'minecraft:cherry_leaves', 'minecraft:mangrove_leaves',
    'minecraft:pale_oak_leaves', 'minecraft:azalea_leaves', 'minecraft:azalea_leaves_flowered',

    // Mushroom blocks (act as leaves in tree felling)
    'minecraft:red_mushroom_block', 'minecraft:brown_mushroom_block',
    'minecraft:nether_wart_block', 'minecraft:warped_wart_block',

    // Vertical plants
    'minecraft:bamboo', 'minecraft:cactus', 'minecraft:sugar_cane', // reeds = sugar cane
    'minecraft:kelp', 'minecraft:cave_vines', 'minecraft:cave_vines_body_with_berries', 'minecraft:cave_vines_head_with_berries',

    // Chorus
    'minecraft:chorus_plant', 'minecraft:chorus_flower',

    // Pumpkin & Melon
    'minecraft:pumpkin', 'minecraft:melon_block', 'minecraft:carved_pumpkin', 'minecraft:lit_pumpkin',
    
    // Mangrove roots
    'minecraft:mangrove_roots', 'minecraft:muddy_mangrove_roots',
]);

function isLog(typeId) {
    return typeId.endsWith('_log') || typeId.endsWith('_stem') || typeId.endsWith('_wood') || typeId.endsWith('_hyphae') || typeId === 'minecraft:mushroom_stem';
};

function isLeaf(typeId) {
    return typeId.endsWith('_leaves') || typeId === 'minecraft:azalea_leaves_flowered' || typeId === 'minecraft:red_mushroom_block' || typeId === 'minecraft:brown_mushroom_block'
        || typeId === 'minecraft:nether_wart_block' || typeId === 'minecraft:warped_wart_block' || typeId === 'minecraft:weeping_vines' || typeId === 'minecraft:weeping_vines_plant';
};

function isVerticalPlant(typeId) {
    return typeId === 'minecraft:bamboo' || typeId === 'minecraft:cactus' || typeId === 'minecraft:sugar_cane' || typeId === 'minecraft:reeds' || typeId === 'minecraft:kelp';
};

function isChorus(typeId) {
    return typeId === 'minecraft:chorus_plant' || typeId === 'minecraft:chorus_flower';
};

function isSawable(typeId) {
    return sawableBlocks.has(typeId);
};

function canBreak(targetBlock) {
    if (!targetBlock?.isValid) return false;
    if (targetBlock.isLiquid || targetBlock.isAir) return false;
    if (!isSawable(targetBlock.typeId)) return false;

    const hardness = getBlockHardness(targetBlock);
    if (hardness < 0) return false;
    
    return true;
};


export function mechanicalSawTick(block, dimension) {
    const entity = dimension.getEntities({location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity`})[0];
    if (!entity) return;

    const rpm = entity.getProperty('create:rpm') ?? 0;
    if (rpm === 0) {
        mechanicalSawDeleteData(block);
        return;
    };

    const rotation = block.permutation.getState('minecraft:cardinal_direction');
    if (!rotation) return;

    const blockKey = posToKey(block.x, block.y, block.z);
    let breakingData = sawData.get(blockKey);
    if (!breakingData) {
        breakingData = { destroyProgress: 0, ticksUntilNext: 0, breakingBlockId: null };
        sawData.set(blockKey, breakingData);
    };

    let targetBlock;
    try { targetBlock = block.offset(DIRECTION_OFFSETS[rotationToFace[INVERT_FACE[rotation]]]); } catch { return; }
    if (!targetBlock?.isValid) return;

    if (breakingData.breakingBlockId !== targetBlock.typeId) {
        breakingData.ticksUntilNext = 0;
        breakingData.destroyProgress = 0;
        breakingData.breakingBlockId = targetBlock.typeId;
    };

    if (!canBreak(targetBlock)) {
        if (breakingData.destroyProgress !== 0) {
            breakingData.ticksUntilNext = 0;
            breakingData.destroyProgress = 0;
            breakingData.breakingBlockId = null;
        };
        return;
    };

    if (breakingData.ticksUntilNext > 0) {
        breakingData.ticksUntilNext--;
        return;
    };

    const blockHardness = getBlockHardness(targetBlock) || 2;
    const breakSpeed = Math.abs(rpm) / 100;
    const nextInterval = Math.max(0, Math.floor(blockHardness / breakSpeed));

    const progressIncrement = Math.max(1, Math.min(Math.floor(breakSpeed / blockHardness), 10 - breakingData.destroyProgress));
    breakingData.destroyProgress += progressIncrement;

    if (breakingData.destroyProgress < 10) {
        spawnCrackParticles(dimension, targetBlock, breakingData.destroyProgress, nextInterval);
        dimension.playSound('hit.wood', targetBlock.center(), { volume: 1 });
    };

    if (breakingData.destroyProgress >= 10) {
        const brokenTypeId = targetBlock.typeId;
        const breakPos = { x: targetBlock.x, y: targetBlock.y, z: targetBlock.z };

        // Quebra o bloco principal
        try { dimension.runCommand(`setblock ${breakPos.x} ${breakPos.y} ${breakPos.z} air destroy`); } catch {}

        // Tree felling: se era um log, busca e derruba a árvore inteira
        if (isLog(brokenTypeId) || isVerticalPlant(brokenTypeId) || isChorus(brokenTypeId)) {
            const tree = findTree(dimension, breakPos, brokenTypeId);
            if (tree.logs.length > 0 || tree.leaves.length > 0) {
                system.runJob(destroyTree(dimension, tree, { x: block.x, y: block.y, z: block.z }));
            };
        };

        breakingData.destroyProgress = 0;
        breakingData.ticksUntilNext = 0;
        breakingData.breakingBlockId = null;
        return;
    };

    breakingData.ticksUntilNext = nextInterval;
};


export function mechanicalSawDeleteData(block) {
    const blockKey = posToKey(block.x, block.y, block.z);
    sawData.delete(blockKey);
};

function getEntitySawKey(entity) {
    const loc = entity.location;
    return `entity:${entity.id ?? `${Math.floor(loc.x)},${Math.floor(loc.y)},${Math.floor(loc.z)}`}`;
}

function getEntityFacingDirection(entity) {
    let yaw = 0;
    try { yaw = (entity.getRotation().y % 360 + 360) % 360; } catch {}
    if (yaw >= 45 && yaw < 135) return "west";
    if (yaw >= 135 && yaw < 225) return "north";
    if (yaw >= 225 && yaw < 315) return "east";
    return "south";
}

function getEntitySawTarget(entity) {
    const location = entity.location;
    const facing = getEntityFacingDirection(entity);
    const forward = DIRECTION_OFFSETS[rotationToFace[facing]] ?? { x: 0, y: 0, z: 0 };
    const pos = {
        x: Math.floor(location.x + forward.x * ENTITY_SAW_FRONT_DISTANCE),
        y: Math.floor(location.y + 0.5),
        z: Math.floor(location.z + forward.z * ENTITY_SAW_FRONT_DISTANCE)
    };

    let block;
    try { block = entity.dimension.getBlock(pos); } catch { return undefined; }
    if (!canBreak(block)) return undefined;
    return block;
}

function collectDroppedItemsNear(dimension, pos, itemCollector) {
    if (typeof itemCollector !== "function") return;

    const location = { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 };
    let itemEntities = [];
    try {
        itemEntities = dimension.getEntities({
            type: "minecraft:item",
            location,
            maxDistance: ENTITY_SAW_DROP_COLLECT_RADIUS
        });
    } catch {
        return;
    }

    for (const itemEntity of itemEntities) {
        const itemStack = itemEntity.getComponent("minecraft:item")?.itemStack?.clone?.()
            ?? itemEntity.getComponent("item")?.itemStack?.clone?.();
        if (!itemStack) continue;
        if (!itemCollector(itemStack)) continue;
        try { itemEntity.remove(); } catch {}
    }
}

function scheduleDropCollection(dimension, pos, itemCollector) {
    if (typeof itemCollector !== "function") return;

    system.run(() => collectDroppedItemsNear(dimension, pos, itemCollector));
    system.run(() => system.run(() => collectDroppedItemsNear(dimension, pos, itemCollector)));
}

export function mechanicalSawEntityTick(entity, itemCollector) {
    if (!entity?.isValid) return false;

    const rpm = entity.getProperty("create:rpm") ?? 0;
    const blockKey = getEntitySawKey(entity);
    if (rpm === 0) {
        sawData.delete(blockKey);
        return false;
    }

    const targetBlock = getEntitySawTarget(entity);
    let breakingData = sawData.get(blockKey);
    if (!breakingData) {
        breakingData = { destroyProgress: 0, ticksUntilNext: 0, breakingBlockId: null };
        sawData.set(blockKey, breakingData);
    }

    if (!targetBlock?.isValid || !canBreak(targetBlock)) {
        if (breakingData.destroyProgress !== 0) {
            breakingData.ticksUntilNext = 0;
            breakingData.destroyProgress = 0;
            breakingData.breakingBlockId = null;
        }
        return false;
    }

    if (breakingData.breakingBlockId !== targetBlock.typeId) {
        breakingData.ticksUntilNext = 0;
        breakingData.destroyProgress = 0;
        breakingData.breakingBlockId = targetBlock.typeId;
    }

    if (breakingData.ticksUntilNext > 0) {
        breakingData.ticksUntilNext--;
        return true;
    }

    const blockHardness = getBlockHardness(targetBlock) || 2;
    const breakSpeed = Math.abs(rpm) / 100;
    const nextInterval = Math.max(0, Math.floor(blockHardness / breakSpeed));
    const progressIncrement = Math.max(1, Math.min(Math.floor(breakSpeed / blockHardness), 10 - breakingData.destroyProgress));
    breakingData.destroyProgress += progressIncrement;

    if (breakingData.destroyProgress < 10) {
        spawnCrackParticles(entity.dimension, targetBlock, breakingData.destroyProgress, nextInterval);
        entity.dimension.playSound("hit.wood", targetBlock.center(), { volume: 1 });
    }

    if (breakingData.destroyProgress >= 10) {
        const brokenTypeId = targetBlock.typeId;
        const breakPos = { x: targetBlock.x, y: targetBlock.y, z: targetBlock.z };
        try { entity.dimension.runCommand(`setblock ${breakPos.x} ${breakPos.y} ${breakPos.z} air destroy`); } catch {}
        scheduleDropCollection(entity.dimension, breakPos, itemCollector);

        if (isLog(brokenTypeId) || isVerticalPlant(brokenTypeId) || isChorus(brokenTypeId)) {
            const tree = findTree(entity.dimension, breakPos, brokenTypeId);
            if (tree.logs.length > 0 || tree.leaves.length > 0) {
                system.runJob(destroyTree(entity.dimension, tree, breakPos, itemCollector));
            }
        }

        breakingData.destroyProgress = 0;
        breakingData.ticksUntilNext = 0;
        breakingData.breakingBlockId = null;
        return true;
    }

    breakingData.ticksUntilNext = nextInterval;
    return true;
}

function findTree(dimension, cutPos, brokenTypeId) {
    const logs = [];
    const leaves = [];
    const visited = new Set();
    const frontier = [];

    // Vertical plants (bamboo, cactus, sugar cane, kelp)
    if (isVerticalPlant(brokenTypeId)) {
        for (let i = 1; i < 256; i++) {
            const pos = { x: cutPos.x, y: cutPos.y + i, z: cutPos.z };
            let block;
            try { block = dimension.getBlock(pos); } catch { break; }
            if (!block?.isValid || !isVerticalPlant(block.typeId)) break;
            logs.push(pos);
        }
        logs.reverse();
        return { logs, leaves };
    };

    // Chorus plants (BFS em todas as direções)
    if (isChorus(brokenTypeId)) {
        const above = { x: cutPos.x, y: cutPos.y + 1, z: cutPos.z };
        let aboveBlock;
        try { aboveBlock = dimension.getBlock(above); } catch { return { logs: [], leaves: [] }; }
        if (!aboveBlock?.isValid || !isChorus(aboveBlock.typeId)) return { logs: [], leaves: [] };

        frontier.push(above);
        visited.add(posToKey(cutPos.x, cutPos.y, cutPos.z));

        while (frontier.length > 0) {
            const pos = frontier.shift();
            const key = posToKey(pos.x, pos.y, pos.z);
            if (visited.has(key)) continue;
            visited.add(key);

            let block;
            try { block = dimension.getBlock(pos); } catch { continue; }
            if (!block?.isValid || !isChorus(block.typeId)) continue;

            logs.push(pos);

            for (const [, offset] of Object.entries(DIRECTION_OFFSETS)) {
                if (typeof offset === 'object' && offset !== null) {
                    frontier.push({ x: pos.x + offset.x, y: pos.y + offset.y, z: pos.z + offset.z });
                };
            };
        };
        logs.reverse();
        return { logs, leaves };
    };

    // Regular tree: BFS pra cima buscando logs, depois folhas
    if (!isLog(brokenTypeId)) return { logs: [], leaves: [] };

    // Verifica se tem log acima (validação básica de árvore)
    const above = { x: cutPos.x, y: cutPos.y + 1, z: cutPos.z };
    let aboveBlock;
    try { aboveBlock = dimension.getBlock(above); } catch { return { logs: [], leaves: [] }; }
    if (!aboveBlock?.isValid || !isLog(aboveBlock.typeId)) return { logs: [], leaves: [] };

    // Fase 1: encontrar todos os logs conectados (BFS pra cima e lados)
    visited.add(posToKey(cutPos.x, cutPos.y, cutPos.z));
    
    // Inicia com o bloco 3x2x3 acima e ao redor do corte
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = 0; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                frontier.push({ x: cutPos.x + dx, y: cutPos.y + dy, z: cutPos.z + dz });
            };
        };
    };

    while (frontier.length > 0) {
        const pos = frontier.shift();
        const key = posToKey(pos.x, pos.y, pos.z);
        if (visited.has(key)) continue;
        visited.add(key);

        let block;
        try { block = dimension.getBlock(pos); } catch { continue; }
        if (!block?.isValid || !isLog(block.typeId)) continue;

        logs.push(pos);

        // Busca vizinhos acima e nos lados (não pra baixo)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = 0; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    const neighbor = { x: pos.x + dx, y: pos.y + dy, z: pos.z + dz };
                    if (!visited.has(posToKey(neighbor.x, neighbor.y, neighbor.z))) {
                        frontier.push(neighbor);
                    };
                };
            };
        };
    };

    // Fase 2: encontrar folhas conectadas aos logs
    const leafFrontier = [...logs];
    const leafVisited = new Set(logs.map(p => posToKey(p.x, p.y, p.z)));

    while (leafFrontier.length > 0) {
        const pos = leafFrontier.shift();

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    const neighbor = { x: pos.x + dx, y: pos.y + dy, z: pos.z + dz };
                    const key = posToKey(neighbor.x, neighbor.y, neighbor.z);
                    if (leafVisited.has(key)) continue;
                    leafVisited.add(key);

                    let block;
                    try { block = dimension.getBlock(neighbor); } catch { continue; }
                    if (!block?.isValid || !isLeaf(block.typeId)) continue;

                    // Limita distância horizontal do tronco original
                    const hDist = Math.max(Math.abs(neighbor.x - cutPos.x), Math.abs(neighbor.z - cutPos.z));
                    if (hDist > 7) continue;

                    leaves.push(neighbor);
                    leafFrontier.push(neighbor);
                };
            };
        };
    };

    return { logs, leaves };
};

function* destroyTree(dimension, tree, sawPos, itemCollector) {
    // Destrói folhas primeiro (de cima pra baixo), depois logs
    const allBlocks = [...tree.leaves.reverse(), ...tree.logs];

    for (const pos of allBlocks) {
        try { dimension.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} air destroy`); } catch {}
        scheduleDropCollection(dimension, pos, itemCollector);
        yield;
    };
};
