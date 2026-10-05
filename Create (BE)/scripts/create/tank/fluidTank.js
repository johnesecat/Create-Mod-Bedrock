import * as mc from "@minecraft/server";
import { fluidTankVisualStructure } from "./visual_structure.js";
import { compatibilityFluids } from "../compatibility/registries.js";

const TANK_ID = "create:fluid_tank";
const CREATIVE_TANK_ID = "create:creative_fluid_tank";
const TANK_FLUID_ENTITY = "create:fluid_tank_fluid";
// Cada bloco do tanque armazena 6 baldes (6.000 mB).
const CAPACITY_PER_BLOCK = 6000;
const MAX_CONNECTED_BLOCKS = 288;
const DIRECTIONS = [
    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
];
const FILLED_BUCKETS = new Set([
    "minecraft:water_bucket",
    "minecraft:lava_bucket",
    "minecraft:milk_bucket",
    "create:honey_bucket",
    "create:chocolate_bucket"
]);

function posKey(location) {
    return `${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

function propertyKey(block) {
    return `${block.typeId === CREATIVE_TANK_ID ? CREATIVE_TANK_ID : TANK_ID}:${block.dimension.id}:${posKey(block.location)}`;
}

function isTank(block) {
    return block?.typeId === TANK_ID || block?.typeId === CREATIVE_TANK_ID;
}

function safeBlock(dimension, location) {
    try { return dimension.getBlock(location); } catch { return undefined; }
}

function connectedTankBlocks(origin) {
    if (!isTank(origin)) return [];
    // O tanque criativo é independente: cada bloco guarda uma fonte infinita.
    const tankType = origin.typeId;
    const structured = fluidTankVisualStructure.getBlocks(origin);
    if (structured.length) return structured;
    const queue = [origin];
    const visited = new Set();
    const blocks = [];

    while (queue.length && blocks.length < MAX_CONNECTED_BLOCKS) {
        const block = queue.shift();
        const key = posKey(block.location);
        if (visited.has(key) || block.typeId !== tankType) continue;
        visited.add(key);
        blocks.push(block);

        for (const direction of DIRECTIONS) {
            const next = safeBlock(block.dimension, {
                x: block.x + direction.x,
                y: block.y + direction.y,
                z: block.z + direction.z
            });
            if (next?.typeId === tankType && !visited.has(posKey(next.location))) queue.push(next);
        }
    }
    return blocks;
}

function canReplaceForTank(block) {
    return block?.typeId === "minecraft:air"
        || block?.typeId === "minecraft:water"
        || block?.typeId === "minecraft:lava";
}

function countTankItems(player, tankType = TANK_ID) {
    if (player?.getGameMode?.() === "Creative") return 999999;
    const container = player?.getComponent("inventory")?.container;
    if (!container) return 0;
    let total = 0;
    for (let slot = 0; slot < container.size; slot++) {
        const item = container.getItem(slot);
        if (item?.typeId === tankType) total += item.amount;
    }
    return total;
}

function consumeTankItems(player, amount, tankType = TANK_ID) {
    if (player?.getGameMode?.() === "Creative") return true;
    const container = player?.getComponent("inventory")?.container;
    if (!container || countTankItems(player, tankType) < amount) return false;

    let remaining = amount;
    for (let slot = 0; slot < container.size && remaining > 0; slot++) {
        const item = container.getItem(slot);
        if (item?.typeId !== tankType) continue;
        const used = Math.min(item.amount, remaining);
        remaining -= used;
        if (item.amount > used) {
            item.amount -= used;
            container.setItem(slot, item);
        } else {
            container.setItem(slot, undefined);
        }
    }
    return remaining === 0;
}

function tankExtensionPlan(block, player, direction) {
    if (!isTank(block) || !player || (direction !== "up" && direction !== "down")) return undefined;
    const tankType = block.typeId;
    const blocks = fluidTankVisualStructure.getBlocks(block);
    if (!blocks.length) return undefined;

    const width = Number(block.permutation.getState("create:size")) || 1;
    const minX = Math.min(...blocks.map((entry) => entry.x));
    const maxX = Math.max(...blocks.map((entry) => entry.x));
    const minY = Math.min(...blocks.map((entry) => entry.y));
    const maxY = Math.max(...blocks.map((entry) => entry.y));
    const minZ = Math.min(...blocks.map((entry) => entry.z));
    const maxZ = Math.max(...blocks.map((entry) => entry.z));
    if (maxY - minY + 1 >= 32) return undefined;

    const y = direction === "up" ? maxY + 1 : minY - 1;
    const positions = [];
    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            const target = safeBlock(block.dimension, { x, y, z });
            if (!canReplaceForTank(target)) return undefined;
            positions.push({ x, y, z });
        }
    }
    if (positions.length !== width * width || countTankItems(player, tankType) < positions.length) return undefined;
    return {
        positions,
        tankType,
        off: Boolean(block.permutation.getState("create:off"))
    };
}

export function canExtendFluidTank(block, player, direction) {
    return !!tankExtensionPlan(block, player, direction);
}

export function extendFluidTank(block, player, direction) {
    const plan = tankExtensionPlan(block, player, direction);
    if (!plan || !consumeTankItems(player, plan.positions.length, plan.tankType)) return false;

    const permutation = mc.BlockPermutation.resolve(plan.tankType, {
        "create:size": 1,
        "create:height": "single",
        "create:pos_x": 0,
        "create:pos_z": 0,
        "create:off": plan.off
    });
    for (const position of plan.positions) {
        try {
            const target = block.dimension.getBlock(position);
            target.setPermutation(permutation);
            block.dimension.playSound("place.copper", target.center(), { volume: 0.65, pitch: 1.05 });
        } catch {}
    }
    const first = plan.positions[0];
    mc.system.run(() => {
        const target = safeBlock(block.dimension, first);
        if (target?.typeId === plan.tankType) fluidTankPlaced(target);
    });
    return true;
}

function readState(blocks) {
    for (const block of blocks) {
        try {
            const raw = mc.world.getDynamicProperty(propertyKey(block));
            if (typeof raw !== "string") continue;
            const state = JSON.parse(raw);
            const amount = Math.max(0, Number(state?.amount) || 0);
            if (state?.fluid && amount > 0) return { fluid: state.fluid, amount };
        } catch {}
    }
    return { fluid: undefined, amount: 0 };
}

function writeState(blocks, state) {
    const capacity = blocks.length * CAPACITY_PER_BLOCK;
    const amount = Math.max(0, Math.min(capacity, Number(state.amount) || 0));
    const normalized = {
        fluid: amount > 0 ? state.fluid : undefined,
        amount
    };
    const encoded = JSON.stringify(normalized);
    for (const block of blocks) {
        try { mc.world.setDynamicProperty(propertyKey(block), encoded); } catch {}
    }
    syncFluidTankVisual(blocks, normalized, capacity);
    return normalized;
}

function fluidVisualType(fluidId) {
    const registered = compatibilityFluids.get(fluidId);
    if (registered?.visualType) return registered.visualType;
    switch (fluidId) {
        case "minecraft:lava_bucket": return "lava";
        case "create:honey_bucket": return "honey";
        case "create:chocolate_bucket": return "chocolate";
        case "minecraft:milk_bucket": return "milk";
        default: return "water";
    }
}

function tankBounds(blocks) {
    if (!blocks.length) return undefined;
    return {
        minX: Math.min(...blocks.map((block) => block.x)),
        minY: Math.min(...blocks.map((block) => block.y)),
        minZ: Math.min(...blocks.map((block) => block.z)),
        maxX: Math.max(...blocks.map((block) => block.x)),
        maxY: Math.max(...blocks.map((block) => block.y)),
        maxZ: Math.max(...blocks.map((block) => block.z))
    };
}

function tankFluidVisuals(dimension, bounds) {
    if (!dimension || !bounds) return [];
    const width = bounds.maxX - bounds.minX + 1;
    const expectedLocation = {
        x: (bounds.minX + bounds.maxX + 1) / 2,
        y: bounds.maxY + 1,
        z: (bounds.minZ + bounds.maxZ + 1) / 2
    };
    let entities = [];
    try {
        entities = dimension.getEntities({
            type: TANK_FLUID_ENTITY,
            location: expectedLocation,
            maxDistance: 0.35
        });
    } catch {}
    return entities.filter((entity) => {
        try {
            const location = entity.location;
            const entityWidth = Number(entity.getProperty("create:tank_width")) || 1;
            const entityHeight = Number(entity.getProperty("create:tank_height")) || 1;
            const expectedHeight = bounds.maxY - bounds.minY + 1;
            return Math.abs(location.x - expectedLocation.x) <= 0.1
                && Math.abs(location.y - expectedLocation.y) <= 0.1
                && Math.abs(location.z - expectedLocation.z) <= 0.1
                && Math.abs(entityWidth - width) <= 0.01
                && Math.abs(entityHeight - expectedHeight) <= 0.01;
        } catch {
            return false;
        }
    });
}

function removeTankFluidVisuals(dimension, bounds) {
    for (const entity of tankFluidVisuals(dimension, bounds)) {
        try { entity.remove(); } catch {}
    }
}

function overlappingTankFluidVisuals(dimension, bounds) {
    if (!dimension || !bounds) return [];
    const center = {
        x: (bounds.minX + bounds.maxX + 1) / 2,
        y: (bounds.minY + bounds.maxY + 1) / 2,
        z: (bounds.minZ + bounds.maxZ + 1) / 2
    };
    const radius = Math.max(
        3,
        bounds.maxX - bounds.minX + 2,
        bounds.maxY - bounds.minY + 2,
        bounds.maxZ - bounds.minZ + 2
    );
    let entities = [];
    try {
        entities = dimension.getEntities({
            type: TANK_FLUID_ENTITY,
            location: center,
            maxDistance: radius
        });
    } catch {
        return [];
    }

    return entities.filter((entity) => {
        try {
            const width = Number(entity.getProperty("create:tank_width")) || 1;
            const height = Number(entity.getProperty("create:tank_height")) || 1;
            const location = entity.location;
            const oldMinX = location.x - width / 2;
            const oldMaxX = oldMinX + width - 1;
            const oldMaxY = location.y - 1;
            const oldMinY = oldMaxY - height + 1;
            const oldMinZ = location.z - width / 2;
            const oldMaxZ = oldMinZ + width - 1;
            return oldMinX <= bounds.maxX && oldMaxX >= bounds.minX
                && oldMinY <= bounds.maxY && oldMaxY >= bounds.minY
                && oldMinZ <= bounds.maxZ && oldMaxZ >= bounds.minZ;
        } catch {
            return false;
        }
    });
}

function removeFluidVisualContainingBlock(dimension, location) {
    if (!dimension || !location) return;
    let entities = [];
    try {
        entities = dimension.getEntities({
            type: TANK_FLUID_ENTITY,
            location: {
                x: location.x + 0.5,
                y: location.y + 0.5,
                z: location.z + 0.5
            },
            maxDistance: 40
        });
    } catch {
        return;
    }

    for (const entity of entities) {
        try {
            const width = Number(entity.getProperty("create:tank_width")) || 1;
            const height = Number(entity.getProperty("create:tank_height")) || 1;
            const visual = entity.location;
            const minX = visual.x - width / 2;
            const maxX = minX + width;
            const minY = visual.y - height;
            const maxY = visual.y;
            const minZ = visual.z - width / 2;
            const maxZ = minZ + width;
            const centerX = location.x + 0.5;
            const centerY = location.y + 0.5;
            const centerZ = location.z + 0.5;

            if (
                centerX >= minX && centerX <= maxX
                && centerY >= minY && centerY <= maxY
                && centerZ >= minZ && centerZ <= maxZ
            ) {
                entity.remove();
            }
        } catch {}
    }
}

function syncFluidTankVisual(blocks, state, capacity) {
    if (!blocks?.length) return;
    const bounds = tankBounds(blocks);
    const dimension = blocks[0].dimension;
    let visuals = tankFluidVisuals(dimension, bounds);
    if (!visuals.length) visuals = overlappingTankFluidVisuals(dimension, bounds);
    if (!state.fluid || state.amount <= 0 || capacity <= 0) {
        for (const entity of visuals) {
            try { entity.remove(); } catch {}
        }
        return;
    }

    const width = bounds.maxX - bounds.minX + 1;
    const structureHeight = bounds.maxY - bounds.minY + 1;
    const fillRatio = Math.max(0, Math.min(1, state.amount / capacity));
    const fluidHeight = Math.max(0.01, (structureHeight - 0.125) * fillRatio);
    const location = {
        x: bounds.minX + width / 2,
        y: bounds.maxY + 1,
        z: bounds.minZ + width / 2
    };

    try {
        const entity = visuals.shift() ?? dimension.spawnEntity(TANK_FLUID_ENTITY, location);
        for (const duplicate of visuals) {
            try { duplicate.remove(); } catch {}
        }
        try { entity.teleport(location); } catch {}
        entity.setProperty("create:tank_width", width);
        entity.setProperty("create:tank_height", structureHeight);
        entity.setProperty("create:fluid_height", fluidHeight);
        entity.setProperty("create:fluid_type", fluidVisualType(state.fluid));
    } catch {}
}

function tankInfo(block) {
    const blocks = connectedTankBlocks(block);
    const state = readState(blocks);
    const capacity = blocks.length * CAPACITY_PER_BLOCK;
    return {
        blocks,
        state: {
            fluid: state.fluid,
            amount: Math.min(state.amount, capacity)
        },
        capacity
    };
}

export function getFluidTankInfo(block, knownBlocks) {
    if (!isTank(block)) return undefined;
    const info = knownBlocks?.length
        ? {
            blocks: knownBlocks,
            state: readState(knownBlocks),
            capacity: knownBlocks.length * CAPACITY_PER_BLOCK
        }
        : tankInfo(block);
    return {
        amount: Math.min(info.state.amount, info.capacity),
        fluid: info.state.fluid,
        capacity: info.capacity,
        blockCount: info.blocks.length,
        capacityPerBlock: CAPACITY_PER_BLOCK
    };
}

// Recria/sincroniza o visual após uma entidade do tanque ser carregada junto
// com o chunk. Isso impede visuais antigos quando o mundo é reaberto.
export function refreshFluidTankVisual(block) {
    if (!isTank(block)) return false;
    const info = tankInfo(block);
    if (!info.blocks.length) return false;
    syncFluidTankVisual(info.blocks, info.state, info.capacity);
    return true;
}

// API usada pelo Steam Engine. Mantém a descoberta da estrutura em um único
// lugar, evitando que tanques 2x2/3x3 sejam tratados como tanques separados.
export function getConnectedFluidTankBlocks(block) {
    if (!isTank(block)) return [];
    return connectedTankBlocks(block);
}

export function setFluidTankBoilerClosed(block, closed) {
    if (block?.typeId !== TANK_ID) return false;
    const blocks = connectedTankBlocks(block);
    if (!blocks.length) return false;

    for (const tank of blocks) {
        try {
            const desired = Boolean(closed);
            if (Boolean(tank.permutation.getState("create:off")) !== desired) {
                tank.setPermutation(tank.permutation.withState("create:off", desired));
            }
        } catch {}
    }
    return true;
}

export function peekFluidTankFluid(block) {
    if (!isTank(block)) return undefined;
    const { state } = tankInfo(block);
    return state.amount >= 1000 ? state.fluid : undefined;
}

export function receiveFluidTankFluid(block, fluidId, amount = 1000) {
    if (!isTank(block) || !fluidId || amount <= 0) return false;
    const info = tankInfo(block);
    if (!info.blocks.length) return false;
    if (info.state.fluid && info.state.fluid !== fluidId) return false;
    if (block.typeId === CREATIVE_TANK_ID) {
        writeState(info.blocks, { fluid: fluidId, amount: info.capacity });
        return true;
    }
    if (info.state.amount + amount > info.capacity) return false;
    writeState(info.blocks, { fluid: fluidId, amount: info.state.amount + amount });
    return true;
}

export function takeFluidTankFluid(block, fluidId, amount = 1000) {
    if (!isTank(block) || amount <= 0) return false;
    const info = tankInfo(block);
    if (info.state.fluid !== fluidId || info.state.amount < amount) return false;
    if (block.typeId === CREATIVE_TANK_ID) return true;
    writeState(info.blocks, { fluid: fluidId, amount: info.state.amount - amount });
    return true;
}

function replaceHeldItem(player, itemId) {
    if (player?.getGameMode?.() === "Creative") return;
    try {
        player.getComponent("equippable")?.setEquipment(mc.EquipmentSlot.Mainhand, new mc.ItemStack(itemId, 1));
    } catch {}
}

export function fluidTankInteract(block, player, item) {
    if (!isTank(block) || !player || !item) return false;

    const registeredFluid = compatibilityFluids.get(item.typeId)
        ?? [...compatibilityFluids.values()].find((fluid) => fluid.bucket === item.typeId);
    if (FILLED_BUCKETS.has(item.typeId) || registeredFluid) {
        const fluidId = registeredFluid?.id ?? item.typeId;
        if (!receiveFluidTankFluid(block, fluidId, 1000)) return false;
        replaceHeldItem(player, registeredFluid?.empty ?? "minecraft:bucket");
        try { block.dimension.playSound(registeredFluid?.sound ?? registeredFluid?.fillSound ?? "bucket.empty_water", block.center(), { volume: 0.7, pitch: 1 }); } catch {}
        return true;
    }

    const fluidId = peekFluidTankFluid(block);
    const storedFluid = compatibilityFluids.get(fluidId);
    if (fluidId && item.typeId === (storedFluid?.empty ?? "minecraft:bucket")) {
        if (!fluidId || !takeFluidTankFluid(block, fluidId, 1000)) return false;
        replaceHeldItem(player, storedFluid?.bucket ?? fluidId);
        try { block.dimension.playSound(storedFluid?.fillSound ?? storedFluid?.sound ?? "bucket.fill_water", block.center(), { volume: 0.7, pitch: 1 }); } catch {}
        return true;
    }
    return false;
}

export function toggleFluidTankTexture(block) {
    if (!isTank(block)) return false;
    const blocks = connectedTankBlocks(block);
    const current = Boolean(block.permutation.getState("create:off"));

    for (const tank of blocks.length ? blocks : [block]) {
        try {
            tank.setPermutation(tank.permutation.withState("create:off", !current));
        } catch {}
    }

    try {
        block.dimension.playSound("random.click", block.center(), { volume: 0.6, pitch: current ? 0.9 : 1.1 });
    } catch {}
    return true;
}

export function fluidTankPlaced(block) {
    if (!isTank(block)) return;
    fluidTankVisualStructure.expandOrAssemble(block);
    const info = tankInfo(block);
    writeState(info.blocks, block.typeId === CREATIVE_TANK_ID && info.state.fluid
        ? { fluid: info.state.fluid, amount: info.capacity }
        : info.state);
}

export function fluidTankBroken(dimension, location, brokenType = TANK_ID) {
    removeFluidVisualContainingBlock(dimension, location);
    try { mc.world.setDynamicProperty(`${brokenType}:${dimension.id}:${posKey(location)}`, undefined); } catch {}
    fluidTankVisualStructure.breakAndReassemble(dimension, location, brokenType);

    const groups = [];
    const grouped = new Set();
    for (const direction of DIRECTIONS) {
        const neighbor = safeBlock(dimension, {
            x: location.x + direction.x,
            y: location.y + direction.y,
            z: location.z + direction.z
        });
        if (neighbor?.typeId !== brokenType) continue;
        const blocks = connectedTankBlocks(neighbor);
        const groupId = blocks.map((entry) => posKey(entry.location)).sort().join("|");
        if (!groupId || grouped.has(groupId)) continue;
        grouped.add(groupId);
        groups.push(blocks);
    }

    let sharedState = { fluid: undefined, amount: 0 };
    for (const blocks of groups) {
        const state = readState(blocks);
        if (state.fluid && state.amount > 0) {
            sharedState = state;
            break;
        }
    }

    let remaining = sharedState.amount;
    for (const blocks of groups) {
        const capacity = blocks.length * CAPACITY_PER_BLOCK;
        const amount = brokenType === CREATIVE_TANK_ID && sharedState.fluid
            ? capacity
            : Math.min(capacity, remaining);
        writeState(blocks, { fluid: sharedState.fluid, amount });
        if (brokenType !== CREATIVE_TANK_ID) remaining -= amount;
    }
}

export function rebuildLoadedFluidTanks() {
    const rebuilt = new Set();
    let propertyIds = [];
    try { propertyIds = mc.world.getDynamicPropertyIds(); } catch { return; }

    for (const id of propertyIds) {
        if (!id.startsWith(`${TANK_ID}:`) && !id.startsWith(`${CREATIVE_TANK_ID}:`)) continue;
        const match = id.match(/^create:(fluid_tank|creative_fluid_tank):(.+):(-?\d+),(-?\d+),(-?\d+)$/);
        if (!match) continue;

        try {
            const tankType = `create:${match[1]}`;
            const dimensionId = match[2].replace(/^minecraft:/, "");
            const dimension = mc.world.getDimension(dimensionId);
            const block = safeBlock(dimension, {
                x: Number(match[3]),
                y: Number(match[4]),
                z: Number(match[5])
            });
            if (block?.typeId !== tankType) continue;

            const key = `${match[2]}:${posKey(block.location)}`;
            if (rebuilt.has(key)) continue;
            fluidTankVisualStructure.expandOrAssemble(block);
            const blocks = connectedTankBlocks(block);
            for (const connected of blocks) {
                rebuilt.add(`${match[2]}:${posKey(connected.location)}`);
            }
            const state = readState(blocks);
            if (tankType === CREATIVE_TANK_ID && state.fluid) {
                writeState(blocks, { fluid: state.fluid, amount: blocks.length * CAPACITY_PER_BLOCK });
            } else {
                updateFluidVisual(blocks, state);
            }
        } catch {}
    }
}
