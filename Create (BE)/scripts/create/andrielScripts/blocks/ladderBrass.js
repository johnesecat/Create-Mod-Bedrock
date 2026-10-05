import { ItemStack } from "@minecraft/server";

const LADDER_IDS = new Set([
    "create:ladder_brass",
    "create:ladder_copper",
    "create:ladder_andesite"
]);
const SUPPORT_OFFSETS = {
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    east: { x: 1, y: 0, z: 0 },
    west: { x: -1, y: 0, z: 0 }
};

function isValidSupport(block) {
    return !!block
        && !block.isAir
        && !block.isLiquid
        && !LADDER_IDS.has(block.typeId);
}

export function ladderBrassHasSupport(block, permutation = block?.permutation) {
    if (!block || !permutation) return false;
    let direction = "south";
    try { direction = permutation.getState("minecraft:cardinal_direction") ?? "south"; } catch {}
    const offset = SUPPORT_OFFSETS[direction];
    if (!offset) return false;
    try { return isValidSupport(block.offset(offset)); } catch { return false; }
}

export function ladderBrassTick(block) {
    if (!block?.isValid || !LADDER_IDS.has(block.typeId)) return;

    if (!ladderBrassHasSupport(block)) {
        const dimension = block.dimension;
        const location = block.center();
        const ladderId = block.typeId;
        try { block.setType("minecraft:air"); } catch { return; }
        try { dimension.spawnItem(new ItemStack(ladderId, 1), location); } catch {}
        return;
    }

    // Somente o segmento no topo de uma coluna conectada usa o aro.
    let connectedAbove = false;
    try {
        const below = block.below();
        const above = block.above();
        connectedAbove = LADDER_IDS.has(below?.typeId)
            && !LADDER_IDS.has(above?.typeId);
    } catch {}

    let current = false;
    try { current = block.permutation.getState("create:connected_above") === true; } catch {}
    if (current === connectedAbove) return;

    try {
        block.setPermutation(block.permutation.withState("create:connected_above", connectedAbove));
    } catch {}
}

function playerTouchesBrassLadder(player) {
    const { x, y, z } = player.location;
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const levels = [Math.floor(y), Math.floor(y + 0.8), Math.floor(y + 1.4)];

    for (const blockY of levels) {
        try {
            if (LADDER_IDS.has(player.dimension.getBlock({ x: blockX, y: blockY, z: blockZ })?.typeId)) {
                return true;
            }
        } catch {}
    }
    return false;
}

export function ladderBrassPlayerTick(player) {
    if (!player?.isValid || !playerTouchesBrassLadder(player)) return;

    // Limita a queda para permitir descer devagar ao se agachar.
    let velocityY = 0;
    try { velocityY = player.getVelocity().y ?? 0; } catch {}
    if (velocityY < -0.08) {
        try {
            player.applyImpulse({ x: 0, y: Math.min(0.28, -velocityY - 0.04), z: 0 });
        } catch {}
    }

    let wantsClimb = true;
    try {
        const movement = player.inputInfo?.getMovementVector?.();
        if (movement) wantsClimb = Math.hypot(movement.x ?? 0, movement.y ?? 0) > 0.05;
    } catch {}

    if (wantsClimb && !player.isSneaking) {
        try { player.applyImpulse({ x: 0, y: 0.085, z: 0 }); } catch {}
    }
}
