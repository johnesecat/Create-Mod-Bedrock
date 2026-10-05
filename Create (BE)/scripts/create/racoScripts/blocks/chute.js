import * as mc from "@minecraft/server"
import { setPermutation, clearMainhand, setItemInHand, isHandEquippedFilterItem } from "../raco-API.js"
import { getCreativeCrateItem } from "./creativeCrate.js"

const CHUTE = "create:chute";
const SMART_CHUTE = "create:chute_smart";
const CHUTE_TYPES = new Set([CHUTE, SMART_CHUTE]);
const SMART_CHUTE_FILTER_ENTITY = "create:chute_smart_filter";
const SMART_CHUTE_FILTER_ITEM_PREFIX = "create:chute_smart_filter_item:";
const SMART_CHUTE_FILTER_FACE_PREFIX = "create:chute_smart_filter_face:";
const SMART_CHUTE_FILTER_OWNER_PROP = "create:chute_smart_filter_owner";

function isChute(block) {
    return CHUTE_TYPES.has(block?.typeId);
}

function isSmartChute(block) {
    return block?.typeId === SMART_CHUTE;
}

function smartChuteKey(block, prefix) {
    const dim = block?.dimension?.id ?? "overworld";
    const loc = block?.location;
    return `${prefix}${dim}:${loc?.x},${loc?.y},${loc?.z}`;
}

function smartChuteOwnerKey(block) {
    return smartChuteKey(block, "");
}

function chutePlacementStates(typeId, chuteType, direction) {
    const states = {
        "create:type": chuteType,
        "create:direction": direction
    };
    if (typeId === SMART_CHUTE) states["create:on"] = false;
    return states;
}

const FACE_BLOCK = {
    "North": (b) => b.north().above(),
    "South": (b) => b.south().above(),
    "East":  (b) => b.east().above(),
    "West":  (b) => b.west().above()
};

const FACE_DIR = {
    "North": "south",
    "South": "north",
    "East":  "west",
    "West":  "east"
};

const INTERACT_FACE_TO_DIR = {
    "North": "north",
    "South": "south",
    "East": "east",
    "West": "west",
    "Up": "up",
    "Down": "down"
};

// The block this directional chute flows INTO (diagonally below-forward)
function getFacedBlock(block) {
    const dir = block.permutation.getState("create:direction");
    if (dir === "north") return block.north()?.below();
    if (dir === "south") return block.south()?.below();
    if (dir === "east")  return block.east()?.below();
    if (dir === "west")  return block.west()?.below();
    return null;
}

// True if src (a diagonal/full chute) flows into dest
function feedsInto(src, dest) {
    if (!isChute(src)) return false;
    const srcType = src.permutation.getState("create:type");
    if (srcType !== "diagonal" && srcType !== "full") return false;
    const faced = getFacedBlock(src);
    if (!faced) return false;
    const fl = faced.location, dl = dest.location;
    return fl.x === dl.x && fl.y === dl.y && fl.z === dl.z;
}

function calcChuteType(block) {
    const type = block.permutation.getState("create:type");

    if (type === "default" || type === "box") {
        // box = at least one diagonal/full above feeds into this
        const hasDiagFeeder = [
            block.north().above(),
            block.south().above(),
            block.east().above(),
            block.west().above(),
        ].some(b => feedsInto(b, block));
        return hasDiagFeeder ? "box" : "default";
    }

    // Directed (diagonal / full):
    // "diagonal" ONLY when it's a true middle-man: same-axis upstream above AND feeds into another directed chute below
    const dir = block.permutation.getState("create:direction");
    const isNS = dir === "north" || dir === "south";
    const above = block.above();

    const hasVerticalInput =
        isChute(above) &&
        (above.permutation.getState("create:type") === "default" ||
         above.permutation.getState("create:type") === "box");

    const hasContainerAbove = !!above?.getComponent?.("inventory");

    const hasSameAxisFeeder = [
        block.north().above(),
        block.south().above(),
        block.east().above(),
        block.west().above(),
    ].some(b => {
        if (!feedsInto(b, block)) return false;
        const bDir = b.permutation.getState("create:direction");
        return (bDir === "north" || bDir === "south") === isNS;
    });

    const hasCrossInput = [
        block.north().above(),
        block.south().above(),
        block.east().above(),
        block.west().above(),
    ].some(b => {
        if (!feedsInto(b, block)) return false;
        const bDir = b.permutation.getState("create:direction");
        return (bDir === "north" || bDir === "south") !== isNS;
    });

    const facedBlock = getFacedBlock(block);
    const feedsToChute = isChute(facedBlock);

    // Completely isolated: no upstream, no downstream → reset to default
    if (!feedsToChute && !hasSameAxisFeeder && !hasVerticalInput && !hasContainerAbove && !hasCrossInput) {
        return "default";
    }

    // Middle of chain: same-axis upstream + downstream + no extra inputs → pass-through
    if (hasSameAxisFeeder && feedsToChute && !hasVerticalInput && !hasContainerAbove && !hasCrossInput) {
        return "diagonal";
    }

    // Has upstream but no downstream → endpoint receiver, no diagonal exit
    if (!feedsToChute && (hasSameAxisFeeder || hasCrossInput || hasVerticalInput || hasContainerAbove)) {
        return "box";
    }

    // Top of chain (has downstream, no same-axis upstream) or junction → full
    return "full";
}

export function onInteract(block, player, item, face) {
    if (!isChute(block)) return;

    if (isSmartChute(block) && player?.isSneaking) {
        clearSmartChuteFilter(block);
        return;
    }

    const holdingChute = CHUTE_TYPES.has(item?.typeId);
    if (isSmartChute(block) && item && !holdingChute) {
        setSmartChuteFilter(block, item, face);
        return;
    }

    if (!holdingChute) return;

    // Up or Down → place a default chute directly above/below
    if (face === "Up" || face === "Down") {
        const targetBlock = face === "Up" ? block.above() : block.below();
        if (!targetBlock || targetBlock.typeId !== "minecraft:air") return;

        mc.system.run(() => {
            targetBlock.setPermutation(mc.BlockPermutation.resolve(item.typeId, chutePlacementStates(item.typeId, "default", "north")));

            // If placed above a diagonal, that diagonal now has a vertical input → full
            if (face === "Up") {
                const blockType = block.permutation.getState("create:type");
                if (blockType === "diagonal") setPermutation(block, "create:type", "full");
            }

            clearMainhand(player, 1);
        });
        return;
    }

    const getTarget = FACE_BLOCK[face];
    if (!getTarget) return;

    const targetBlock = getTarget(block);
    if (!targetBlock || targetBlock.typeId !== "minecraft:air") return;

    mc.system.run(() => {
        // Place directed, then resolve the correct type
        targetBlock.setPermutation(mc.BlockPermutation.resolve(item.typeId, chutePlacementStates(item.typeId, "diagonal", FACE_DIR[face])));

        const newType = calcChuteType(targetBlock);
        if (newType !== "diagonal") setPermutation(targetBlock, "create:type", newType);

        // Update the clicked block — it may now become box/full
        setPermutation(block, "create:type", calcChuteType(block));

        clearMainhand(player, 1);
    });
}



// ─── Item Transport ──────────────────────────────────────────────────────────

function pullFromContainer(container) {
    for (let i = 0; i < container.size; i++) {
        const slot = container.getItem(i);
        if (!slot) continue;
        const out = slot.clone();
        out.amount = 1;
        if (slot.amount > 1) { slot.amount--; container.setItem(i, slot); }
        else                  { container.setItem(i, undefined); }
        return out;
    }
    return null;
}

export const smartChuteComponent = {
    onTick: event => {
        onTick(event.block);
    },
    onPlayerInteract: event => {
        const player = event.player;
        const item = player?.getComponent("equippable")?.getEquipment("Mainhand");
        onInteract(event.block, player, item, event.face);
    },
    onRedstoneUpdate: event => {
        redstoneUpdate(event.block, event.powerLevel);
    },
    onPlayerBreak: event => {
        onBreak(event.block, event.brokenBlockPermutation, event.dimension);
    }
};

function peekFromContainer(container, filterId = undefined) {
    for (let i = 0; i < container.size; i++) {
        const slot = container.getItem(i);
        if (filterId && slot?.typeId !== filterId) continue;
        if (slot) return slot.clone();
    }
    return null;
}

function consumeOneFromContainer(container, itemId) {
    for (let i = 0; i < container.size; i++) {
        const slot = container.getItem(i);
        if (!slot || slot.typeId !== itemId) continue;
        const out = slot.clone();
        out.amount = 1;
        if (slot.amount > 1) { slot.amount--; container.setItem(i, slot); }
        else container.setItem(i, undefined);
        return out;
    }
    return null;
}

function findDroppedItemEntity(dimension, location, filterItem) {
    const filterId = filterItem?.typeId;
    for (const entity of dimension.getEntities({ type: "minecraft:item", location, maxDistance: 1.5, minDistance: 0 })) {
        if (!entity?.isValid) continue;
        const item = entity.getComponent("item")?.itemStack;
        if (!item) continue;
        if (filterId && item.typeId !== filterId) continue;
        return entity;
    }
    return undefined;
}

function insertIntoContainer(container, itemStack) {
    const id = itemStack.typeId;
    for (let i = 0; i < container.size; i++) {
        const slot = container.getItem(i);
        if (slot?.typeId === id && slot.amount < slot.maxAmount) {
            slot.amount++;
            container.setItem(i, slot);
            return true;
        }
    }
    for (let i = 0; i < container.size; i++) {
        if (!container.getItem(i)) { container.setItem(i, itemStack); return true; }
    }
    return false;
}

function spawnFixed(dim, item, pos) {
    const e = dim.spawnItem(item, pos);
    e?.clearVelocity();
    return e;
}

// Walks the chute chain starting at startBlock and returns the first
// non-chute block that the item would exit into (container or air/other).
// Rules: diagonal/full → exit via getFacedBlock (down + sideways)
//        default/box   → exit via below()
function tracePath(startBlock, itemStack) {
    let current = startBlock;
    const visited = new Set();
    while (true) {
        if (isSmartChute(current) && isSmartChutePowered(current)) return null;
        if (isSmartChute(current) && !smartChuteAllows(current, itemStack)) return null;

        const key = `${current.location.x},${current.location.y},${current.location.z}`;
        if (visited.has(key)) return null; // loop guard
        visited.add(key);

        const type = current.permutation.getState("create:type");
        const next = (type === "diagonal" || type === "full")
            ? getFacedBlock(current)
            : current.below();

        // If there's no next block, or it's not a chute, this is the exit
        if (!next || !isChute(next)) return next ?? null;
        if (isSmartChute(next) && isSmartChutePowered(next)) return null;
        if (isSmartChute(next) && !smartChuteAllows(next, itemStack)) return null;

        current = next;
    }
}

export function onTick(block) {
    syncSmartChuteFilter(block);
    if (isSmartChute(block) && isSmartChutePowered(block)) return;

    const type = block.permutation.getState("create:type");
    // Only default, box and full have a top-face input
    if (type !== "default" && type !== "box" && type !== "full") return;

    const dim = block.dimension;
    const loc = block.location;

    // ── INTAKE: container directly above ─────────────────────────────────────
    const above = block.above();
    const invAbove = above?.getComponent?.("inventory");
    const ownFilter = isSmartChute(block) ? getSmartChuteFilterItem(block) : undefined;
    const ownFilterId = ownFilter?.typeId;
    const creativeCandidate = above?.typeId === "create:crate_creative"
        ? getCreativeCrateItem(above, 1)
        : null;
    const containerCandidate = creativeCandidate ? null : (invAbove ? peekFromContainer(invAbove.container, ownFilterId) : null);
    const sourceCandidate = creativeCandidate ?? containerCandidate;
    if (sourceCandidate && !smartChuteAllows(block, sourceCandidate)) return;

    // ── INTAKE: item entity resting on top of this block ─────────────────────
    const intakePos = { x: loc.x + 0.5, y: loc.y + 1, z: loc.z + 0.5 };
    const dropped = sourceCandidate ? null : findDroppedItemEntity(dim, intakePos, ownFilter);

    const droppedItem = dropped?.getComponent("item")?.itemStack?.clone();
    const candidate = sourceCandidate ?? droppedItem;
    if (!candidate || !smartChuteAllows(block, candidate)) return;

    // ── TRACE PATH & DELIVER ──────────────────────────────────────────────────
    // Follow the chain to find where the item exits
    const dest = tracePath(block, candidate);
    if (!dest) return;

    const item = creativeCandidate ?? (containerCandidate
        ? consumeOneFromContainer(invAbove.container, containerCandidate.typeId)
        : droppedItem);
    if (!item) return;
    if (dropped) dropped.remove();

    const dl = dest.location;
    const destPos = { x: dl.x + 0.5, y: dl.y + 0.5, z: dl.z + 0.5 };

    // If exit block is a container, insert into it
    const inv = dest.getComponent?.("inventory");
    if (inv) {
        if (!insertIntoContainer(inv.container, item)) {
            spawnFixed(dim, item, destPos); // container full, drop at exit
        }
        return;
    }

    // Otherwise drop item at the exit point
    spawnFixed(dim, item, destPos);
}

// ─── Break update ─────────────────────────────────────────────────────────────

export function onBreak(block, brokenPermutation, dimension) {
    if (brokenPermutation?.type?.id === SMART_CHUTE || brokenPermutation?.typeId === SMART_CHUTE) {
        try { getSmartChuteFilterEntity(block)?.remove(); } catch {}
        clearStoredSmartChuteFilter(block);
    }

    const brokenType = brokenPermutation?.getState("create:type");
    const brokenDir  = brokenPermutation?.getState("create:direction");
    if (!brokenType) return;

    const dimId = (dimension ?? block.dimension).id;
    const { x, y, z } = block.location;

    mc.system.run(() => {
        const dim = mc.world.getDimension(dimId);
        const toUpdate = new Map();

        function walkAll(px, py, pz) {
            const key = `${px},${py},${pz}`;
            if (toUpdate.has(key)) return;
            const b = dim.getBlock({ x: px, y: py, z: pz });
            if (!isChute(b)) return;
            toUpdate.set(key, b);
            const type = b.permutation.getState("create:type");

            // Edge: directed feeders from diagonal-above (all 4 dirs) that point HERE
            const diagonalAbove = [
                dim.getBlock({ x: px,   y: py+1, z: pz-1 }),
                dim.getBlock({ x: px,   y: py+1, z: pz+1 }),
                dim.getBlock({ x: px+1, y: py+1, z: pz   }),
                dim.getBlock({ x: px-1, y: py+1, z: pz   }),
            ];
            for (const fb of diagonalAbove) {
                if (!isChute(fb)) continue;
                const ft = fb.permutation.getState("create:type");
                if (ft !== "diagonal" && ft !== "full") continue;
                const faced = getFacedBlock(fb);
                const fl = faced?.location;
                if (fl?.x === px && fl?.y === py && fl?.z === pz) {
                    walkAll(fb.location.x, fb.location.y, fb.location.z);
                }
            }

            // Edge: directly above — default/box/full all have top input
            walkAll(px, py + 1, pz);

            // Edge: directed downstream
            if (type === "diagonal" || type === "full") {
                const next = getFacedBlock(b);
                if (next) walkAll(next.location.x, next.location.y, next.location.z);
            }

            // Edge: vertical downstream (default/box passes to block below)
            if (type === "default" || type === "box") {
                walkAll(px, py - 1, pz);
            }
        }

        // Seed the traversal from all immediate neighbors of the broken position
        walkAll(x, y + 1, z);
        walkAll(x, y - 1, z);
        walkAll(x, y+1, z-1);
        walkAll(x, y+1, z+1);
        walkAll(x+1, y+1, z);
        walkAll(x-1, y+1, z);

        if (brokenType !== "default" && brokenType !== "box") {
            let tx = x, ty = y - 1, tz = z;
            if (brokenDir === "north")      tz = z - 1;
            else if (brokenDir === "south") tz = z + 1;
            else if (brokenDir === "east")  tx = x + 1;
            else if (brokenDir === "west")  tx = x - 1;
            walkAll(tx, ty, tz);
        }

        // Snapshot: compute all new types before applying any
        const updates = [];
        for (const b of toUpdate.values())
            updates.push({ b, newType: calcChuteType(b) });
        for (const { b, newType } of updates)
            setPermutation(b, "create:type", newType);
    });
}

export function redstoneUpdate(block, powerLevel) {
    if (!isSmartChute(block)) return;
    const powered = powerLevel > 0;
    try {
        if (block.permutation.getState("create:on") !== powered) {
            setPermutation(block, "create:on", powered);
        }
    } catch {}
    syncSmartChuteFilter(block);
}

function isSmartChutePowered(block) {
    try { return block?.permutation?.getState("create:on") === true; }
    catch { return false; }
}

function smartChuteAllows(block, itemStack) {
    if (!isSmartChute(block)) return true;
    const filterId = getSmartChuteFilterItem(block)?.typeId;
    return !filterId || itemStack?.typeId === filterId;
}

function smartChuteFilterFacing(block) {
    try {
        const storedFace = mc.world.getDynamicProperty(smartChuteKey(block, SMART_CHUTE_FILTER_FACE_PREFIX));
        if (typeof storedFace === "string" && ["north", "east", "south", "west", "up", "down"].includes(storedFace)) {
            return storedFace;
        }
    } catch {}

    try {
        const type = block.permutation.getState("create:type");
        if (type === "diagonal" || type === "full") return block.permutation.getState("create:direction");
    } catch {}
    return "up";
}

function smartChuteFilterLocation(block) {
    return block.center();
}

function getSmartChuteFilterEntity(block) {
    if (!block) return undefined;
    const ownerKey = smartChuteOwnerKey(block);
    const center = smartChuteFilterLocation(block);
    const entities = block.dimension.getEntities({
        type: SMART_CHUTE_FILTER_ENTITY,
        location: center,
        maxDistance: 0.45,
        closest: 1
    });

    return entities.find(entity => {
        try {
            const storedOwner = entity.getDynamicProperty(SMART_CHUTE_FILTER_OWNER_PROP);
            if (storedOwner) return storedOwner === ownerKey;
        } catch {}
        return distanceSq(entity.location, center) <= 0.04;
    });
}

function getSmartChuteFilterItem(block, entity = getSmartChuteFilterEntity(block)) {
    const visualItem = entity?.getComponent("minecraft:inventory")?.container?.getItem(0);
    if (visualItem) return visualItem;

    try {
        const storedItem = mc.world.getDynamicProperty(smartChuteKey(block, SMART_CHUTE_FILTER_ITEM_PREFIX));
        if (typeof storedItem === "string" && storedItem.length > 0) return new mc.ItemStack(storedItem, 1);
    } catch {}

    return undefined;
}

function setStoredSmartChuteFilter(block, item, face) {
    try { mc.world.setDynamicProperty(smartChuteKey(block, SMART_CHUTE_FILTER_ITEM_PREFIX), item?.typeId); } catch {}
    if (face) {
        const visualFace = INTERACT_FACE_TO_DIR[face] ?? face;
        try { mc.world.setDynamicProperty(smartChuteKey(block, SMART_CHUTE_FILTER_FACE_PREFIX), visualFace); } catch {}
    }
}

function clearStoredSmartChuteFilter(block) {
    try { mc.world.setDynamicProperty(smartChuteKey(block, SMART_CHUTE_FILTER_ITEM_PREFIX), undefined); } catch {}
    try { mc.world.setDynamicProperty(smartChuteKey(block, SMART_CHUTE_FILTER_FACE_PREFIX), undefined); } catch {}
}

function clearSmartChuteFilterVisual(entity) {
    try { entity?.getComponent("minecraft:inventory")?.container?.setItem(0, undefined); } catch {}
    try { entity?.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air"); } catch {}
}

function syncSmartChuteFilter(block) {
    if (!isSmartChute(block)) return undefined;
    let entity = getSmartChuteFilterEntity(block);
    const filterItem = getSmartChuteFilterItem(block, entity);

    if (!filterItem) {
        if (entity?.isValid) {
            clearSmartChuteFilterVisual(entity);
            try { entity.remove(); } catch {}
        }
        return undefined;
    }

    const pos = smartChuteFilterLocation(block);
    if (!entity?.isValid) entity = block.dimension.spawnEntity(SMART_CHUTE_FILTER_ENTITY, pos);
    try { entity.setDynamicProperty(SMART_CHUTE_FILTER_OWNER_PROP, smartChuteOwnerKey(block)); } catch {}
    try { entity.teleport(pos); } catch {}
    removeWrongSmartChuteFilterEntities(block, entity);
    try { entity.setProperty("create:facing_direction", smartChuteFilterFacing(block)); } catch {}
    setItemInHand(filterItem, entity, "Mainhand", 0, "create:type");
    try { entity.setProperty("create:type", isHandEquippedFilterItem(filterItem.typeId) ? "hand_equipped" : "item"); } catch {}
    return entity;
}

function setSmartChuteFilter(block, item, face) {
    if (!block || !item) return false;
    const visualFace = INTERACT_FACE_TO_DIR[face] ?? smartChuteFilterFacing(block);
    setStoredSmartChuteFilter(block, item, visualFace);
    const entity = getSmartChuteFilterEntity(block) ?? block.dimension.spawnEntity(SMART_CHUTE_FILTER_ENTITY, smartChuteFilterLocation(block));
    try { entity.setDynamicProperty(SMART_CHUTE_FILTER_OWNER_PROP, smartChuteOwnerKey(block)); } catch {}
    setItemInHand(item, entity, "Mainhand", 0, "create:type");
    try { entity.setProperty("create:type", isHandEquippedFilterItem(item.typeId) ? "hand_equipped" : "item"); } catch {}
    try { entity.setProperty("create:facing_direction", visualFace); } catch {}
    try { entity.teleport(smartChuteFilterLocation(block)); } catch {}
    try { block.dimension.playSound("block.itemframe.add_item", block.center(), { volume: 0.7, pitch: 1.1 }); } catch {}
    return true;
}

function clearSmartChuteFilter(block) {
    const entity = getSmartChuteFilterEntity(block);
    clearSmartChuteFilterVisual(entity);
    clearStoredSmartChuteFilter(block);
    try { entity?.remove(); } catch {}
    try { block.dimension.playSound("block.itemframe.remove_item", block.center(), { volume: 0.7, pitch: 1.0 }); } catch {}
}

function removeWrongSmartChuteFilterEntities(block, keepEntity) {
    const center = smartChuteFilterLocation(block);
    const ownerKey = smartChuteOwnerKey(block);
    const nearby = block.dimension.getEntities({
        type: SMART_CHUTE_FILTER_ENTITY,
        location: center,
        maxDistance: 0.45
    });

    for (const entity of nearby) {
        if (!entity?.isValid || entity.id === keepEntity?.id) continue;
        let owner;
        try { owner = entity.getDynamicProperty(SMART_CHUTE_FILTER_OWNER_PROP); } catch {}
        if (owner && owner !== ownerKey) continue;
        if (distanceSq(entity.location, center) <= 0.04) {
            try { entity.remove(); } catch {}
        }
    }
}

function distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

