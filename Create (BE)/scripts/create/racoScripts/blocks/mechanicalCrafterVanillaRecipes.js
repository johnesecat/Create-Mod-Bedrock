// Receitas essenciais da mesa de trabalho vanilla, usadas pelo Mechanical Crafter.
/** @param {string} id */
const item = id => ({ item: id })
/** @param {string} name */
const tag = name => ({ tag: name })
/** @param {string[]} pattern @param {Record<string, {item?: string, tag?: string, ids?: string[]}>} key @param {string} id @param {number} [amount] */
const recipe = (pattern, key, id, amount = 1) => ({ pattern, key, result: { id, amount } })

const recipes = [
    recipe(["PP", "PP"], { P: tag("minecraft:planks") }, "minecraft:crafting_table"),
    recipe(["P", "P"], { P: tag("minecraft:planks") }, "minecraft:stick", 4),
    recipe(["PPP", "P P", "PPP"], { P: tag("minecraft:planks") }, "minecraft:chest"),
    recipe(["CCC", "C C", "CCC"], { C: tag("minecraft:stone_crafting_materials") }, "minecraft:furnace"),
    recipe(["C", "S"], { C: { ids: ["minecraft:coal", "minecraft:charcoal"] }, S: item("minecraft:stick") }, "minecraft:torch", 4),
    recipe([" S ", "S S", " S "], { S: item("minecraft:stick") }, "minecraft:ladder", 3),
    recipe(["III", " i ", "iii"], { I: item("minecraft:iron_block"), i: item("minecraft:iron_ingot") }, "minecraft:anvil"),
    recipe([" I ", "III", " I "], { I: item("minecraft:iron_ingot") }, "minecraft:iron_block"),
    recipe(["GGG", "GGG", "GGG"], { G: item("minecraft:gold_ingot") }, "minecraft:gold_block"),
    recipe(["DDD", "DDD", "DDD"], { D: item("minecraft:diamond") }, "minecraft:diamond_block"),
    recipe(["EEE", "EEE", "EEE"], { E: item("minecraft:emerald") }, "minecraft:emerald_block"),
    recipe(["RRR", "RRR", "RRR"], { R: item("minecraft:redstone") }, "minecraft:redstone_block"),
    recipe(["GGG", "GGG", "GGG"], { G: item("minecraft:glowstone_dust") }, "minecraft:glowstone"),
    recipe(["III", "I I", "III"], { I: item("minecraft:iron_ingot") }, "minecraft:hopper"),
    recipe(["CCC", "CRC", "CCC"], { C: tag("minecraft:stone_crafting_materials"), R: item("minecraft:redstone") }, "minecraft:dropper"),
    recipe(["CCC", "CRC", "CBC"], { C: tag("minecraft:stone_crafting_materials"), R: item("minecraft:redstone"), B: item("minecraft:bow") }, "minecraft:dispenser"),
    recipe(["SSS", "SRS", "SSS"], { S: tag("minecraft:stone_crafting_materials"), R: item("minecraft:redstone") }, "minecraft:observer"),
    recipe(["SSS", "SRS", "SSS"], { S: tag("minecraft:planks"), R: item("minecraft:redstone") }, "minecraft:noteblock"),
    recipe(["R", "S"], { R: item("minecraft:redstone"), S: item("minecraft:stick") }, "minecraft:redstone_torch"),
    recipe(["SSS", "RRR", "SSS"], { S: tag("minecraft:stone_crafting_materials"), R: item("minecraft:redstone") }, "minecraft:repeater"),
    recipe(["SSS", "RRR", "QQQ"], { S: tag("minecraft:stone_crafting_materials"), R: item("minecraft:redstone_torch"), Q: item("minecraft:quartz") }, "minecraft:comparator"),
    recipe([" I ", "ISI", " I "], { I: item("minecraft:iron_ingot"), S: item("minecraft:flint") }, "minecraft:flint_and_steel"),
    recipe([" I", "I "], { I: item("minecraft:iron_ingot") }, "minecraft:shears"),
    recipe(["III", "I I", "III"], { I: item("minecraft:iron_ingot") }, "minecraft:cauldron"),
    recipe([" I ", "I I", " I "], { I: item("minecraft:iron_ingot") }, "minecraft:bucket"),
    recipe(["PPP", "P P", "PPP"], { P: item("minecraft:paper") }, "minecraft:book"),
    recipe(["PPP"], { P: item("minecraft:sugar_cane") }, "minecraft:paper", 3),
    recipe(["PPP", "P P", "PPP"], { P: item("minecraft:paper") }, "minecraft:book", 3),
    recipe(["PPP", "BBB", "PPP"], { P: tag("minecraft:planks"), B: item("minecraft:book") }, "minecraft:bookshelf"),
    recipe(["GG", "GG"], { G: item("minecraft:glass") }, "minecraft:glass_pane", 16),
    recipe(["GGG", "G G", "GGG"], { G: item("minecraft:gold_ingot") }, "minecraft:golden_apple"),
    recipe(["BBB", "B B", "BBB"], { B: item("minecraft:brick") }, "minecraft:bricks"),
    recipe(["SS", "SS"], { S: item("minecraft:sandstone") }, "minecraft:cut_sandstone", 4),
    recipe(["CC", "CC"], { C: item("minecraft:clay_ball") }, "minecraft:clay"),
    recipe(["LLL", "L L", "LLL"], { L: item("minecraft:leather") }, "minecraft:leather_helmet"),
    recipe(["L L", "LLL", "LLL"], { L: item("minecraft:leather") }, "minecraft:leather_chestplate"),
    recipe(["LLL", "L L", "L L"], { L: item("minecraft:leather") }, "minecraft:leather_leggings"),
    recipe(["L L", "L L"], { L: item("minecraft:leather") }, "minecraft:leather_boots"),
    recipe(["SS ", "SA ", " A "], { S: item("minecraft:stick"), A: item("minecraft:string") }, "minecraft:fishing_rod"),
    recipe([" SS", "S S", " SS"], { S: item("minecraft:string") }, "minecraft:bow")
]

const toolMaterials = [
    ["minecraft:planks", "minecraft:wooden"],
    ["minecraft:cobblestone", "minecraft:stone"],
    ["minecraft:iron_ingot", "minecraft:iron"],
    ["minecraft:gold_ingot", "minecraft:golden"],
    ["minecraft:diamond", "minecraft:diamond"]
]

for (const [material, prefix] of toolMaterials) {
    const M = material === "minecraft:planks" ? tag("minecraft:planks") : item(material)
    const S = item("minecraft:stick")
    recipes.push(
        recipe(["MMM", " S ", " S "], { M, S }, `minecraft:${prefix}_pickaxe`),
        recipe(["MM ", "MS ", " S "], { M, S }, `minecraft:${prefix}_axe`),
        recipe(["M", "S", "S"], { M, S }, `minecraft:${prefix}_shovel`),
        recipe(["MM ", " S ", " S "], { M, S }, `minecraft:${prefix}_hoe`),
        recipe(["M", "M", "S"], { M, S }, `minecraft:${prefix}_sword`)
    )
}

for (const [material, prefix] of [["minecraft:iron_ingot", "iron"], ["minecraft:gold_ingot", "golden"], ["minecraft:diamond", "diamond"]]) {
    const M = item(material)
    recipes.push(
        recipe(["MMM", "M M"], { M }, `minecraft:${prefix}_helmet`),
        recipe(["M M", "MMM", "MMM"], { M }, `minecraft:${prefix}_chestplate`),
        recipe(["MMM", "M M", "M M"], { M }, `minecraft:${prefix}_leggings`),
        recipe(["M M", "M M"], { M }, `minecraft:${prefix}_boots`)
    )
}

export const VANILLA_CRAFTING_RECIPES = recipes
