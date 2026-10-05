import { BlockPermutation, system } from "@minecraft/server";
import { clearMainhand } from "../../racoScripts/raco-API.js";
import { assembleCartAssemblerContraption, disassembleCartAssemblerContraption, findMinecartOnCartAssembler } from "./mechanicalBearing.js";

const CART_ASSEMBLER = "create:cart_assembler";
const RAILS = new Set([
    "minecraft:rail",
    "minecraft:golden_rail",
    "minecraft:powered_rail",
    "minecraft:detector_rail",
    "minecraft:activator_rail"
]);

function cartAssemblerDirectionFromRail(rail) {
    let railDirection = 0;
    try {
        railDirection = Number(rail.permutation.getState("rail_direction")
            ?? rail.permutation.getState("minecraft:rail_direction") ?? 0);
    } catch {}
    return railDirection === 1 || railDirection === 2 || railDirection === 3 ? "east" : "north";
}

export function placeCartAssemblerOnRail(data) {
    const { block, player } = data;
    if (!RAILS.has(block?.typeId) || !player || data.isFirstEvent === false) return false;

    let held = data.itemStack;
    try { held ??= player.getComponent("minecraft:equippable")?.getEquipment("Mainhand"); } catch {}
    if (held?.typeId !== CART_ASSEMBLER) return false;

    data.cancel = true;
    const location = { ...block.location };
    const dimension = block.dimension;
    const direction = cartAssemblerDirectionFromRail(block);
    system.run(() => {
        const target = dimension.getBlock(location);
        if (!RAILS.has(target?.typeId)) return;
        let currentHeld;
        try { currentHeld = player.getComponent("minecraft:equippable")?.getEquipment("Mainhand"); } catch {}
        if (currentHeld?.typeId !== CART_ASSEMBLER) return;
        try {
            target.setPermutation(BlockPermutation.resolve(CART_ASSEMBLER, {
                "minecraft:cardinal_direction": direction,
                "create:powered": false
            }));
            clearMainhand(player, 1);
            dimension.playSound("use.stone", target.center(), { volume: 0.7, pitch: 1.0 });
        } catch {}
    });
    return true;
}

export function cartAssemblerTick(block, dimension = block?.dimension) {
    if (!block?.isValid || block.typeId !== CART_ASSEMBLER) return false;
    const minecart = findMinecartOnCartAssembler(block);
    if (!minecart) return false;

    let powered = false;
    try { powered = block.permutation.getState("create:powered") === true; } catch {}
    const changed = powered
        ? assembleCartAssemblerContraption(block, minecart)
        : disassembleCartAssemblerContraption(block, minecart);
    return changed;
}

export function cartAssemblerRedstoneUpdate(block, dimension, powerLevel) {
    if (!block?.isValid || block.typeId !== CART_ASSEMBLER) return false;
    const powered = Number(powerLevel ?? 0) > 0;
    let current = false;
    try { current = block.permutation.getState("create:powered") === true; } catch {}
    if (current !== powered) {
        try { block.setPermutation(block.permutation.withState("create:powered", powered)); } catch { return false; }
    }
    try {
        dimension?.playSound("random.click", block.center(), {
            volume: 0.45,
            pitch: powered ? 1.35 : 0.8
        });
    } catch {}
    system.run(() => cartAssemblerTick(block, dimension));
    return true;
}
