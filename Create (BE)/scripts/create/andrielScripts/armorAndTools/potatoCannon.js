import { ItemStack, system } from "@minecraft/server";

const POTATO_CANNON = "create:potato_cannon";
const POTATO_PROJECTILE = "create:potato_projectile";
const SHOT_COOLDOWN_TICKS = 25;
const lastShotTick = new Map();

const AMMUNITION = [
    "minecraft:potato", "minecraft:baked_potato", "minecraft:apple", "minecraft:golden_apple",
    "minecraft:enchanted_golden_apple", "minecraft:carrot", "minecraft:golden_carrot", "minecraft:beetroot",
    "minecraft:sweet_berries", "minecraft:glow_berries", "minecraft:chorus_fruit", "minecraft:melon_slice",
    "minecraft:pumpkin_pie", "minecraft:cake", "minecraft:cod", "minecraft:cooked_cod",
    "minecraft:salmon", "minecraft:cooked_salmon", "minecraft:tropical_fish", "minecraft:pufferfish",
    "minecraft:rotten_flesh", "minecraft:spider_eye", "minecraft:poisonous_potato", "minecraft:bread",
    "minecraft:cookie"
];
const AMMO_INDEX = new Map(AMMUNITION.map((typeId, index) => [typeId, index]));

// The projectile component has gravity, so reducing launch speed naturally
// gives heavy foods a stronger arc while light foods travel farther.
const LIGHT_AMMO = new Set([8, 9, 11, 24]);
const HEAVY_AMMO = new Set([3, 4, 12, 13, 14, 15, 16, 17, 18, 19]);

/** @param {number} ammoIndex */
function getAmmoMotion(ammoIndex) {
    if (LIGHT_AMMO.has(ammoIndex)) return { speed: 1.9, weight: 0.7 };
    if (HEAVY_AMMO.has(ammoIndex)) return { speed: 1.32, weight: 1.35 };
    return { speed: 1.65, weight: 1.0 };
}

/** @param {import('@minecraft/server').Entity} projectile @param {number} ammoIndex */
function playProjectileImpact(projectile, ammoIndex) {
    try {
        const { weight } = getAmmoMotion(ammoIndex);
        projectile.dimension.playSound("random.pop", projectile.location, {
            volume: 0.55 + weight * 0.35,
            pitch: 1.35 / weight
        });
    } catch {}
}

/** @param {import('@minecraft/server').Player} player */
function takeAmmunition(player) {
    let container;
    try { container = player.getComponent("minecraft:inventory")?.container; } catch {}
    if (!container) return undefined;

    for (let slot = 0; slot < container.size; slot++) {
        const stack = container.getItem(slot);
        if (!stack) continue;
        const ammoIndex = AMMO_INDEX.get(stack.typeId);
        if (ammoIndex === undefined) continue;
        const typeId = stack.typeId;

        if (stack.amount > 1) {
            stack.amount--;
            container.setItem(slot, stack);
        } else {
            container.setItem(slot, undefined);
        }
        return { typeId, index: ammoIndex };
    }
    return undefined;
}

/** @param {import('@minecraft/server').Entity} target @param {string} effect
 * @param {number} duration @param {number} amplifier
 */
function addEffect(target, effect, duration, amplifier = 0) {
    try { target.addEffect(effect, duration, { amplifier, showParticles: true }); } catch {}
}

/** @param {import('@minecraft/server').Entity | undefined} projectile */
function despawnPotatoProjectile(projectile) {
    // Instant despawn does not play the generic entity death sound.
    try {
        if (projectile?.isValid) projectile.triggerEvent("create:remove");
    } catch {}
}

/** @param {import('@minecraft/server').ProjectileHitEntityAfterEvent} data */
export function potatoProjectileHitEntity(data) {
    const projectile = data?.projectile;
    if (projectile?.typeId !== POTATO_PROJECTILE) return false;

    let ammoIndex = 0;
    try {
        const value = projectile.getProperty('create:ammo_type');
        if (typeof value === 'number') ammoIndex = value;
    } catch {}
    let target;
    try { target = data.getEntityHit()?.entity; } catch {}

    if (target?.isValid) {
        switch (ammoIndex) {
            case 1:
                try { target.setOnFire(4, true); } catch {}
                break;
            case 3:
                addEffect(target, "regeneration", 100, 1);
                addEffect(target, "absorption", 2400, 0);
                break;
            case 4:
                addEffect(target, "regeneration", 400, 1);
                addEffect(target, "absorption", 2400, 3);
                addEffect(target, "resistance", 6000, 0);
                addEffect(target, "fire_resistance", 6000, 0);
                break;
            case 10: {
                const p = target.location;
                try {
                    target.tryTeleport({
                        x: p.x + Math.random() * 16 - 8,
                        y: p.y + Math.random() * 8 - 4,
                        z: p.z + Math.random() * 16 - 8
                    }, { checkForBlocks: true });
                } catch {}
                break;
            }
            case 19:
                addEffect(target, "poison", 120, 1);
                addEffect(target, "nausea", 200, 0);
                addEffect(target, "hunger", 300, 2);
                break;
            case 20:
                addEffect(target, "hunger", 600, 0);
                break;
            case 21:
                addEffect(target, "poison", 100, 0);
                break;
            case 22:
                addEffect(target, "poison", 100, 0);
                break;
        }
    }
    playProjectileImpact(projectile, ammoIndex);
    despawnPotatoProjectile(projectile);
    return true;
}

/** @param {import('@minecraft/server').ProjectileHitBlockAfterEvent} data */
export function potatoProjectileHitBlock(data) {
    const projectile = data?.projectile;
    if (projectile?.typeId !== POTATO_PROJECTILE) return false;
    let ammoIndex = 0;
    try {
        const value = projectile.getProperty('create:ammo_type');
        if (typeof value === 'number') ammoIndex = value;
    } catch {}
    playProjectileImpact(projectile, ammoIndex);
    despawnPotatoProjectile(projectile);
    return true;
}

/** @param {import('@minecraft/server').ItemUseAfterEvent} event */
export function usePotatoCannon({ source, itemStack }) {
    if (itemStack?.typeId !== POTATO_CANNON || source?.typeId !== "minecraft:player") return false;

    const previousTick = lastShotTick.get(source.id) ?? -SHOT_COOLDOWN_TICKS;
    if (system.currentTick - previousTick < SHOT_COOLDOWN_TICKS) return true;
    const ammunition = takeAmmunition(source);
    if (!ammunition) {
        try { source.playSound("note.bass", { volume: 0.45, pitch: 0.7 }); } catch {}
        return true;
    }

    lastShotTick.set(source.id, system.currentTick);
    try { source.startItemCooldown("create_potato_cannon", SHOT_COOLDOWN_TICKS); } catch {}

    const direction = source.getViewDirection();
    const head = source.getHeadLocation();
    // Camera-relative left vector: the projectile starts at the cannon's muzzle
    // while continuing to travel toward the crosshair.
    const left = {
        x: -direction.z,
        y: 0,
        z: direction.x
    };
    const spawnLocation = {
        x: head.x + direction.x * 1.15 + left.x * 0.55,
        y: head.y + direction.y * 1.15 - 0.12,
        z: head.z + direction.z * 1.15 + left.z * 0.55
    };

    try {
        const isBerryShot = ammunition.index === 8 || ammunition.index === 9;
        const ammoMotion = getAmmoMotion(ammunition.index);
        const pelletCount = isBerryShot ? 3 : 1;
        /** @param {number} pellet */
        const spawnPellet = (pellet) => {
            // Berry ammunition behaves like Create's shotgun shot. Each berry
            // starts in its own lane so the projectile entities do not overlap.
            const lane = isBerryShot ? pellet - 1 : 0;
            const projectileSpawn = {
                x: spawnLocation.x + left.x * lane * 0.08,
                y: spawnLocation.y,
                z: spawnLocation.z + left.z * lane * 0.08
            };
            const projectile = source.dimension.spawnEntity(POTATO_PROJECTILE, projectileSpawn);
            projectile.setProperty("create:ammo_type", ammunition.index);
            const projectileComponent = projectile.getComponent("minecraft:projectile");
            if (!projectileComponent) {
                projectile.remove();
                throw new Error('Potato projectile is missing its projectile component');
            }
            projectileComponent.owner = source;

            const horizontalSpread = isBerryShot ? lane * 0.055 : 0;
            const verticalSpread = isBerryShot ? (pellet === 1 ? 0.045 : -0.025) : 0;
            projectileComponent.shoot({
                x: (direction.x + left.x * horizontalSpread) * ammoMotion.speed,
                y: (direction.y + verticalSpread) * ammoMotion.speed + 0.035,
                z: (direction.z + left.z * horizontalSpread) * ammoMotion.speed
            }, { uncertainty: 0 });
        };
        for (let pellet = 0; pellet < pelletCount; pellet++) {
            if (isBerryShot && pellet !== 1) {
                // Spawn each side on a different tick. This prevents the two
                // side projectiles from touching each other at the muzzle.
                const pelletDelay = pellet === 0 ? 1 : 2;
                system.runTimeout(() => {
                    try { spawnPellet(pellet); } catch {}
                }, pelletDelay);
            } else {
                spawnPellet(pellet);
            }
        }
        source.playSound("create:fwoomp", { volume: 3.0, pitch: 1.0 });
    } catch {
        // Return the ammunition if the projectile could not be created.
        try { source.dimension.spawnItem(new ItemStack(ammunition.typeId, 1), source.location); } catch {}
    }
    return true;
}
