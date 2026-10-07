import * as mc from "@minecraft/server";
const { system } = mc;

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Entity} Entity */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {'north' | 'south' | 'east' | 'west'} HorizontalDirection */
/** @typedef {{block: Block, cancel: boolean}} BeforePlaceEvent */
/** @typedef {{block: Block}} BlockEvent */

const ID = "create:copper_door";

/** @param {Block} block */
function states(block) {
    return block.permutation.getAllStates();
}

/** @param {Block} block @returns {Block | undefined} */
function otherHalf(block) {
    const upper = states(block)["create:upper"] === true;
    return block.dimension.getBlock({ x: block.x, y: block.y + (upper ? -1 : 1), z: block.z });
}

/** @param {Block | undefined} block @param {string} name @param {string | number | boolean} value */
function setState(block, name, value) {
    if (!block || block.typeId !== ID) return;
    block.setPermutation(mc.BlockPermutation.resolve(block.typeId, { ...states(block), [name]: value }));
}

const VISUAL_TYPES = {
    north: "create:copper_door_visual_lower",
    south: "create:copper_door_visual_south",
    west: "create:copper_door_visual_west",
    east: "create:copper_door_visual_east"
};
const HINGED_VISUAL_TYPES = {
    north: "create:copper_door_visual_lower_hinged",
    south: "create:copper_door_visual_south_hinged",
    west: "create:copper_door_visual_west_hinged",
    east: "create:copper_door_visual_east_hinged"
};

const ALL_VISUAL_TYPES = Object.values(VISUAL_TYPES);

/** @param {Entity | undefined} entity */
function removeVisual(entity) {
    try { entity?.remove(); } catch {}
}

/** @param {Block} block */
function visualType(block) {
    const direction = states(block)["minecraft:cardinal_direction"];
    return typeof direction === "string" && isHorizontalDirection(direction)
        ? VISUAL_TYPES[direction]
        : VISUAL_TYPES.north;
}

/** @param {unknown} value @returns {value is HorizontalDirection} */
function isHorizontalDirection(value) {
    return value === "north" || value === "south" || value === "west" || value === "east";
}

/** @param {Block} block @param {boolean} upper @returns {Entity | undefined} */
function visualAt(block, upper) {
    try {
        for (const type of ALL_VISUAL_TYPES) {
            const entities = block.dimension.getEntities({
                type,
                location: { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 },
                maxDistance: 0.75
            });
            if (entities?.[0]) return entities[0];
        }
    } catch {
        return undefined;
    }
}

/** @param {Block} block @param {boolean} upper */
function removeVisualAt(block, upper) {
    try {
        for (const type of ALL_VISUAL_TYPES) {
            const entities = block.dimension.getEntities({
                type,
                location: { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 },
                maxDistance: 0.75
            });
            for (const entity of entities) removeVisual(entity);
        }
    } catch {}
}

/** @param {Block} block @param {boolean} upper @param {boolean} opening @returns {Entity} */
function spawnVisual(block, upper, opening) {
    removeVisualAt(block, false);
    const location = { x: block.x + 0.5, y: block.y, z: block.z + 0.5 };
    const entity = block.dimension.spawnEntity(
        visualType(block),
        location
    );
    try { entity.teleport(location); } catch {}
    try { entity.setProperty("create:hinge", isMirroredHinge(block)); } catch {}
    try { entity.setProperty("create:opening", opening); } catch {}
    return entity;
}

/** @param {Block} block @param {boolean} upper @param {boolean} opening @returns {Entity} */
function getOrSpawnVisual(block, upper, opening) {
    const existing = visualAt(block, upper);
    if (existing) {
        const location = { x: block.x + 0.5, y: block.y, z: block.z + 0.5 };
        try { existing.teleport(location); } catch {}
        try { existing.setProperty("create:hinge", isMirroredHinge(block)); } catch {}
        try { existing.setProperty("create:opening", opening); } catch {}
        return existing;
    }
    return spawnVisual(block, upper, opening);
}

/** @param {Block} block @returns {Block | undefined} */
function pairedDoor(block) {
    const direction = states(block)["minecraft:cardinal_direction"];
    const offsets = direction === "north" || direction === "south"
        ? [{ x: 1, z: 0 }, { x: -1, z: 0 }]
        : [{ x: 0, z: 1 }, { x: 0, z: -1 }];
    for (const offset of offsets) {
        const candidate = block.dimension.getBlock({ x: block.x + offset.x, y: block.y, z: block.z + offset.z });
        if (candidate?.typeId !== ID || states(candidate)["create:upper"] === true) continue;
        if (states(candidate)["minecraft:cardinal_direction"] === direction) return candidate;
    }
}

/** @param {Block} block */
function isMirroredHinge(block) {
    const pair = pairedDoor(block);
    if (!pair) return states(block)["create:hinge"] === true;
    const direction = states(block)["minecraft:cardinal_direction"];
    if (direction === "north") return block.x > pair.x;
    if (direction === "south") return block.x < pair.x;
    if (direction === "west") return block.z < pair.z;
    return block.z > pair.z;
}

/** @param {Block} block @param {boolean | undefined} [forcedOpen] @param {boolean} [syncPair] */
function toggle(block, forcedOpen, syncPair = true) {
    const lower = states(block)["create:upper"] === true ? otherHalf(block) : block;
    if (!lower || lower.typeId !== ID) return;
    const upper = otherHalf(lower);
    if (!upper || upper.typeId !== ID) return;
    const current = states(lower);
    if (current["create:animating"] === true) return;
    const open = forcedOpen ?? !current["create:open"];
    if (open === current["create:open"]) return;

    setState(lower, "create:animating", true);
    setState(upper, "create:animating", true);
    if (syncPair) {
        const pair = pairedDoor(lower);
        if (pair) toggle(pair, open, false);
    }
    const visuals = open
        ? [spawnVisual(lower, false, true)]
        : [getOrSpawnVisual(lower, false, false)];
    lower.dimension.playSound(open ? "open.iron_door" : "close.iron_door", lower.center(), {
        volume: 0.8,
        pitch: 1.05
    });

    system.runTimeout(() => {
        const lowerNow = lower.dimension.getBlock(lower.location);
        const upperNow = lower.dimension.getBlock(upper.location);
        if (lowerNow?.typeId === ID) {
            setState(lowerNow, "create:open", open);
            setState(lowerNow, "create:animating", false);
        }
        if (upperNow?.typeId === ID) {
            setState(upperNow, "create:open", open);
            setState(upperNow, "create:animating", false);
        }
        if (!open) visuals.forEach(removeVisual);
    }, 15);
}

/** @param {Block} block */
function power(block) {
    return block.getRedstonePower?.() ?? 0;
}

/** @param {Block} block @param {boolean} powered */
function updateRedstonePower(block, powered) {
    const lower = states(block)["create:upper"] === true ? otherHalf(block) : block;
    if (!lower || lower.typeId !== ID) return;
    const upper = otherHalf(lower);
    if (!upper || upper.typeId !== ID) return;
    const wasPowered = states(lower)["create:powered"] === true;
    if (wasPowered === powered) return;
    setState(lower, "create:powered", powered);
    setState(upper, "create:powered", powered);
    toggle(lower, powered);
}

/** @type {{beforeOnPlayerPlace: (event: BeforePlaceEvent) => void, onPlace: (event: BlockEvent) => void, onPlayerInteract: (event: BlockEvent) => void, onTick: (event: BlockEvent) => void, onPlayerBreak: (event: BlockEvent) => void}} */
export const copperDoorComponent = {
    beforeOnPlayerPlace(event) {
        const block = event.block;
        const above = block.dimension.getBlock({ x: block.x, y: block.y + 1, z: block.z });
        if (!above || (!above.isAir && !above.isLiquid)) event.cancel = true;
    },

    onPlace(event) {
        const dimension = event.block.dimension;
        const location = event.block.location;
        // onPlace pode ocorrer enquanto event.block ainda aponta para o ar.
        // Espera um tick para obter a permutaÃ§Ã£o da porta jÃ¡ colocada.
        system.run(() => {
            const block = dimension.getBlock(location);
            if (!block || block.typeId !== ID || states(block)["create:upper"] === true) return;
            const above = dimension.getBlock({ x: block.x, y: block.y + 1, z: block.z });
            if (!above || (!above.isAir && !above.isLiquid)) return;
            const pair = pairedDoor(block);
            setState(block, "create:hinge", isMirroredHinge(block));
            const placed = dimension.getBlock(location);
            if (!placed || placed.typeId !== ID) return;
            const upperPermutation = mc.BlockPermutation.resolve(ID, {
                ...states(placed),
                "create:upper": true,
                "create:open": false,
                "create:animating": false,
                "create:powered": false
            });
            above.setPermutation(upperPermutation);
        });
    },

    onPlayerInteract(event) {
        toggle(event.block);
    },

    onTick(event) {
        const block = event.block;
        const current = states(block);
        const mate = otherHalf(block);
        // Se a outra metade foi quebrada, remove esta metade no tick seguinte.
        if (!mate || mate.typeId !== ID) {
            const location = block.location;
            const dimension = block.dimension;
            system.runTimeout(() => {
                const currentBlock = dimension.getBlock(location);
                if (!currentBlock || currentBlock.typeId !== ID) return;
                const other = otherHalf(currentBlock);
                if (other?.typeId === ID) return;
                if (states(currentBlock)["create:upper"] !== true) removeVisualAt(currentBlock, false);
                currentBlock.setType("minecraft:air");
            }, 2);
            return;
        }
        if (current["create:upper"] === true) return;
        updateRedstonePower(block, power(block) > 0);
    },

    onPlayerBreak(event) {
        const block = event.block;
        const upper = states(block)["create:upper"] === true;
        const dimension = block.dimension;
        const mateLocation = { x: block.x, y: block.y + (upper ? -1 : 1), z: block.z };
        const lower = upper ? dimension.getBlock(mateLocation) : block;
        if (lower) removeVisualAt(lower, false);
        system.run(() => {
            const mate = dimension.getBlock(mateLocation);
            if (mate?.typeId === ID) {
                const lowerNow = upper ? mate : block;
                removeVisualAt(lowerNow, false);
                mate.setType("minecraft:air");
            }
        });
    }
};
