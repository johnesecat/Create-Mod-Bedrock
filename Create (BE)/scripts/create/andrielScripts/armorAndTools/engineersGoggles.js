import { world, system, Player } from "@minecraft/server";
import { rpmConfig } from "../rpm/rpmConfigs";
import { getFluidTankInfo } from "../../tank/fluidTank";
import { getSteamBoilerInfo } from "../../racoScripts/blocks/steamEngine.js";
import { compatibilityFluids } from "../../compatibility/registries.js";

const visibleGogglesPanels = new Set();

export function engineersGoggles(player, currentTick) {
    const viewDir = player.getViewDirection();
    const cameraLoc = player.getHeadLocation();
    cameraLoc.y += 0.2;

    const viewData = player.dimension.getBlockFromRay(cameraLoc, viewDir, { maxDistance: 8 });
    if (!viewData?.block) {
        clearGogglesPanel(player);
        return;
    }

    const targetBlock = viewData.block;

    if (targetBlock.typeId === "create:fluid_tank" || targetBlock.typeId === "create:creative_fluid_tank") {
        const boiler = targetBlock.typeId === "create:fluid_tank" ? getSteamBoilerInfo(targetBlock) : undefined;
        if (boiler) {
            const parts = [
                { text: "screen.create\u00a7fBoiler Status: " },
                { text: boiler.active ? "\u00a7aActive" : "\u00a7aIdle" },
                { text: `\n\u00a77Size...... ${boilerBar(boiler.sizeLevel, "\u00a7a")}` },
                { text: `\n\u00a77Water..... ${boilerBar(boiler.waterLevel, "\u00a79")}` },
                { text: `\n\u00a77Heat...... ${boilerBar(boiler.heatLevel, "\u00a7c")}` },
                { text: `\n\n\u00a7fKinetic Stress Capacity:\n\u00a7b${formatNumber(boiler.stressCapacity)}su \u00a77via ${boiler.engines} engine${boiler.engines === 1 ? "" : "s"}` }
            ];
            visibleGogglesPanels.add(player.id);
            player.onScreenDisplay.setActionBar({ rawtext: parts });
            return;
        }
        const tank = getFluidTankInfo(targetBlock);
        if (!tank) {
            clearGogglesPanel(player);
            return;
        }
        const parts = [
            { text: "screen.create" },
            { text: "\u00a7f" },
            { translate: "create.hud.goggles.fluid_container_info" }
        ];

        if (tank.fluid && tank.amount > 0) {
            parts.push(
                { text: "\n\u00a77" },
                { translate: fluidTranslationKey(tank.fluid) },
                { text: `\n  \u00a76${formatNumber(tank.amount)}mB \u00a77/ \u00a78${formatNumber(tank.capacity)}mB` }
            );
        } else {
            parts.push(
                { text: "\n\u00a77" },
                { translate: "create.hud.goggles.fluid_capacity" },
                { text: `\n  \u00a76${formatNumber(tank.capacity)}mB` }
            );
        }

        visibleGogglesPanels.add(player.id);
        player.onScreenDisplay.setActionBar({ rawtext: parts });
        return;
    }

    const config = rpmConfig.get(targetBlock.typeId);
    if (!config) {
        clearGogglesPanel(player);
        return;
    }

    const targetEntity = targetBlock.dimension.getEntities({ location: targetBlock.center(), maxDistance: 0.25, type: `${targetBlock.typeId}_entity`})[0];
    const rpm = targetEntity?.getProperty('create:rpm') ?? 0;

    let text = null;

    if (targetBlock.typeId === 'create:speedometer') {
        const absRpm = Math.abs(rpm);
        const speed = getSpeedLevel(rpm);

        text = { rawtext: [
            { text: 'screen.create' },
            { text: '§f' },
            { translate: 'create.hud.goggles.gauge.info_header' },
            { text: '\n§7' },
            { translate: "create.hud.goggles.speedometer.title" },
            { text: `\n ${speed.color}${speed.bar} ` },
            { translate: speed.label },
            { text: ` (${formatNumber(absRpm)} RPM)` }
        ]};
    }

    // Gerador (creative motor, hand crank, water wheel...)
    else if (config.isGenerator && (config.stressCapacity ?? 0) > 0) {
        const capacityTotal = config.stressCapacity * Math.abs(rpm);

        text = { rawtext: [
            { text: 'screen.create' },
            { text: '§f' },
            { translate: 'create.hud.goggles.generator_stats' },
            { text: '\n§7' },
            { translate: 'create.hud.goggles.stress_capacity' },
            { text: `\n  §b${formatNumber(capacityTotal)}su §8` },
            { translate: 'create.hud.goggles.at_current_speed' }
        ]};
    }

    // Máquina que consome stress (drill, saw, press, mixer...)
    else if ((config.stressImpact ?? 0) > 0) {
        const stressTotal = config.stressImpact * Math.abs(rpm);

        text = { rawtext: [
            { text: 'screen.create' },
            { text: '§f' },
            { translate: 'create.hud.goggles.kinetic_stats' },
            { text: '\n§7' },
            { translate: 'create.hud.goggles.stress_impact' },
            { text: `\n  §b${formatNumber(stressTotal)}su §8` },
            { translate: 'create.hud.goggles.at_current_speed' }
        ]};
    }

    else if (targetBlock.typeId === 'create:stressometer') {
        const totalStress = targetEntity?.getDynamicProperty('create:network_stress') ?? 0;
        const totalCapacity = targetEntity?.getDynamicProperty('create:network_capacity') ?? 0;
        const fraction = totalCapacity > 0 ? totalStress / totalCapacity : 0;
        const remaining = Math.max(0, totalCapacity - totalStress);
        const stress = getStressLevel(fraction);
        
        text = { rawtext: [
            { text: 'screen.create' },
            { text: '§f' },
            { translate: 'create.hud.goggles.gauge.info_header' },
            { text: '\n§7' },
            { translate: 'create.hud.goggles.stressometer.title' },
            { text: `\n ${stress.color}${stress.bar} ` },
            { translate: stress.label },
            { text: ` (${Math.round(fraction * 100)}%)` },
            { text: '\n§7' },
            { translate: 'create.hud.goggles.stressometer.capacity' },
            { text: `\n  ${stress.color}${formatNumber(remaining)}su §7/ §8${formatNumber(totalCapacity)} su` }
        ]};
    }

    else if (!text) {
        const absRpm = Math.abs(rpm);
        const speed = getSpeedLevel(rpm);

        const parts = [
            { text: 'screen.create' },
            { text: '§f' },
            { translate: 'create.hud.goggles.kinetic_info' },
            { text: '\n§7' },
            { translate: 'create.hud.goggles.speedometer.title' },
            { text: `\n ${speed.color}${speed.bar} ` },
            { translate: speed.label },
            { text: ` (${formatNumber(absRpm)} RPM)` }
        ];

        const powered = targetBlock.permutation.getState('create:powered');
        if (powered !== undefined) {
            parts.push({ text: '\n\n§7' });
            parts.push({ translate: 'create.hud.goggles.redstone_state' });
            parts.push({ text: ' §b' });
            parts.push({ translate: powered ? 'create.hud.goggles.state.active' : 'create.hud.goggles.state.inactive' });
        };

        text = { rawtext: parts };
    };

    if (!text) {
        clearGogglesPanel(player);
        return;
    }
    visibleGogglesPanels.add(player.id);
    player.onScreenDisplay.setActionBar(text);
};

export function clearGogglesPanel(player) {
    if (!visibleGogglesPanels.delete(player.id)) return;
    try {
        player.onScreenDisplay.setActionBar({ rawtext: [] });
    } catch {}
}

function getSpeedLevel(rpm) {
    const abs = Math.abs(rpm);
    if (abs >= 100) return { bar: '\u2588\u2588\u2588', label: 'create.hud.goggles.speed.fast', color: '§d' };
    if (abs >= 30)  return { bar: '\u2588\u2588\u2592', label: 'create.hud.goggles.speed.medium', color: '§b' };
    if (abs > 0)   return { bar: '\u2588\u2592\u2592', label: 'create.hud.goggles.speed.slow', color: '§a' };
    return { bar: '\u2592\u2592\u2592', label: 'create.hud.goggles.speed.none', color: '§8' };
};

function getStressLevel(fraction) {
    if (fraction > 1)    return { bar: '\u2588\u2588\u2588', label: 'create.hud.goggles.stressImpact.overstressed', color: '§c' };
    if (fraction > 0.75) return { bar: '\u2588\u2588\u2592', label: 'create.hud.goggles.stressImpact.high', color: '§6' };
    if (fraction > 0.5)  return { bar: '\u2588\u2588\u2592', label: 'create.hud.goggles.stressImpact.medium', color: '§e' };
    return { bar: '\u2588\u2592\u2592', label: 'create.hud.goggles.stressImpact.low', color: '§a' };
};

function formatNumber(n) {
    const parts = n.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
};

function boilerBar(fraction, color) {
    const total = 8;
    const filled = Math.max(0, Math.min(total, Math.round(fraction * total)));
    return `${color}${"\u2588".repeat(filled)}\u00a78${"\u2588".repeat(total - filled)}`;
}

function fluidTranslationKey(fluidId) {
    switch (fluidId) {
        case "minecraft:water_bucket": return "create.hud.goggles.fluid.water";
        case "minecraft:lava_bucket": return "create.hud.goggles.fluid.lava";
        case "minecraft:milk_bucket": return "create.hud.goggles.fluid.milk";
        case "create:honey_bucket": return "create.hud.goggles.fluid.honey";
        case "create:chocolate_bucket": return "create.hud.goggles.fluid.chocolate";
        default: return compatibilityFluids.get(fluidId)?.translationKey ?? "create.hud.goggles.fluid.unknown";
    }
}
