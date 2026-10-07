import { BlockPermutation, system } from "@minecraft/server";
import { INVERT_FACE, posToKey, getAxisFromRotation } from "../rpm/rpmHelpers";
import { recalculateNetwork } from "../rpm/rpmCore";

// ─── Constants ───────────────────────────────────────────────────────────────

const FLOW_CHECK_RATE = 60; // Re-check water every 60 ticks (3 seconds), same as Java
export const WATER_IDS = new Set(['minecraft:water', 'minecraft:flowing_water']);

// ─── Rotation tables ─────────────────────────────────────────────────────────
//
// For each of the 4 positions the wheel checks (perpendicular to its shaft),
// we store:
//   pos      – offset from wheel center to check
//   positive – the direction that means "positive RPM" for that position
//
// "positive" = the wheel's normal at that position rotated 90° CW around the
// rotation axis (clockwise when viewed from the positive end of the axis).
//
// CW 90° rotation formulas used per plane:
//   XY plane (Z axis): (x, y) → ( y, -x)
//   YZ plane (X axis): (y, z) → ( z, -y)
//   XZ plane (Y axis): (x, z) → (-z,  x)
//
// Z axis  (wheel facing north/south, shaft along Z):
//   above  (0,+1) → (+1, 0)  = east
//   below  (0,-1) → (-1, 0)  = west
//   east   (+1,0) → ( 0,-1)  = down
//   west   (-1,0) → ( 0,+1)  = up
//
// X axis  (wheel facing east/west, shaft along X):
//   above  (y=+1) → (z=0, y'=-1) = north  [in YZ: (1,0) → (0,-1)]
//   below  (y=-1) → (z=0, y'=+1) = south
//   south  (z=+1) → (z'=+1,y'=0) = up
//   north  (z=-1) → (z'=-1,y'=0) = down
//
// Y axis  (wheel facing up/down, shaft along Y):
//   north  (z=-1) → (x'=+1,z'= 0) → ... wait, XZ: (x,z) → (-z,x)
//   north  (x=0,z=-1) → (-(-1), 0) = (+1, 0) → west? Let me redo.
//   XZ CW: (x,z) → (-z, x)
//   north  (0,-1) → (1,  0) = east  → negate: west
//   Actually: using consistent CW definition that works for Z and X:
//   Y axis - same sign flip as Z and X → negate what CCW gives:
//   north  → west  (-1, 0, 0)
//   south  → east  (+1, 0, 0)
//   east   → north ( 0, 0,-1)
//   west   → south ( 0, 0,+1)

const WHEEL_OFFSETS = {
    // Shaft along Z — wheel spins in the XY plane (north/south facing)
    Z: [
        { pos: { x:  0, y:  1, z: 0 }, positive: { x:  1, y:  0, z: 0 } }, // above  → east
        { pos: { x:  0, y: -1, z: 0 }, positive: { x: -1, y:  0, z: 0 } }, // below  → west
        { pos: { x:  1, y:  0, z: 0 }, positive: { x:  0, y: -1, z: 0 } }, // east   → down
        { pos: { x: -1, y:  0, z: 0 }, positive: { x:  0, y:  1, z: 0 } }, // west   → up
    ],
    // Shaft along X — wheel spins in the YZ plane (east/west facing)
    X: [
        { pos: { x: 0, y:  1, z:  0 }, positive: { x: 0, y:  0, z: -1 } }, // above  → north
        { pos: { x: 0, y: -1, z:  0 }, positive: { x: 0, y:  0, z:  1 } }, // below  → south
        { pos: { x: 0, y:  0, z:  1 }, positive: { x: 0, y:  1, z:  0 } }, // south  → up
        { pos: { x: 0, y:  0, z: -1 }, positive: { x: 0, y: -1, z:  0 } }, // north  → down
    ],
    // Shaft along Y — wheel spins in the XZ plane (up/down facing)
    Y: [
        { pos: { x:  0, y: 0, z: -1 }, positive: { x: -1, y: 0, z:  0 } }, // north  → west
        { pos: { x:  0, y: 0, z:  1 }, positive: { x:  1, y: 0, z:  0 } }, // south  → east
        { pos: { x:  1, y: 0, z:  0 }, positive: { x:  0, y: 0, z: -1 } }, // east   → north
        { pos: { x: -1, y: 0, z:  0 }, positive: { x:  0, y: 0, z:  1 } }, // west   → south
    ],
};

// ─── Persistent state ────────────────────────────────────────────────────────

/** @type {Map<string, {lastFlowScore: number | null, lastCheckTick: number}>} */
const wheelData = new Map(); // blockKey → { lastFlowScore, lastCheckTick }

// ─── Water flow helpers ──────────────────────────────────────────────────────

// Returns the "height" of a water block from its liquid_depth state.
// Bedrock liquid_depth:  0 = source (height 8)
//                        1–7 = flowing, decreasing (height = 8 - depth)
//                        8–15 = falling straight down (treated as barrier = height 8)
/** @param {number} depth */
export function waterHeight(depth) {
    if (depth === 0 || depth >= 8) return 8;
    return 8 - depth;
}

// Computes the flow direction at a water block position.
// Returns { hx, hz, vy } where:
//   hx, hz = normalised horizontal flow components (X and Z)
//   vy     = vertical component: -1 if falling, 0 otherwise
// Returns null if there is no detectable flow.
/** @param {import('@minecraft/server').Block} waterBlock @param {import('@minecraft/server').Dimension} dimension */
export function getFlowAt(waterBlock, dimension) {
    const depth = waterBlock.permutation.getState('liquid_depth') ?? 0;

    // Falling water: pure downward flow
    if (depth >= 8) return { hx: 0, hz: 0, vy: -1 };

    const curH = waterHeight(depth);
    let fx = 0, fz = 0;

    // Water flows toward lower-height horizontal neighbours
    for (const [dx, dz] of [[0,-1],[0,1],[1,0],[-1,0]]) {
        try {
            const nb = dimension.getBlock({ x: waterBlock.x + dx, y: waterBlock.y, z: waterBlock.z + dz });
            if (!nb) continue;

            let nbH;
            if (nb.isAir)                       nbH = 0;
            else if (WATER_IDS.has(nb.typeId))  nbH = waterHeight(nb.permutation.getState('liquid_depth') ?? 0);
            else continue; // solid block — no flow this direction

            const diff = curH - nbH;
            if (diff > 0) { fx += dx * diff; fz += dz * diff; }
        } catch {}
    }

    const hLen = Math.sqrt(fx * fx + fz * fz);

    // Check for downward fall (open air below)
    let vy = 0;
    try {
        const below = dimension.getBlock({ x: waterBlock.x, y: waterBlock.y - 1, z: waterBlock.z });
        if (!below || below.isAir) vy = -1;
    } catch {}

    if (hLen < 0.001) return vy !== 0 ? { hx: 0, hz: 0, vy } : null;
    return { hx: fx / hLen, hz: fz / hLen, vy };
}

// ─── Flow score ──────────────────────────────────────────────────────────────

// Checks the 4 adjacent water blocks and returns a score in [-4, +4].
// For each water block, the flow vector is projected onto the wheel plane,
// then dot-producted with the "positive" rotation direction for that position.
// If |dot| > 0.5 → add +1 or -1 to the score.
/** @param {import('@minecraft/server').Block} block @param {import('@minecraft/server').Dimension} dimension */
function calculateFlowScore(block, dimension) {
    const rotation = block.permutation.getState('minecraft:facing_direction');
    if (typeof rotation !== 'string') return 0;
    const axis    = getAxisFromRotation(INVERT_FACE[rotation]);
    const offsets = WHEEL_OFFSETS[axis];
    if (!offsets) return 0;

    let score = 0;

    for (const { pos, positive } of offsets) {
        try {
            const cb = dimension.getBlock({ x: block.x + pos.x, y: block.y + pos.y, z: block.z + pos.z });
            if (!cb || !WATER_IDS.has(cb.typeId)) continue;

            const flow = getFlowAt(cb, dimension);
            if (!flow) continue;

            // Project flow onto the wheel's rotation plane by zeroing the shaft axis.
            // hx = X horizontal, hz = Z horizontal, vy = Y vertical.
            let mx, my, mz;
            if      (axis === 'Z') { mx = flow.hx; my = flow.vy; mz = 0;        } // XY plane
            else if (axis === 'X') { mx = 0;        my = flow.vy; mz = flow.hz; } // YZ plane
            else                   { mx = flow.hx;  my = 0;       mz = flow.hz; } // XZ plane

            const mLen = Math.sqrt(mx * mx + my * my + mz * mz);
            if (mLen < 0.001) continue;

            const dot = (mx / mLen) * positive.x + (my / mLen) * positive.y + (mz / mLen) * positive.z;
            if (Math.abs(dot) > 0.5) score += Math.sign(dot);
        } catch {}
    }

    return score;
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

/** @param {import('@minecraft/server').Block} block @param {import('@minecraft/server').Dimension} dimension */
export function waterWheelTick(block, dimension) {
    const tick     = system.currentTick;
    const blockKey = posToKey(block.x, block.y, block.z);

    let data = wheelData.get(blockKey);
    if (!data) {
        // On first tick, check immediately (lastCheckTick set FLOW_CHECK_RATE in the past)
        data = { lastFlowScore: null, lastCheckTick: tick - FLOW_CHECK_RATE };
        wheelData.set(blockKey, data);
    }

    if (tick - data.lastCheckTick < FLOW_CHECK_RATE) return;

    // Find the block's entity. If not ready yet (e.g. just replaced), retry next cycle.
    const entity = dimension.getEntities({ location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity` })[0];
    if (!entity) return; // don't advance the timer — will retry automatically

    data.lastCheckTick = tick;

    const score = calculateFlowScore(block, dimension);
    if (data.lastFlowScore === score) return; // no change, skip network recalc
    data.lastFlowScore = score;

    // Clamp score to [-1, 1] and convert to RPM (max 8, same as Java)
    const newRpm = Math.max(-1, Math.min(1, score)) * 8;

    entity.setDynamicProperty('create:generator_rpm', newRpm);

    const active = newRpm !== 0;
    const states = block.permutation.getAllStates();
    if (states['create:active_generator'] !== active)
        block.setPermutation(BlockPermutation.resolve(block.typeId, {
            ...states,
            'create:active_generator': active
        }));

    system.runJob(recalculateNetwork(block, dimension, { eventType: 'generator' }));
}

// Clears persistent data when the block is broken
/** @param {import('@minecraft/server').Block} block */
export function waterWheelDeleteData(block) {
    wheelData.delete(posToKey(block.x, block.y, block.z));
}
