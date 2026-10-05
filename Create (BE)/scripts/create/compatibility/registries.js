// Shared runtime registries. Kept dependency-free so Create's machines and
// third-party integration code can both use them without circular imports.
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

export const compatibilityFluids = new Map();
export const compatibilityFluidsByBucket = new Map();
export const compatibilityFluidsByBlock = new Map();

export function getCompatibilityFluid(fluidOrContainerId) {
    return compatibilityFluids.get(fluidOrContainerId)
        ?? compatibilityFluidsByBucket.get(fluidOrContainerId)
        ?? compatibilityFluidsByBlock.get(fluidOrContainerId);
}

export function resolveCompatibilityFluidId(fluidOrContainerId) {
    return getCompatibilityFluid(fluidOrContainerId)?.id;
}

export function isCompatibilityFluidContainer(itemId) {
    if (typeof itemId !== "string") return false;
    if (compatibilityFluidsByBucket.has(itemId)) return true;
    for (const fluid of compatibilityFluids.values()) if (fluid.empty === itemId) return true;
    return false;
}
