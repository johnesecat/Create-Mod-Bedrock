import * as mc from "@minecraft/server";
import * as racoAPI from "../raco-API.js";
import { feedBlazeBurner, isBlazeBurnerBlockActive, isBlazeBurnerFuel } from "./blazeBurner.js";
import { tryInsertItemFromArmIntoFunnel } from "./brassFunnel.js";

// ── Timing & speed ────────────────────────────────────────────────────────────
const TIME_CONFIG = { 1:800, 2:400, 4:200, 8:100, 16:50, 32:25, 64:12.5, 128:6.25, 256:3.125 };
const SPEED_INDEX = { 1:0, 2:1, 4:2, 8:3, 16:4, 32:5, 64:6, 128:7, 256:8 };
const MAX_REACH = 6; // blocks

function snapToPowerOf2(rpm) {
    const steps = [1, 2, 4, 8, 16, 32, 64, 128, 256];
    let best = steps[0], bestDiff = Math.abs(rpm - best);
    for (let i = 1; i < steps.length; i++) {
        const diff = Math.abs(rpm - steps[i]);
        if (diff < bestDiff) { best = steps[i]; bestDiff = diff; }
    }
    return best;
}

// ── IK arm solver ─────────────────────────────────────────────────────────────
const ROD_A = 10 / 16; // upper arm (matches Fabricate's rodA)
const ROD_B = 24 / 16; // forearm  (matches Fabricate's rodB)

// ── Animation tuning — adjust here to fix visual alignment ───────────────────
const ARM_YAW_INVERT    =  1;   // 1 or -1 — inverts yaw direction
const ARM_SHOULDER_INVERT = 1; // 1 or -1 — inverts shoulder direction
const ARM_ELBOW_INVERT  =  1;   // 1 or -1 — inverts elbow direction
const ARM_YAW_OFFSET    =  0;   // degrees added to yaw after IK
const ARM_SHOULDER_OFFSET = 90; // degrees added to shoulder after IK
const ARM_ELBOW_OFFSET  =  90;   // degrees added to elbow after IK
const ARM_REST_SHOULDER = 130 * ARM_SHOULDER_INVERT + ARM_SHOULDER_OFFSET;
const ARM_REST_ELBOW = 42.5 * ARM_ELBOW_INVERT + ARM_ELBOW_OFFSET;

/**
 * IK solver — takes RELATIVE vector (target minus pivot), same as Fabricate.
 * Returns { baseYaw, shoulder, elbow }.
 */
function getArmAngles(rel) {
    const RAD2DEG  = 180 / Math.PI;
    const distXZ   = Math.hypot(rel.x, rel.z);
    const distTotal = Math.hypot(distXZ, rel.y);
    const maxReach = ROD_A + ROD_B;
    const baseYaw  = Math.atan2(rel.x, rel.z) * RAD2DEG;

    if (distTotal - 2 > maxReach) {
        const scale = maxReach / distTotal;
        const p   = { x: rel.x * scale, y: rel.y * scale, z: rel.z * scale };
        const dxz = Math.hypot(p.x, p.z);
        const d   = Math.hypot(dxz, p.y);
        const a   = Math.atan2(p.y, dxz);
        const ca  = (ROD_A**2 + d**2 - ROD_B**2) / (2 * ROD_A * d);
        const so  = Math.acos(Math.max(-1, Math.min(1, ca)));
        const shoulder = (a + so) * RAD2DEG;
        const cb  = (ROD_A**2 + ROD_B**2 - d**2) / (2 * ROD_A * ROD_B);
        const elbow = Math.acos(Math.max(-1, Math.min(1, cb))) * RAD2DEG;
        return { baseYaw, shoulder, elbow };
    }
    const angle    = Math.atan2(rel.y, distXZ);
    const ca       = (ROD_A**2 + distTotal**2 - ROD_B**2) / (2 * ROD_A * distTotal);
    const so       = Math.acos(Math.max(-1, Math.min(1, ca)));
    const shoulder = (angle + so) * RAD2DEG;
    const cb       = (ROD_A**2 + ROD_B**2 - distTotal**2) / (2 * ROD_A * ROD_B);
    const elbow    = Math.acos(Math.max(-1, Math.min(1, cb))) * RAD2DEG;
    return { baseYaw, shoulder, elbow };
}

/** Normalize angle to [-180, 180] — identical to Fabricate's shortestAngle */
function shortestAngle(currentAngle, targetAngle) {
    const normalize = (a) => ((a + 180) % 360) - 180;
    const cur  = normalize(currentAngle);
    const tgt  = normalize(targetAngle);
    const diff = normalize(tgt - cur);
    return normalize(cur + diff);
}

/**
 * Set arm _new properties and schedule _current after animation delay.
 * Matches Fabricate: yaw uses shortestAngle(arm_1_new → target);
 * shoulder and elbow set directly from IK (no shortestAngle).
 * Returns the delay in ticks.
 */
// Facing Y offset from entity's cardinal_rotation (matches rpm.rpa.json facing_rotation bone formula)
const ENTITY_FACING_Y = { south: 0, north: 180, west: 90, east: -90 };

function setArmTarget(entity, block, targetWorld, rpm) {
    const snapped = snapToPowerOf2(Math.abs(rpm));
    const delay   = Math.ceil(TIME_CONFIG[snapped]);

    const facingY = ENTITY_FACING_Y[entity.getProperty('create:cardinal_rotation')] ?? 0;

    const pivot = { x: block.center().x, y: block.location.y + 14 / 16, z: block.center().z };
    const rel   = { x: targetWorld.x - pivot.x, y: targetWorld.y - pivot.y, z: targetWorld.z - pivot.z };
    const armInfo = getArmAngles(rel);
    const finalYaw      = armInfo.baseYaw      * ARM_YAW_INVERT      + ARM_YAW_OFFSET + facingY;
    const finalShoulder = armInfo.shoulder     * ARM_SHOULDER_INVERT + ARM_SHOULDER_OFFSET;
    const finalElbow    = armInfo.elbow        * ARM_ELBOW_INVERT    + ARM_ELBOW_OFFSET;

    // Yaw: shortest path from current _new (like Fabricate)
    const newYaw = shortestAngle(entity.getProperty("create:arm_1_new") ?? 0, finalYaw);

    entity.setProperty("create:arm_1_new", newYaw);
    entity.setProperty("create:arm_2_new", finalShoulder);
    entity.setProperty("create:arm_3_new", finalElbow);

    mc.system.runTimeout(() => {
        if (!entity.isValid) return;
        entity.setProperty("create:arm_1", shortestAngle(entity.getProperty("create:arm_1") ?? 0, finalYaw));
        entity.setProperty("create:arm_2", finalShoulder);
        entity.setProperty("create:arm_3", finalElbow);
    }, delay);

    return delay;
}

/** Move arm back to resting pose — matches Fabricate's standard=true branch. */
function setArmRest(entity, rpm) {
    const snapped = snapToPowerOf2(Math.abs(rpm));
    const delay   = Math.ceil(TIME_CONFIG[snapped]);

    // Keep current yaw target unchanged; return shoulder/elbow to rest
    const currentYawNew = entity.getProperty("create:arm_1_new") ?? 0;
    const newYaw = shortestAngle(currentYawNew, currentYawNew); // normalises but no change

    const restShoulder = ARM_REST_SHOULDER;
    const restElbow    = ARM_REST_ELBOW;

    entity.setProperty("create:arm_1_new", newYaw);
    entity.setProperty("create:arm_2_new", restShoulder);
    entity.setProperty("create:arm_3_new", restElbow);

    mc.system.runTimeout(() => {
        if (!entity.isValid) return;
        entity.setProperty("create:arm_1", shortestAngle(entity.getProperty("create:arm_1") ?? 0, currentYawNew));
        entity.setProperty("create:arm_2", restShoulder);
        entity.setProperty("create:arm_3", restElbow);
    }, delay);

    return delay;
}

// ── Item sources & outputs ────────────────────────────────────────────────────

/**
 * Check if there is at least one grabbable item at location WITHOUT consuming it.
 * Returns true if something is available.
 */
function hasItemAtSource(dimension, loc, filterItem, itemPredicate = () => true) {
    const block      = dimension.getBlock(loc);
    const center     = block?.center() ?? { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
    const filterType = filterItem?.typeId ?? null;

    for (const ent of dimension.getEntities({ type: "minecraft:item", location: center, maxDistance: 0.75 })) {
        if (!ent.isValid) continue;
        const stack = ent.getComponent("minecraft:item")?.itemStack;
        if (!stack) continue;
        if (filterType && stack.typeId !== filterType) continue;
        if (!itemPredicate(stack)) continue;
        return true;
    }
    for (const ent of dimension.getEntities({ type: "create:conveyor_item", location: center, maxDistance: 0.75 })) {
        if (!ent.isValid) continue;
        const stack = ent.getComponent("inventory")?.container?.getItem(0);
        if (!stack) continue;
        if (filterType && stack.typeId !== filterType) continue;
        if (!itemPredicate(stack)) continue;
        return true;
    }
    if (block) {
        const inv = block.getComponent("minecraft:inventory");
        if (inv) {
            const container = inv.container;
            for (let i = 0; i < container.size; i++) {
                const item = container.getItem(i);
                if (!item) continue;
                if (filterType && item.typeId !== filterType) continue;
                if (!itemPredicate(item)) continue;
                return true;
            }
        }
    }
    return false;
}

/**
 * Try to grab 1 item from location.
 * Searches: ground items → conveyor_items (depot) → container block.
 * Returns ItemStack or null.
 */
function grabFromSource(dimension, loc, filterItem, itemPredicate = () => true) {
    const block      = dimension.getBlock(loc);
    const center     = block?.center() ?? { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
    const filterType = filterItem?.typeId ?? null;

    // 1. Ground items
    for (const ent of dimension.getEntities({ type: "minecraft:item", location: center, maxDistance: 0.75 })) {
        if (!ent.isValid) continue;
        const stack = ent.getComponent("minecraft:item")?.itemStack;
        if (!stack) continue;
        if (filterType && stack.typeId !== filterType) continue;
        if (!itemPredicate(stack)) continue;
        const taken = stack.clone();
        taken.amount = 1;
        if (stack.amount > 1) {
            const rest = stack.clone();
            rest.amount = stack.amount - 1;
            const s = dimension.spawnItem(rest, ent.location);
            if (s?.isValid) s.clearVelocity();
        }
        ent.remove();
        return taken;
    }

    // 2. Conveyor / depot items (create:conveyor_item entities)
    for (const ent of dimension.getEntities({ type: "create:conveyor_item", location: center, maxDistance: 0.75 })) {
        if (!ent.isValid) continue;
        const container = ent.getComponent("inventory")?.container;
        const stack = container?.getItem(0);
        if (!stack) continue;
        if (filterType && stack.typeId !== filterType) continue;
        if (!itemPredicate(stack)) continue;
        const taken = stack.clone();
        taken.amount = 1;
        if (stack.amount > 1) {
            const rest = stack.clone();
            rest.amount = stack.amount - 1;
            racoAPI.setItemInHand(rest, ent, "Mainhand", 0, "create:item_visual");
        } else {
            ent.remove();
        }
        return taken;
    }

    // 3. Container block
    if (block) {
        const inv = block.getComponent("minecraft:inventory");
        if (inv) {
            const container = inv.container;
            for (let i = 0; i < container.size; i++) {
                const item = container.getItem(i);
                if (!item) continue;
                if (filterType && item.typeId !== filterType) continue;
                if (!itemPredicate(item)) continue;
                const taken = item.clone();
                taken.amount = 1;
                if (item.amount > 1) {
                    const rest = item.clone();
                    rest.amount = item.amount - 1;
                    container.setItem(i, rest);
                } else {
                    container.setItem(i, undefined);
                }
                return taken;
            }
        }
    }

    return null;
}

/**
 * Drop item to output location.
 * Inserts into container if present; otherwise spawns on top of block.
 */
function dropToOutput(dimension, loc, item) {
    const block  = dimension.getBlock(loc);
    const above  = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
    if (block) {
        if (block.typeId === "create:blaze_burner" && feedBlazeBurner(block, item)) return;
        if (block.typeId === "create:brass_funnel" && tryInsertItemFromArmIntoFunnel(block, item)) return;

        const inv = block.getComponent("minecraft:inventory");
        if (inv) {
            const leftover = inv.container.addItem(item);
            if (leftover) {
                const spawned = dimension.spawnItem(leftover, above);
                if (spawned?.isValid) spawned.clearVelocity();
            }
            return;
        }
    }
    const spawned = dimension.spawnItem(item, above);
    if (spawned?.isValid) spawned.clearVelocity();
}

// ── Helper to find the arm entity at a block ──────────────────────────────────
function getArmEntity(block) {
    return block.dimension.getEntities({
        type: "create:mechanical_arm_entity",
        location: block.center(),
        maxDistance: 0.5
    })[0] ?? null;
}

function getVisualItemType(item) {
    if (!item) return "item";
    if (racoAPI.isHandEquippedFilterItem(item.typeId)) return "hand_equipped";
    try { return racoAPI.itemStackIs(item); } catch { return "item"; }
}

function syncArmVisuals(entity) {
    const container = entity?.getComponent("inventory")?.container;
    if (!container) return;

    const filterItem = container.getItem(0);
    const heldItem = container.getItem(1);
    const visualKey = `${filterItem?.typeId ?? ""}|${heldItem?.typeId ?? ""}`;
    if (entity.getDynamicProperty("create:arm_visual_key") === visualKey && mc.system.currentTick % 20 !== 0) return;

    entity.setDynamicProperty("create:arm_visual_key", visualKey);
    entity.setProperty("create:type_filter", getVisualItemType(filterItem));
    entity.setProperty("create:type_claw", getVisualItemType(heldItem));

    try { entity.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${filterItem?.typeId ?? "air"}`); } catch {}
    try { entity.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${heldItem?.typeId ?? "air"}`); } catch {}
}

function closeTo(value, target) {
    return Math.abs((value ?? 0) - target) < 0.001;
}

function fixReloadedRestPose(entity) {
    const defaultShoulder = 130;
    const defaultElbow = 42.5;
    const isRawDefaultPose =
        closeTo(entity.getProperty("create:arm_2"), defaultShoulder) &&
        closeTo(entity.getProperty("create:arm_2_new"), defaultShoulder) &&
        closeTo(entity.getProperty("create:arm_3"), defaultElbow) &&
        closeTo(entity.getProperty("create:arm_3_new"), defaultElbow);

    if (!isRawDefaultPose) return;

    entity.setProperty("create:arm_2", ARM_REST_SHOULDER);
    entity.setProperty("create:arm_2_new", ARM_REST_SHOULDER);
    entity.setProperty("create:arm_3", ARM_REST_ELBOW);
    entity.setProperty("create:arm_3_new", ARM_REST_ELBOW);
}

// ── Pre-placement configuration ───────────────────────────────────────────────

/**
 * Called from beforeBlockInteract when the player is holding create:mechanical_arm.
 * Sets input block on 1st click, output block on 2nd click.
 * Returns true if the interaction should be cancelled.
 */
export function mechanicalArmBeforeInteract(player, block, item) {
    if (item?.typeId !== "create:mechanical_arm") return false;
    if (block.typeId === "create:mechanical_arm") return false;

    // Lê as DPs de forma síncrona (leitura é permitida em before events)
    const pendingInput  = player.getDynamicProperty("create:arm_pending_input");
    const pendingOutput = player.getDynamicProperty("create:arm_pending_output");

    // Ambos já definidos — não cancela; deixa o jogador colocar o braço
    if (pendingInput != null && pendingOutput != null) return false;

    // Captura a localização antes do mc.system.run (Block fica inválido depois)
    const loc = { x: block.location.x, y: block.location.y, z: block.location.z };

    mc.system.run(() => {
        if (pendingInput == null) {
            player.setDynamicProperty("create:arm_pending_input", JSON.stringify(loc));
            player.onScreenDisplay.setActionBar("§aInput set! Now click the output block.");
        } else {
            player.setDynamicProperty("create:arm_pending_output", JSON.stringify(loc));
            player.onScreenDisplay.setActionBar("§aOutput set! Now place the Mechanical Arm.");
        }
    });
    return true; // cancela a interação (não abre baú, etc.)
}

/**
 * Called from playerBlockPlace after the arm block is placed.
 * Transfers pending input/output DPs from player to the arm entity.
 */
export function mechanicalArmBlockPlaced(data) {
    const { block, player } = data;
    if (block.typeId !== "create:mechanical_arm") return;

    // Wait one tick for the RPM system to summon the entity
    mc.system.runTimeout(() => {
        const entity = getArmEntity(block);
        if (!entity) return;

        const inputRaw  = player?.getDynamicProperty("create:arm_pending_input");
        const outputRaw = player?.getDynamicProperty("create:arm_pending_output");

        if (inputRaw)  entity.setDynamicProperty("create:arm_input",  inputRaw);
        if (outputRaw) entity.setDynamicProperty("create:arm_output", outputRaw);

        player?.setDynamicProperty("create:arm_pending_input",  undefined);
        player?.setDynamicProperty("create:arm_pending_output", undefined);

        if (inputRaw && outputRaw) {
            player?.onScreenDisplay.setActionBar("§eMechanical Arm configured!");
        } else if (!inputRaw || !outputRaw) {
            player?.onScreenDisplay.setActionBar("§cWarning: input or output not set. Break and replace.");
        }
    }, 1);
}

// ── Despawn — drop held/filter items when block is broken ─────────────────────

/** Called from entityJsonEvent when create:despawn_entity fires on the arm entity. */
export function mechanicalArmDespawn(entity) {
    const container = entity.getComponent("inventory")?.container;
    if (!container) return;
    const held   = container.getItem(1);
    const filter = container.getItem(0);
    if (held) {
        const s = entity.dimension.spawnItem(held, entity.location);
        if (s?.isValid) s.clearVelocity();
    }
    // filter is not a stored item — discard silently
}

// ── Filter interaction (on the placed arm block) ──────────────────────────────

/**
 * Called from blockInteract when player right-clicks the placed arm.
 * - Normal click with item  → set filter
 * - Sneak click (empty hand) → remove held item first, then filter
 */
export function mechanicalArmInteract(block, player, item) {
    const entity = getArmEntity(block);
    if (!entity) return;

    const container = entity.getComponent("inventory")?.container;
    if (!container) return;

    if (player.isSneaking) {
        // Sneak: drop held item (slot 1), then filter (slot 0)
        const heldItem = container.getItem(1);
        if (heldItem) {
            const s = block.dimension.spawnItem(heldItem, { x: block.location.x + 0.5, y: block.location.y + 0.5, z: block.location.z + 0.5 });
            if (s?.isValid) s.clearVelocity();
            container.setItem(1, undefined);
            entity.runCommand("replaceitem entity @s slot.weapon.offhand 0 minecraft:air");
            return;
        }
        const filterItem = container.getItem(0);
        if (filterItem) {
            container.setItem(0, undefined);
            entity.runCommand("replaceitem entity @s slot.weapon.mainhand 0 minecraft:air");
        }
        return;
    }

    if (item) {
        racoAPI.setItemInHand(item, entity, "Mainhand", 0, "create:type_filter");
        racoAPI.clearMainhand(player, 1);
    }
}

// ── Main tick ─────────────────────────────────────────────────────────────────

/** Called every tick while the arm block is ticking (spinning). */
export function mechanicalArmTick(block) {
    const entity = getArmEntity(block);
    if (!entity) return;
    syncArmVisuals(entity);
    fixReloadedRestPose(entity);

    const rpm = entity.getProperty("create:rpm") ?? 0;
    if (rpm === 0) return;

    // Update gear speed every tick (like Fabricate) so the AC always has the right state
    const snappedRpm = snapToPowerOf2(Math.abs(rpm));
    entity.setProperty("create:speed", SPEED_INDEX[snappedRpm]);

    const inputRaw  = entity.getDynamicProperty("create:arm_input");
    const outputRaw = entity.getDynamicProperty("create:arm_output");
    if (!inputRaw || !outputRaw) return;

    const inputPos  = JSON.parse(inputRaw);
    const outputPos = JSON.parse(outputRaw);

    // Validate reach (arm pivot → block center + 0.5)
    const c = block.center();
    const distTo = (pos) => {
        const dx = pos.x + 0.5 - c.x, dy = pos.y + 0.5 - c.y, dz = pos.z + 0.5 - c.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    };
    if (distTo(inputPos) > MAX_REACH || distTo(outputPos) > MAX_REACH) return;

    const now      = mc.system.currentTick;
    const stateRaw = entity.getDynamicProperty("create:arm_state");
    let   state    = stateRaw ? JSON.parse(stateRaw) : { phase: "idle", timeout: 0 };

    // Still waiting for movement to finish
    if (now < state.timeout) return;

    const container  = entity.getComponent("inventory")?.container;
    if (!container) return;
    const filterItem = container.getItem(0);
    const heldItem   = container.getItem(1);
    const outputBlock = block.dimension.getBlock(outputPos);
    const outputIsBlazeBurner = outputBlock?.typeId === "create:blaze_burner";
    const outputBlazeBurnerActive = outputIsBlazeBurner && isBlazeBurnerBlockActive(outputBlock);
    const outputItemPredicate = outputBlock?.typeId === "create:blaze_burner"
        ? (item) => !outputBlazeBurnerActive && isBlazeBurnerFuel(item)
        : () => true;

    switch (state.phase) {
        case "idle": {
            if (heldItem) {
                if (outputBlazeBurnerActive) break;
                // Already holding — deliver it
                const delay = setArmTarget(entity, block,
                    { x: outputPos.x + 0.5, y: outputPos.y + 0.5, z: outputPos.z + 0.5 }, rpm);
                state = { phase: "traveling_to_output", timeout: now + delay + 2 };
            } else {
                // Only move if there is something to pick up
                if (!hasItemAtSource(block.dimension, inputPos, filterItem, outputItemPredicate)) break;
                const delay = setArmTarget(entity, block,
                    { x: inputPos.x + 0.5, y: inputPos.y + 0.5, z: inputPos.z + 0.5 }, rpm);
                state = { phase: "traveling_to_input", timeout: now + delay + 2 };
            }
            break;
        }

        case "traveling_to_input": {
            // Arrived at input — try to grab
            const grabbed = grabFromSource(block.dimension, inputPos, filterItem, outputItemPredicate);
            if (grabbed) {
                racoAPI.setItemInHand(grabbed, entity, "Offhand", 1, "create:type_claw");
                const delay = setArmTarget(entity, block,
                    { x: outputPos.x + 0.5, y: outputPos.y + 0.5, z: outputPos.z + 0.5 }, rpm);
                state = { phase: "traveling_to_output", timeout: now + delay + 2 };
            } else {
                // Nothing to grab — return to rest
                const delay = setArmRest(entity, rpm);
                state = { phase: "returning", timeout: now + delay + 2 };
            }
            break;
        }

        case "traveling_to_output": {
            // Arrived at output — drop item
            const item = container.getItem(1);
            if (item) {
                if (outputBlazeBurnerActive) {
                    state = { phase: "traveling_to_output", timeout: now + 10 };
                    break;
                }
                dropToOutput(block.dimension, outputPos, item);
                container.setItem(1, undefined);
                entity.runCommand("replaceitem entity @s slot.weapon.offhand 0 minecraft:air");
            }
            const delay = setArmRest(entity, rpm);
            state = { phase: "returning", timeout: now + delay + 2 };
            break;
        }

        case "returning": {
            // Rest pose reached — back to idle
            state = { phase: "idle", timeout: now };
            break;
        }
    }

    entity.setDynamicProperty("create:arm_state", JSON.stringify(state));
}
