import { system, ItemStack, BlockTypes } from "@minecraft/server";

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {import('@minecraft/server').Entity} Entity */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */
/** @typedef {{rpm: number, speed: number, delta: Vector3, axis: 'X' | 'Z', moveAxis: 'x' | 'y' | 'z', perpAxis: 'x' | 'z', slope: string, part: string, diagonalFlip: boolean, block: Block, moveSign: number}} BeltInfo */
/** @typedef {{pos: Vector3, hasPulley: boolean, wasBroken: boolean}} BeltItemEntry */

// USE A TAG "create:conveyor_stop" PARA PARAR UM ITEM NA ESTEIRA 

const ITEM_SPACING = 0.45;
const CENTER_FORCE = 0.025;
const BELT_TOP = 13 / 16;         // 0.8125 - superfície plana da esteira
const DIAG_LOW = 7 / 16;          // 0.5 - base da diagonal (altura mínima)
const DIAG_HIGH = 1 + 7 / 16;     // 1.5 - topo da diagonal (altura máxima)
const START_SLOPE_BEGIN = 6 / 16;  // 0.375 - onde começa a inclinação no start
const END_SLOPE_END = 6 / 16;     // 0.3125 - onde termina a inclinação no end
const PERP_MARGIN_MOVE = 0.15;    // Margem pra mover (mais ampla)
const PERP_MARGIN_INTAKE = 0.2;  // Margem pra converter (mais restrita)
const ENTITY_QUERY_VOLUME = { x: 0, y: 0.75, z: 0 };
const BELT_ITEM_TICK_INTERVAL = 1;
const BELT_ENTITY_CACHE_TICKS = 10;
const DROPPED_ITEM_SCAN_INTERVAL = 4;
const PLAYER_PUSH_INTERVAL = 1;
const MOB_PUSH_INTERVAL = 1;
const BRASS_FUNNEL_STOP_EPSILON = 0.02;
const BELT_EJECT_MIN_STRENGTH = 0.1;
const BELT_EJECT_MAX_STRENGTH = 0.72;
const BELT_EJECT_RPM_FOR_MAX = 256;
const BELT_EJECT_EDGE_OFFSET = 0.18;

const beltInfoCache = new Map();
const playerPushTick = new Map();

/** @param {Block} block @param {Dimension} dimension */
export function mechanicalBeltTick(block, dimension) {
    if (!shouldProcessBelt(block)) return;
    const info = getBeltInfo(block, dimension);
    if (!info) return;

    const center = block.center();
    const shouldScanDroppedItems = shouldRunBeltInterval(block, DROPPED_ITEM_SCAN_INTERVAL);
    const shouldPushPlayers = shouldRunBeltInterval(block, PLAYER_PUSH_INTERVAL);
    const shouldPushOtherEntities = shouldRunBeltInterval(block, MOB_PUSH_INTERVAL);

    // Filtra por margem perpendicular (compartilhado entre intake e move)
    const perpMinMove = block.location[info.perpAxis] + PERP_MARGIN_MOVE;
    const perpMaxMove = block.location[info.perpAxis] + 1 - PERP_MARGIN_MOVE;
    const perpMinIntake = block.location[info.perpAxis] + PERP_MARGIN_INTAKE;
    const perpMaxIntake = block.location[info.perpAxis] + 1 - PERP_MARGIN_INTAKE;

    /** @param {Entity} entity @param {'intake' | 'move'} margin */
    const inMargin = (entity, margin) => {
        const aabb = entity.getAABB();
        if (!aabb) return true;

        const halfExt = aabb.extent[info.perpAxis];
        const aabbMin = aabb.center[info.perpAxis] - halfExt;
        const aabbMax = aabb.center[info.perpAxis] + halfExt;
        const min = margin === 'intake' ? perpMinIntake : perpMinMove;
        const max = margin === 'intake' ? perpMaxIntake : perpMaxMove;

        return aabbMax > min && aabbMin < max;
    };

    const droppedItems = [];
    const conveyorItems = [];
    const otherEntities = [];

    if (shouldScanDroppedItems) {
        const droppedCandidates = dimension.getEntities({ type: 'minecraft:item', volume: ENTITY_QUERY_VOLUME, location: block.location, excludeFamilies: ['immovable'] });
        for (const ent of droppedCandidates) {
            if (!ent?.isValid) continue;
            if (inMargin(ent, 'intake')) droppedItems.push(ent);
            else if (shouldPushOtherEntities) otherEntities.push(ent);
        };
    }

    const conveyorCandidates = dimension.getEntities({ type: 'create:conveyor_item', volume: ENTITY_QUERY_VOLUME, location: block.location, excludeFamilies: ['immovable'] });
    for (const ent of conveyorCandidates) {
        if (!ent?.isValid) continue;
        try { if (ent.hasTag('create_depot_visual')) continue; } catch {}
        if (inMargin(ent, 'move')) conveyorItems.push(ent);
    }

    if (shouldPushPlayers) {
        const playerCandidates = dimension.getEntities({ type: 'minecraft:player', location: center, maxDistance: 1.15 });
        for (const ent of playerCandidates) {
            if (!ent?.isValid) continue;
            if (inMargin(ent, 'move')) otherEntities.push(ent);
        }
    }

    if (shouldPushOtherEntities) {
        const allEntities = dimension.getEntities({ location: center, maxDistance: 1.15, excludeFamilies: ['immovable'] });
        for (const ent of allEntities) {
            if (!ent?.isValid) continue;
            if (ent.typeId === 'minecraft:player') continue;
            if (ent.typeId === 'minecraft:item' || ent.typeId === 'create:conveyor_item') continue;
            if (ent.typeId === `${block.typeId}_entity`) continue;
            if (inMargin(ent, 'move')) otherEntities.push(ent);
        }
    }

    if (info.slope !== 'vertical') intakeDroppedItems(block, info, dimension, droppedItems);
    moveConveyorItems(block, info, dimension, conveyorItems);
    if (info.slope !== 'vertical') pushEntities(block, info, dimension, otherEntities);
};

/** @param {Block} block */
function shouldProcessBelt(block) {
    return true;
}

/** @param {Block} block @param {number} interval */
function shouldRunBeltInterval(block, interval) {
    if (interval <= BELT_ITEM_TICK_INTERVAL) return true;
    const loc = block.location;
    const stagger = Math.abs((loc.x * 31 + loc.y * 17 + loc.z * 13) | 0) % interval;
    return ((system.currentTick + stagger) % interval) < BELT_ITEM_TICK_INTERVAL;
}

/** @param {Block} block @param {Dimension} dimension */
function beltCacheKey(block, dimension) {
    return `${dimension.id}:${block.x},${block.y},${block.z}`;
}

/** @param {Block} block @param {Dimension} dimension @returns {BeltInfo | null} */
function getBeltInfo(block, dimension) {
    const key = beltCacheKey(block, dimension);
    const cached = beltInfoCache.get(key);
    if (cached && system.currentTick - cached.tick <= BELT_ENTITY_CACHE_TICKS) return cached.info;

    const entity = dimension.getEntities({ location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity` })[0];

    const rpmValue = entity?.getProperty('create:rpm') ?? 0;
    const rpm = typeof rpmValue === 'number' ? rpmValue : 0;
    if (Math.abs(rpm) === 0) {
        beltInfoCache.set(key, { tick: system.currentTick, info: null });
        return null;
    }

    const slope = block.permutation.getAllStates()['create:slope'];

    const face = block.permutation.getState('minecraft:block_face');
    if (face === 'up' || face === 'down') return null;

    /** @type {'X' | 'Z'} */
    const axis = (face === 'north' || face === 'south') ? 'Z' : 'X';
    const states = block.permutation.getAllStates();
    const part = states['create:part'];
    const diagonalFlip = states['create:diagonal_flip'] === true;

    // Create: a velocidade linear da belt é RPM / 480 blocos por tick.
    // Multiplicamos pelo intervalo real de atualização para o item visual
    // percorrer exatamente a mesma distância independentemente do tick rate.
    if (typeof slope !== 'string' || (part !== 'start' && part !== 'middle' && part !== 'end')) return null;
    const speed = (rpm / 480) * BELT_ITEM_TICK_INTERVAL;
    const delta = { x: 0, y: 0, z: 0 };

    if (slope === 'horizontal') {
        if (axis === 'Z') delta.x = speed;
        else delta.z = -speed;
    } else if (slope === 'vertical') {
        delta.y = speed;
    } else if (slope === 'diagonal') {
        const component = Math.abs(speed) / Math.SQRT2;
        const sign = Math.sign(speed);
        if (axis === 'Z') {
            delta.x = sign * component * (diagonalFlip ? -1 : 1);
        } else {
            delta.z = -sign * component * (diagonalFlip ? 1 : -1);
        }
        delta.y = sign * component;
    }

    /** @type {'x' | 'y' | 'z'} */
    const moveAxis = slope === 'vertical' ? 'y' : axis === 'Z' ? 'x' : 'z';
    /** @type {'x' | 'z'} */
    const perpAxis = axis === 'Z' ? 'z' : 'x';

    const moveSign = slope === 'vertical' ? Math.sign(speed) : axis === 'X' ? -Math.sign(speed) : Math.sign(speed);

    const info = { rpm, speed, delta, axis, moveAxis, perpAxis, slope, part, diagonalFlip, block, moveSign };
    beltInfoCache.set(key, { tick: system.currentTick, info });
    return info;
};

const EJECT_MARGIN = 0.2; // Margem nas pontas start/end onde não converte

/** @param {Block} block @param {BeltInfo} info @param {Dimension} dimension @param {Entity[]} droppedItems */
function intakeDroppedItems(block, info, dimension, droppedItems) {
    const center = block.center();
    const sign = info.moveSign;

    for (const itemEntity of droppedItems) {
        if (!itemEntity?.isValid) continue;
        const pos = itemEntity.location;

        const localSurfaceY = getSurfaceY(block, info, pos.x, pos.z);
        const dy = pos.y - localSurfaceY;
        if (dy < -0.2 || dy > 0.2) continue;

        // Margem de exclusão: não converte perto da saída
        if (info.part === 'start' || info.part === 'end') {
            const locMove = pos[info.moveAxis];
            const moveMin = block.location[info.moveAxis];

            // Identifica a borda de saída baseado na direção do RPM
            const exitAtMin = sign < 0; // RPM negativo → sai pelo lado baixo
            const exitAtMax = sign > 0; // RPM positivo → sai pelo lado alto

            if (sign < 0 && locMove < moveMin + EJECT_MARGIN) {
                // Na borda de saída → empurra pra fora
                pushItemAway(itemEntity, info, -1);
                continue;
            }
            if (sign > 0 && locMove > moveMin + 1 - EJECT_MARGIN) {
                pushItemAway(itemEntity, info, 1);
                continue;
            }
        }

        const itemStack = itemEntity.getComponent('minecraft:item')?.itemStack;
        if (!itemStack) continue;

        const spawnPos = { x: pos.x, y: localSurfaceY, z: pos.z };

        system.run(() => {
            try {
                if (!itemEntity?.isValid) return;
                itemEntity.remove();

                const convItem = dimension.spawnEntity('create:conveyor_item', spawnPos);
                const container = convItem.getComponent('minecraft:inventory')?.container;
                if (container) container.setItem(0, itemStack);

                convItem.setProperty('create:rotation_y', Math.random() * 360);

                const slopeRot = getItemSlopeRotation(info, pos.x, pos.z);
                convItem.setProperty('create:rotation_x', slopeRot.axis === 'x' ? slopeRot.angle : 0);
                convItem.setProperty('create:rotation_z', slopeRot.axis === 'z' ? slopeRot.angle : 0);

                const visual = getItemVisual(itemStack.typeId);
                if (visual.hand) convItem.setProperty('create:item_visual', 'hand_equipped');
                else if (visual.block) convItem.setProperty('create:item_visual', 'block');

                system.runTimeout(() => {
                    try {
                        if (!convItem?.isValid) return;
                        convItem.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${itemStack.typeId}`);
                        if (itemStack.amount > 1) convItem.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${itemStack.typeId}`);
                    } catch {}
                }, 1);
            } catch {}
        });

        return;
    }
}

/**
 * Empurra um minecraft:item pra fora da esteira na direção de saída.
 */
/** @param {Entity} itemEntity @param {BeltInfo} info @param {number} direction */
function pushItemAway(itemEntity, info, direction) {
    try {
        const pushSpeed = Math.max(Math.abs(info.speed) * 0.3, 0.05);
        const impulse = { x: 0, y: 0.04, z: 0 };
        impulse[info.moveAxis] = direction * pushSpeed;
        itemEntity.applyImpulse(impulse);
    } catch {}
}

/** @param {Block} block @param {BeltInfo} info @param {number} worldX @param {number} worldZ */
function getSurfaceY(block, info, worldX, worldZ) {
    if (info.slope === 'horizontal') return block.y + BELT_TOP;

    // Local 0→1 ao longo da direção ascendente
    let local;
    if (info.axis === 'Z') {
        local = info.diagonalFlip ? (1 - (worldX - block.x)) : (worldX - block.x);
    } else {
        local = info.diagonalFlip ? (worldZ - block.z) : (1 - (worldZ - block.z));
    }
    local = Math.max(0, Math.min(1, local));

    if (info.part === 'start') {
    // Flat em BELT_TOP (13/16), depois sobe até DIAG_HIGH (1.5)
        if (local <= START_SLOPE_BEGIN) return block.y + BELT_TOP;
        const t = (local - START_SLOPE_BEGIN) / (1 - START_SLOPE_BEGIN);
        return block.y + BELT_TOP + t * (DIAG_HIGH - BELT_TOP);
    }

    if (info.part === 'middle') {
        // Diagonal completa: DIAG_LOW → DIAG_HIGH
        return block.y + DIAG_LOW + local * (DIAG_HIGH - DIAG_LOW);
    }

    if (info.part === 'end') {
        // Sobe de DIAG_LOW até BELT_TOP, depois flat
        if (local <= END_SLOPE_END) {
            const t = local / END_SLOPE_END;
            return block.y + DIAG_LOW + t * (BELT_TOP - DIAG_LOW);
        }
        return block.y + BELT_TOP;
    }

    return block.y + BELT_TOP;
};

/** @param {BeltInfo} info @param {number} worldX @param {number} worldZ */
function getItemSlopeRotation(info, worldX, worldZ) {
    if (info.slope === 'horizontal') return { axis: null, angle: 0 };

    // Local 0→1 na direção ascendente
    let local;
    if (info.axis === 'Z') {
        local = info.diagonalFlip ? (1 - (worldX - info.block.x)) : (worldX - info.block.x);
    } else {
        local = info.diagonalFlip ? (worldZ - info.block.z) : (1 - (worldZ - info.block.z));
    }
    local = Math.max(0, Math.min(1, local));

    // Checa se está na parte inclinada ou flat
    const onSlope = (info.part === 'middle')
        || (info.part === 'start' && local > START_SLOPE_BEGIN)
        || (info.part === 'end' && local < END_SLOPE_END);

    if (!onSlope) return { axis: null, angle: 0 };

    // Eixo de rotação: perpendicular ao shaft
    const rotAxis = info.axis === 'Z' ? 'z' : 'x';

    // Sinal: depende da direção do flip
    const sign = info.axis === 'Z'
        ? (info.diagonalFlip ? 1 : -1)
        : (info.diagonalFlip ? -1 : 1);

    return { axis: rotAxis, angle: 45 * sign };
};

/** @param {Block} block @param {BeltInfo} info @param {Dimension} dimension @param {Entity[]} conveyorItems */
function moveConveyorItems(block, info, dimension, conveyorItems) {
    if (conveyorItems.length === 0) return;

    const center = block.center();
    const sign = info.moveSign;

    const moveMin = block.location[info.moveAxis];
    const validItems = conveyorItems.filter(item => {
        const locMove = item.location[info.moveAxis];
        return locMove >= moveMin && locMove < moveMin + 1;
    });

    if (validItems.length === 0) return;

    validItems.sort((a, b) => {
        return sign > 0
            ? b.location[info.moveAxis] - a.location[info.moveAxis]
            : a.location[info.moveAxis] - b.location[info.moveAxis];
    });

    const hDelta = { x: 0, y: 0, z: 0 };
    if (info.slope === 'vertical') hDelta.y = info.speed;
    else if (info.axis === 'Z') hDelta.x = info.speed;
    else hDelta.z = -info.speed;

    let leaderPos = sign > 0 ? Infinity : -Infinity;

    for (const item of validItems) {
        const loc = item.location;

        // Stop tag: item parado = barreira pros de trás
        if (item.hasTag('create:conveyor_stop')) {
            if (shouldReleaseFunnelStop(block, item)) {
                try { item.removeTag('create:conveyor_stop'); } catch {}
                try { item.removeTag('create:brass_funnel_stop'); } catch {}
            } else {
                leaderPos = loc[info.moveAxis];
                continue;
            }
        }

        const proposed = { x: loc.x + hDelta.x, y: loc.y, z: loc.z + hDelta.z };

        const stopAtFunnel = getBlockingFunnelStop(block, info, item, loc, proposed);
        if (stopAtFunnel !== null) {
            proposed[info.moveAxis] = stopAtFunnel;
            proposed.y = getSurfaceY(block, info, proposed.x, proposed.z);
            item.addTag('create:conveyor_stop');
            item.addTag('create:brass_funnel_stop');
        }

        // Espaçamento entre itens
        const gap = sign > 0 ? leaderPos - proposed[info.moveAxis] : proposed[info.moveAxis] - leaderPos;
        if (gap < ITEM_SPACING) {
            proposed[info.moveAxis] = sign > 0 ? leaderPos - ITEM_SPACING : leaderPos + ITEM_SPACING;
            if ((sign > 0 && proposed[info.moveAxis] <= loc[info.moveAxis]) || (sign < 0 && proposed[info.moveAxis] >= loc[info.moveAxis])) {
                leaderPos = loc[info.moveAxis];
                continue;
            }
        }

        // Centraliza perpendicularmente
        const diffCenter = center[info.perpAxis] - loc[info.perpAxis];
        if (Math.abs(diffCenter) > 0.01) {
            proposed[info.perpAxis] = loc[info.perpAxis] + diffCenter * Math.min(Math.abs(info.speed) * 6, CENTER_FORCE);
        }

        // Checa se saiu do bloco
        const proposedMove = proposed[info.moveAxis];
        const exitedBlock = proposedMove < moveMin || proposedMove >= moveMin + 1;

        if (exitedBlock) {
            // Checa ação de saída
            const action = checkExitAction(block, info, dimension, proposed);

            if (action === 'eject') {
                ejectConveyorItem(item, info, dimension);
                leaderPos = loc[info.moveAxis];
                continue;
            }

            if (action === 'depot') {
                const exitDir = { x: 0, y: 0, z: 0 };
                exitDir[info.moveAxis] = info.moveSign > 0 ? 1 : -1;
                const depotBlock = getBlockAt(dimension, block.x + exitDir.x, block.y + exitDir.y, block.z + exitDir.z);
                if (depotBlock?.typeId === 'create:depot') {
                    const pushed = pushToDepot(item, depotBlock, info, dimension);
                    if (!pushed) {
                        // Depot ocupado → item para na borda
                        leaderPos = loc[info.moveAxis];
                    }
                    continue;
                }
            }

            if (action === 'stop') {
    /** @type {Block | null | undefined} */
    let nextBlock = null;
    /** @type {BeltInfo | null} */
    let nextInfo = null;

    if (info.slope === 'diagonal') {
        for (const dy of [0, 1, -1]) {
            const candidate = getBlockAt(dimension, proposed.x, block.y + dy, proposed.z);
            if (candidate?.typeId === block.typeId) {
                nextBlock = candidate;
                nextInfo = getBeltInfo(candidate, dimension);
                break;
            }
        }
    } else {
        nextBlock = getBlockAt(dimension, proposed.x, info.slope === 'vertical' ? proposed.y : block.y, proposed.z);
        if (nextBlock?.typeId === block.typeId) {
            nextInfo = getBeltInfo(nextBlock, dimension);
        } else {
            leaderPos = loc[info.moveAxis];
            continue;
        }
    }

    if (!nextBlock || !nextInfo) {
        leaderPos = loc[info.moveAxis];
        continue;
    }

    if (nextInfo.slope !== 'vertical') proposed.y = getSurfaceY(nextBlock, nextInfo, proposed.x, proposed.z);

    // Troca de eixo (Z→X ou X→Z): centraliza no novo perpAxis
    if (nextInfo.perpAxis !== info.perpAxis) {
        const nextCenter = nextBlock.location[nextInfo.perpAxis] + 0.5;
        const nextMargin = nextBlock.location[nextInfo.perpAxis] + PERP_MARGIN_MOVE + 0.01; 

        // moveSign determina de qual lado entra
        const entryEdge = info.moveSign > 0 ? nextMargin : nextBlock.location[nextInfo.perpAxis] + 1 - PERP_MARGIN_MOVE - 0.01; 

        // Interpolação: velocidade baixa = borda, velocidade alta = centro
        const t = Math.min(Math.abs(info.speed) * 8, 1);
        proposed[nextInfo.perpAxis] = entryEdge + (nextCenter - entryEdge) * t;
    }
}
        } else if (info.slope !== 'vertical') {
            proposed.y = getSurfaceY(block, info, proposed.x, proposed.z);
        }

        // Rotação
        const newRot = getItemSlopeRotation(info, proposed.x, proposed.z);
        const targetRotX = newRot.axis === 'x' ? newRot.angle : 0;
        const targetRotZ = newRot.axis === 'z' ? newRot.angle : 0;

        try {
            if ((item.getProperty('create:rotation_x') ?? 0) !== targetRotX) item.setProperty('create:rotation_x', targetRotX);
            if ((item.getProperty('create:rotation_z') ?? 0) !== targetRotZ) item.setProperty('create:rotation_z', targetRotZ);
        } catch {}

        try { item.teleport(proposed); } catch {}
        leaderPos = proposed[info.moveAxis];
    }
}

/** @param {Block} block @param {BeltInfo} info @param {Entity} conveyorItem @param {Vector3} loc @param {Vector3} proposed */
function getBlockingFunnelStop(block, info, conveyorItem, loc, proposed) {
    if (info.slope === 'vertical') return null;

    const funnelBlock = getBlockAt(block.dimension, block.x, block.y + 1, block.z);
    if (funnelBlock?.typeId !== 'create:brass_funnel') {
        if (conveyorItem.hasTag('create:brass_funnel_stop')) {
            try { conveyorItem.removeTag('create:conveyor_stop'); } catch {}
            try { conveyorItem.removeTag('create:brass_funnel_stop'); } catch {}
        }
        return null;
    }

    if (funnelAllowsConveyorItem(funnelBlock, conveyorItem)) {
        if (conveyorItem.hasTag('create:brass_funnel_stop')) {
            try { conveyorItem.removeTag('create:conveyor_stop'); } catch {}
            try { conveyorItem.removeTag('create:brass_funnel_stop'); } catch {}
        }
        return null;
    }

    const stopPos = block.location[info.moveAxis] + 0.5;
    const from = loc[info.moveAxis];
    const to = proposed[info.moveAxis];
    const movement = to - from;
    if (Math.abs(movement) < 0.000001) return null;

    // Usa o deslocamento real do item. Em algumas orientações o moveSign
    // representa a rotação visual da Belt e pode ficar invertido.
    const movementSign = movement > 0 ? 1 : -1;
    const movingTowardStop = movementSign > 0
        ? from < stopPos && to >= stopPos
        : from > stopPos && to <= stopPos;

    if (!movingTowardStop) return null;
    return stopPos - (movementSign * BRASS_FUNNEL_STOP_EPSILON);
}

/** @param {Block} block @param {Entity} conveyorItem */
function shouldReleaseFunnelStop(block, conveyorItem) {
    if (!conveyorItem.hasTag('create:brass_funnel_stop')) return false;
    const funnelBlock = getBlockAt(block.dimension, block.x, block.y + 1, block.z);
    return funnelBlock?.typeId !== 'create:brass_funnel' || funnelAllowsConveyorItem(funnelBlock, conveyorItem);
}

/** @param {Block} funnelBlock @param {Entity} conveyorItem */
function funnelAllowsConveyorItem(funnelBlock, conveyorItem) {
    if (!funnelBlock.permutation.getAllStates()["create:input"]) return false;

    const item = conveyorItem.getComponent('minecraft:inventory')?.container?.getItem(0);
    if (!item) return true;

    const funnelEntity = funnelBlock.dimension.getEntities({
        type: "create:brass_funnel_entity",
        location: funnelBlock.center(),
        maxDistance: 0.5
    })[0];
    const filterItem = funnelEntity?.getComponent("inventory")?.container?.getItem(0) ?? null;
    if (!filterItem) return true;

    const invertFilter = funnelBlock.permutation.getAllStates()["create:on"] === true;
    const match = item.typeId === filterItem.typeId;
    return invertFilter ? !match : match;
}

const PUSH_CONFIG = {
    player: {
        targetMult: 6,
        impulseFactor: 0.035,
        centerForce: 0.025,
        maxHorizontalImpulse: 0.06,
        maxVerticalImpulse: 0.025
    },
    mob:    { impulseMult: 0.5, centerForce: 0.1, yMult: 0.25 },
};

// ==================== DELTA PRA PUSH (FLAT ↔ DIAGONAL) ====================

/** @param {BeltInfo} info @param {number} entityX @param {number} entityZ */
function getPushDelta(info, entityX, entityZ) {
    if (info.slope === 'horizontal') return info.delta;

    let local;
    if (info.axis === 'Z') {
        local = info.diagonalFlip ? (1 - (entityX - info.block.x)) : (entityX - info.block.x);
    } else {
        local = info.diagonalFlip ? (entityZ - info.block.z) : (1 - (entityZ - info.block.z));
    }
    local = Math.max(0, Math.min(1, local));

    const isOnFlat = (info.part === 'start' && local < START_SLOPE_BEGIN)
                  || (info.part === 'end' && local >= END_SLOPE_END);

    // Horizontal base
    const hDelta = { x: 0, y: 0, z: 0 };
    if (info.axis === 'Z') hDelta.x = info.speed;
    else hDelta.z = -info.speed;

    if (isOnFlat) return hDelta;

    // Y derivado da superfície real (respeita flip automaticamente)
    const currentY = getSurfaceY(info.block, info, entityX, entityZ);
    const nextY = getSurfaceY(info.block, info, entityX + hDelta.x, entityZ + hDelta.z);
    hDelta.y = nextY - currentY;

    return hDelta;
}

/** @param {Block} block @param {BeltInfo} info @param {Dimension} dimension @param {Entity[]} otherEntities */
function pushEntities(block, info, dimension, otherEntities) {
    const center = block.center();

    for (const ent of otherEntities) {
        if (!ent?.isValid) continue;

        const localSurfaceY = getSurfaceY(block, info, ent.location.x, ent.location.z);
        const dy = ent.location.y - localSurfaceY;
        if (dy < -0.3 || dy > 1.5) continue;

        if (ent.typeId === 'minecraft:player' && ent.isSneaking) continue;

        const diffPerp = center[info.perpAxis] - ent.location[info.perpAxis];
        if (Math.abs(diffPerp) > 0.75) continue;

        // Delta correto pra posição da entidade (flat ou diagonal)
        const delta = getPushDelta(info, ent.location.x, ent.location.z);

        if (ent.typeId === 'minecraft:player') {
            // Uma linha de belts possui vários blocos processados no mesmo tick.
            // Impedir impulsos duplicados evita trancos sem reduzir a velocidade-alvo.
            if (playerPushTick.get(ent.id) === system.currentTick) continue;
            playerPushTick.set(ent.id, system.currentTick);

            const cfg = PUSH_CONFIG.player;
            try {
                const vel = ent.getVelocity();
                const targetVelX = delta.x * cfg.targetMult;
                const targetVelZ = delta.z * cfg.targetMult;
                const impulse = {
                    x: Math.max(-cfg.maxHorizontalImpulse, Math.min(cfg.maxHorizontalImpulse, (targetVelX - vel.x) * cfg.impulseFactor)),
                    y: Math.max(-cfg.maxVerticalImpulse, Math.min(cfg.maxVerticalImpulse, delta.y * cfg.impulseFactor)),
                    z: Math.max(-cfg.maxHorizontalImpulse, Math.min(cfg.maxHorizontalImpulse, (targetVelZ - vel.z) * cfg.impulseFactor))
                };

                // Centraliza gradualmente dentro da belt no mesmo impulso.
                if (Math.abs(diffPerp) > 0.05) {
                    impulse[info.perpAxis] += Math.max(
                        -cfg.maxHorizontalImpulse,
                        Math.min(cfg.maxHorizontalImpulse, diffPerp * cfg.centerForce)
                    );
                    impulse[info.perpAxis] = Math.max(
                        -cfg.maxHorizontalImpulse,
                        Math.min(cfg.maxHorizontalImpulse, impulse[info.perpAxis])
                    );
                }

                ent.applyImpulse(impulse);
            } catch {}
        } else {
            const cfg = PUSH_CONFIG.mob;
            try {
                ent.applyImpulse({
                    x: delta.x * cfg.impulseMult,
                    y: delta.y * cfg.yMult,
                    z: delta.z * cfg.impulseMult
                });

                if (Math.abs(diffPerp) > 0.05) {
                    const perpImpulse = { x: 0, y: 0, z: 0 };
                    perpImpulse[info.perpAxis] = diffPerp * cfg.centerForce;
                    ent.applyImpulse(perpImpulse);
                }

                ent.addEffect('slowness', 10, { amplifier: 1, showParticles: false });
            } catch {}
        }
    }
}


// ==================== EJEÇÃO E DEPOT ====================

/**
 * Checa se o item deve ser ejetado, empurrado pro depot, ou parado.
 * Chamado quando o item sai dos limites do bloco.
 * Retorna: 'eject' | 'depot' | 'stop'
 */
/** @param {Block} block @param {BeltInfo} info @param {Dimension} dimension @param {Vector3} proposed */
function checkExitAction(block, info, dimension, proposed) {
    const part = info.part;
    if (part !== 'start' && part !== 'end') return 'stop';

    // Bloco na frente (direção do movimento)
    const sign = info.moveSign;
    const exitDir = { x: 0, y: 0, z: 0 };
    exitDir[info.moveAxis] = sign > 0 ? 1 : -1;

    /** @type {Block | null | undefined} */
    let frontBlock = null;
    if (info.slope === 'diagonal') {
        for (const dy of [0, 1, -1]) {
            const candidate = getBlockAt(dimension,
                block.x + exitDir.x,
                block.y + dy,
                block.z + exitDir.z
            );
            if (candidate?.typeId === block.typeId || candidate?.typeId === 'create:depot') {
                frontBlock = candidate;
                break;
            }
        }
    } else {
        frontBlock = getBlockAt(dimension,
            block.x + exitDir.x,
            block.y + exitDir.y,
            block.z + exitDir.z
        );
    }

    if (frontBlock?.typeId === block.typeId) return 'stop';
    if (frontBlock?.typeId === 'create:depot') return 'depot';

    return 'eject';
}

/** @param {Entity} conveyorItem @param {BeltInfo} info @param {Dimension} dimension */
function ejectConveyorItem(conveyorItem, info, dimension) {
    const container = conveyorItem.getComponent('minecraft:inventory')?.container;
    const itemStack = container?.getItem(0);
    if (!itemStack) { try { conveyorItem.remove(); } catch {}; return; }

    const pos = conveyorItem.location;
    const direction = getBeltEjectDirection(info, pos);
    const rpmFactor = Math.min(Math.abs(info.rpm) / BELT_EJECT_RPM_FOR_MAX, 1);
    const ejectStrength = BELT_EJECT_MIN_STRENGTH
        + (BELT_EJECT_MAX_STRENGTH - BELT_EJECT_MIN_STRENGTH) * rpmFactor;
    const spawnPos = {
        x: pos.x + direction.x * BELT_EJECT_EDGE_OFFSET,
        y: pos.y + Math.max(0, direction.y) * BELT_EJECT_EDGE_OFFSET + 0.03,
        z: pos.z + direction.z * BELT_EJECT_EDGE_OFFSET
    };

    try {
        const spawned = dimension.spawnItem(itemStack, spawnPos);
        spawned.clearVelocity();
        spawned.applyImpulse({
            x: direction.x * ejectStrength,
            y: direction.y * ejectStrength + 0.055 + ejectStrength * 0.12,
            z: direction.z * ejectStrength
        });
    } catch {}

    try { conveyorItem.remove(); } catch {}
}

/** @param {BeltInfo} info @param {Vector3} pos */
function getBeltEjectDirection(info, pos) {
    let movement = getPushDelta(info, pos.x, pos.z);

    // Na ponta plana da diagonal, getPushDelta pode não carregar componente Y.
    // O eixo horizontal e seu sinal continuam sendo a direção confiável da saída.
    if (Math.abs(movement.x) + Math.abs(movement.y) + Math.abs(movement.z) < 0.0001) {
        movement = { x: 0, y: 0, z: 0 };
        movement[info.moveAxis] = info.moveSign;
    }

    const length = Math.hypot(movement.x, movement.y, movement.z) || 1;
    return {
        x: movement.x / length,
        y: movement.y / length,
        z: movement.z / length
    };
}

/** @param {Entity} conveyorItem @param {Block} depotBlock @param {BeltInfo} info @param {Dimension} dimension */
function pushToDepot(conveyorItem, depotBlock, info, dimension) {
    // Checa se já tem conveyor_item no depot
    const existing = dimension.getEntities({
        location: depotBlock.center(),
        type: 'create:conveyor_item',
        maxDistance: 0.5
    });

    // Ignora a si mesmo na contagem
    const occupiedItem = existing.find(e => {
        try { if (e.hasTag('create_depot_visual')) return false; } catch {}
        return e.id !== conveyorItem.id;
    });
    if (occupiedItem?.isValid) {
        const sourceContainer = conveyorItem.getComponent('minecraft:inventory')?.container;
        const sourceItem = sourceContainer?.getItem(0);
        const targetContainer = occupiedItem.getComponent('minecraft:inventory')?.container;
        const targetItem = targetContainer?.getItem(0);
        if (!sourceContainer || !targetContainer || !sourceItem || !targetItem) return false;

        let canStack = false;
        try { canStack = targetItem.isStackableWith(sourceItem); } catch { canStack = targetItem.typeId === sourceItem.typeId; }
        if (!canStack) return false;

        const space = Math.max(0, (targetItem.maxAmount ?? 64) - targetItem.amount);
        const amountToMove = Math.min(space, sourceItem.amount);
        if (amountToMove <= 0) return false;

        const updatedTarget = targetItem.clone();
        updatedTarget.amount += amountToMove;
        targetContainer.setItem(0, updatedTarget);

        if (sourceItem.amount > amountToMove) {
            const updatedSource = sourceItem.clone();
            updatedSource.amount -= amountToMove;
            sourceContainer.setItem(0, updatedSource);
        } else {
            try { conveyorItem.remove(); } catch {}
        }
        return true;
    }

    const targetPos = {
        x: depotBlock.center().x,
        y: depotBlock.y + BELT_TOP,
        z: depotBlock.center().z
    };

    try {
        conveyorItem.teleport(targetPos);
        conveyorItem.addTag('create:conveyor_stop');
        conveyorItem.setProperty('create:rotation_x', 0);
        conveyorItem.setProperty('create:rotation_z', 0);
    } catch {}

    return true;
}






// ==================== DEBUG====================

/** @param {Block} block @param {BeltInfo} info @param {Dimension} dimension */
function conveyorDebugSurface(block, info, dimension) {
    const center = block.center();
    const steps = 4;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;

        let wx, wz;
        if (info.axis === 'Z') {
            wx = block.x + (info.diagonalFlip ? (1 - t) : t);
            wz = center.z;
        } else {
            wx = center.x;
            wz = block.z + (info.diagonalFlip ? t : (1 - t));
        }

        const wy = getSurfaceY(block, info, wx, wz);

        dimension.spawnParticle('minecraft:basic_flame_particle', { x: wx, y: wy + 0.1, z: wz });
    }
};


/** @param {Block} block @param {BeltInfo} info @param {Dimension} dimension */
function conveyorDebugRotation(block, info, dimension) {
    if (info.slope === 'horizontal') return;

    const center = block.center();
    const steps = 5;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;

        let wx, wz;
        if (info.axis === 'Z') {
            wx = block.x + (info.diagonalFlip ? (1 - t) : t);
            wz = center.z;
        } else {
            wx = center.x;
            wz = block.z + (info.diagonalFlip ? t : (1 - t));
        }

        const wy = getSurfaceY(block, info, wx, wz);
        const rot = getItemSlopeRotation(info, wx, wz);

        // Verde = flat (rotação 0), azul = slope (rotação 45)
        const particle = rot.angle === 0
            ? 'minecraft:basic_flame_particle'
            : 'minecraft:blue_flame_particle';

        dimension.spawnParticle(particle, { x: wx, y: wy + 0.1, z: wz });
    }
};


/**
 * Mostra com partículas o caminho que itens percorrem na esteira.
 * Chama no blockTick quando quiser debugar.
 * @param {Block} block
 * @param {Dimension} dimension
 */
export function conveyorDebugParticles(block, dimension) {
    const info = getBeltInfo(block, dimension);
    if (!info) return;

    const center = block.center();
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;

        let px, py, pz;

        if (info.slope === 'horizontal') {
            if (info.axis === 'Z') { px = block.x + t; pz = center.z; }
            else { px = center.x; pz = block.z + t; }
            py = block.y + BELT_TOP + 0.05;
        } else {
            // Diagonal: calcula posição horizontal
            if (info.axis === 'Z') { px = block.x + (info.diagonalFlip ? (1 - t) : t); pz = center.z; }
            else { px = center.x; pz = block.z + (info.diagonalFlip ? t : (1 - t)); }

            // Y depende de start/middle/end
            if (info.part === 'middle') {
                py = block.y + BELT_TOP + t + 0.05;
            } else if (info.part === 'start') {
                py = block.y + BELT_TOP + (t < 0.5 ? 0 : (t - 0.5) * 2) + 0.05;
            } else {
                py = block.y + BELT_TOP + (t < 0.5 ? t * 2 : 1) + 0.05;
            }
        }

        dimension.spawnParticle('minecraft:basic_flame_particle', { x: px, y: py, z: pz });
    }
}


// ==================== HELPERS ====================

const HAND_EQUIPPED = new Set([
    "minecraft:copper_sword", "minecraft:diamond_sword", "minecraft:golden_sword", "minecraft:iron_sword", "minecraft:netherite_sword",
    "minecraft:stone_sword", "minecraft:wooden_sword", "minecraft:copper_pickaxe", "minecraft:diamond_pickaxe", "minecraft:golden_pickaxe",
    "minecraft:iron_pickaxe", "minecraft:netherite_pickaxe", "minecraft:stone_pickaxe", "minecraft:wooden_pickaxe", "minecraft:copper_shovel",
    "minecraft:diamond_shovel", "minecraft:golden_shovel", "minecraft:iron_shovel", "minecraft:netherite_shovel", "minecraft:stone_shovel",
    "minecraft:wooden_shovel", "minecraft:copper_axe", "minecraft:diamond_axe", "minecraft:golden_axe", "minecraft:iron_axe",
    "minecraft:netherite_axe", "minecraft:stone_axe", "minecraft:wooden_axe", "minecraft:copper_hoe", "minecraft:diamond_hoe",
    "minecraft:golden_hoe", "minecraft:iron_hoe", "minecraft:netherite_hoe", "minecraft:stone_hoe", "minecraft:wooden_hoe",
    "minecraft:stick", "minecraft:carrot_on_a_stick", "minecraft:warped_fungus_on_a_stick", "minecraft:blaze_rod", "minecraft:breeze_rod",
    "minecraft:spyglass", "minecraft:fishing_rod", "minecraft:mace", "minecraft:bamboo", "minecraft:bone", "minecraft:shield", "minecraft:trident",
    "minecraft:bow", "minecraft:crossbow", "minecraft:diamond_spear", "minecraft:golden_spear", "minecraft:iron_spear",
    "minecraft:netherite_spear", "minecraft:stone_spear", "minecraft:wooden_spear",
]);

const NON_BLOCK_ITEMS = new Set([
    // Itens finos que tambem possuem BlockType no Bedrock. Eles devem usar a
    // exibicao plana de item na belt, nunca a rotacao inclinada dos blocos.
    "minecraft:wheat", "minecraft:wheat_seeds", "minecraft:resin_clump",
    "minecraft:beetroot", "minecraft:beetroot_seeds", "minecraft:carrot", "minecraft:potato",
    "minecraft:poisonous_potato", "minecraft:melon_seeds", "minecraft:pumpkin_seeds",
    "minecraft:torchflower_seeds", "minecraft:pitcher_pod", "minecraft:cocoa_beans",
    "minecraft:sugar_cane", "minecraft:sweet_berries", "minecraft:glow_berries",
    "minecraft:fern", "minecraft:large_fern", "minecraft:tall_grass", "minecraft:tall_dry_grass", "minecraft:seagrass",
    "minecraft:deadbush", "minecraft:bamboo", "minecraft:vine", "minecraft:glow_lichen", "minecraft:waterlily",
    "minecraft:brown_mushroom", "minecraft:red_mushroom", "minecraft:spore_blossom", "minecraft:firefly_bush",
    "minecraft:hanging_roots", "minecraft:nether_sprouts", "minecraft:crimson_roots", "minecraft:warped_roots",
    "minecraft:weeping_vines", "minecraft:twisting_vines", "minecraft:mangrove_propagule",
    "minecraft:oak_sapling", "minecraft:birch_sapling", "minecraft:cherry_sapling", "minecraft:dark_sapling",
    "minecraft:jungle_sapling", "minecraft:pale_oak_sapling", "minecraft:spruce_sapling",
    "minecraft:poppy", "minecraft:dandelion", "minecraft:blue_orchid", "minecraft:allium", "minecraft:azure_bluet",
    "minecraft:red_tulip", "minecraft:orange_tulip", "minecraft:white_tulip", "minecraft:pink_tulip",
    "minecraft:oxeye_daisy", "minecraft:cornflower", "minecraft:lily_of_the_valley", "minecraft:wither_rose",
    "minecraft:torchflower", "minecraft:peony", "minecraft:rose_bush", "minecraft:lilac", "minecraft:sunflower",
    "minecraft:candle", "minecraft:white_candle", "minecraft:light_gray_candle", "minecraft:gray_candle",
    "minecraft:black_candle", "minecraft:brown_candle", "minecraft:red_candle", "minecraft:orange_candle",
    "minecraft:yellow_candle", "minecraft:lime_candle", "minecraft:green_candle", "minecraft:cyan_candle",
    "minecraft:light_blue_candle", "minecraft:blue_candle", "minecraft:purple_candle", "minecraft:magenta_candle",
    "minecraft:pink_candle", "minecraft:tube_coral_fan", "minecraft:tube_coral", "minecraft:brain_coral", "minecraft:brain_coral_fan",
    "minecraft:bubble_coral_fan", "minecraft:bubble_coral", "minecraft:fire_coral_fan", "minecraft:fire_coral",
    "minecraft:horn_coral_fan", "minecraft:horn_coral", "minecraft:dead_tube_coral_fan", "minecraft:dead_tube_coral",
    "minecraft:dead_brain_coral_fan", "minecraft:dead_brain_coral", "minecraft:dead_bubble_coral_fan",
    "minecraft:dead_fire_coral_fan", "minecraft:dead_horn_coral_fan", "minecraft:dead_bubble_coral",
    "minecraft:dead_fire_coral", "minecraft:dead_horn_coral",
    "minecraft:torch", "minecraft:soul_torch", "minecraft:redstone_torch", "minecraft:copper_torch",
    "minecraft:ladder", "minecraft:flower_pot", "minecraft:lever", "minecraft:tripwire_hook", "minecraft:sea_pickle",
    "minecraft:web", "minecraft:rail", "minecraft:golden_rail", "minecraft:detector_rail", "minecraft:activator_rail",
    "minecraft:bed", "minecraft:acacia_hanging_sign", "minecraft:bamboo_hanging_sign", "minecraft:birch_hanging_sign",
    "minecraft:cherry_hanging_sign", "minecraft:crimson_hanging_sign", "minecraft:dark_oak_hanging_sign",
    "minecraft:jungle_hanging_sign", "minecraft:mangrove_hanging_sign", "minecraft:oak_hanging_sign",
    "minecraft:pale_oak_hanging_sign", "minecraft:spruce_hanging_sign", "minecraft:warped_hanging_sign",
    "minecraft:wooden_door", "minecraft:spruce_door", "minecraft:birch_door", "minecraft:jungle_door",
    "minecraft:acacia_door", "minecraft:dark_oak_door", "minecraft:mangrove_door", "minecraft:crimson_door",
    "minecraft:warped_door", "minecraft:iron_door", "minecraft:pale_oak_door", "minecraft:bamboo_door",
    "minecraft:cherry_door", "minecraft:copper_door", "minecraft:exposed_copper_door",
    "minecraft:weathered_copper_door", "minecraft:oxidized_copper_door", "minecraft:waxed_copper_door",
    "minecraft:waxed_exposed_copper_door", "minecraft:waxed_weathered_copper_door", "minecraft:waxed_oxidized_copper_door",
    "minecraft:lantern", "minecraft:soul_lantern", "minecraft:bell", "minecraft:iron_chain",
    "minecraft:campfire", "minecraft:soul_campfire", "minecraft:frame", "minecraft:glow_frame",
    "minecraft:hopper", "minecraft:cauldron", "minecraft:copper_chain", "minecraft:exposed_copper_chain",
    "minecraft:oxidized_copper_chain", "minecraft:waxed_copper_chain", "minecraft:waxed_exposed_copper_chain",
    "minecraft:waxed_oxidized_copper_chain", "minecraft:waxed_weathered_copper_chain", "minecraft:weathered_copper_chain",
    "minecraft:frog_spawn", "minecraft:sniffer_egg", "minecraft:turtle_egg",
    "minecraft:amethyst_cluster", "minecraft:large_amethyst_bud", "minecraft:small_amethyst_bud", "minecraft:medium_amethyst_bud",
    "minecraft:kelp", "minecraft:pointed_dripstone", "minecraft:pale_hanging_moss", "minecraft:leaf_litter",
    "minecraft:short_grass", "minecraft:short_dry_grass", "minecraft:bush", "minecraft:wildflowers",
    "minecraft:pink_petals", "minecraft:cactus_flower", "minecraft:closed_eyeblossom", "minecraft:pitcher_plant",
    "minecraft:open_eyeblossom", "minecraft:iron_bars",
    "minecraft:copper_bars", "minecraft:exposed_copper_bars", "minecraft:weathered_copper_bars",
    "minecraft:oxidized_copper_bars", "minecraft:waxed_copper_bars", "minecraft:waxed_exposed_copper_bars",
    "minecraft:waxed_weathered_copper_bars", "minecraft:waxed_oxidized_copper_bars",
    "minecraft:crimson_fungus", "minecraft:warped_fungus", "minecraft:nether_wart", "minecraft:brewing_stand",
]);

const HAND_PATTERN = /sword|pickaxe|axe|shovel|hoe|spear|wrench|hammer|drill|saw|knife|dagger|mace|bow|crossbow|trident|rod|staff|cannon/;

/** @param {string} itemId */
export function getItemVisual(itemId) {
    const hand = HAND_EQUIPPED.has(itemId) || (!itemId.startsWith('minecraft:') && HAND_PATTERN.test(itemId));
    const block = !hand && !!BlockTypes.get(itemId) && !NON_BLOCK_ITEMS.has(itemId);
    return { hand, block };
};

/** @param {Dimension} dimension @param {number} x @param {number} y @param {number} z */
function getBlockAt(dimension, x, y, z) {
    try { return dimension.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }); }
    catch { return null; }
};
