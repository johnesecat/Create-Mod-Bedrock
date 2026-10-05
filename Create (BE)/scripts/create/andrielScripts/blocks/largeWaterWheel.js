import { system } from "@minecraft/server";
import { INVERT_FACE, posToKey, getAxisFromRotation } from "../rpm/rpmHelpers";
import { recalculateNetwork } from "../rpm/rpmCore";
import { WATER_IDS, waterHeight, getFlowAt } from "./waterWheel";

// ─── Constants ───────────────────────────────────────────────────────────────

const FLOW_CHECK_RATE = 60; // Same as small wheel (60 ticks = 3 seconds)

// ─── Rim offsets (local coordinates) ─────────────────────────────────────────
//
// The large wheel checks 12 positions around its rim at radius ~2.
// Offsets are stored as [a, b] in the wheel's LOCAL plane:
//
//   Axis Z  (wheel faces N/S, spins in XY): a = X,  b = Y
//   Axis X  (wheel faces E/W, spins in YZ): a = Z,  b = Y
//   Axis Y  (wheel faces U/D, spins in XZ): a = X,  b = Z
//
// The 12 positions form a diamond at r=2:
//   4 cardinal  (0,±2) (±2,0)
//   8 flanking  (±1,±2) (±2,±1)
//
//        (-1,2)(0,2)(1,2)
//    (-2,1)              (2,1)
//    (-2,0)     [W]      (2,0)
//    (-2,-1)             (2,-1)
//       (-1,-2)(0,-2)(1,-2)

const RIM_OFFSETS = [
    [  0,  2 ], [  0, -2 ],  // top / bottom center
    [  2,  0 ], [ -2,  0 ],  // right / left center
    [  1,  2 ], [ -1,  2 ],  // top flanks
    [  1, -2 ], [ -1, -2 ],  // bottom flanks
    [  2,  1 ], [  2, -1 ],  // right flanks
    [ -2,  1 ], [ -2, -1 ],  // left flanks
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Converts a local [a, b] rim offset to a world {x, y, z} offset.
function rimToWorld(a, b, axis) {
    if (axis === 'Z') return { x: a, y: b, z: 0 }; // XY plane
    if (axis === 'X') return { x: 0, y: b, z: a }; // YZ plane  (a→Z, b→Y)
    return                   { x: a, y: 0, z: b }; // XZ plane  (a→X, b→Z)
}

// Rotates a unit vector 90° CW around the shaft axis to get the
// "positive rotation" direction — the same convention as the small wheel.
//   Axis Z CW:  (x,y) → ( y, -x)
//   Axis X CW:  (y,z) → ( z, -y)
//   Axis Y CCW: (x,z) → ( z, -x)  ← matches the small wheel's empirical correction
function computePositive(worldOffset, axis) {
    const len = Math.sqrt(worldOffset.x ** 2 + worldOffset.y ** 2 + worldOffset.z ** 2);
    if (len < 0.001) return { x: 0, y: 0, z: 0 };
    const nx = worldOffset.x / len, ny = worldOffset.y / len, nz = worldOffset.z / len;

    if (axis === 'Z') return { x:  ny, y: -nx, z:   0 };
    if (axis === 'X') return { x:   0, y:  nz, z: -ny };
    return                   { x:  nz, y:   0, z: -nx };
}

// ─── Flow score ───────────────────────────────────────────────────────────────

// Checks the 12 rim positions and returns a score in [-12, +12].
// Logic is identical to the small wheel but uses dynamic positive directions
// because rim offsets are not always axis-aligned.
function calculateFlowScore(block, dimension) {
    const axis = getAxisFromRotation(INVERT_FACE[block.permutation.getState('minecraft:facing_direction')]);
    let score = 0;

    for (const [a, b] of RIM_OFFSETS) {
        const offset = rimToWorld(a, b, axis);
        try {
            const cb = dimension.getBlock({ x: block.x + offset.x, y: block.y + offset.y, z: block.z + offset.z });
            if (!cb || !WATER_IDS.has(cb.typeId)) continue;

            const flow = getFlowAt(cb, dimension);
            if (!flow) continue;

            // Project flow onto the wheel's rotation plane (zero out the shaft axis)
            let mx, my, mz;
            if      (axis === 'Z') { mx = flow.hx; my = flow.vy; mz = 0;       } // XY plane
            else if (axis === 'X') { mx = 0;       my = flow.vy; mz = flow.hz; } // YZ plane
            else                   { mx = flow.hx; my = 0;       mz = flow.hz; } // XZ plane

            const mLen = Math.sqrt(mx * mx + my * my + mz * mz);
            if (mLen < 0.001) continue;

            const positive = computePositive(offset, axis);
            const dot = (mx / mLen) * positive.x + (my / mLen) * positive.y + (mz / mLen) * positive.z;
            if (Math.abs(dot) > 0.5) score += Math.sign(dot);
        } catch {}
    }

    return score;
}

// ─── Persistent state ────────────────────────────────────────────────────────

const largeWheelData = new Map(); // blockKey → { lastFlowScore, lastCheckTick }

// ─── Tick ─────────────────────────────────────────────────────────────────────

export function largeWaterWheelTick(block, dimension) {
    const tick     = system.currentTick;
    const blockKey = posToKey(block.x, block.y, block.z);

    let data = largeWheelData.get(blockKey);
    if (!data) {
        data = { lastFlowScore: null, lastCheckTick: tick - FLOW_CHECK_RATE };
        largeWheelData.set(blockKey, data);
    }

    if (tick - data.lastCheckTick < FLOW_CHECK_RATE) return;

    // Wait for the block's entity to be ready before advancing the timer
    const entity = dimension.getEntities({ location: block.center(), maxDistance: 0.25, type: `${block.typeId}_entity` })[0];
    if (!entity) return;

    data.lastCheckTick = tick;

    const score = calculateFlowScore(block, dimension);
    if (data.lastFlowScore === score) return;
    data.lastFlowScore = score;

    // Large wheel: max 4 RPM  (8 / size = 8 / 2 = 4, same as Java)
    const newRpm = Math.max(-1, Math.min(1, score)) * 4;

    entity.setDynamicProperty('create:generator_rpm', newRpm);

    const active = newRpm !== 0;
    if (block.permutation.getState('create:active_generator') !== active)
        block.setPermutation(block.permutation.withState('create:active_generator', active));

    system.runJob(recalculateNetwork(block, dimension, { eventType: 'generator' }));
}

// Clears persistent data when the block is broken
export function largeWaterWheelDeleteData(block) {
    largeWheelData.delete(posToKey(block.x, block.y, block.z));
}
