const MIXER_RECIPES_WITHOUT_HEAT = [
    {
        input: { "minecraft:andesite": 1, "minecraft:iron_nugget": 1 },
        output: { id: "create:andesite_alloy", amount: 2 },
        particleColor: { red: 0.50, green: 0.48, blue: 0.46, alpha: 1 }
    },
    {
        input: { "minecraft:andesite": 1, "create:zinc_nugget": 2 },
        output: { id: "create:andesite_alloy", amount: 2 },
        particleColor: { red: 0.50, green: 0.48, blue: 0.46, alpha: 1 }
    },
    {
        input: { "minecraft:egg": 1, "minecraft:sugar": 1, "create:cinder_flour": 1 },
        output: { id: "create:blaze_cake_base", amount: 1 },
        particleColor: { red: 0.72, green: 0.16, blue: 0.09, alpha: 1 }
    },
    {
        input: { "minecraft:redstone": 4, "minecraft:quartz": 1 },
        output: { id: "create:rose_quartz", amount: 1 },
        particleColor: { red: 0.93, green: 0.45, blue: 0.55, alpha: 1 }
    },
    {
        input: { "minecraft:red_dye": 1, "minecraft:yellow_dye": 1 },
        output: { id: "minecraft:orange_dye", amount: 2 },
        particleColor: { red: 0.98, green: 0.50, blue: 0.11, alpha: 1 }
    },
    {
        input: { "minecraft:red_dye": 1, "minecraft:white_dye": 1 },
        output: { id: "minecraft:pink_dye", amount: 2 },
        particleColor: { red: 0.95, green: 0.55, blue: 0.74, alpha: 1 }
    },
    {
        input: { "minecraft:white_dye": 1, "minecraft:black_dye": 1 },
        output: { id: "minecraft:gray_dye", amount: 2 },
        particleColor: { red: 0.30, green: 0.30, blue: 0.30, alpha: 1 }
    },
    {
        input: { "minecraft:gray_dye": 1, "minecraft:white_dye": 1 },
        output: { id: "minecraft:light_gray_dye", amount: 2 },
        particleColor: { red: 0.62, green: 0.62, blue: 0.59, alpha: 1 }
    },
    {
        input: { "minecraft:blue_dye": 1, "minecraft:green_dye": 1 },
        output: { id: "minecraft:cyan_dye", amount: 2 },
        particleColor: { red: 0.09, green: 0.61, blue: 0.61, alpha: 1 }
    },
    {
        input: { "minecraft:blue_dye": 1, "minecraft:white_dye": 1 },
        output: { id: "minecraft:light_blue_dye", amount: 2 },
        particleColor: { red: 0.36, green: 0.69, blue: 0.85, alpha: 1 }
    },
    {
        input: { "minecraft:red_dye": 1, "minecraft:blue_dye": 1 },
        output: { id: "minecraft:purple_dye", amount: 2 },
        particleColor: { red: 0.49, green: 0.18, blue: 0.74, alpha: 1 }
    },
    {
        input: { "minecraft:purple_dye": 1, "minecraft:pink_dye": 1 },
        output: { id: "minecraft:magenta_dye", amount: 2 },
        particleColor: { red: 0.78, green: 0.30, blue: 0.79, alpha: 1 }
    }
];

const MIXER_RECIPES_WITH_HEAT = [
    {
        input: { "minecraft:copper_ingot": 1, "create:zinc_ingot": 1 },
        output: { id: "create:brass_ingot", amount: 1 },
        requiresHeat: true,
        particleColor: { red: 0.78, green: 0.58, blue: 0.24, alpha: 1 }
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
    }
];

const MIXER_RECIPES_WITH_SUPERHEAT = [
    {
        input: { "minecraft:cobblestone": 1 },
        fluidOutput: "minecraft:lava_bucket",
        requiresSuperheat: true,
        particleColor: { red: 1.00, green: 0.28, blue: 0.03, alpha: 1 }
    }
];

export const MIXER_RECIPE_TABS = [
    {
        id: "mixer_without_blaze_burner",
        title: "Mixer",
        subtitle: "Sem Blaze Burner",
        icon: "create:mechanical_mixer",
        recipes: MIXER_RECIPES_WITHOUT_HEAT
    },
    {
        id: "mixer_with_blaze_burner",
        title: "Mixer",
        subtitle: "Com Blaze Burner",
        icon: "create:blaze_burner",
        requiresHeat: true,
        recipes: MIXER_RECIPES_WITH_HEAT
    },
    {
        id: "mixer_with_superheated_blaze_burner",
        title: "Mixer",
        subtitle: "Com Blaze Burner Super-Heated",
        icon: "create:blaze_cake",
        requiresSuperheat: true,
        recipes: MIXER_RECIPES_WITH_SUPERHEAT
    }
];

export const MIXER_RECIPES = [
    ...MIXER_RECIPES_WITHOUT_HEAT,
    ...MIXER_RECIPES_WITH_HEAT,
    ...MIXER_RECIPES_WITH_SUPERHEAT
];
