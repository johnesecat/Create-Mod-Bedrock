// Shared runtime registries. Kept dependency-free so Create's machines and
// third-party integration code can both use them without circular imports.
/** @typedef {Record<string, any>} CompatibilityRecipe */
/** @typedef {{millstone: Map<string, CompatibilityRecipe>, crushing: Map<string, CompatibilityRecipe>, pressing: Map<string, CompatibilityRecipe>, mixing: CompatibilityRecipe[], spouting: CompatibilityRecipe[], blasting: Map<string, CompatibilityRecipe>, smoking: Map<string, CompatibilityRecipe>, splashing: Map<string, CompatibilityRecipe>, haunting: Map<string, CompatibilityRecipe>, sequenced: CompatibilityRecipe[], crafting: CompatibilityRecipe[], crafting_shapeless: CompatibilityRecipe[]}} CompatibilityRecipeRegistry */
/** @typedef {{id: string, bucket: string, empty: string, block?: string, translationKey?: string, [key: string]: any}} CompatibilityFluid */
/** @typedef {Map<string, CompatibilityFluid>} CompatibilityFluidMap */

/** @type {CompatibilityRecipeRegistry} */
export const compatibilityRecipes = {
    millstone: new Map(),
    crushing: new Map(),
    pressing: new Map(),
    mixing: [],
    spouting: [],
    blasting: new Map(),
    smoking: new Map(),
    splashing: new Map(),
    haunting: new Map(),
    sequenced: [],
    crafting: [],
    crafting_shapeless: []
};

/** @type {CompatibilityFluidMap} */
export const compatibilityFluids = new Map();
/** @type {CompatibilityFluidMap} */
export const compatibilityFluidsByBucket = new Map();
/** @type {CompatibilityFluidMap} */
export const compatibilityFluidsByBlock = new Map();

/** @param {unknown} fluidOrContainerId */
export function getCompatibilityFluid(fluidOrContainerId) {
    if (typeof fluidOrContainerId !== "string") return undefined;
    return compatibilityFluids.get(fluidOrContainerId)
        ?? compatibilityFluidsByBucket.get(fluidOrContainerId)
        ?? compatibilityFluidsByBlock.get(fluidOrContainerId);
}

/** @param {unknown} fluidOrContainerId */
export function resolveCompatibilityFluidId(fluidOrContainerId) {
    return getCompatibilityFluid(fluidOrContainerId)?.id;
}

/** @param {unknown} itemId */
export function isCompatibilityFluidContainer(itemId) {
    if (typeof itemId !== "string") return false;
    if (compatibilityFluidsByBucket.has(itemId)) return true;
    for (const fluid of compatibilityFluids.values()) if (fluid.empty === itemId) return true;
    return false;
}
