import * as mc from "@minecraft/server";
import * as racoAPI from "../raco-API.js";
import { initRpmBlock } from "../../andrielScripts/rpm/rpmCore.js";
import { getItemVisual } from "../../andrielScripts/blocks/conveyorMovement.js";

const VISUAL_TAG = "create_weighted_ejector_item";
const FLYING_TAG = "create_weighted_ejector_flying";
const PANEL_ENTITY = "create:weighted_ejector_ejector";
const SELECTION_ENTITY = "create:glue_selection";
const TARGET_PREFIX = "create:weighted_ejector_target:";
const PENDING_TARGET = "create:weighted_ejector_pending_target";
const TARGET_MAX_DISTANCE = 32;
const targetSelections = new Map();
const placementOutlines = new Map();
const entityLaunchCooldowns = new Map();
const GREEN_BELT_COLOR = { red: 0.2, green: 1.0, blue: 0.25, alpha: 1.0 };
const ITEM_Y = 13 / 16;
const DIRECTIONS = {
    // O estado cardinal aponta para a traseira/painel do modelo. O item
    // precisa ser lancado pelo lado oposto, que e a frente do ejetor.
    north: { x: 0, z: -1 }, south: { x: 0, z: 1 },
    west: { x: 1, z: 0 }, east: { x: -1, z: 0 }
};
const FACE_OFFSETS = {
    north: { x: 0, y: 0, z: -1 }, south: { x: 0, y: 0, z: 1 },
    west: { x: -1, y: 0, z: 0 }, east: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 }, down: { x: 0, y: -1, z: 0 }
};
function panelLocation(block) {
    const center = block.center();
    return { x: center.x, y: center.y - 0.5, z: center.z };
}

function panelOwnerTag(block) {
    return `create:weighted_ejector_panel:${block.x}:${block.y}:${block.z}`;
}

function getPanelVisual(block) {
    if (!block?.dimension) return undefined;
    return block.dimension.getEntities({
        type: PANEL_ENTITY,
        tags: [panelOwnerTag(block)]
    })[0] ?? block.dimension.getEntities({
        type: PANEL_ENTITY,
        location: panelLocation(block),
        maxDistance: 0.45
    })[0];
}

function dimensionKey(dimension) {
    return dimension?.id ?? "minecraft:overworld";
}

function blockKey(block) {
    return `${dimensionKey(block.dimension)}:${block.x},${block.y},${block.z}`;
}

function targetProperty(block) {
    return `${TARGET_PREFIX}${blockKey(block)}`;
}

function readTarget(block) {
    try {
        const raw = mc.world.getDynamicProperty(targetProperty(block));
        const target = typeof raw === "string" ? JSON.parse(raw) : undefined;
        if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z)) return undefined;
        return target;
    } catch { return undefined; }
}

function saveTarget(block, target) {
    try {
        mc.world.setDynamicProperty(targetProperty(block), JSON.stringify({
            x: Math.floor(target.x), y: Math.floor(target.y), z: Math.floor(target.z)
        }));
        return true;
    } catch { return false; }
}

function clearTarget(block) {
    try { mc.world.setDynamicProperty(targetProperty(block), undefined); } catch {}
}

function removeSelection(playerId) {
    const selection = targetSelections.get(playerId);
    targetSelections.delete(playerId);
    try { if (selection?.outline?.isValid) selection.outline.remove(); } catch {}
}

function removePlacementOutline(playerId) {
    const outline = placementOutlines.get(playerId);
    placementOutlines.delete(playerId);
    try { if (outline?.isValid) outline.remove(); } catch {}
}

function targetCenter(target) {
    return { x: target.x + 0.5, y: target.y + 1.04, z: target.z + 0.5 };
}

function isTargetInFront(block, target) {
    const facing = block?.permutation?.getState("minecraft:cardinal_direction") ?? "north";
    const direction = DIRECTIONS[facing] ?? DIRECTIONS.north;
    const dx = (target.x + 0.5) - block.center().x;
    const dz = (target.z + 0.5) - block.center().z;
    return dx * direction.x + dz * direction.z > 0.01;
}

function isTargetStraightFrom(source, target) {
    const dx = Math.abs(target.x - source.x);
    const dz = Math.abs(target.z - source.z);
    // O destino pode mudar de altura, mas horizontalmente deve permanecer
    // exatamente no mesmo eixo X ou Z do Weighted Ejector.
    return dx < 0.01 || dz < 0.01;
}

function isTargetStraightAhead(block, target) {
    return isTargetStraightFrom(block.location, target) && isTargetInFront(block, target);
}

function faceEjectorTowardTarget(block, target) {
    const dx = target.x - block.x;
    const dz = target.z - block.z;
    if (Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01) return false;

    // No eixo Z, north aponta para -Z e south para +Z. O eixo X conserva
    // a orientacao propria do modelo do Weighted Ejector.
    const facing = Math.abs(dx) > Math.abs(dz)
        ? (dx > 0 ? "west" : "east")
        : (dz > 0 ? "south" : "north");
    try {
        block.setPermutation(block.permutation.withState("minecraft:cardinal_direction", facing));
        return true;
    } catch { return false; }
}

function launchStart(block) {
    const facing = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
    const direction = DIRECTIONS[facing] ?? DIRECTIONS.north;
    return {
        x: block.center().x + direction.x * 0.48,
        y: block.y + 1.05,
        z: block.center().z + direction.z * 0.48
    };
}

function smoothSpinProgress(progress) {
    return progress * progress * (3 - 2 * progress);
}

function trajectoryPoint(start, end, progress) {
    // Smoothstep mantem o inicio e a chegada sem trancos, enquanto o arco
    // continua usando o progresso real para conservar uma parabola limpa.
    const smoothProgress = progress * progress * (3 - 2 * progress);
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const distance = Math.hypot(dx, dz);
    const height = Math.max(1.15, Math.min(6, distance * 0.3));
    return {
        x: start.x + (end.x - start.x) * smoothProgress,
        y: start.y + (end.y - start.y) * smoothProgress + 4 * height * progress * (1 - progress),
        z: start.z + (end.z - start.z) * smoothProgress
    };
}

function spawnBeltParticle(dimension, location, color = GREEN_BELT_COLOR) {
    const variables = new mc.MolangVariableMap();
    variables.setFloat("speed", 0);
    variables.setFloat("direction_x", 0);
    variables.setFloat("direction_y", 0);
    variables.setFloat("direction_z", 0);
    variables.setFloat("is_push", 0);
    variables.setFloat("air_distance", 1);
    variables.setColorRGBA("color", color);
    variables.setFloat("color_r", color.red);
    variables.setFloat("color_g", color.green);
    variables.setFloat("color_b", color.blue);
    variables.setFloat("color_a", color.alpha);
    try { dimension.spawnParticle("create:belt_preview", location, variables); } catch {}
}

function spawnGreenBeltParticle(dimension, location) {
    spawnBeltParticle(dimension, location, GREEN_BELT_COLOR);
}

const INVALID_BELT_COLOR = { red: 0.9, green: 0.12, blue: 0.47, alpha: 1 };

function showTrajectory(dimension, start, end, dense = false, valid = true) {
    const steps = dense ? 18 : 12;
    for (let index = 0; index <= steps; index++) {
        const point = trajectoryPoint(start, end, index / steps);
        spawnBeltParticle(dimension, point, valid ? GREEN_BELT_COLOR : INVALID_BELT_COLOR);
    }
}

function spawnUnitOutline(dimension, target, tag) {
    const location = { x: target.x + 0.5, y: target.y + 0.5, z: target.z + 0.5 };
    let outline;
    try {
        outline = dimension.spawnEntity(SELECTION_ENTITY, location);
        outline.addTag(tag);
    } catch { return undefined; }
    for (const axis of ["x", "y", "z"]) {
        try { outline.setProperty(`create:scale_${axis}`, 1); } catch {}
    }
    return outline;
}

function updateOutline(selection, target) {
    if (!selection || !target) return;
    const location = { x: target.x + 0.5, y: target.y + 0.5, z: target.z + 0.5 };
    let outline = selection.outline;
    if (!outline?.isValid) {
        outline = spawnUnitOutline(selection.dimension, target, "create_weighted_ejector_target");
        if (!outline) return;
        selection.outline = outline;
    }
    try { outline.teleport(location, { checkForBlocks: false }); } catch {}
    for (const axis of ["x", "y", "z"]) {
        try { outline.setProperty(`create:scale_${axis}`, 1); } catch {}
    }
}

export function weightedEjectorBeforeInteract(player, block, item) {
    if (item?.typeId !== "create:weighted_ejector" || !player || !block) return false;
    if (block.typeId === "create:weighted_ejector") return false;
    try {
        if (player.getDynamicProperty(PENDING_TARGET) != null) return false;
    } catch {}
    const target = { x: block.x, y: block.y, z: block.z };
    removePlacementOutline(player.id);
    const outline = spawnUnitOutline(block.dimension, target, "create_weighted_ejector_pending_target");
    if (outline) placementOutlines.set(player.id, outline);
    mc.system.run(() => {
        try { player.setDynamicProperty(PENDING_TARGET, JSON.stringify(target)); } catch {}
        try { player.onScreenDisplay.setActionBar("§aTarget set! Now place the Weighted Ejector."); } catch {}
    });
    return true;
}

export function weightedEjectorBlockPlaced({ block, player }) {
    if (block?.typeId !== "create:weighted_ejector" || !player) return;
    let target;
    try {
        const raw = player.getDynamicProperty(PENDING_TARGET);
        target = typeof raw === "string" ? JSON.parse(raw) : undefined;
        player.setDynamicProperty(PENDING_TARGET, undefined);
    } catch {}
    const outline = placementOutlines.get(player.id);
    placementOutlines.delete(player.id);
    if (!target) {
        ensurePanelVisual(block);
        try { if (outline?.isValid) outline.remove(); } catch {}
        return;
    }
    const dx = target.x - block.x;
    const dy = target.y - block.y;
    const dz = target.z - block.z;
    if (dx * dx + dy * dy + dz * dz > TARGET_MAX_DISTANCE * TARGET_MAX_DISTANCE) {
        ensurePanelVisual(block);
        try { if (outline?.isValid) outline.remove(); } catch {}
        try { player.onScreenDisplay.setActionBar(`§cTarget is too far away (maximum: ${TARGET_MAX_DISTANCE} blocks).`); } catch {}
        return;
    }
    if (!isTargetStraightFrom(block.location, target)) {
        ensurePanelVisual(block);
        try { if (outline?.isValid) outline.remove(); } catch {}
        showTrajectory(block.dimension, launchStart(block), targetCenter(target), true, false);
        try { player.onScreenDisplay.setActionBar("§cThe target must be in a straight line."); } catch {}
        return;
    }
    // Primeiro gira o bloco para o destino; depois cria o painel já alinhado.
    faceEjectorTowardTarget(block, target);
    // A direcao mudou depois da colocacao: atualiza imediatamente o eixo e
    // recalcula suas conexoes com shafts, condutores e geradores vizinhos.
    try { initRpmBlock({ block, dimension: block.dimension }); } catch {}
    ensurePanelVisual(block);
    if (!isTargetInFront(block, target)) {
        try { if (outline?.isValid) outline.remove(); } catch {}
        try { player.onScreenDisplay.setActionBar("§cThe target must be in front of the Weighted Ejector."); } catch {}
        return;
    }
    saveTarget(block, target);
    showTrajectory(block.dimension, launchStart(block), targetCenter(target), true);
    mc.system.runTimeout(() => { try { if (outline?.isValid) outline.remove(); } catch {} }, 30);
    try { player.onScreenDisplay.setActionBar("§aWeighted Ejector configured!"); } catch {}
}

export function weightedEjectorPlacementTick(player, currentTick) {
    if (!player?.isValid) return;
    let target;
    try {
        const raw = player.getDynamicProperty(PENDING_TARGET);
        target = typeof raw === "string" ? JSON.parse(raw) : undefined;
    } catch {}
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z)) return;

    let outline = placementOutlines.get(player.id);
    if (!outline?.isValid) {
        outline = spawnUnitOutline(player.dimension, target, "create_weighted_ejector_pending_target");
        if (outline) placementOutlines.set(player.id, outline);
    }
    if (currentTick % 3 !== 0) return;

    let start;
    let sourceLocation;
    try {
        const hit = player.getBlockFromViewDirection({ maxDistance: 6 });
        const face = String(hit?.face ?? "").toLowerCase();
        const offset = FACE_OFFSETS[face];
        if (hit?.block && offset) {
            sourceLocation = {
                x: hit.block.x + offset.x,
                y: hit.block.y + offset.y,
                z: hit.block.z + offset.z
            };
            start = {
                x: sourceLocation.x + 0.5,
                y: sourceLocation.y + 1.05,
                z: sourceLocation.z + 0.5
            };
        }
    } catch {}
    if (!start) {
        const view = player.getViewDirection?.() ?? { x: 0, y: 0, z: 1 };
        start = {
            x: player.location.x + view.x * 0.8,
            y: player.location.y + 1.0,
            z: player.location.z + view.z * 0.8
        };
    }
    const valid = !sourceLocation || isTargetStraightFrom(sourceLocation, target);
    showTrajectory(player.dimension, start, targetCenter(target), false, valid);
}

function beginTargetSelection(block, player) {
    removeSelection(player.id);
    const selection = {
        source: { x: block.x, y: block.y, z: block.z },
        sourceKey: blockKey(block),
        dimension: block.dimension,
        dimensionId: dimensionKey(block.dimension),
        tick: mc.system.currentTick,
        outline: undefined
    };
    targetSelections.set(player.id, selection);
    try { player.playSound("random.click", { volume: 0.55, pitch: 1.25 }); } catch {}
    try { player.sendMessage("§aClick with the Wrench on the block where the item should land."); } catch {}
}

export function weightedEjectorTargetInteract(block, player, item) {
    if (!item && player) {
        try { item = player.getComponent("minecraft:equippable")?.getEquipment("Mainhand"); } catch {}
    }
    if (item?.typeId !== "create:wrench" || !block || !player) return false;
    const selection = targetSelections.get(player.id);
    if (!selection) {
        if (block.typeId !== "create:weighted_ejector") return false;
        beginTargetSelection(block, player);
        return true;
    }
    if (selection.dimensionId !== dimensionKey(block.dimension)) {
        removeSelection(player.id);
        return true;
    }
    const dx = block.x - selection.source.x;
    const dy = block.y - selection.source.y;
    const dz = block.z - selection.source.z;
    if (dx * dx + dy * dy + dz * dz > TARGET_MAX_DISTANCE * TARGET_MAX_DISTANCE) {
        try { player.sendMessage(`§cThe target must be no more than ${TARGET_MAX_DISTANCE} blocks away.`); } catch {}
        return true;
    }
    if (!isTargetStraightFrom(selection.source, block.location)) {
        let sourceBlock;
        try { sourceBlock = block.dimension.getBlock(selection.source); } catch {}
        if (sourceBlock?.typeId === "create:weighted_ejector") {
            showTrajectory(block.dimension, launchStart(sourceBlock), targetCenter(block.location), true, false);
        }
        try { player.sendMessage("§cThe target must be in a straight line, not diagonally."); } catch {}
        return true;
    }
    let sourceBlock;
    try { sourceBlock = block.dimension.getBlock(selection.source); } catch {}
    if (sourceBlock?.typeId === "create:weighted_ejector" && !isTargetStraightAhead(sourceBlock, block.location)) {
        try { player.sendMessage("The target must be in front of the Weighted Ejector."); } catch {}
        return true;
    }
    if (sourceBlock?.typeId === "create:weighted_ejector" && saveTarget(sourceBlock, block.location)) {
        showTrajectory(block.dimension, launchStart(sourceBlock), targetCenter(block.location), true);
        try { player.playSound("random.orb", { volume: 0.65, pitch: 1.35 }); } catch {}
        try { player.sendMessage(`§aEjector target set: ${block.x}, ${block.y}, ${block.z}`); } catch {}
    }
    removeSelection(player.id);
    return true;
}

export function weightedEjectorSelectionTick(player, currentTick) {
    const selection = targetSelections.get(player?.id);
    if (!selection) return;
    if (currentTick - selection.tick > 400 || dimensionKey(player.dimension) !== selection.dimensionId) {
        removeSelection(player.id);
        return;
    }
    let held;
    try { held = player.getComponent("minecraft:equippable")?.getEquipment("Mainhand"); } catch {}
    if (held?.typeId !== "create:wrench") {
        removeSelection(player.id);
        return;
    }
    let hit;
    try { hit = player.getBlockFromViewDirection({ maxDistance: TARGET_MAX_DISTANCE }); } catch {}
    const target = hit?.block;
    if (!target) return;
    const dx = target.x - selection.source.x;
    const dy = target.y - selection.source.y;
    const dz = target.z - selection.source.z;
    if (dx * dx + dy * dy + dz * dz > TARGET_MAX_DISTANCE * TARGET_MAX_DISTANCE) return;
    let sourceBlock;
    try { sourceBlock = player.dimension.getBlock(selection.source); } catch {}
    const straight = isTargetStraightFrom(selection.source, target.location);
    if (sourceBlock?.typeId === "create:weighted_ejector" && (!straight || !isTargetInFront(sourceBlock, target.location))) {
        try { if (selection.outline?.isValid) selection.outline.remove(); } catch {}
        selection.outline = undefined;
        if (currentTick % 3 === 0) {
            showTrajectory(player.dimension, launchStart(sourceBlock), targetCenter(target.location), false, false);
        }
        return;
    }
    updateOutline(selection, target.location);
    if (currentTick % 3 !== 0) return;
    if (sourceBlock?.typeId === "create:weighted_ejector") {
        showTrajectory(player.dimension, launchStart(sourceBlock), targetCenter(target.location));
    }
}

function ensurePanelVisual(block) {
    const ownerTag = panelOwnerTag(block);
    const ownedPanels = block.dimension.getEntities({
        type: PANEL_ENTITY,
        tags: [ownerTag]
    });
    const nearbyPanels = block.dimension.getEntities({
        type: PANEL_ENTITY,
        location: panelLocation(block),
        maxDistance: 0.45
    });
    const panels = [...ownedPanels];
    const panelIds = new Set(ownedPanels.map(panel => panel.id));
    for (const nearbyPanel of nearbyPanels) {
        if (!panelIds.has(nearbyPanel.id)) {
            panels.push(nearbyPanel);
            panelIds.add(nearbyPanel.id);
        }
    }
    let panel = panels[0];
    for (let index = 1; index < panels.length; index++) {
        try { panels[index].remove(); } catch {}
    }
    if (!panel?.isValid) {
        try { panel = block.dimension.spawnEntity(PANEL_ENTITY, panelLocation(block)); } catch { return undefined; }
    }
    const facing = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
    try {
        panel.addTag(ownerTag);
        panel.setProperty("create:cardinal_rotation", facing);
        panel.teleport(panelLocation(block), { checkForBlocks: false });
        // A direcao visual agora e aplicada instantaneamente no bone root.
        // A entidade permanece com yaw zero para nao interpolar ao nascer.
        const rotation = panel.getRotation();
        if (Math.abs(rotation.x) > 0.001 || Math.abs(rotation.y) > 0.001) {
            panel.setRotation({ x: 0, y: 0 });
        }
    } catch {}
    return panel;
}

function getVisual(block) {
    return (block?.dimension?.getEntities({ type: "create:conveyor_item", location: { x: block.center().x, y: block.y + ITEM_Y, z: block.center().z }, maxDistance: 0.7 }) ?? [])
        .find(entity => entity?.isValid && entity.hasTag(VISUAL_TAG));
}

function setVisualItem(entity, stack) {
    entity.addTag(VISUAL_TAG);
    racoAPI.setItemInHand(stack, entity, "Mainhand", 0, "create:item_visual");
    const visual = getItemVisual(stack?.typeId ?? "");
    try {
        entity.setProperty("create:item_visual", visual.hand ? "hand_equipped" : visual.block ? "block" : "item");
        entity.setProperty("create:rotation_x", 0);
        entity.setProperty("create:rotation_z", 0);
        entity.setProperty("create:rotation_y", Math.random() * 360);
    } catch {}
}

function storeItem(block, stack, amount) {
    if (!block || !stack || getVisual(block)) return 0;
    const stored = stack.clone();
    stored.amount = Math.min(amount, stack.amount, stack.maxAmount ?? 64);
    const visual = block.dimension.spawnEntity("create:conveyor_item", { x: block.center().x, y: block.y + ITEM_Y, z: block.center().z });
    setVisualItem(visual, stored);
    return stored.amount;
}

function getRpm(block) {
    let entity = block.dimension.getEntities({
        type: "create:shaft_entity",
        location: block.center(),
        maxDistance: 0.3
    })[0];
    if (!entity?.isValid) {
        // Usa o inicializador oficial da rede cinetica. Ele cria exatamente
        // create:shaft_entity, igual aos outros blocos da addon.
        try { initRpmBlock({ block, dimension: block.dimension }); } catch {}
        entity = block.dimension.getEntities({
            type: "create:shaft_entity",
            location: block.center(),
            maxDistance: 0.3
        })[0];
    }
    try { return Number(entity?.getProperty("create:rpm") ?? 0); } catch { return 0; }
}

export function weightedEjectorInteract(block, player, item) {
    if (!item || item.typeId === "create:wrench" || getVisual(block)) return;
    if (storeItem(block, item, 1) > 0) {
        racoAPI.clearMainhand(player, 1);
        block.dimension.playSound("block.itemframe.add_item", block.center());
    }
}

export function weightedEjectorStepOn(block, entity) {
    if (!entity?.isValid) return;

    if (entity.typeId === "minecraft:item") {
        if (getVisual(block)) return;
        const stack = entity.getComponent("minecraft:item")?.itemStack;
        if (!stack || storeItem(block, stack, stack.amount) <= 0) return;
        try { entity.remove(); } catch {}
        return;
    }

    // Entidades visuais da maquina nao podem ser arremessadas.
    if (entity.typeId === PANEL_ENTITY || entity.typeId === "create:conveyor_item" || entity.hasTag?.(FLYING_TAG)) return;

    const rpm = Math.abs(getRpm(block));
    if (rpm < 1) return;

    const cooldownKey = `${entity.id}:${blockKey(block)}`;
    const now = mc.system.currentTick;
    if ((entityLaunchCooldowns.get(cooldownKey) ?? -100) + 15 > now) return;
    entityLaunchCooldowns.set(cooldownKey, now);
    if (entityLaunchCooldowns.size > 256) {
        for (const [key, tick] of entityLaunchCooldowns) {
            if (tick + 40 < now) entityLaunchCooldowns.delete(key);
        }
    }

    const facing = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
    const fallback = DIRECTIONS[facing] ?? DIRECTIONS.north;
    const target = readTarget(block);
    let directionX = fallback.x;
    let directionZ = fallback.z;
    let distance = 4;

    if (target && isTargetStraightAhead(block, target)) {
        const dx = target.x + 0.5 - entity.location.x;
        const dz = target.z + 0.5 - entity.location.z;
        distance = Math.max(1, Math.hypot(dx, dz));
        directionX = dx / distance;
        directionZ = dz / distance;
    }

    const horizontalStrength = Math.min(2.25, 0.55 + distance * 0.055 + rpm / 640);
    const verticalStrength = Math.min(1.15, 0.48 + distance * 0.035 + rpm / 1024);
    try { entity.clearVelocity?.(); } catch {}
    try {
        entity.applyKnockback({ x: directionX, z: directionZ }, horizontalStrength, verticalStrength);
    } catch {
        try {
            entity.applyImpulse({
                x: directionX * horizontalStrength,
                y: verticalStrength,
                z: directionZ * horizontalStrength
            });
        } catch { return; }
    }

    const panel = ensurePanelVisual(block);
    try { panel?.playAnimation("animation.weighted_ejector.ejector", { blendOutTime: 0.06 }); } catch {}
    try { block.dimension.playSound("create:weighted_ejector", block.center(), { volume: 3.0, pitch: 1.0 }); } catch {}
}

export function weightedEjectorTick(block) {
    const panel = ensurePanelVisual(block);
    const rpm = getRpm(block);
    // O shaft original faz a conexao externa; rpm2 completa o pequeno trecho
    // dentro da carcaça e gira exatamente na mesma velocidade.
    try { panel?.setProperty("create:rpm", rpm); } catch {}
    const visual = getVisual(block);
    if (!visual || (mc.system.currentTick + block.x * 3 + block.z * 5) % 8 !== 0) return;
    if (Math.abs(rpm) < 1) return;
    const stack = visual.getComponent("inventory")?.container?.getItem(0);
    if (!stack) { try { visual.remove(); } catch {} return; }

    const facing = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
    const direction = DIRECTIONS[facing] ?? DIRECTIONS.north;
    const strength = Math.min(1.15, 0.38 + Math.abs(rpm) / 320);
    try {
        panel?.playAnimation("animation.weighted_ejector.ejector", {
            blendOutTime: 0.06
        });
    } catch {}
    let target = readTarget(block);
    if (target && !isTargetStraightAhead(block, target)) {
        clearTarget(block);
        target = undefined;
    }
    if (target) {
        const start = launchStart(block);
        const end = targetCenter(target);
        const distance = Math.hypot(end.x - start.x, end.z - start.z);
        const duration = Math.max(14, Math.min(46, Math.round(distance * 2.35 + 9 - Math.min(5, Math.abs(rpm) / 64))));
        const spinOnZ = Math.abs(end.x - start.x) >= Math.abs(end.z - start.z);
        try { visual.removeTag(VISUAL_TAG); visual.addTag(FLYING_TAG); } catch {}
        let elapsed = 0;
        const runId = mc.system.runInterval(() => {
            if (!visual?.isValid) { mc.system.clearRun(runId); return; }
            elapsed++;
            const progress = Math.min(1, elapsed / duration);
            const point = trajectoryPoint(start, end, progress);
            try { visual.teleport(point, { checkForBlocks: false }); } catch {}
            // Faz apenas o item visual cambalhotar durante o arco. O eixo de
            // giro acompanha a direcao horizontal do lancamento.
            const spinAngle = ((smoothSpinProgress(progress) * Math.max(360, duration * 25) + 180) % 360) - 180;
            try { visual.setProperty("create:rotation_x", spinOnZ ? 0 : spinAngle); } catch {}
            try { visual.setProperty("create:rotation_z", spinOnZ ? -spinAngle : 0); } catch {}
            if (progress < 1) return;
            mc.system.clearRun(runId);
            try { visual.remove(); } catch {}
            try { block.dimension.spawnItem(stack, end); } catch {}
        }, 1);
    } else {
        const drop = block.dimension.spawnItem(stack, {
            x: block.center().x + direction.x * 0.55,
            y: block.y + 1.05,
            z: block.center().z + direction.z * 0.55
        });
        drop.applyImpulse({ x: direction.x * strength, y: 0.42 + strength * 0.18, z: direction.z * strength });
        try { visual.remove(); } catch {}
    }
    try { block.dimension.playSound("create:weighted_ejector", block.center(), { volume: 3.0, pitch: 1.0 }); } catch {}
}

export function weightedEjectorBreak(block, dimension = block?.dimension) {
    clearTarget(block);
    const visual = getVisual(block);
    if (visual) {
        const stack = visual.getComponent("inventory")?.container?.getItem(0);
        if (stack) try { dimension.spawnItem(stack, block.center()); } catch {}
        try { visual.remove(); } catch {}
    }
    const panels = dimension?.getEntities({
        type: PANEL_ENTITY,
        tags: [panelOwnerTag(block)]
    }) ?? [];
    const panelIds = new Set(panels.map(panel => panel.id));
    for (const panel of dimension?.getEntities({
        type: PANEL_ENTITY,
        location: panelLocation(block),
        maxDistance: 0.45
    }) ?? []) {
        if (!panelIds.has(panel.id)) {
            panels.push(panel);
            panelIds.add(panel.id);
        }
    }
    for (const panel of panels) {
        try { panel.remove(); } catch {}
    }
}
