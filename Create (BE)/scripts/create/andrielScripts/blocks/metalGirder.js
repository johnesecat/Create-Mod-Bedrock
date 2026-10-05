import { system } from "@minecraft/server";

const GIRDER_ID = "create:metal_girder";
const X_OFFSETS = [{ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }];
const Z_OFFSETS = [{ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 }];
const UP_OFFSET = { x: 0, y: 1, z: 0 };
const DOWN_OFFSET = { x: 0, y: -1, z: 0 };

function neighborAt(block, offset) {
    return block.dimension.getBlock({
        x: block.x + offset.x,
        y: block.y + offset.y,
        z: block.z + offset.z
    });
}

function hasGirder(block, offset) {
    return neighborAt(block, offset)?.typeId === GIRDER_ID;
}

function hasPoleAbove(block) {
    const above = neighborAt(block, UP_OFFSET);
    return above?.typeId === GIRDER_ID
        && above.permutation.getState("create:is_pole") === true;
}

function refreshGirder(block) {
    if (block?.typeId !== GIRDER_ID) return;

    const currentFacing = block.permutation.getState("minecraft:cardinal_direction");
    const currentAxisIsX = currentFacing === "north" || currentFacing === "south";
    const hasX = X_OFFSETS.some(offset => hasGirder(block, offset));
    const hasZ = Z_OFFSETS.some(offset => hasGirder(block, offset));
    const isPole = !hasX && !hasZ;

    // Preserve an existing beam's axis. A pole chooses the axis of the first
    // horizontal neighbor that is placed beside it.
    const useX = !isPole && ((currentAxisIsX && hasX) || !hasZ);
    const axis = useX ? X_OFFSETS : Z_OFFSETS;
    const connected = !isPole
        && !hasPoleAbove(block)
        && axis.every(offset => hasGirder(block, offset));

    try {
        let permutation = block.permutation
            .withState("create:is_pole", isPole)
            .withState("create:connected", connected);

        if (!isPole) {
            permutation = permutation.withState(
                "minecraft:cardinal_direction",
                useX ? "north" : "west"
            );
        }
        block.setPermutation(permutation);
    } catch {}
}

function refreshNearby(dimension, location) {
    const offsets = [
        { x: 0, y: 0, z: 0 },
        ...X_OFFSETS,
        ...Z_OFFSETS,
        UP_OFFSET,
        DOWN_OFFSET
    ];
    for (const offset of offsets) {
        refreshGirder(dimension.getBlock({
            x: location.x + offset.x,
            y: location.y,
            z: location.z + offset.z
        }));
    }
}

export function metalGirderPlace(block) {
    if (block?.typeId !== GIRDER_ID) return;
    const dimension = block.dimension;
    const location = { ...block.location };
    system.run(() => refreshNearby(dimension, location));
}

export function metalGirderBreak(block, brokenBlockPermutation) {
    if (brokenBlockPermutation?.type?.id !== GIRDER_ID) return;
    const dimension = block.dimension;
    const location = { ...block.location };
    system.run(() => refreshNearby(dimension, location));
}
