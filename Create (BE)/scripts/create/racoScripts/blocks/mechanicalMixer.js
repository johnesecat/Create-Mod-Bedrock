import * as mc from "@minecraft/server";
import { setItemInHand, separeItemEntity } from "../raco-API.js";
import { isBlazeBurnerBlockActive, isBlazeBurnerBlockSuperheated } from "./blazeBurner.js";
import { fillBucketFromFluidContainer, itemDrainBreak, peekItemDrainFluid, receiveItemDrainFluid, syncBasinFluid, transformItemDrainFluid } from "./itemDrain.js";
export { MIXER_RECIPE_TABS } from "./mechanicalMixerRecipes.js";
import { compatibilityRecipes } from "../../compatibility/registries.js";

// ============================================================
// RECIPES
// input:  { "itemId": count } — todos os itens devem estar presentes, sem extras
// output: { id: "itemId", amount: count }
// ============================================================
/** @typedef {{input: Record<string, number>, output?: {id: string, amount: number}, fluidInput?: string, fluidOutput?: string, requiresHeat?: boolean, requiresSuperheat?: boolean, particleColor?: {red: number, green: number, blue: number, alpha: number}}} MixerRecipe */
/** @typedef {MixerRecipe & Record<string, any>} MixerCompatibleRecipe */
/** @type {MixerRecipe[]} */
export const MIXER_RECIPES = [
    // Andesite Alloy — receita principal do Create
    {
        input:  { "minecraft:andesite": 1, "minecraft:iron_nugget": 1 },
        output: { id: "create:andesite_alloy", amount: 2 },
        particleColor: { red: 0.50, green: 0.48, blue: 0.46, alpha: 1 }
    },
    // Andesite Alloy — variante com zinc nugget
    {
        input:  { "minecraft:andesite": 1, "create:zinc_nugget": 2 },
        output: { id: "create:andesite_alloy", amount: 2 },
        particleColor: { red: 0.50, green: 0.48, blue: 0.46, alpha: 1 }
    },
    {
        input: { "minecraft:egg": 1, "minecraft:sugar": 1, "create:cinder_flour": 1 },
        output: { id: "create:blaze_cake_base", amount: 1 },
        particleColor: { red: 0.72, green: 0.16, blue: 0.09, alpha: 1 }
    },
    // Brass Ingot — liga de cobre + zinco (no Create Java exige aquecimento/blaze burner)
    {
        input:  { "minecraft:copper_ingot": 1, "create:zinc_ingot": 1 },
        output: { id: "create:brass_ingot", amount: 1 },
        requiresHeat: true,
        particleColor: { red: 0.78, green: 0.58, blue: 0.24, alpha: 1 }
    },
    // Cobblestone vira lava somente com um Blaze Burner Super-Heated.
    {
        input: { "minecraft:cobblestone": 1 },
        fluidOutput: "minecraft:lava_bucket",
        requiresSuperheat: true,
        particleColor: { red: 1.00, green: 0.28, blue: 0.03, alpha: 1 }
    },
    {
        input: { "minecraft:sugar": 1, "minecraft:cocoa_beans": 1 },
        fluidInput: "minecraft:milk_bucket",
        fluidOutput: "create:chocolate_bucket",
        requiresHeat: true,
        particleColor: { red: 0.30, green: 0.13, blue: 0.07, alpha: 1 }
    },
    {
        input: { "minecraft:honey_block": 1 },
        fluidOutput: "create:honey_bucket",
        requiresHeat: true,
        particleColor: { red: 0.95, green: 0.62, blue: 0.12, alpha: 1 }
    },
    // Rose Quartz — 4 redstone + 1 nether quartz (no Create Java exige aquecimento)
    {
        input:  { "minecraft:redstone": 4, "minecraft:quartz": 1 },
        output: { id: "create:rose_quartz", amount: 1 },
        particleColor: { red: 0.93, green: 0.45, blue: 0.55, alpha: 1 }
    },

    // ─── Mistura de corantes (igual à crafting table vanilla) ─────────────
    {
        input:  { "minecraft:red_dye": 1, "minecraft:yellow_dye": 1 },
        output: { id: "minecraft:orange_dye", amount: 2 },
        particleColor: { red: 0.98, green: 0.50, blue: 0.11, alpha: 1 }
    },
    {
        input:  { "minecraft:red_dye": 1, "minecraft:white_dye": 1 },
        output: { id: "minecraft:pink_dye", amount: 2 },
        particleColor: { red: 0.95, green: 0.55, blue: 0.74, alpha: 1 }
    },
    {
        input:  { "minecraft:white_dye": 1, "minecraft:black_dye": 1 },
        output: { id: "minecraft:gray_dye", amount: 2 },
        particleColor: { red: 0.30, green: 0.30, blue: 0.30, alpha: 1 }
    },
    {
        input:  { "minecraft:gray_dye": 1, "minecraft:white_dye": 1 },
        output: { id: "minecraft:light_gray_dye", amount: 2 },
        particleColor: { red: 0.62, green: 0.62, blue: 0.59, alpha: 1 }
    },
    {
        input:  { "minecraft:blue_dye": 1, "minecraft:green_dye": 1 },
        output: { id: "minecraft:cyan_dye", amount: 2 },
        particleColor: { red: 0.09, green: 0.61, blue: 0.61, alpha: 1 }
    },
    {
        input:  { "minecraft:blue_dye": 1, "minecraft:white_dye": 1 },
        output: { id: "minecraft:light_blue_dye", amount: 2 },
        particleColor: { red: 0.36, green: 0.69, blue: 0.85, alpha: 1 }
    },
    {
        input:  { "minecraft:red_dye": 1, "minecraft:blue_dye": 1 },
        output: { id: "minecraft:purple_dye", amount: 2 },
        particleColor: { red: 0.49, green: 0.18, blue: 0.74, alpha: 1 }
    },
    {
        input:  { "minecraft:purple_dye": 1, "minecraft:pink_dye": 1 },
        output: { id: "minecraft:magenta_dye", amount: 2 },
        particleColor: { red: 0.78, green: 0.30, blue: 0.79, alpha: 1 }
    }
];

// ============================================================
// CONSTANTS
// ============================================================
const MAX_RPM      = 512;

// Y do chão interno do basin (2px acima da base do bloco)
const BASIN_FLOOR_Y_OFFSET = 0.2;
const BASIN_FLUID_ITEM_Y_OFFSET = 0.76;
// Raio de busca para pegar minecraft:item e converter em conveyor_item
const ABSORB_RADIUS = 0.9;
// Raio para encontrar conveyor_items já dentro do basin
const SLOT_RADIUS   = 0.6;

// ============================================================
// STATE MAPS — chave "dimensionId:x:y:z"
// ============================================================
/** @type {Map<string, number>} */ const basinProgress      = new Map();
/** @type {Map<string, string>} */ const basinState         = new Map();
/** @type {Map<string, number>} */ const basinTransitionEnd = new Map();
/** @type {Map<string, number>} */ const basinStopEnd       = new Map();

// ============================================================
// HELPERS INTERNOS
// ============================================================

function blockKey(block) {
    const { x, y, z } = block.location;
    return `${block.dimension.id}:${x}:${y}:${z}`;
}

function getMixTime(rpm) {
    // Inverso linear: dobrar o RPM divide o tempo pela metade (proporcional)
    // 32 RPM → 128 ticks (6.4s), 64 → 64t, 128 → 32t, 256 → 16t
    const k = Math.min(Math.max(Math.abs(rpm), 1), MAX_RPM);
    return Math.max(Math.ceil(4096 / k), 8);
}

/** Posição central do chão do basin, onde os display items ficam parados. */
function basinDisplayPos(block) {
    return {
        x: block.center().x,
        y: block.location.y + getBasinItemYOffset(block),
        z: block.center().z
    };
}

function getBasinItemYOffset(block) {
    return peekItemDrainFluid(block) ? BASIN_FLUID_ITEM_Y_OFFSET : BASIN_FLOOR_Y_OFFSET;
}

/** Posição aleatória dentro do basin para espalhar os conveyor_items visualmente. */
function randomBasinItemPos(block) {
    const angle = Math.random() * Math.PI * 2;
    const r     = Math.random() * 0.18;
    return {
        x: block.center().x + Math.cos(angle) * r,
        y: block.location.y + getBasinItemYOffset(block),
        z: block.center().z + Math.sin(angle) * r
    };
}

function syncBasinItemHeight(block) {
    const targetY = block.location.y + getBasinItemYOffset(block);
    for (const slot of getBasinSlots(block)) {
        if (!slot?.isValid) continue;
        try {
            slot.teleport({
                x: slot.location.x,
                y: targetY,
                z: slot.location.z
            });
        } catch {}
    }
}

/** Emite partículas coloridas de mistura (burst com delay, como a millstone). */
function spawnMixingParticles(block, color, times) {
    if (times <= 0) return;
    try {
        const molang = new mc.MolangVariableMap();
        molang.setColorRGBA('color', color ?? { red: 0.7, green: 0.7, blue: 0.7, alpha: 1 });
        const angle = Math.random() * Math.PI * 2;
        const r     = 0.25;
        block.dimension.spawnParticle('create:millstone_crushing', {
            x: block.center().x + Math.cos(angle) * r,
            y: block.location.y + 0.5,
            z: block.center().z + Math.sin(angle) * r
        }, molang);
    } catch { }
    mc.system.runTimeout(() => { spawnMixingParticles(block, color, times - 1); }, 2);
}

/** Emite partículas de crítico quando a receita é concluída (burst com delay). */
function spawnCritParticles(block, times) {
    if (times <= 0) return;
    try {
        const angle = Math.random() * Math.PI * 2;
        const r     = 0.3;
        block.dimension.spawnParticle('create:millstone_crit', {
            x: block.center().x + Math.cos(angle) * r,
            y: block.location.y + 0.7,
            z: block.center().z + Math.sin(angle) * r
        });
    } catch { }
    mc.system.runTimeout(() => { spawnCritParticles(block, times - 1); }, 2);
}

/**
 * Encontra a create:mechanical_mixer_entity 2 blocos acima do basin.
 * @param {mc.Block} basinBlock
 * @returns {mc.Entity|null}
 */
function getMixerEntity(basinBlock) {
    const { x, y, z } = basinBlock.location;
    try {
        // Aceita mixer diretamente acima (y+1) ou com gap de ar (y+2)
        for (const dy of [1, 2]) {
            const mixerBlock = basinBlock.dimension.getBlock({ x, y: y + dy, z });
            if (!mixerBlock || mixerBlock.typeId !== "create:mechanical_mixer") continue;
            const entity = basinBlock.dimension.getEntities({
                location:    mixerBlock.center(),
                type:        "create:mechanical_mixer_entity",
                maxDistance: 0.6
            })[0] ?? null;
            if (entity?.isValid) return entity;
        }
        return null;
    } catch { return null; }
}

/**
 * Para a animação e limpa toda a state do basin.
 * @param {mc.Entity|null} mixerEntity
 * @param {string} k
 */
function stopMixerHard(mixerEntity, k) {
    if (mixerEntity?.isValid) {
        mixerEntity.setProperty("create:is_mixing", false);
        try { mixerEntity.playAnimation("animation.create_bedrock.create.mechanical_mixer.mixing.stop"); } catch { }
    }
    basinProgress.delete(k);
    basinTransitionEnd.delete(k);
    basinStopEnd.delete(k);
    basinState.set(k, "idle");
}

/**
 * Lê o item armazenado em um conveyor_item (slot 0 do inventário).
 * @param {mc.Entity} entity
 * @returns {mc.ItemStack|undefined}
 */
function getConveyorStack(entity) {
    return entity?.getComponent("inventory")?.container?.getItem(0);
}

/**
 * Encontra todos os conveyor_items dentro do basin.
 * @param {mc.Block} block
 * @returns {mc.Entity[]}
 */
function getBasinSlots(block) {
    const pos = basinDisplayPos(block);
    return block.dimension
        .getEntities({ location: pos, type: "create:conveyor_item", maxDistance: SLOT_RADIUS })
        .filter(e => e?.isValid);
}

/**
 * Absorve minecraft:item entities perto do basin e os converte em
 * conveyor_items estáticos espalhados aleatoriamente no chão do bowl.
// IDs de entidades minecraft:item autorizadas a serem absorvidas (dropped pelo jogador)
/** @type {Set<string>} */
export const BASIN_APPROVED_ITEMS = new Set();

 /**
 * Absorve minecraft:item entities que caem de cima do basin
 * OU que foram explicitamente aprovadas (jogador dropou olhando pro basin).
 * @param {mc.Block} block
 */
function absorbItems(block) {
    const dim    = block.dimension;
    const center = block.center();

    const rawItems = dim
        .getEntities({ location: center, maxDistance: ABSORB_RADIUS })
        .filter(e => {
            if (!e?.isValid || e.typeId !== "minecraft:item") return false;
            // aprovado por drop do jogador
            if (BASIN_APPROVED_ITEMS.has(e.id)) return true;
            // veio de cima (queda natural / automação pelo topo)
            return e.location.y >= block.location.y + 0.9;
        });

    if (rawItems.length === 0) return;

    // Limita número de entidades dentro do basin para evitar spam
    let slotCount = getBasinSlots(block).length;

    for (const rawItem of rawItems) {
        if (slotCount >= 8) break;
        if (!rawItem?.isValid) continue;
        const rawStack = rawItem.getComponent("minecraft:item")?.itemStack;
        if (!rawStack) continue;

        const separated = separeItemEntity(rawItem, rawStack.amount);
        if (!separated || !separated.firstItem) continue;

        const slot = dim.spawnEntity("create:conveyor_item", randomBasinItemPos(block));
        slot.setProperty("create:rotation_y", Math.random() * 360);
        setItemInHand(separated.firstItem, slot, "Mainhand", 0, "create:item_visual");
        slotCount++;
        BASIN_APPROVED_ITEMS.delete(rawItem.id);

        if (separated.secondItem) {
            dim.spawnItem(separated.secondItem, center);
        }
        rawItem.remove();
    }
}

// ============================================================
// HANDLERS EXPORTADOS
// ============================================================

/**
 * Constrói mapa de contagem { typeId: amount } a partir dos slots.
 * @param {mc.Entity[]} slots
 * @returns {Record<string, number>}
 */
function buildCounts(slots) {
    const counts = {};
    for (const slot of slots) {
        const stack = getConveyorStack(slot);
        if (stack) counts[stack.typeId] = (counts[stack.typeId] ?? 0) + stack.amount;
    }
    return counts;
}

/**
 * Procura receita compatível com os counts.
 * Permite que o output já esteja no basin (acúmulo entre ciclos).
 * @param {Record<string, number>} counts
 * @returns {MixerRecipe | null}
 */
function findRecipe(counts) {
    for (const recipe of /** @type {MixerCompatibleRecipe[]} */ ([...compatibilityRecipes.mixing, ...MIXER_RECIPES])) {
        if (!Object.entries(recipe.input).every(([id, need]) => (counts[id] ?? 0) >= need)) continue;
        const outputId = recipe.output?.id;
        if (!Object.keys(counts).every(id => recipe.input[id] != null || (outputId && id === outputId))) continue;
        return recipe;
    }
    return null;
}

function findRecipeForBasin(block, counts) {
    const recipe = findRecipe(counts);
    if (!recipe) return null;
    if (recipe.requiresSuperheat && !isBasinSuperheated(block)) return null;
    if (recipe.requiresHeat && !isBasinHeated(block)) return null;
    if (peekItemDrainFluid(block) && !recipe.fluidInput) return null;
    if (recipe.fluidInput && peekItemDrainFluid(block) !== recipe.fluidInput) return null;
    return recipe;
}

function isBasinHeated(block) {
    for (const dy of [1, 2]) {
        const below = block.dimension.getBlock({
            x: block.location.x,
            y: block.location.y - dy,
            z: block.location.z
        });
        if (isBlazeBurnerBlockActive(below)) return true;
    }
    return false;
}

function isBasinSuperheated(block) {
    for (const dy of [1, 2]) {
        const below = block.dimension.getBlock({
            x: block.location.x,
            y: block.location.y - dy,
            z: block.location.z
        });
        if (isBlazeBurnerBlockSuperheated(below)) return true;
    }
    return false;
}

/**
 * Sincroniza o basin com hoppers adjacentes (apenas no estado idle).
 * Saída: hopper abaixo puxa conveyor_items.
 * Entrada: hoppers laterais apontando para o basin empurram itens.
 * Rate: 1 transferência a cada 8 ticks (igual hopper vanilla).
 * @param {mc.Block} block
 */
function handleHopperIO(block) {
    if ((mc.system.currentTick % 8) !== 0) return;

    const { x, y, z } = block.location;
    const dim = block.dimension;

    // ── SAÍDA: hopper abaixo puxa itens do basin ─────────────────────────────────
    try {
        const below = dim.getBlock({ x, y: y - 1, z });
        if (below?.typeId === 'minecraft:hopper') {
            const slots = getBasinSlots(block);
            for (const slot of slots) {
                if (!slot?.isValid) continue;
                const stack = getConveyorStack(slot);
                if (!stack) continue;
                const hopperInv = below.getComponent('minecraft:inventory')?.container;
                if (!hopperInv) break;
                const leftover = hopperInv.addItem(stack);
                const taken = stack.amount - (leftover?.amount ?? 0);
                if (taken <= 0) break;
                if (taken >= stack.amount) {
                    slot.remove();
                } else {
                    const updated = stack.clone();
                    updated.amount = stack.amount - taken;
                    setItemInHand(updated, slot, "Mainhand", 0, "create:item_visual");
                }
                break; // um item por ciclo de 8 ticks
            }
        }
    } catch { }

    // ── ENTRADA: hoppers laterais apontando para o basin empurram itens ────────
    // facing_direction no Bedrock é inteiro: 0=down, 2=north, 3=south, 4=west, 5=east
    const sideChecks = [
        { dx: -1, dz:  0, facing: 5 },  // hopper a oeste, apontando leste (→ basin)
        { dx:  1, dz:  0, facing: 4 },  // hopper a leste, apontando oeste (→ basin)
        { dx:  0, dz: -1, facing: 3 },  // hopper ao norte, apontando sul (→ basin)
        { dx:  0, dz:  1, facing: 2 },  // hopper ao sul, apontando norte (→ basin)
    ];
    for (const { dx, dz, facing } of sideChecks) {
        try {
            const neighbor = dim.getBlock({ x: x + dx, y, z: z + dz });
            if (neighbor?.typeId !== 'minecraft:hopper') continue;
            const perm = neighbor.permutation;
            if (perm.getState('facing_direction') !== facing) continue;
            if (perm.getState('toggle_bit') === true) continue; // hopper desabilitado
            const hopperInv = neighbor.getComponent('minecraft:inventory')?.container;
            if (!hopperInv) continue;
            if (getBasinSlots(block).length >= 8) break;
            for (let i = 0; i < hopperInv.size; i++) {
                const item = hopperInv.getItem(i);
                if (!item) continue;
                const toInsert = item.clone();
                toInsert.amount = 1;
                if (item.amount <= 1) {
                    hopperInv.setItem(i, undefined);
                } else {
                    const remaining = item.clone();
                    remaining.amount = item.amount - 1;
                    hopperInv.setItem(i, remaining);
                }
                const convSlot = dim.spawnEntity("create:conveyor_item", randomBasinItemPos(block));
                convSlot.setProperty("create:rotation_y", Math.random() * 360);
                setItemInHand(toInsert, convSlot, "Mainhand", 0, "create:item_visual");
                break; // um item por hopper por ciclo
            }
        } catch { }
    }
}

/**
 * Tick principal — disparado via racoTriggers a cada tick do basin.
 * @param {mc.Block} block
 */
export function basinTick(block) {
    const k     = blockKey(block);
    const state = basinState.get(k) ?? "idle";
    syncBasinFluid(block);
    syncBasinItemHeight(block);

    // Sempre absorve itens soltos ao redor
    absorbItems(block);

    const mixer = getMixerEntity(block);

    // ── STOPPING: aguarda animação de saída ──────────────────────────────────
    if (state === "stopping") {
        if (mc.system.currentTick >= (basinStopEnd.get(k) ?? 0)) {
            basinStopEnd.delete(k);
            basinState.set(k, "idle");
        }
        return;
    }

    // ── TRANSITIONING: whisk descendo ────────────────────────────────────────
    if (state === "transitioning") {
        if (mc.system.currentTick < (basinTransitionEnd.get(k) ?? 0)) return;
        if (mixer?.isValid) {
            mixer.setProperty("create:is_mixing", true);
            // Inicia animação de hold para manter o whisk embaixo indefinidamente
            try { mixer.playAnimation("animation.create_bedrock.create.mechanical_mixer.mixing.hold"); } catch { }
        }
        basinState.set(k, "mixing");
        return;
    }

    // ── MIXING: misturando ────────────────────────────────────────────────────
    if (state === "mixing") {
        const slots = getBasinSlots(block);
        if (!slots.length) {
            stopMixerHard(mixer, k);
            return;
        }

        mixer?.setProperty("create:is_mixing", true);
        // Re-dispara o hold a cada tick para o whisk ficar embaixo enquanto mistura
        try { mixer?.playAnimation("animation.create_bedrock.create.mechanical_mixer.mixing.hold"); } catch { }

        const rpmValue = mixer?.isValid ? mixer.getProperty("create:rpm") : 1;
        const rpm = typeof rpmValue === "number" ? Math.abs(rpmValue) : 1;
        const progress = (basinProgress.get(k) ?? 0) + 1;

        if (progress < getMixTime(rpm || 1)) {
            // Partículas coloridas a cada 3 ticks durante a mistura (burst de 5)
            if (progress % 3 === 0) {
                const recipe = findRecipeForBasin(block, buildCounts(slots));
                spawnMixingParticles(block, recipe?.particleColor, 5);
                spawnCritParticles(block, 1);
            }
            basinProgress.set(k, progress);
            return;
        }

        // ── Receita completa ──────────────────────────────────────────────────
        basinProgress.delete(k);
        basinTransitionEnd.delete(k);

        const matchedRecipe = findRecipeForBasin(block, buildCounts(slots));
        if (matchedRecipe) {
            if (matchedRecipe.fluidOutput) {
                const fluidOk = matchedRecipe.fluidInput
                    ? transformItemDrainFluid(block, matchedRecipe.fluidInput, matchedRecipe.fluidOutput)
                    : receiveItemDrainFluid(block, matchedRecipe.fluidOutput);
                if (!fluidOk) {
                    stopMixerHard(mixer, k);
                    return;
                }
            }

            const remaining = { ...matchedRecipe.input };
            for (const slot of slots) {
                if (!slot?.isValid) continue;
                const stack = getConveyorStack(slot);
                if (!stack) continue;
                const need = remaining[stack.typeId];
                if (!need) continue;
                const take = Math.min(stack.amount, need);
                remaining[stack.typeId] -= take;
                if (stack.amount - take <= 0) {
                    slot.remove();
                } else {
                    const updated  = stack.clone();
                    updated.amount = stack.amount - take;
                    setItemInHand(updated, slot, "Mainhand", 0, "create:item_visual");
                }
            }
            if (matchedRecipe.output) {
                const outputSlot = block.dimension.spawnEntity("create:conveyor_item", randomBasinItemPos(block));
                outputSlot.setProperty("create:rotation_y", Math.random() * 360);
                setItemInHand(
                    new mc.ItemStack(matchedRecipe.output.id, matchedRecipe.output.amount),
                    outputSlot, "Mainhand", 0, "create:item_visual"
                );
            }
            // Partículas de crítico na conclusão
            spawnCritParticles(block, 6);
        } // end if matchedRecipe

        mixer?.setProperty("create:is_mixing", false);
        try { mixer?.playAnimation("animation.create_bedrock.create.mechanical_mixer.mixing.transition_out"); } catch { }
        basinState.set(k, "stopping");
        basinStopEnd.set(k, mc.system.currentTick + 20);
        return;
    }

    // ── IDLE: verifica se há condições para começar ───────────────────────────
    handleHopperIO(block);
    if (block.permutation.getAllStates()["create:canal"]) _handleCanalOutput(block);
    const slots = getBasinSlots(block);
    if (!slots.length) return;

    const rpm = mixer?.isValid ? (mixer.getProperty("create:rpm") ?? 0) : 0;
    if (rpm === 0) return;

    const recipe = findRecipeForBasin(block, buildCounts(slots));
    if (!recipe) return;

    try { mixer?.playAnimation("animation.create_bedrock.create.mechanical_mixer.mixing.transition_in"); } catch { }
    basinState.set(k, "transitioning");
    basinTransitionEnd.set(k, mc.system.currentTick + 20);
}

/**
 * Abre o canal na face clicada com a wrench; se já aberto, fecha.
 * @param {mc.Block} block
 * @param {mc.Player} player
 * @param {string|undefined} face  ("North" | "South" | "East" | "West" | "Up" | "Down")
 */
function _wrenchBasinCanal(block, player, face) {
    const perm   = block.permutation;
    const isOpen = perm.getAllStates()["create:canal"];
    if (isOpen) {
        try { block.setPermutation(/** @type {any} */ (perm).withState("create:canal", false)); } catch { }
        player?.onScreenDisplay.setActionBar("§7Canal: Closed");
        return;
    }        const dir = face?.toLowerCase();
    if (!dir || !_DIRS.some(d => d.dir === dir)) return; // ignora Up/Down/undefined
    try {
        block.setPermutation(
            /** @type {any} */ (perm).withState("create:canal", true)
                .withState("minecraft:cardinal_direction", dir)
        );
    } catch { }
    const label = dir.charAt(0).toUpperCase() + dir.slice(1);
    player?.onScreenDisplay.setActionBar(`§eCanal: ${label}`);
}

/**
 * Drena um item por ciclo (8 ticks) pelo canal aberto.
 */
function _handleCanalOutput(block) {
    if ((mc.system.currentTick % 8) !== 0) return;
    const slots = getBasinSlots(block);
    if (!slots.length) return;
    const cardinal = block.permutation.getState("minecraft:cardinal_direction");
    const dirData  = _DIRS.find(d => d.dir === cardinal);
    if (!dirData) return;
    for (const slot of slots) {
        if (!slot?.isValid) continue;
        const stack = getConveyorStack(slot);
        if (!stack) continue;
        const taken = stack.clone();
        taken.amount = 1;
        if (stack.amount <= 1) {
            slot.remove();
        } else {
            const updated = stack.clone();
            updated.amount = stack.amount - 1;
            setItemInHand(updated, slot, "Mainhand", 0, "create:item_visual");
        }
        const dropPos = {
            x: block.center().x + dirData.dx * 0.7,
            y: block.location.y + 0.5,
            z: block.center().z + dirData.dz * 0.7
        };
        try { const s = block.dimension.spawnItem(taken, dropPos); s?.clearVelocity?.(); } catch { }
        break;
    }
}

/**
 * Chamado quando o jogador interage com o basin (clique direito).
 * Wrench: abre/fecha o canal na face clicada. Caso contrário: devolve itens ao inventário.
 * @param {mc.Block} block
 * @param {mc.Player} player
 * @param {mc.ItemStack|undefined} item
 * @param {string|undefined} face
 */
export function basinInteract(block, player, item, face) {
    if (fillBucketFromFluidContainer(block, player, item)) return;

    if (item?.typeId === "create:wrench") {
        _wrenchBasinCanal(block, player, face);
        return;
    }
    const slots = getBasinSlots(block);
    if (!slots.length) return;

    const inv = player?.getComponent("inventory")?.container;
    const dropPos = { x: block.center().x, y: block.location.y + 1, z: block.center().z };

    for (const slot of slots) {
        if (!slot?.isValid) continue;
        const stack = getConveyorStack(slot);
        if (stack) {
            const leftover = inv ? inv.addItem(stack) : stack;
            if (leftover) block.dimension.spawnItem(leftover, dropPos);
        }
        try { slot.remove(); } catch { }
    }

    // Para o mixer se estava em andamento
    stopMixerHard(getMixerEntity(block), blockKey(block));
}

/**
 * Chamado quando o basin é quebrado.
 * Converte os conveyor_items de volta em minecraft:items (drops) e limpa o estado.
 * @param {mc.Block} block
 */
export function basinBreak(block) {
    const k        = blockKey(block);
    const breakPos = { x: block.center().x, y: block.location.y + 0.5, z: block.center().z };

    for (const slot of getBasinSlots(block)) {
        const stack = getConveyorStack(slot);
        if (stack) block.dimension.spawnItem(stack, breakPos);
        try { slot.remove(); } catch { }
    }

    itemDrainBreak(block, block.dimension);
    stopMixerHard(getMixerEntity(block), k);
}

/**
 * Chamado quando o basin é colocado — atualiza o canal/spout.
 * @param {mc.Block} block
 */
export function basinPlace(block) {
    if (block.typeId === "create:basin") _updateBasinCanal(block);
}

// ============================================================
// CANAL (spout de output)
// ============================================================
const _DIRS  = [
    { dir: "north", dx:  0, dz: -1 }, { dir: "south", dx: 0, dz: 1 },
    { dir: "west",  dx: -1, dz:  0 }, { dir: "east",  dx: 1, dz: 0 }
];
const _OPP   = { north: "south", south: "north", west: "east", east: "west" };
const _TRANS = new Set(["create:belt", "create:depot"]);

function _updateBasinCanal(basin) {
    const { x, y, z } = basin.location;
    const dim = basin.dimension;
    /** @type {string | null} */
    let found = null;
    outer: for (const { dir, dx, dz } of _DIRS) {
        for (const dy of [0, -1]) {
            const nb = dim.getBlock({ x: x + dx, y: y + dy, z: z + dz });
            if (nb && _TRANS.has(nb.typeId)) { found = dir; break outer; }
        }
    }
    try {
        let perm = basin.permutation;
        perm = found
            ? /** @type {any} */ (perm.withState("minecraft:cardinal_direction", found)).withState("create:canal", true)
            : /** @type {any} */ (perm).withState("create:canal", false);
        basin.setPermutation(perm);
    } catch { }
}
