import { BlockPermutation, ItemStack, MolangVariableMap, system } from "@minecraft/server";

const WHISTLE_ID = "create:whistle";
const WHISTLE_TUBE_ID = "create:whistle_tubo";
const WHISTLE_ENTITY = "create:whistle_active";
const WHISTLE_SOUND_INTERVAL = 32;

const PARTICLE_BY_DIRECTION = {
    south: { x: 0, z: -0.62 },
    north: { x: 0, z: 0.62 },
    west: { x: -0.62, z: 0 },
    east: { x: 0.62, z: 0 }
};

function visualLocation(block) {
    return { x: block.x + 0.5, y: block.y, z: block.z + 0.5 };
}

function getDirection(block) {
    try { return block.permutation.getState("minecraft:cardinal_direction") ?? "south"; }
    catch { return "south"; }
}

function getVisual(block) {
    try {
        return block.dimension.getEntities({
            type: WHISTLE_ENTITY,
            location: visualLocation(block),
            maxDistance: 0.35
        })[0];
    } catch { return undefined; }
}

function removeVisual(block) {
    let entities = [];
    try {
        entities = block.dimension.getEntities({
            type: WHISTLE_ENTITY,
            location: visualLocation(block),
            maxDistance: 0.45
        });
    } catch {}
    for (const entity of entities) {
        try { entity.remove(); } catch {}
    }
}

function removeVisualAt(dimension, location) {
    if (!dimension || !location) return;
    const visual = {
        x: location.x + 0.5,
        y: location.y,
        z: location.z + 0.5
    };
    let entities = [];
    try {
        entities = dimension.getEntities({
            type: WHISTLE_ENTITY,
            location: visual,
            maxDistance: 0.45
        });
    } catch {}
    for (const entity of entities) {
        try { entity.remove(); } catch {}
    }
}

function stopWhistleSound(block) {
    let players = [];
    try {
        players = block.dimension.getPlayers({ location: block.center(), maxDistance: 64 });
    } catch {}
    for (const player of players) {
        try { player.stopSound("create:whistle"); } catch {}
        try { player.runCommand("stopsound @s create:whistle"); } catch {}
    }
}

function ensureVisual(block) {
    let entity = getVisual(block);
    const direction = getDirection(block);
    const location = visualLocation(block);
    if (!entity?.isValid) {
        try { entity = block.dimension.spawnEntity(WHISTLE_ENTITY, location); } catch { return undefined; }
    }
    try { entity.removeEffect("invisibility"); } catch {}
    try { entity.setProperty("create:whistle_direction", direction); } catch {}
    try { entity.setProperty("create:whistle_connected_above", block.permutation.getState("create:connected_above") === true); } catch {}
    try {
        entity.teleport(location, {
            checkForBlocks: false
        });
    } catch {}
    return entity;
}

function emitSteam(block) {
    const direction = getDirection(block);
    const offset = PARTICLE_BY_DIRECTION[direction] ?? PARTICLE_BY_DIRECTION.south;
    try {
        const variables = new MolangVariableMap();
        variables.setFloat("variable.direction_x", offset.x);
        variables.setFloat("variable.direction_y", 0);
        variables.setFloat("variable.direction_z", offset.z);
        block.dimension.spawnParticle("create:steam_jet", {
            x: block.x + 0.5 + offset.x,
            y: block.y + 0.88,
            z: block.z + 0.5 + offset.z
        }, variables);
    } catch {}
}

export function whistleRedstoneUpdate(block, dimension, powerLevel) {
    if (block?.typeId !== WHISTLE_ID) return;
    const powered = powerLevel > 0;
    let wasPowered = false;
    try { wasPowered = block.permutation.getState("create:powered") === true; } catch {}
    if (wasPowered !== powered) {
        try { block.setPermutation(block.permutation.withState("create:powered", powered)); } catch {}
        if (powered) {
            const entity = ensureVisual(block);
            try { dimension.playSound("create:whistle", block.center(), { volume: 1.2, pitch: 1.0 }); } catch {}
            try { entity?.setDynamicProperty("create:last_whistle_sound_tick", system.currentTick); } catch {}
        } else {
            stopWhistleSound(block);
            removeVisual(block);
        }
    }
}

export function whistleTick(block) {
    if (block?.typeId !== WHISTLE_ID) return;
    let powered = false;
    try { powered = block.permutation.getState("create:powered") === true; } catch {}
    if (!powered) {
        removeVisual(block);
        return;
    }
    const entity = ensureVisual(block);
    const lastSoundTick = Number(entity?.getDynamicProperty?.("create:last_whistle_sound_tick") ?? -WHISTLE_SOUND_INTERVAL);
    if (system.currentTick - lastSoundTick >= WHISTLE_SOUND_INTERVAL) {
        try { block.dimension.playSound("create:whistle", block.center(), { volume: 1.2, pitch: 1.0 }); } catch {}
        try { entity?.setDynamicProperty("create:last_whistle_sound_tick", system.currentTick); } catch {}
    }
    emitSteam(block);
}

export function whistleBreak(block, brokenBlockPermutation) {
    const brokenId = brokenBlockPermutation?.type?.id;
    if (brokenId !== WHISTLE_ID && brokenId !== WHISTLE_TUBE_ID) return;
    if (brokenId === WHISTLE_ID) {
        stopWhistleSound(block);
        removeVisual(block);
    }
    const dimension = block.dimension;
    const location = { ...block.location };
    system.run(() => {
        try {
            // Tubes depend on the segment immediately below them. Destroy the
            // entire continuous column above when its support is removed.
            for (let y = location.y + 1; y < location.y + 320; y++) {
                const above = dimension.getBlock({ x: location.x, y, z: location.z });
                if (above?.typeId !== WHISTLE_TUBE_ID) break;
                const dropLocation = above.center();
                above.setType("minecraft:air");
                try { dimension.spawnItem(new ItemStack(WHISTLE_ID, 1), dropLocation); } catch {}
            }

            const below = dimension.getBlock({ x: location.x, y: location.y - 1, z: location.z });
            if (below?.typeId === WHISTLE_ID || below?.typeId === WHISTLE_TUBE_ID) {
                below.setPermutation(below.permutation.withState("create:connected_above", false));
            }
        } catch {}
    });
}

// A quebra com Wrench troca o bloco diretamente para ar e não aciona
// consistentemente o componente on_break. Fazemos a mesma limpeza aqui para
// não deixar a visual do Whistle, nem a tampa da extensão, travadas.
export function whistleWrenchRemoved(dimension, location, brokenId) {
    if (!dimension || !location) return;
    if (brokenId !== WHISTLE_ID && brokenId !== WHISTLE_TUBE_ID) return;

    if (brokenId === WHISTLE_ID) {
        removeVisualAt(dimension, location);
        let players = [];
        try {
            players = dimension.getPlayers({
                location: { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 },
                maxDistance: 64
            });
        } catch {}
        for (const player of players) {
            try { player.stopSound("create:whistle"); } catch {}
        }
    }

    try {
        // Remover uma extensão no meio também desmonta as extensões que
        // perderam apoio acima dela, devolvendo Whistles normais.
        for (let y = location.y + 1; y < location.y + 320; y++) {
            const above = dimension.getBlock({ x: location.x, y, z: location.z });
            if (above?.typeId !== WHISTLE_TUBE_ID) break;
            const dropLocation = above.center();
            above.setType("minecraft:air");
            dimension.spawnItem(new ItemStack(WHISTLE_ID, 1), dropLocation);
        }

        const below = dimension.getBlock({ x: location.x, y: location.y - 1, z: location.z });
        if (below?.typeId === WHISTLE_ID || below?.typeId === WHISTLE_TUBE_ID) {
            below.setPermutation(below.permutation.withState("create:connected_above", false));
        }
    } catch {}
}

export function whistlePlace(block) {
    if (block?.typeId !== WHISTLE_ID) return;
    const dimension = block.dimension;
    const location = { ...block.location };
    system.run(() => {
        try {
            const current = dimension.getBlock(location);
            if (current?.typeId !== WHISTLE_ID) return;
            const below = dimension.getBlock({ x: location.x, y: location.y - 1, z: location.z });
            if (below?.typeId !== WHISTLE_ID && below?.typeId !== WHISTLE_TUBE_ID) return;

            const direction = current.permutation.getState("minecraft:cardinal_direction") ?? "south";
            current.setPermutation(BlockPermutation.resolve(WHISTLE_TUBE_ID, {
                "minecraft:cardinal_direction": direction,
                "create:connected_above": false
            }));
            below.setPermutation(below.permutation.withState("create:connected_above", true));
        } catch {}
    });
}
