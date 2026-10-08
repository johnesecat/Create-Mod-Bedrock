import { MolangVariableMap, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { recalculateNetwork } from "../rpm/rpmCore";

/** @type {Readonly<Partial<Record<Lowercase<import('@minecraft/server').Direction>, string>>>} */
const MOTOR_RPM_PARTICLES = {
    north: "create:motor_rpm_north_v2",
    south: "create:motor_rpm_south_v2",
    east: "create:motor_rpm_east_v2",
    west: "create:motor_rpm_west_v2",
    up: "create:motor_rpm_up_v2"
};

/** @type {Readonly<Partial<Record<Lowercase<import('@minecraft/server').Direction>, string>>>} */
const SPEED_CONTROLLER_RPM_PARTICLES = {
    north: "create:speed_controller_rpm_north",
    south: "create:speed_controller_rpm_south",
    east: "create:speed_controller_rpm_east",
    west: "create:speed_controller_rpm_west"
};

/** @param {import('@minecraft/server').Entity | undefined} value */
function isValid(value) {
    return value?.isValid === true;
}

/** @param {string} value
 * @returns {value is Lowercase<import('@minecraft/server').Direction>}
 */
function isDirection(value) {
    return ['north', 'south', 'east', 'west', 'up', 'down'].includes(value);
}

/** @param {import('@minecraft/server').Entity} entity */
function getMotorRpm(entity) {
    const value = entity.getProperty('create:rpm');
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** @param {import('@minecraft/server').Player} player
 * @param {number} currentTick
 */
export function creativeMotorRpmParticleTick(player, currentTick) {
    if (!isValid(player) || currentTick % 3 !== 0) return;

    let hit;
    try { hit = player.getBlockFromViewDirection({ maxDistance: 6 }); } catch { return; }
    const block = hit?.block;
    if (!block || block.typeId !== "create:creative_motor") return;

    // Mostra o RPM somente na face do motor atingida pela mira.
    // A face inferior (down) nao existe no mapa e, portanto, nao renderiza.
    const face = `${hit?.face ?? ""}`.toLowerCase();
    if (!isDirection(face)) return;
    const particleId = MOTOR_RPM_PARTICLES[face];
    if (!particleId) return;

    let motorDirection = "";
    try {
        motorDirection = `${block.permutation.getState("minecraft:facing_direction") ?? ""}`.toLowerCase();
    } catch { return; }

    // Quando o motor esta em pe, mostra nas tres placas laterais e oculta
    // somente a face escura. O lado escuro inverte entre up e down.
    // Topo/eixo e parte inferior tambem permanecem sem RPM.
    const isVertical = motorDirection === "up" || motorDirection === "down";
    if (isVertical) {
        if (face === "up" || face === "down") return;
        const darkFace = motorDirection === "up" ? "south" : "north";
        if (face === darkFace) return;
    }

    let entity;
    try {
        entity = block.dimension.getEntities({
            location: block.center(),
            type: "create:creative_motor_entity",
            maxDistance: 0.5
        })[0];
    } catch { return; }
    if (!entity || !isValid(entity)) return;

    let rpm = 0;
    try { rpm = getMotorRpm(entity); } catch { return; }
    const digits = String(Math.min(256, Math.max(0, Math.round(Math.abs(rpm))))).split("").map(Number);
    const center = block.center();
    const spacing = 0.1;

    for (let index = 0; index < digits.length; index++) {
        const offset = (index - ((digits.length - 1) / 2)) * spacing;
        const variables = new MolangVariableMap();
        variables.setFloat("digit", digits[index]);
        variables.setFloat("digit_offset", offset);
        try { block.dimension.spawnParticle(particleId, center, variables); } catch {}
    }
}

/** @param {import('@minecraft/server').Player} player
 * @param {number} currentTick
 */
export function speedControllerRpmParticleTick(player, currentTick) {
    if (!isValid(player) || currentTick % 3 !== 0) return;

    let hit;
    try { hit = player.getBlockFromViewDirection({ maxDistance: 6 }); } catch { return; }
    const block = hit?.block;
    if (!block || block.typeId !== "create:rotation_speed_controller") return;

    const face = `${hit?.face ?? ""}`.toLowerCase();
    if (!isDirection(face)) return;
    const particleId = SPEED_CONTROLLER_RPM_PARTICLES[face];
    if (!particleId) return;

    let direction = "";
    try {
        direction = `${block.permutation.getState("minecraft:cardinal_direction") ?? "south"}`.toLowerCase();
    } catch { return; }

    const northSouth = direction === "north" || direction === "south";
    if (northSouth && face !== "east" && face !== "west") return;
    if (!northSouth && face !== "north" && face !== "south") return;

    let entity;
    try {
        entity = block.dimension.getEntities({
            location: block.center(),
            type: "create:rotation_speed_controller_entity",
            maxDistance: 0.5
        })[0];
    } catch { return; }
    if (!entity || !isValid(entity)) return;

    let rpm = 0;
    try {
        const savedRpm = entity.getDynamicProperty('create:speed_controller');
        rpm = typeof savedRpm === 'number' && Number.isFinite(savedRpm) ? savedRpm : getMotorRpm(entity);
    } catch { return; }

    const digits = String(Math.min(256, Math.max(0, Math.round(Math.abs(rpm))))).split("").map(Number);
    const center = block.center();
    const spacing = 0.1;

    for (let index = 0; index < digits.length; index++) {
        const offset = (index - ((digits.length - 1) / 2)) * spacing;
        const variables = new MolangVariableMap();
        variables.setFloat("digit", digits[index]);
        variables.setFloat("digit_offset", offset);
        try { block.dimension.spawnParticle(particleId, center, variables); } catch {}
    }
}


/** @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').Block} block
 * @param {import('@minecraft/server').Dimension} dimension
 */
export function onInteractCreativeMotor(player, block, dimension) {
    const blockLocation = { x: block.location.x, y: block.location.y, z: block.location.z };
    const blockTypeId = block.typeId;
    const entityTypeId = `${blockTypeId}_entity`;
    const entity = dimension.getEntities({ location: block.center(), type: entityTypeId, maxDistance: 0.5 })[0];
    if (!entity?.isValid) return;
    const form = new ModalFormData();

    form.title({ rawtext: [{ text: 'create:rpm.' }, { translate: 'creative_motor.title' }] })
    const currentRpm = getMotorRpm(entity);
    form.toggle({ translate: 'creative_motor.reverse_rotation.text' }, { defaultValue: currentRpm < 0 });
    form.slider({ translate: 'creative_motor.speed.text' }, 1, 256, { defaultValue: Math.min(256, Math.max(1, Math.abs(currentRpm))) });
    form.submitButton({ translate: 'creative_motor.confirm.text' });
    form.show(player).then(resp => {
        if (resp.canceled || !resp.formValues) return;
        const [invert, speed] = resp.formValues;
        if (typeof invert !== 'boolean' || typeof speed !== 'number' || !Number.isFinite(speed) || speed < 1 || speed > 256) return;
        const rpm = invert ? -speed : speed;

        // A tela pode ficar aberta enquanto o bloco/entidade e removido. Localiza tudo
        // novamente antes de alterar propriedades para evitar InvalidEntityError.
        const currentBlock = dimension.getBlock(blockLocation);
        if (!currentBlock || currentBlock.typeId !== blockTypeId) return;

        const currentEntity = dimension.getEntities({
            location: currentBlock.center(),
            type: entityTypeId,
            maxDistance: 0.5
        })[0];
        if (!currentEntity?.isValid) return;

        try {
            currentEntity.setDynamicProperty('create:generator_rpm', rpm);
            currentEntity.setProperty('create:rpm', rpm);
        } catch {
            return;
        }

        if (resp.formValues && player.isValid) {
            player.playSound('beacon.power', { pitch: 8, volume: 0.35, location: currentBlock.center() });
            system.runJob(recalculateNetwork(currentBlock, dimension, { eventType: 'update' }));
        };
    }).catch(error => console.warn(`[Create] Creative motor form failed: ${error}`));
};
