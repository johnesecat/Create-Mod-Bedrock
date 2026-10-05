import { BlockPermutation, ItemStack, MolangVariableMap, system } from "@minecraft/server";
import { DIRECTION_OFFSETS, INVERT_FACE, posToKey, resolveBlockFaces } from "../rpm/rpmHelpers";
import { removeItem, replaceableBlocks, rotationToFace } from "../xZ-Utils";
import { initRpmBlock, recalculateNetwork } from "../rpm/rpmCore";
import { rpmConfig } from "../rpm/rpmConfigs";

const MAX_CONVEYOR_LENGTH = 20;
const PREVIEW_DENSITY = 3;
const PREVIEW_TICK_RATE = 3;
const PREVIEW_PARTICLE_CHANCE = 0.60;
const PREVIEW_ANCHOR_RATE = 8;
const BELT_PREVIEW_VALID_COLOR = { red: 0.12, green: 1.0, blue: 0.32, alpha: 1 };
const BELT_PREVIEW_INVALID_COLOR = { red: 0.9, green: 0.12, blue: 0.47, alpha: 1 };

const BELT_DYE_COLORS = new Map([
    ['minecraft:black_dye', 0],
    ['minecraft:blue_dye', 1],
    ['minecraft:brown_dye', 2],
    ['minecraft:cyan_dye', 3],
    ['minecraft:gray_dye', 4],
    ['minecraft:green_dye', 5],
    ['minecraft:light_blue_dye', 6],
    ['minecraft:light_gray_dye', 7],
    ['minecraft:lime_dye', 8],
    ['minecraft:magenta_dye', 9],
    ['minecraft:orange_dye', 10],
    ['minecraft:pink_dye', 11],
    ['minecraft:purple_dye', 12],
    ['minecraft:red_dye', 13],
    ['minecraft:white_dye', 14],
    ['minecraft:yellow_dye', 15]
]);

const pendingConnections = new Map(); // playerId → { x, y, z }
const previewTargets = new Map();

export function isMechanicalBeltDye(itemStack) {
    return BELT_DYE_COLORS.has(itemStack?.typeId);
}

// ==================== INTERAÇÃO ====================

export function mechanicalBeltInteract(player, block, dimension, itemStack) {
    if (itemStack?.typeId !== 'create:mechanical_belt') return;
    if (tryExtendConveyorForward(player, block, dimension)) return;

    const playerId = player.id;

    // Sem seleção pendente → seleciona shaft1
    if (!pendingConnections.has(playerId)) {
        if (block.typeId !== 'create:shaft') return;
        pendingConnections.set(playerId, { x: block.x, y: block.y, z: block.z });
        return;
    }

    const shaft1Pos = pendingConnections.get(playerId);

    // Clicou no próprio shaft1 → cancela
    if (block.x === shaft1Pos.x && block.y === shaft1Pos.y && block.z === shaft1Pos.z || player.isSneaking) {
        pendingConnections.delete(playerId);
        previewTargets.delete(playerId);
        return;
    };

    // Pega o target do preview (já snapped e validado)
    const preview = previewTargets.get(playerId);
    if (!preview?.valid) return;
    
    pendingConnections.delete(playerId);
    previewTargets.delete(playerId);

    let shaft1, shaft2;
    try { shaft1 = dimension.getBlock(shaft1Pos); } catch { return; }
    try { shaft2 = dimension.getBlock(preview.endPos); } catch { return; }

    if (!shaft1?.isValid || shaft1.typeId !== 'create:shaft') return;
    if (!shaft2?.isValid || shaft2.typeId !== 'create:shaft') return;

    player.runCommand('/clear @s create:mechanical_belt 0 1');
    const result = createConveyor(shaft1, shaft2, dimension);
};

export function cancelPendingConnection(playerId) {
    pendingConnections.delete(playerId);
};

// ==================== PREVIEW ====================

export function conveyorPreviewTick(player, dimension, currentTick) {
    const playerId = player.id;
    if (!pendingConnections.has(playerId)) return;
    if (currentTick % PREVIEW_TICK_RATE !== 0) return;

    const shaft1Pos = pendingConnections.get(playerId);

    let shaft1;
    try { shaft1 = dimension.getBlock(shaft1Pos); } catch { return; }
    if (!shaft1?.isValid || shaft1.typeId !== 'create:shaft') {
        pendingConnections.delete(playerId);
        previewTargets.delete(playerId);
        return;
    }

    if (currentTick % PREVIEW_ANCHOR_RATE === 0) {
        spawnBeltPreviewParticle(dimension, {
            x: shaft1Pos.x + 0.5, y: shaft1Pos.y + 0.5, z: shaft1Pos.z + 0.5
        }, BELT_PREVIEW_VALID_COLOR);
    }

    const viewPos = player.getHeadLocation();
    viewPos.y += 0.2; // Ajusta para o centro do bloco
    const viewDir = player.getViewDirection();
    const rayResult = dimension.getBlockFromRay(viewPos, viewDir, { maxDistance: 8, includePassableBlocks: false });
    if (!rayResult?.block) {
        previewTargets.delete(playerId);
        return;
    }

    const axis = faceToAxis(shaft1.permutation.getState('minecraft:block_face'));

    // Determina bloco alvo
    let targetBlock;
    if (rayResult.block.typeId === 'create:shaft') {
        targetBlock = rayResult.block;
    } else {
        try { targetBlock = rayResult.block[rotationToFace[rayResult.face.toLowerCase()]](); } catch {}
    }
    if (!targetBlock) { previewTargets.delete(playerId); return; }

    // Ignora se é o próprio shaft1
    if (targetBlock.x === shaft1Pos.x && targetBlock.y === shaft1Pos.y && targetBlock.z === shaft1Pos.z) {
        previewTargets.delete(playerId);
        return;
    }

    // Sempre usa snap — garante direções válidas independente do que está olhando
    const targetPos = targetBlock.center();
    const snapped = snapToValidDirection(shaft1Pos, targetPos, axis);
    if (!snapped) { previewTargets.delete(playerId); return; }

    const endPos = snapped.endPos;
    const pathClear = isPathClear(dimension, shaft1Pos, endPos, axis);

    let endBlock;
    try { endBlock = dimension.getBlock(endPos); } catch {}
    const hasValidShaft = endBlock?.typeId === 'create:shaft'
        && faceToAxis(endBlock.permutation.getState('minecraft:block_face')) === axis;

    const valid = pathClear && hasValidShaft;

    // Salva pra usar no interact
    previewTargets.set(playerId, { endPos, valid });

    const particleColor = valid ? BELT_PREVIEW_VALID_COLOR : BELT_PREVIEW_INVALID_COLOR;

    const dx = endPos.x - shaft1Pos.x;
    const dy = endPos.y - shaft1Pos.y;
    const dz = endPos.z - shaft1Pos.z;
    const length = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
    if (length === 0) return;

    const stepX = dx / length;
    const stepY = dy / length;
    const stepZ = dz / length;

    for (let i = 0; i <= length * PREVIEW_DENSITY; i++) {
        if (Math.random() > PREVIEW_PARTICLE_CHANCE) continue;
        const t = i / PREVIEW_DENSITY;
        spawnBeltPreviewParticle(dimension, {
            x: shaft1Pos.x + 0.5 + stepX * t,
            y: shaft1Pos.y + 0.5 + stepY * t,
            z: shaft1Pos.z + 0.5 + stepZ * t
        }, particleColor);
    }
}

// ==================== OBSTRUÇÃO ====================

/**
 * Checa se o caminho entre start e end está livre.
 * Permite: ar e shafts no mesmo eixo.
 */
function spawnBeltPreviewParticle(dimension, location, color) {
    const particleData = new MolangVariableMap();
    particleData.setFloat('speed', 0);
    particleData.setFloat('direction_x', 0);
    particleData.setFloat('direction_y', 0);
    particleData.setFloat('direction_z', 0);
    particleData.setFloat('is_push', 0);
    particleData.setFloat('air_distance', 1);
    particleData.setColorRGBA('color', color);
    particleData.setFloat('color_r', color.red);
    particleData.setFloat('color_g', color.green);
    particleData.setFloat('color_b', color.blue);
    particleData.setFloat('color_a', color.alpha);

    try { dimension.spawnParticle('create:belt_preview', location, particleData); } catch {}
}

function isPathClear(dimension, startPos, endPos, axis) {
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dz = endPos.z - startPos.z;
    const length = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const stepZ = Math.sign(dz);

    for (let i = 1; i < length; i++) {
        const pos = {
            x: startPos.x + stepX * i,
            y: startPos.y + stepY * i,
            z: startPos.z + stepZ * i
        };

        let block;
        try { block = dimension.getBlock(pos); } catch { return false; }
        if (!block?.isValid) return false;
        if (block.isAir || block.isLiquid || replaceableBlocks.has(block.typeId)) continue;

        if (block.typeId === 'create:shaft') {
            if (faceToAxis(block.permutation.getState('minecraft:block_face')) === axis) continue;
        }

        return false;
    }

    return true;
}

function snapToValidDirection(shaft1Pos, targetPos, axis) {
    const dx = Math.round(targetPos.x - 0.5) - shaft1Pos.x;
    const dy = Math.round(targetPos.y - 0.5) - shaft1Pos.y;
    const dz = Math.round(targetPos.z - 0.5) - shaft1Pos.z;

    const candidates = [];

    if (axis === 'Z') {
        if (dx !== 0) candidates.push({ x: dx, y: 0, z: 0 });
        if (dy !== 0) candidates.push({ x: 0, y: dy, z: 0 });
        if (dx !== 0 && dy !== 0) {
            const d = Math.min(Math.abs(dx), Math.abs(dy));
            candidates.push({ x: Math.sign(dx) * d, y: Math.sign(dy) * d, z: 0 });
        }
    } else if (axis === 'X') {
        if (dz !== 0) candidates.push({ x: 0, y: 0, z: dz });
        if (dy !== 0) candidates.push({ x: 0, y: dy, z: 0 });
        if (dz !== 0 && dy !== 0) {
            const d = Math.min(Math.abs(dz), Math.abs(dy));
            candidates.push({ x: 0, y: Math.sign(dy) * d, z: Math.sign(dz) * d });
        }
    } else {
        if (dx !== 0) candidates.push({ x: dx, y: 0, z: 0 });
        if (dz !== 0) candidates.push({ x: 0, y: 0, z: dz });
    }

    if (candidates.length === 0) return null;

    let best = null;
    let bestDist = Infinity;
    for (const c of candidates) {
        const dist = (dx - c.x) ** 2 + (dy - c.y) ** 2 + (dz - c.z) ** 2;
        if (dist < bestDist) { bestDist = dist; best = c; }
    }

    let length = Math.max(Math.abs(best.x), Math.abs(best.y), Math.abs(best.z));
    if (length > MAX_CONVEYOR_LENGTH - 1) {
        const scale = (MAX_CONVEYOR_LENGTH - 1) / length;
        best.x = Math.round(best.x * scale);
        best.y = Math.round(best.y * scale);
        best.z = Math.round(best.z * scale);
    }

    if (best.x === 0 && best.y === 0 && best.z === 0) return null;

    return {
        endPos: {
            x: shaft1Pos.x + best.x,
            y: shaft1Pos.y + best.y,
            z: shaft1Pos.z + best.z
        }
    };
}

// ==================== VALIDAÇÃO ====================

function tryExtendConveyorForward(player, block, dimension) {
    if (player.isSneaking) return false;
    if (block.typeId !== 'create:mechanical_belt') return false;

    const part = block.permutation.getState('create:part');
    const hasPulley = block.permutation.getState('create:has_pulley') ?? false;
    if (!hasPulley || (part !== 'start' && part !== 'end')) return false;

    const slope = block.permutation.getState('create:slope');
    const blockFace = block.permutation.getState('minecraft:block_face');
    const diagonalFlip = block.permutation.getState('create:diagonal_flip') ?? false;
    const axis = faceToAxis(blockFace);
    const step = getStepFromSlope(slope, axis, diagonalFlip);
    if (!step) return false;

    const forward = getBeltEndpointForwardDirection(dimension, block, step);
    if (!forward) return false;

    const newEndPos = {
        x: block.x + forward.x,
        y: block.y + forward.y,
        z: block.z + forward.z
    };

    let newEndBlock;
    try { newEndBlock = dimension.getBlock(newEndPos); } catch { return false; }
    if (!canUseBlockForBeltExtension(newEndBlock, axis)) return false;

    const path = collectExtendedConveyorPath(dimension, block, newEndPos, forward, part, slope, axis, diagonalFlip);
    if (!path || path.length > MAX_CONVEYOR_LENGTH) return false;

    if (player.getGameMode() !== 'Creative') player.runCommand('/clear @s create:mechanical_belt 0 1');
    buildConveyor(path, dimension);
    try { dimension.playSound('place.cloth', newEndBlock.center(), { volume: 0.9, pitch: 1.15 }); } catch {}
    system.runJob(recalculateNetwork(block, dimension, { eventType: 'update' }));
    return true;
}

function getBeltEndpointForwardDirection(dimension, block, step) {
    const backward = { x: -step.x, y: -step.y, z: -step.z };
    const behind = getBlockAtOffset(dimension, block, backward);
    if (behind?.typeId === 'create:mechanical_belt') return step;

    const ahead = getBlockAtOffset(dimension, block, step);
    if (ahead?.typeId === 'create:mechanical_belt') return backward;

    return null;
}

function getBlockAtOffset(dimension, block, offset) {
    try {
        return dimension.getBlock({ x: block.x + offset.x, y: block.y + offset.y, z: block.z + offset.z });
    } catch {
        return undefined;
    }
}

function canUseBlockForBeltExtension(block, axis) {
    if (!block?.isValid) return false;
    if (block.isAir || block.isLiquid || replaceableBlocks.has(block.typeId)) return true;
    return block.typeId === 'create:shaft'
        && faceToAxis(block.permutation.getState('minecraft:block_face')) === axis;
}

function collectExtendedConveyorPath(dimension, clickedEndBlock, newEndPos, forward, clickedPart, slope, axis, diagonalFlip) {
    const reverse = { x: -forward.x, y: -forward.y, z: -forward.z };
    const clickedPos = { x: clickedEndBlock.x, y: clickedEndBlock.y, z: clickedEndBlock.z };
    const positions = [clickedPos];
    let foundOppositeEnd = false;

    for (let i = 1; i <= MAX_CONVEYOR_LENGTH; i++) {
        const pos = {
            x: clickedEndBlock.x + reverse.x * i,
            y: clickedEndBlock.y + reverse.y * i,
            z: clickedEndBlock.z + reverse.z * i
        };

        let block;
        try { block = dimension.getBlock(pos); } catch { break; }
        if (!block?.isValid || block.typeId !== 'create:mechanical_belt') break;

        positions.push(pos);
        const part = block.permutation.getState('create:part');
        if (part === 'start' || part === 'end') {
            foundOppositeEnd = true;
            break;
        }
    }

    if (!foundOppositeEnd) return null;

    const ordered = clickedPart === 'end'
        ? [...positions.reverse(), newEndPos]
        : [newEndPos, ...positions];

    return ordered.map((pos, index) => ({
        pos,
        part: index === 0 ? 'start' : index === ordered.length - 1 ? 'end' : 'middle',
        slope,
        axis,
        diagonalFlip
    }));
}

export function validateConveyorPlacement(shaft1, shaft2) {
    if (shaft1.typeId !== 'create:shaft' || shaft2.typeId !== 'create:shaft') {
        return { valid: false, reason: 'both_must_be_shafts' };
    }

    const axis1 = faceToAxis(shaft1.permutation.getState('minecraft:block_face'));
    const axis2 = faceToAxis(shaft2.permutation.getState('minecraft:block_face'));
    if (axis1 !== axis2) return { valid: false, reason: 'axis_mismatch' };

    const axis = axis1;
    const dx = shaft2.x - shaft1.x;
    const dy = shaft2.y - shaft1.y;
    const dz = shaft2.z - shaft1.z;

    let slope;

    if (axis === 'Y') {
        if (dy !== 0) return { valid: false, reason: 'not_aligned_on_axis' };
        if (dx !== 0 && dz !== 0) return { valid: false, reason: 'no_diagonal_on_y_shaft' };
        if (dx === 0 && dz === 0) return { valid: false, reason: 'same_position' };
        slope = dx !== 0 ? 'horizontal' : 'vertical';
    } else {
        if (axis === 'Z' && dz !== 0) return { valid: false, reason: 'not_aligned_on_axis' };
        if (axis === 'X' && dx !== 0) return { valid: false, reason: 'not_aligned_on_axis' };

        const perpDelta = axis === 'Z' ? dx : dz;
        if (perpDelta === 0 && dy === 0) return { valid: false, reason: 'same_position' };

        if (dy === 0) slope = 'horizontal';
        else if (perpDelta === 0) slope = 'vertical';
        else if (Math.abs(dy) === Math.abs(perpDelta)) slope = 'diagonal';
        else return { valid: false, reason: 'invalid_angle' };
    }

    const length = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) + 1;
    if (length > MAX_CONVEYOR_LENGTH) return { valid: false, reason: 'too_long' };
    if (length < 2) return { valid: false, reason: 'too_short' };

    if (!isPathClear(shaft1.dimension, shaft1, shaft2, axis)) {
        return { valid: false, reason: 'path_obstructed' };
    }

    return { valid: true, axis, slope, length };
}

// ==================== CAMINHO ====================

export function calculatePath(shaft1, shaft2, validation) {
    const { axis, slope } = validation;
    const [start, end] = orderStartEnd(shaft1, shaft2, axis, slope);

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const length = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) + 1;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const stepZ = Math.sign(dz);

    let diagonalFlip = false;
    if (slope === 'diagonal') {
        if (axis === 'Z') diagonalFlip = dx < 0;
        else if (axis === 'X') diagonalFlip = dz > 0;
    }

    const path = [];
    for (let i = 0; i < length; i++) {
        path.push({
            pos: { x: start.x + stepX * i, y: start.y + stepY * i, z: start.z + stepZ * i },
            part: i === 0 ? 'start' : i === length - 1 ? 'end' : 'middle',
            slope, axis, diagonalFlip
        });
    }
    return path;
}

// ==================== CONSTRUÇÃO ====================

export function buildConveyor(path, dimension) {
    const shaftsFound = [];
    for (let i = 1; i < path.length - 1; i++) {
        let block;
        try { block = dimension.getBlock(path[i].pos); } catch { continue; }
        if (block?.typeId === 'create:shaft') shaftsFound.push(i);
    }

    const blockFaceMap = { 'Z': 'north', 'X': 'east', 'Y': 'up' };

    for (let i = 0; i < path.length; i++) {
        const { pos, part, slope, axis, diagonalFlip } = path[i];
        let block;
        try { block = dimension.getBlock(pos); } catch { continue; }
        if (!block) continue;

        const hasPulley = (part === 'start' || part === 'end') || shaftsFound.includes(i);

        const oldEntities = dimension.getEntities({ location: block.center(), maxDistance: 0.25 })
            .filter(e => e.typeId.startsWith('create:'));
        for (const oldEntity of oldEntities) {
            if (block.typeId === 'create:mechanical_belt' && oldEntity.typeId === 'create:mechanical_belt_entity') continue;
            try { oldEntity?.remove(); } catch {}
        }

        if (!block.isAir && !block.isLiquid && block.typeId !== 'create:shaft' && replaceableBlocks.has(block.typeId)) {
            try { dimension.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} air destroy`); } catch {}
        }

        try {
            dimension.playSound('dig.cloth', block.center(), { volume: 1, pitch: 1.2 });
            block.setPermutation(BlockPermutation.resolve('create:mechanical_belt', {
                'create:slope': slope,
                'create:part': part,
                'create:diagonal_flip': diagonalFlip ?? false,
                'create:has_pulley': hasPulley,
                'minecraft:block_face': blockFaceMap[axis],
            }));
        } catch { continue; }
    }

    system.runTimeout(() => {
        for (let i = 0; i < path.length; i++) {
            const { pos, part, slope, axis, diagonalFlip } = path[i];
            const hasPulley = (part === 'start' || part === 'end') || shaftsFound.includes(i);

            const entities = dimension.getEntities({
                location: { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 },
                type: 'create:mechanical_belt_entity',
                maxDistance: 0.5
            });

            let entity = entities[0];
            for (let j = 1; j < entities.length; j++) {
                try { entities[j].remove(); } catch {}
            }

            if (!entity) {
                try {
                    entity = dimension.spawnEntity('create:mechanical_belt_entity', { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 });
                } catch {}
            }

            syncBeltEntity(entity, { part, slope, axis, diagonalFlip, hasPulley, blockFaceMap });
        }
    }, 1);

    return path;
}

function syncBeltEntity(entity, data) {
    if (!entity?.isValid) return;
    try { entity.setProperty('create:diagonal_flip', data.diagonalFlip ?? false); } catch {}
    try { entity.setProperty('create:has_pulley', data.hasPulley); } catch {}
    try { entity.setProperty('create:slope', data.slope); } catch {}
    try { entity.setProperty('create:part', data.part); } catch {}
    try { entity.setProperty('create:cardinal_rotation', data.blockFaceMap[data.axis]); } catch {}
}

// ==================== QUEBRA DA ESTEIRA ====================

/**
 * Quebrar qualquer bloco da esteira destrói toda ela.
 * Blocos com pulley voltam a ser shaft (exceto o bloco quebrado, que dropa shaft).
 */
export function onBreakConveyor(block, dimension, brokenBlockPermutation) {
    const brokenPos = { x: block.x, y: block.y, z: block.z };

    // Converte conveyor_items de volta em minecraft:item
    const conveyorItems = dimension.getEntities({
        location: { x: brokenPos.x + 0.5, y: brokenPos.y + 0.5, z: brokenPos.z + 0.5 },
        type: 'create:conveyor_item',
        maxDistance: 1.5
    });

    for (const convItem of conveyorItems) {
        if (!convItem?.isValid) continue;
        const container = convItem.getComponent('minecraft:inventory')?.container;
        const itemStack = container?.getItem(0);
        if (itemStack) {
            try { dimension.spawnItem(itemStack, convItem.location); } catch {}
        }
        try { convItem.remove(); } catch {}
    };

    const slope = brokenBlockPermutation.getState('create:slope');
    const blockFace = brokenBlockPermutation.getState('minecraft:block_face');
    const diagonalFlip = brokenBlockPermutation.getState('create:diagonal_flip') ?? false;
    const hasPulley = brokenBlockPermutation.getState('create:has_pulley') ?? false;
    const brokenPart = brokenBlockPermutation.getState('create:part');
    const axis = faceToAxis(blockFace);

    const step = getOrderedStepFromSlope(slope, axis, diagonalFlip);
    if (!step) return;

    // Coleta todos os blocos da esteira (busca nas duas direções)
    const beltBlocks = [{ pos: brokenPos, hasPulley, wasBroken: true }];
    const match = { slope, blockFace, diagonalFlip };
    if (brokenPart !== 'end') searchBeltDirection(dimension, brokenPos, step, beltBlocks, match);
    if (brokenPart !== 'start') searchBeltDirection(dimension, brokenPos, { x: -step.x, y: -step.y, z: -step.z }, beltBlocks, match);

    const blockFaceMap = { 'Z': 'north', 'X': 'east', 'Y': 'up' };
    const shaftFace = blockFaceMap[axis];

    if (hasPulley) dimension.spawnItem(new ItemStack('create:shaft', 1), brokenPos);

    for (const entry of beltBlocks) {
        removeBeltEntityAt(dimension, entry.pos);

        let targetBlock;
        try { targetBlock = dimension.getBlock(entry.pos); } catch { continue; }
        if (!targetBlock?.isValid || targetBlock.typeId !== 'create:mechanical_belt') continue;

        const blockHasPulley = targetBlock.permutation.getState('create:has_pulley') ?? false;

        if (blockHasPulley) {
            try { targetBlock.setPermutation(BlockPermutation.resolve('create:shaft', { 'minecraft:block_face': shaftFace })); } catch {}
        } else {
            try { targetBlock.setType('minecraft:air'); } catch {}
        };

        dimension.playSound('dig.cloth', brokenPos, { volume: 1, pitch: 1.2 });
    };

    system.runTimeout(() => {
        for (const entry of beltBlocks) removeBeltEntityAt(dimension, entry.pos);
    }, 1);
};

export function dyeMechanicalBelt(player, block, dimension, itemStack) {
    const colorIndex = BELT_DYE_COLORS.get(itemStack?.typeId);
    if (colorIndex === undefined || block?.typeId !== 'create:mechanical_belt') return false;

    const slope = block.permutation.getState('create:slope');
    const blockFace = block.permutation.getState('minecraft:block_face');
    const diagonalFlip = block.permutation.getState('create:diagonal_flip') ?? false;
    const selectedPart = block.permutation.getState('create:part');
    const axis = faceToAxis(blockFace);
    const step = getOrderedStepFromSlope(slope, axis, diagonalFlip);
    if (!step) return false;

    // Segue somente o eixo desta esteira. A busca antiga passava por todos os
    // vizinhos e acabava pintando linhas paralelas apenas por estarem encostadas.
    const beltBlocks = [{
        pos: { x: block.x, y: block.y, z: block.z },
        hasPulley: block.permutation.getState('create:has_pulley') ?? false
    }];
    const match = { slope, blockFace, diagonalFlip };
    const selectedPos = { x: block.x, y: block.y, z: block.z };
    if (selectedPart !== 'end') {
        searchBeltDirection(dimension, selectedPos, step, beltBlocks, match);
    }
    if (selectedPart !== 'start') {
        searchBeltDirection(
            dimension,
            selectedPos,
            { x: -step.x, y: -step.y, z: -step.z },
            beltBlocks,
            match
        );
    }

    let changed = false;

    for (const entry of beltBlocks) {
        const pos = entry.pos;
        let beltBlock;
        try { beltBlock = dimension.getBlock(pos); } catch { continue; }
        if (!beltBlock?.isValid || beltBlock.typeId !== 'create:mechanical_belt') continue;

        const entities = dimension.getEntities({
            location: beltBlock.center(),
            type: 'create:mechanical_belt_entity',
            maxDistance: 0.5
        });
        for (const entity of entities) {
            try {
                if (entity.getProperty('create:belt_color_index') !== colorIndex) {
                    entity.setProperty('create:belt_color_index', colorIndex);
                    changed = true;
                }
            } catch {}
        }
    }

    if (!changed) return true;
    try { dimension.playSound('dig.cloth', block.center(), { volume: 0.8, pitch: 1.25 }); } catch {}

    if (player.getGameMode() !== 'Creative') {
        const equippable = player.getComponent('minecraft:equippable');
        const held = equippable?.getEquipment('Mainhand');
        if (held?.typeId === itemStack.typeId) {
            if (held.amount > 1) {
                held.amount -= 1;
                try { equippable.setEquipment('Mainhand', held); } catch {}
            } else {
                try { equippable.setEquipment('Mainhand', undefined); } catch {}
            }
        }
    }
    return true;
}

/**
 * Busca blocos da esteira numa direção, para ao encontrar start/end.
 */
function removeBeltEntityAt(dimension, pos) {
    const entities = dimension.getEntities({
        type: 'create:mechanical_belt_entity',
        location: { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 },
        maxDistance: 0.35
    }) ?? [];

    for (const entity of entities) {
        try { entity.remove(); } catch {}
    }
}

function searchBeltDirection(dimension, startPos, step, results, match) {
    for (let i = 1; i <= MAX_CONVEYOR_LENGTH; i++) {
        const pos = {
            x: startPos.x + step.x * i,
            y: startPos.y + step.y * i,
            z: startPos.z + step.z * i
        };

        let block;
        try { block = dimension.getBlock(pos); } catch { break; }
        if (!block?.isValid || block.typeId !== 'create:mechanical_belt') break;
        if (!isSameConveyorLine(block, match)) break;

        const hasPulley = block.permutation.getState('create:has_pulley') ?? false;
        const part = block.permutation.getState('create:part');
        results.push({ pos, hasPulley, wasBroken: false });

        if (part === 'start' || part === 'end') break;
    }
}

function isSameConveyorLine(block, match) {
    try {
        return block.permutation.getState('create:slope') === match.slope
            && block.permutation.getState('minecraft:block_face') === match.blockFace
            && (block.permutation.getState('create:diagonal_flip') ?? false) === match.diagonalFlip;
    } catch {
        return false;
    }
}

function getStepFromSlope(slope, axis, diagonalFlip) {
    if (slope === 'horizontal') {
        if (axis === 'Z') return { x: 1, y: 0, z: 0 };
        if (axis === 'X') return { x: 0, y: 0, z: 1 };
        if (axis === 'Y') return { x: 1, y: 0, z: 0 };
    }
    if (slope === 'vertical') {
        if (axis === 'Z' || axis === 'X') return { x: 0, y: 1, z: 0 };
        if (axis === 'Y') return { x: 0, y: 0, z: 1 };
    }
    if (slope === 'diagonal') {
        if (axis === 'Z') return { x: diagonalFlip ? -1 : 1, y: 1, z: 0 };
        if (axis === 'X') return { x: 0, y: 1, z: diagonalFlip ? 1 : -1 };
    }
    return null;
}

function getOrderedStepFromSlope(slope, axis, diagonalFlip) {
    const step = getStepFromSlope(slope, axis, diagonalFlip);
    if (!step) return null;

    if (slope === 'horizontal' && (axis === 'Z' || axis === 'Y')) {
        return { x: -step.x, y: -step.y, z: -step.z };
    }

    return step;
}

// ==================== PULLEY: ADICIONAR / REMOVER ====================

/**
 * Adiciona pulley clicando com shaft num bloco middle.
 * Consome 1 shaft do inventário.
 */
export function addPulley(data) {
    const { block, blockFace, itemStack, player, isFirstEvent } = data;
    
    if (!isFirstEvent || player.isSneaking) return;
    if (block.typeId !== 'create:mechanical_belt') return false;
    if (block.permutation.getState('create:part') !== 'middle') return false;
    if (block.permutation.getState('create:has_pulley')) return false;
    
    data.cancel = true;
    system.run(() => {
        block.setPermutation(block.permutation.withState('create:has_pulley', true));
        const entity = player.dimension.getEntities({ location: block.center(), type: 'create:mechanical_belt_entity', maxDistance: 0.5 })[0];
        if (entity) entity.setProperty('create:has_pulley', true);

        // Consome 1 shaft
        if (player.getGameMode() !== 'Creative') player.runCommand('/clear @s create:shaft 0 1');
        player.dimension.playSound('place.chain', block.center(), { volume: 0.8, pitch: 1.3 });
        system.runJob(recalculateNetwork(block, player.dimension, { eventType: 'update' }));
        return true;
    });
}

/**
 * Remove pulley interagindo com wrench num bloco middle com pulley.
 * Dropa 1 shaft.
 */
export function removePulley(data) {
    const { player, block, isFirstEvent } = data;

    if (!isFirstEvent || player.isSneaking) return;
    if (block.typeId !== 'create:mechanical_belt') return false;
    if (block.permutation.getState('create:part') !== 'middle') return false;
    if (!block.permutation.getState('create:has_pulley')) return false;

    system.run(() => {
        // Pega as faces do shaft ANTES de remover o pulley
        const blockFace = block.permutation.getState('minecraft:block_face');
        const axis = (blockFace === 'north' || blockFace === 'south') ? 'Z' : (blockFace === 'east' || blockFace === 'west') ? 'X' : 'Y';
        const shaftFaces = axis === 'Z' ? ['north', 'south'] : axis === 'X' ? ['east', 'west'] : ['above', 'below'];

        // Remove o pulley
        block.setPermutation(block.permutation.withState('create:has_pulley', false));

        const entity = player.dimension.getEntities({ location: block.center(), type: 'create:mechanical_belt_entity', maxDistance: 0.5 })[0];
        if (entity) entity.setProperty('create:has_pulley', false);

        try { player.dimension.spawnItem(new ItemStack('create:shaft', 1), block.center()); } catch {}
        player.dimension.playSound('dig.chain', block.center(), { volume: 0.8, pitch: 1.4 });

        // Recalcula vizinhos nas direções do shaft (que perderam conexão)
        for (const face of shaftFaces) {
            const offset = DIRECTION_OFFSETS[face];
            if (!offset) continue;
            const neighbor = block.offset(offset);
            if (neighbor && rpmConfig.has(neighbor.typeId)) {
                system.runJob(recalculateNetwork(neighbor, player.dimension, { eventType: 'break' }));
            }
        }
    });
};

// ==================== INTEGRAÇÃO ====================

export function createConveyor(shaft1, shaft2, dimension) {
    const validation = validateConveyorPlacement(shaft1, shaft2);
    if (!validation.valid) return { success: false, reason: validation.reason };

    const path = calculatePath(shaft1, shaft2, validation);
    buildConveyor(path, dimension);
    return { success: true, path };
}

// ==================== HELPERS ====================

function faceToAxis(face) {
    if (face === 'north' || face === 'south') return 'Z';
    if (face === 'east' || face === 'west') return 'X';
    return 'Y';
}

function orderStartEnd(shaft1, shaft2, axis, slope) {
    if (axis === 'Y') {
        if (slope === 'horizontal') return shaft1.x > shaft2.x ? [shaft1, shaft2] : [shaft2, shaft1];
        return shaft1.z < shaft2.z ? [shaft1, shaft2] : [shaft2, shaft1];
    }
    if (shaft1.y !== shaft2.y) return shaft1.y < shaft2.y ? [shaft1, shaft2] : [shaft2, shaft1];
    if (axis === 'Z') return shaft1.x > shaft2.x ? [shaft1, shaft2] : [shaft2, shaft1];
    return shaft1.z < shaft2.z ? [shaft1, shaft2] : [shaft2, shaft1];
}
