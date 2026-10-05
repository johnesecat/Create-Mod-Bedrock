export function getBlockHardness(block) {
    return BLOCK_HARDNESS[block.typeId] ?? 3;
};

export function isUnbreakable(block) {
    return getBlockHardness(block) < 0;
};

const BLOCK_HARDNESS = {
  undefined: 0,
  'minecraft:air': 0,
  'minecraft:acacia_door': 3,
  'minecraft:activator_rail': 0.7,
  'minecraft:allium': 0,
  'minecraft:allow': -1,
  'minecraft:amethyst_block': 1.5,
  'minecraft:amethyst_cluster': 1.5,
  'minecraft:ancient_debris': 30,
  'minecraft:andesite': 1.5,
  'minecraft:andesite_slab': 1.5,
  'minecraft:andesite_stairs': 1.5,
  'minecraft:andesite_wall': 1.5,
  'minecraft:anvil': 5,
  'minecraft:azalea': 0,
  'minecraft:azure_bluet': 0,
  'minecraft:bamboo': 1,
  'minecraft:bamboo_block': 2,
  'minecraft:bamboo_mosaic': 2,
  'minecraft:bamboo_mosaic_slab': 2,
  'minecraft:bamboo_mosaic_stairs': 2,
  'minecraft:barrel': 2.5,
  'minecraft:barrier': -1,
  'minecraft:basalt': 1.25,
  'minecraft:beacon': 3,
  'minecraft:bed': 0.2,
  'minecraft:bedrock': -1,
  'minecraft:bee_nest': 0.3,
  'minecraft:beehive': 0.6,
  'minecraft:bell': 5,
  'minecraft:big_dripleaf': 0.1,
  'minecraft:birch_door': 3,
  'minecraft:blackstone': 1.5,
  'minecraft:blackstone_slab': 2,
  'minecraft:blackstone_stairs': 1.5,
  'minecraft:blackstone_wall': 1.5,
  'minecraft:blast_furnace': 3.5,
  'minecraft:blue_ice': 2.8,
  'minecraft:blue_orchid': 0,
  'minecraft:bone_block': 2,
  'minecraft:bookshelf': 1.5,
  'minecraft:border_block': -1,
  'minecraft:brewing_stand': 0.5,
  'minecraft:brick_slab': 2,
  'minecraft:brick_stairs': 2,
  'minecraft:brick_wall': 2,
  'minecraft:brown_mushroom': 0,
  'minecraft:brown_mushroom_block': 0,
  'minecraft:bubble_column': 0,
  'minecraft:budding_amethyst': 1.5,
  'minecraft:bush': 0,
  'minecraft:cactus': 0.4,
  'minecraft:cactus_flower': 0,
  'minecraft:cake': 0.5,
  'minecraft:calcite': 0.75,
  'minecraft:calibrated_sculk_sensor': 1.5,
  'minecraft:camera': 0,
  'minecraft:campfire': 2,
  'minecraft:candle': 0.1,
  'minecraft:cartography_table': 2.5,
  'minecraft:carved_pumpkin': 1,
  'minecraft:cauldron': 2,
  'minecraft:cave_vines': 0,
  'minecraft:chain': 5,
  'minecraft:chain_command_block': -1,
  'minecraft:chest': 2.5,
  'minecraft:chiseled_bookshelf': 1.5,
  'minecraft:chiseled_copper': 3,
  'minecraft:chiseled_deepslate': 3.5,
  'minecraft:chiseled_nether_bricks': 2,
  'minecraft:chiseled_polished_blackstone': 1.5,
  'minecraft:chiseled_quartz_block': 0.8,
  'minecraft:chiseled_red_sandstone': 0.8,
  'minecraft:chiseled_resin_bricks': 1.5,
  'minecraft:chiseled_sandstone': 0.8,
  'minecraft:chiseled_stone_bricks': 1.5,
  'minecraft:chiseled_tuff': 1.5,
  'minecraft:chiseled_tuff_bricks': 1.5,
  'minecraft:chorus_flower': 0.4,
  'minecraft:chorus_plant': 0.4,
  'minecraft:clay': 0.6,
  'minecraft:closed_eyeblossom': 0,
  'minecraft:coal_block': 5,
  'minecraft:coal_ore': 3,
  'minecraft:coarse_dirt': 0.5,
  'minecraft:cobbled_deepslate': 3.5,
  'minecraft:cobbled_deepslate_slab': 3.5,
  'minecraft:cobbled_deepslate_stairs': 3.5,
  'minecraft:cobbled_deepslate_wall': 3.5,
  'minecraft:cobblestone': 2,
  'minecraft:cobblestone_slab': 2,
  'minecraft:cobblestone_wall': 2,
  'minecraft:cocoa': 0.2,
  'minecraft:command_block': -1,
  'minecraft:composter': 0.6,
  'minecraft:compound_creator': 2.5,
  'minecraft:conduit': 3,
  'minecraft:copper_block': 3,
  'minecraft:copper_bulb': 3,
  'minecraft:copper_door': 3,
  'minecraft:copper_grate': 3,
  'minecraft:copper_ore': 3,
  'minecraft:copper_trapdoor': 3,
  'minecraft:cornflower': 0,
  'minecraft:cracked_deepslate_bricks': 3.5,
  'minecraft:cracked_deepslate_tiles': 3.5,
  'minecraft:cracked_nether_bricks': 2,
  'minecraft:cracked_polished_blackstone_bricks': 1.5,
  'minecraft:cracked_stone_bricks': 1.5,
  'minecraft:crafter': 1.5,
  'minecraft:crafting_table': 2.5,
  'minecraft:creaking_heart': 10,
  'minecraft:creeper_head': 1,
  'minecraft:crimson_door': 3,
  'minecraft:crimson_fungus': 0,
  'minecraft:crimson_nylium': 0.4,
  'minecraft:crimson_roots': 0,
  'minecraft:crying_obsidian': 50,
  'minecraft:cut_copper': 3,
  'minecraft:cut_copper_slab': 3,
  'minecraft:cut_copper_stairs': 3,
  'minecraft:cut_red_sandstone': 0.8,
  'minecraft:cut_red_sandstone_slab': 2,
  'minecraft:cut_sandstone': 0.8,
  'minecraft:cut_sandstone_slab': 2,
  'minecraft:dandelion': 0,
  'minecraft:dark_oak_door': 3,
  'minecraft:dark_prismarine': 1.5,
  'minecraft:dark_prismarine_slab': 1.5,
  'minecraft:dark_prismarine_stairs': 1.5,
  'minecraft:daylight_detector': 0.2,
  'minecraft:decorated_pot': 0,
  'minecraft:deepslate': 3,
  'minecraft:deepslate_brick_slab': 3.5,
  'minecraft:deepslate_brick_stairs': 3.5,
  'minecraft:deepslate_brick_wall': 3.5,
  'minecraft:deepslate_bricks': 3.5,
  'minecraft:deepslate_coal_ore': 4.5,
  'minecraft:deepslate_copper_ore': 4.5,
  'minecraft:deepslate_diamond_ore': 4.5,
  'minecraft:deepslate_emerald_ore': 4.5,
  'minecraft:deepslate_gold_ore': 4.5,
  'minecraft:deepslate_iron_ore': 4.5,
  'minecraft:deepslate_redstone_ore': 4.5,
  'minecraft:deepslate_tile_slab': 3.5,
  'minecraft:deepslate_tile_stairs': 3.5,
  'minecraft:deepslate_tile_wall': 3.5,
  'minecraft:deepslate_tiles': 3.5,
  'minecraft:deny': -1,
  'minecraft:deprecated_purpur_block_2': 1.5,
  'minecraft:detector_rail': 0.7,
  'minecraft:diamond_block': 5,
  'minecraft:diamond_ore': 3,
  'minecraft:diorite': 1.5,
  'minecraft:diorite_slab': 1.5,
  'minecraft:diorite_stairs': 1.5,
  'minecraft:diorite_wall': 1.5,
  'minecraft:dirt': 0.5,
  'minecraft:dispenser': 3.5,
  'minecraft:dragon_egg': 3,
  'minecraft:dragon_head': 1,
  'minecraft:dried_kelp_block': 0.5,
  'minecraft:dripstone_block': 1.5,
  'minecraft:dropper': 3.5,
  'minecraft:emerald_block': 5,
  'minecraft:emerald_ore': 3,
  'minecraft:enchanting_table': 5,
  'minecraft:end_gateway': -1,
  'minecraft:end_portal': -1,
  'minecraft:end_portal_frame': -1,
  'minecraft:end_rod': 0,
  'minecraft:end_stone': 3,
  'minecraft:end_stone_brick_slab': 3,
  'minecraft:end_stone_brick_wall': 3,
  'minecraft:ender_chest': 22.5,
  'minecraft:farmland': 0.6,
  'minecraft:fence_gate': 2,
  'minecraft:fern': 0,
  'minecraft:fire': 0,
  'minecraft:firefly_bush': 0,
  'minecraft:fletching_table': 2.5,
  'minecraft:flower_pot': 0,
  'minecraft:flowering_azalea': 0,
  'minecraft:flowing_water': 100,
  'minecraft:frosted_ice': 0.5,
  'minecraft:furnace': 3.5,
  'minecraft:gilded_blackstone': 1.5,
  'minecraft:glass': 0.3,
  'minecraft:glass_pane': 0.3,
  'minecraft:glow_lichen': 0.2,
  'minecraft:glowstone': 0.3,
  'minecraft:gold_block': 3,
  'minecraft:gold_ore': 3,
  'minecraft:granite': 1.5,
  'minecraft:granite_slab': 1.5,
  'minecraft:granite_stairs': 1.5,
  'minecraft:granite_wall': 1.5,
  'minecraft:grass_block': 0.6,
  'minecraft:gravel': 0.6,
  'minecraft:grindstone': 2,
  'minecraft:hanging_roots': 0,
  'minecraft:hardened_clay': 1.25,
  'minecraft:hay_block': 0.5,
  'minecraft:heavy_core': 10,
  'minecraft:heavy_weighted_pressure_plate': 0.5,
  'minecraft:honey_block': 0,
  'minecraft:honeycomb_block': 0.6,
  'minecraft:hopper': 3,
  'minecraft:ice': 0.5,
  'minecraft:infested_chiseled_stone_bricks': 0.75,
  'minecraft:infested_cobblestone': 1,
  'minecraft:infested_cracked_stone_bricks': 0.75,
  'minecraft:infested_deepslate': 1.5,
  'minecraft:infested_mossy_stone_bricks': 0.75,
  'minecraft:infested_stone': 0.75,
  'minecraft:infested_stone_bricks': 0.75,
  'minecraft:invisible_bedrock': -1,
  'minecraft:iron_bars': 5,
  'minecraft:iron_block': 5,
  'minecraft:iron_door': 5,
  'minecraft:iron_ore': 3,
  'minecraft:iron_trapdoor': 5,
  'minecraft:jukebox': 2,
  'minecraft:jungle_door': 3,
  'minecraft:kelp': 0,
  'minecraft:lab_table': 2.5,
  'minecraft:ladder': 0.4,
  'minecraft:lantern': 3.5,
  'minecraft:lapis_block': 3,
  'minecraft:lapis_ore': 3,
  'minecraft:large_amethyst_bud': 1.5,
  'minecraft:large_fern': 0,
  'minecraft:lava': 100,
  'minecraft:leaf_litter': 0,
  'minecraft:lectern': 2.5,
  'minecraft:lever': 0.5,
  'minecraft:light_weighted_pressure_plate': 0.5,
  'minecraft:lightning_rod': 3,
  'minecraft:lilac': 0,
  'minecraft:lily_of_the_valley': 0,
  'minecraft:lodestone': 3.5,
  'minecraft:loom': 2.5,
  'minecraft:mangrove_door': 3,
  'minecraft:mangrove_propagule': 0,
  'minecraft:mangrove_roots': 0.7,
  'minecraft:material_reducer': 2.5,
  'minecraft:medium_amethyst_bud': 1.5,
  'minecraft:melon_block': 1,
  'minecraft:melon_stem': 0,
  'minecraft:mob_spawner': 5,
  'minecraft:moss_block': 0.1,
  'minecraft:moss_carpet': 0.1,
  'minecraft:mossy_cobblestone': 2,
  'minecraft:mossy_cobblestone_slab': 2,
  'minecraft:mossy_cobblestone_stairs': 2,
  'minecraft:mossy_cobblestone_wall': 2,
  'minecraft:mossy_stone_brick_slab': 1.5,
  'minecraft:mossy_stone_brick_stairs': 1.5,
  'minecraft:mossy_stone_brick_wall': 1.5,
  'minecraft:mossy_stone_bricks': 1.5,
  'minecraft:mud': 0.5,
  'minecraft:mud_brick_slab': 1.5,
  'minecraft:mud_brick_stairs': 1.5,
  'minecraft:mud_brick_wall': 1.5,
  'minecraft:mud_bricks': 1.5,
  'minecraft:muddy_mangrove_roots': 0.7,
  'minecraft:mycelium': 0.6,
  'minecraft:nether_brick_fence': 2,
  'minecraft:nether_brick_slab': 2,
  'minecraft:nether_brick_stairs': 2,
  'minecraft:nether_brick_wall': 2,
  'minecraft:nether_gold_ore': 3,
  'minecraft:nether_sprouts': 0,
  'minecraft:nether_wart': 0,
  'minecraft:nether_wart_block': 1,
  'minecraft:netherite_block': 50,
  'minecraft:netherrack': 0.4,
  'minecraft:observer': 3,
  'minecraft:obsidian': 50,
  'minecraft:ochre_froglight': 0.3,
  'minecraft:open_eyeblossom': 0,
  'minecraft:orange_tulip': 0,
  'minecraft:oxeye_daisy': 0,
  'minecraft:packed_ice': 0.5,
  'minecraft:packed_mud': 1,
  'minecraft:pale_hanging_moss': 0,
  'minecraft:pale_moss_block': 0.1,
  'minecraft:pale_moss_carpet': 0.1,
  'minecraft:pearlescent_froglight': 0.3,
  'minecraft:peony': 0,
  'minecraft:petrified_oak_slab': 2,
  'minecraft:piglin_head': 1,
  'minecraft:pink_petals': 0,
  'minecraft:pink_tulip': 0,
  'minecraft:piston': 1.5,
  'minecraft:pitcher_plant': 0,
  'minecraft:player_head': 1,
  'minecraft:podzol': 0.5,
  'minecraft:pointed_dripstone': 1.5,
  'minecraft:polished_andesite': 1.5,
  'minecraft:polished_andesite_slab': 1.5,
  'minecraft:polished_andesite_stairs': 1.5,
  'minecraft:polished_basalt': 1.25,
  'minecraft:polished_blackstone': 2,
  'minecraft:polished_blackstone_brick_slab': 2,
  'minecraft:polished_blackstone_brick_stairs': 1.5,
  'minecraft:polished_blackstone_brick_wall': 1.5,
  'minecraft:polished_blackstone_bricks': 1.5,
  'minecraft:polished_blackstone_button': 0.5,
  'minecraft:polished_blackstone_pressure_plate': 0.5,
  'minecraft:polished_blackstone_slab': 2,
  'minecraft:polished_blackstone_stairs': 2,
  'minecraft:polished_blackstone_wall': 2,
  'minecraft:polished_deepslate': 3.5,
  'minecraft:polished_deepslate_slab': 3.5,
  'minecraft:polished_deepslate_stairs': 3.5,
  'minecraft:polished_deepslate_wall': 3.5,
  'minecraft:polished_diorite': 1.5,
  'minecraft:polished_diorite_slab': 1.5,
  'minecraft:polished_diorite_stairs': 1.5,
  'minecraft:polished_granite': 1.5,
  'minecraft:polished_granite_slab': 1.5,
  'minecraft:polished_granite_stairs': 1.5,
  'minecraft:polished_tuff': 1.5,
  'minecraft:polished_tuff_slab': 1.5,
  'minecraft:polished_tuff_stairs': 1.5,
  'minecraft:polished_tuff_wall': 1.5,
  'minecraft:poppy': 0,
  'minecraft:portal': -1,
  'minecraft:potatoes': 0,
  'minecraft:powder_snow': 0.25,
  'minecraft:prismarine': 1.5,
  'minecraft:prismarine_brick_slab': 1.5,
  'minecraft:prismarine_bricks': 1.5,
  'minecraft:prismarine_slab': 1.5,
  'minecraft:prismarine_stairs': 1.5,
  'minecraft:prismarine_wall': 1.5,
  'minecraft:pumpkin': 1,
  'minecraft:pumpkin_stem': 0,
  'minecraft:purpur_block': 1.5,
  'minecraft:purpur_pillar': 1.5,
  'minecraft:purpur_slab': 2,
  'minecraft:purpur_stairs': 1.5,
  'minecraft:quartz_block': 0.8,
  'minecraft:quartz_bricks': 0.8,
  'minecraft:quartz_ore': 3,
  'minecraft:quartz_pillar': 0.8,
  'minecraft:quartz_slab': 2,
  'minecraft:quartz_stairs': 0.8,
  'minecraft:rail': 0.7,
  'minecraft:raw_copper_block': 5,
  'minecraft:raw_gold_block': 5,
  'minecraft:raw_iron_block': 5,
  'minecraft:red_mushroom': 0,
  'minecraft:red_mushroom_block': 0,
  'minecraft:red_nether_brick_slab': 2,
  'minecraft:red_nether_brick_stairs': 2,
  'minecraft:red_nether_brick_wall': 2,
  'minecraft:red_sand': 0.5,
  'minecraft:red_sandstone': 0.8,
  'minecraft:red_sandstone_slab': 2,
  'minecraft:red_sandstone_stairs': 0.8,
  'minecraft:red_sandstone_wall': 0.8,
  'minecraft:red_tulip': 0,
  'minecraft:redstone_block': 5,
  'minecraft:redstone_lamp': 0.3,
  'minecraft:redstone_ore': 3,
  'minecraft:redstone_torch': 0,
  'minecraft:redstone_wire': 0,
  'minecraft:reinforced_deepslate': 55,
  'minecraft:repeating_command_block': -1,
  'minecraft:reserved6': 0,
  'minecraft:resin_block': 0,
  'minecraft:resin_brick_slab': 1.5,
  'minecraft:resin_brick_stairs': 1.5,
  'minecraft:resin_brick_wall': 1.5,
  'minecraft:resin_bricks': 1.5,
  'minecraft:resin_clump': 0,
  'minecraft:respawn_anchor': 50,
  'minecraft:rose_bush': 0,
  'minecraft:sand': 0.5,
  'minecraft:sandstone': 0.8,
  'minecraft:sandstone_slab': 2,
  'minecraft:sandstone_stairs': 0.8,
  'minecraft:sandstone_wall': 0.8,
  'minecraft:scaffolding': 0,
  'minecraft:sculk': 0.2,
  'minecraft:sculk_catalyst': 3,
  'minecraft:sculk_sensor': 1.5,
  'minecraft:sculk_shrieker': 3,
  'minecraft:sculk_vein': 0.2,
  'minecraft:sea_lantern': 0.3,
  'minecraft:sea_pickle': 0,
  'minecraft:seagrass': 0,
  'minecraft:short_dry_grass': 0,
  'minecraft:short_grass': 0,
  'minecraft:shroomlight': 1,
  'minecraft:skeleton_skull': 1,
  'minecraft:small_amethyst_bud': 1.5,
  'minecraft:small_dripleaf_block': 0,
  'minecraft:smithing_table': 2.5,
  'minecraft:smoker': 3.5,
  'minecraft:smooth_basalt': 1.25,
  'minecraft:smooth_quartz_slab': 2,
  'minecraft:smooth_quartz_stairs': 2,
  'minecraft:smooth_red_sandstone': 2,
  'minecraft:smooth_red_sandstone_slab': 2,
  'minecraft:smooth_red_sandstone_stairs': 2,
  'minecraft:smooth_sandstone': 2,
  'minecraft:smooth_sandstone_slab': 2,
  'minecraft:smooth_sandstone_stairs': 2,
  'minecraft:smooth_stone': 2,
  'minecraft:smooth_stone_slab': 2,
  'minecraft:sniffer_egg': 0.5,
  'minecraft:snow': 0.1,
  'minecraft:snow_layer': 0.1,
  'minecraft:soul_campfire': 2,
  'minecraft:soul_fire': 0,
  'minecraft:soul_lantern': 3.5,
  'minecraft:soul_sand': 0.5,
  'minecraft:soul_soil': 0.5,
  'minecraft:soul_torch': 0,
  'minecraft:sponge': 0.6,
  'minecraft:spore_blossom': 0,
  'minecraft:spruce_door': 3,
  'minecraft:sticky_piston': 1.5,
  'minecraft:stone': 1.5,
  'minecraft:stone_brick_slab': 2,
  'minecraft:stone_brick_stairs': 1.5,
  'minecraft:stone_brick_wall': 1.5,
  'minecraft:stone_bricks': 1.5,
  'minecraft:stone_button': 0.5,
  'minecraft:stone_pressure_plate': 0.5,
  'minecraft:stone_stairs': 1.5,
  'minecraft:stonecutter': 3.5,
  'minecraft:stonecutter_block': 3.5,
  'minecraft:stripped_bamboo_block': 2,
  'minecraft:structure_block': -1,
  'minecraft:structure_void': 0,
  'minecraft:sunflower': 0,
  'minecraft:suspicious_gravel': 0.25,
  'minecraft:suspicious_sand': 0.25,
  'minecraft:tall_dry_grass': 0,
  'minecraft:tall_grass': 0,
  'minecraft:target': 0.5,
  'minecraft:tinted_glass': 0.3,
  'minecraft:tnt': 0,
  'minecraft:torch': 0,
  'minecraft:torchflower': 0,
  'minecraft:trapdoor': 3,
  'minecraft:trapped_chest': 2.5,
  'minecraft:trial_spawner': 50,
  'minecraft:tripwire_hook': 0,
  'minecraft:tuff': 1.5,
  'minecraft:tuff_brick_slab': 1.5,
  'minecraft:tuff_brick_stairs': 1.5,
  'minecraft:tuff_brick_wall': 1.5,
  'minecraft:tuff_bricks': 1.5,
  'minecraft:tuff_slab': 1.5,
  'minecraft:tuff_stairs': 1.5,
  'minecraft:tuff_wall': 1.5,
  'minecraft:turtle_egg': 0.5,
  'minecraft:twisting_vines': 0,
  'minecraft:underwater_tnt': 0,
  'minecraft:underwater_torch': 0,
  'minecraft:vault': 50,
  'minecraft:verdant_froglight': 0.3,
  'minecraft:warped_door': 3,
  'minecraft:warped_fungus': 0,
  'minecraft:warped_nylium': 0.4,
  'minecraft:warped_roots': 0,
  'minecraft:warped_wart_block': 1,
  'minecraft:water': 100,
  'minecraft:web': 4,
  'minecraft:weeping_vines': 0,
  'minecraft:wet_sponge': 0.6,
  'minecraft:wheat': 0,
  'minecraft:white_tulip': 0,
  'minecraft:wildflowers': 0,
  'minecraft:wither_rose': 0,
  'minecraft:wither_skeleton_skull': 1,
  'minecraft:wooden_button': 0.5,
  'minecraft:wooden_door': 3,
  'minecraft:wooden_pressure_plate': 0.5,
  'minecraft:zombie_head': 1,
  'minecraft:acacia_button': 0.5,
  'minecraft:acacia_fence': 2,
  'minecraft:acacia_fence_gate': 2,
  'minecraft:acacia_log': 2,
  'minecraft:bamboo_button': 0.5,
  'minecraft:bamboo_fence': 2,
  'minecraft:bamboo_fence_gate': 2,
  'minecraft:birch_button': 0.5,
  'minecraft:birch_fence': 2,
  'minecraft:birch_fence_gate': 2,
  'minecraft:birch_log': 2,
  'minecraft:cherry_button': 0.5,
  'minecraft:cherry_fence': 2,
  'minecraft:cherry_fence_gate': 2,
  'minecraft:cherry_log': 2,
  'minecraft:crimson_button': 0.5,
  'minecraft:crimson_fence': 2,
  'minecraft:crimson_fence_gate': 2,
  'minecraft:crimson_stem': 2,
  'minecraft:dark_oak_button': 0.5,
  'minecraft:dark_oak_fence': 2,
  'minecraft:dark_oak_fence_gate': 2,
  'minecraft:dark_oak_log': 2,
  'minecraft:jungle_button': 0.5,
  'minecraft:jungle_fence': 2,
  'minecraft:jungle_fence_gate': 2,
  'minecraft:jungle_log': 2,
  'minecraft:mangrove_button': 0.5,
  'minecraft:mangrove_fence': 2,
  'minecraft:mangrove_fence_gate': 2,
  'minecraft:mangrove_log': 2,
  'minecraft:mushroom_stem': 2,
  'minecraft:oak_fence': 2,
  'minecraft:oak_log': 2,
  'minecraft:pale_oak_button': 0.5,
  'minecraft:pale_oak_fence': 2,
  'minecraft:pale_oak_fence_gate': 2,
  'minecraft:pale_oak_log': 2,
  'minecraft:spruce_button': 0.5,
  'minecraft:spruce_fence': 2,
  'minecraft:spruce_fence_gate': 2,
  'minecraft:spruce_log': 2,
  'minecraft:stripped_acacia_log': 2,
  'minecraft:stripped_birch_log': 2,
  'minecraft:stripped_cherry_log': 2,
  'minecraft:stripped_crimson_stem': 2,
  'minecraft:stripped_dark_oak_log': 2,
  'minecraft:stripped_jungle_log': 2,
  'minecraft:stripped_mangrove_log': 2,
  'minecraft:stripped_oak_log': 2,
  'minecraft:stripped_pale_oak_log': 2,
  'minecraft:stripped_spruce_log': 2,
  'minecraft:stripped_warped_stem': 2,
  'minecraft:warped_button': 0.5,
  'minecraft:warped_fence': 2,
  'minecraft:warped_fence_gate': 2,
  'minecraft:warped_stem': 2,
  'minecraft:acacia_leaves': 0.2,
  'minecraft:acacia_sapling': 0,
  'minecraft:azalea_leaves': 0.2,
  'minecraft:azalea_leaves_flowered': 0.2,
  'minecraft:bamboo_sapling': 0,
  'minecraft:birch_leaves': 0.2,
  'minecraft:birch_sapling': 0,
  'minecraft:black_glazed_terracotta': 1.25,
  'minecraft:black_terracotta': 1.25,
  'minecraft:black_wool': 0.8,
  'minecraft:blue_glazed_terracotta': 1.25,
  'minecraft:blue_terracotta': 1.25,
  'minecraft:blue_wool': 0.8,
  'minecraft:brown_glazed_terracotta': 1.25,
  'minecraft:brown_terracotta': 1.25,
  'minecraft:brown_wool': 0.8,
  'minecraft:cherry_leaves': 0.2,
  'minecraft:cherry_sapling': 0,
  'minecraft:cyan_glazed_terracotta': 1.25,
  'minecraft:cyan_terracotta': 1.25,
  'minecraft:cyan_wool': 0.8,
  'minecraft:dark_oak_leaves': 0.2,
  'minecraft:dark_oak_sapling': 0,
  'minecraft:gray_glazed_terracotta': 1.25,
  'minecraft:gray_terracotta': 1.25,
  'minecraft:gray_wool': 0.8,
  'minecraft:green_glazed_terracotta': 1.25,
  'minecraft:green_terracotta': 1.25,
  'minecraft:green_wool': 0.8,
  'minecraft:jungle_leaves': 0.2,
  'minecraft:jungle_sapling': 0,
  'minecraft:light_blue_glazed_terracotta': 1.25,
  'minecraft:light_blue_terracotta': 1.25,
  'minecraft:light_blue_wool': 0.8,
  'minecraft:light_gray_terracotta': 1.25,
  'minecraft:light_gray_wool': 0.8,
  'minecraft:lime_glazed_terracotta': 1.25,
  'minecraft:lime_terracotta': 1.25,
  'minecraft:lime_wool': 0.8,
  'minecraft:magenta_glazed_terracotta': 1.25,
  'minecraft:magenta_terracotta': 1.25,
  'minecraft:magenta_wool': 0.8,
  'minecraft:mangrove_leaves': 0.2,
  'minecraft:oak_leaves': 0.2,
  'minecraft:oak_sapling': 0,
  'minecraft:orange_glazed_terracotta': 1.25,
  'minecraft:orange_terracotta': 1.25,
  'minecraft:orange_wool': 0.8,
  'minecraft:pale_oak_leaves': 0.2,
  'minecraft:pale_oak_sapling': 0,
  'minecraft:pink_glazed_terracotta': 1.25,
  'minecraft:pink_terracotta': 1.25,
  'minecraft:pink_wool': 0.8,
  'minecraft:purple_glazed_terracotta': 1.25,
  'minecraft:purple_terracotta': 1.25,
  'minecraft:purple_wool': 0.8,
  'minecraft:red_glazed_terracotta': 1.25,
  'minecraft:red_terracotta': 1.25,
  'minecraft:red_wool': 0.8,
  'minecraft:silver_glazed_terracotta': 1.25,
  'minecraft:spruce_leaves': 0.2,
  'minecraft:spruce_sapling': 0,
  'minecraft:white_glazed_terracotta': 1.25,
  'minecraft:white_terracotta': 1.25,
  'minecraft:white_wool': 0.8,
  'minecraft:yellow_glazed_terracotta': 1.25,
  'minecraft:yellow_terracotta': 1.25,
  'minecraft:yellow_wool': 0.8,
  'minecraft:black_stained_glass': 0.3,
  'minecraft:black_stained_glass_pane': 0.3,
  'minecraft:blue_stained_glass': 0.3,
  'minecraft:blue_stained_glass_pane': 0.3,
  'minecraft:brown_stained_glass': 0.3,
  'minecraft:brown_stained_glass_pane': 0.3,
  'minecraft:cyan_stained_glass': 0.3,
  'minecraft:cyan_stained_glass_pane': 0.3,
  'minecraft:gray_stained_glass': 0.3,
  'minecraft:gray_stained_glass_pane': 0.3,
  'minecraft:green_stained_glass': 0.3,
  'minecraft:green_stained_glass_pane': 0.3,
  'minecraft:light_blue_stained_glass': 0.3,
  'minecraft:light_blue_stained_glass_pane': 0.3,
  'minecraft:light_gray_stained_glass': 0.3,
  'minecraft:light_gray_stained_glass_pane': 0.3,
  'minecraft:lime_stained_glass': 0.3,
  'minecraft:lime_stained_glass_pane': 0.3,
  'minecraft:magenta_stained_glass': 0.3,
  'minecraft:magenta_stained_glass_pane': 0.3,
  'minecraft:orange_stained_glass': 0.3,
  'minecraft:orange_stained_glass_pane': 0.3,
  'minecraft:pink_stained_glass': 0.3,
  'minecraft:pink_stained_glass_pane': 0.3,
  'minecraft:purple_stained_glass': 0.3,
  'minecraft:purple_stained_glass_pane': 0.3,
  'minecraft:red_stained_glass': 0.3,
  'minecraft:red_stained_glass_pane': 0.3,
  'minecraft:white_stained_glass': 0.3,
  'minecraft:white_stained_glass_pane': 0.3,
  'minecraft:yellow_stained_glass': 0.3,
  'minecraft:yellow_stained_glass_pane': 0.3,
  'minecraft:black_shulker_box': 2,
  'minecraft:blue_shulker_box': 2,
  'minecraft:brown_shulker_box': 2,
  'minecraft:cyan_shulker_box': 2,
  'minecraft:gray_shulker_box': 2,
  'minecraft:green_shulker_box': 2,
  'minecraft:light_blue_shulker_box': 2,
  'minecraft:light_gray_shulker_box': 2,
  'minecraft:lime_shulker_box': 2,
  'minecraft:magenta_shulker_box': 2,
  'minecraft:orange_shulker_box': 2,
  'minecraft:pink_shulker_box': 2,
  'minecraft:purple_shulker_box': 2,
  'minecraft:red_shulker_box': 2,
  'minecraft:undyed_shulker_box': 2,
  'minecraft:white_shulker_box': 2,
  'minecraft:yellow_shulker_box': 2,
  'minecraft:black_candle': 0.1,
  'minecraft:black_candle_cake': 0.5,
  'minecraft:black_carpet': 0.1,
  'minecraft:black_concrete': 1.8,
  'minecraft:black_concrete_powder': 0.5,
  'minecraft:blue_candle': 0.1,
  'minecraft:blue_candle_cake': 0.5,
  'minecraft:blue_carpet': 0.1,
  'minecraft:blue_concrete': 1.8,
  'minecraft:blue_concrete_powder': 0.5,
  'minecraft:brown_candle': 0.1,
  'minecraft:brown_candle_cake': 0.5,
  'minecraft:brown_carpet': 0.1,
  'minecraft:brown_concrete': 1.8,
  'minecraft:brown_concrete_powder': 0.5,
  'minecraft:candle_cake': 0.5,
  'minecraft:cyan_candle': 0.1,
  'minecraft:cyan_candle_cake': 0.5,
  'minecraft:cyan_carpet': 0.1,
  'minecraft:cyan_concrete': 1.8,
  'minecraft:cyan_concrete_powder': 0.5,
  'minecraft:gray_candle': 0.1,
  'minecraft:gray_candle_cake': 0.5,
  'minecraft:gray_carpet': 0.1,
  'minecraft:gray_concrete': 1.8,
  'minecraft:gray_concrete_powder': 0.5,
  'minecraft:green_candle': 0.1,
  'minecraft:green_candle_cake': 0.5,
  'minecraft:green_carpet': 0.1,
  'minecraft:green_concrete': 1.8,
  'minecraft:green_concrete_powder': 0.5,
  'minecraft:light_blue_candle': 0.1,
  'minecraft:light_blue_candle_cake': 0.5,
  'minecraft:light_blue_carpet': 0.1,
  'minecraft:light_blue_concrete': 1.8,
  'minecraft:light_blue_concrete_powder': 0.5,
  'minecraft:light_gray_candle': 0.1,
  'minecraft:light_gray_candle_cake': 0.5,
  'minecraft:light_gray_carpet': 0.1,
  'minecraft:light_gray_concrete': 1.8,
  'minecraft:light_gray_concrete_powder': 0.5,
  'minecraft:lime_candle': 0.1,
  'minecraft:lime_candle_cake': 0.5,
  'minecraft:lime_carpet': 0.1,
  'minecraft:lime_concrete': 1.8,
  'minecraft:lime_concrete_powder': 0.5,
  'minecraft:magenta_candle': 0.1,
  'minecraft:magenta_candle_cake': 0.5,
  'minecraft:magenta_carpet': 0.1,
  'minecraft:magenta_concrete': 1.8,
  'minecraft:magenta_concrete_powder': 0.5,
  'minecraft:orange_candle': 0.1,
  'minecraft:orange_candle_cake': 0.5,
  'minecraft:orange_carpet': 0.1,
  'minecraft:orange_concrete': 1.8,
  'minecraft:orange_concrete_powder': 0.5,
  'minecraft:pink_candle': 0.1,
  'minecraft:pink_candle_cake': 0.5,
  'minecraft:pink_carpet': 0.1,
  'minecraft:pink_concrete': 1.8,
  'minecraft:pink_concrete_powder': 0.5,
  'minecraft:purple_candle': 0.1,
  'minecraft:purple_candle_cake': 0.5,
  'minecraft:purple_carpet': 0.1,
  'minecraft:purple_concrete': 1.8,
  'minecraft:purple_concrete_powder': 0.5,
  'minecraft:red_candle': 0.1,
  'minecraft:red_candle_cake': 0.5,
  'minecraft:red_carpet': 0.1,
  'minecraft:red_concrete': 1.8,
  'minecraft:red_concrete_powder': 0.5,
  'minecraft:white_candle': 0.1,
  'minecraft:white_candle_cake': 0.5,
  'minecraft:white_carpet': 0.1,
  'minecraft:white_concrete': 1.8,
  'minecraft:white_concrete_powder': 0.5,
  'minecraft:yellow_candle': 0.1,
  'minecraft:yellow_candle_cake': 0.5,
  'minecraft:yellow_carpet': 0.1,
  'minecraft:yellow_concrete': 1.8,
  'minecraft:yellow_concrete_powder': 0.5,
  'minecraft:acacia_wood': 2,
  'minecraft:birch_wood': 2,
  'minecraft:cherry_wood': 2,
  'minecraft:crimson_hyphae': 2,
  'minecraft:dark_oak_wood': 2,
  'minecraft:jungle_wood': 2,
  'minecraft:mangrove_wood': 2,
  'minecraft:oak_wood': 2,
  'minecraft:pale_oak_wood': 2,
  'minecraft:spruce_wood': 2,
  'minecraft:stripped_acacia_wood': 2,
  'minecraft:stripped_birch_wood': 2,
  'minecraft:stripped_cherry_wood': 2,
  'minecraft:stripped_crimson_hyphae': 2,
  'minecraft:stripped_dark_oak_wood': 2,
  'minecraft:stripped_jungle_wood': 2,
  'minecraft:stripped_mangrove_wood': 2,
  'minecraft:stripped_oak_wood': 2,
  'minecraft:stripped_pale_oak_wood': 2,
  'minecraft:stripped_spruce_wood': 2,
  'minecraft:stripped_warped_hyphae': 2,
  'minecraft:warped_hyphae': 2,
  'minecraft:acacia_planks': 2,
  'minecraft:bamboo_planks': 2,
  'minecraft:birch_planks': 2,
  'minecraft:cherry_planks': 2,
  'minecraft:crimson_planks': 2,
  'minecraft:dark_oak_planks': 2,
  'minecraft:jungle_planks': 2,
  'minecraft:mangrove_planks': 2,
  'minecraft:oak_planks': 2,
  'minecraft:pale_oak_planks': 2,
  'minecraft:spruce_planks': 2,
  'minecraft:warped_planks': 2,
  'minecraft:acacia_hanging_sign': 1,
  'minecraft:acacia_standing_sign': 1,
  'minecraft:acacia_wall_sign': 1,
  'minecraft:bamboo_door': 2,
  'minecraft:bamboo_double_slab': 2,
  'minecraft:bamboo_hanging_sign': 1,
  'minecraft:bamboo_mosaic_double_slab': 2,
  'minecraft:bamboo_pressure_plate': 2,
  'minecraft:bamboo_slab': 2,
  'minecraft:bamboo_stairs': 2,
  'minecraft:bamboo_standing_sign': 1,
  'minecraft:bamboo_trapdoor': 2,
  'minecraft:bamboo_wall_sign': 1,
  'minecraft:birch_hanging_sign': 1,
  'minecraft:birch_standing_sign': 1,
  'minecraft:birch_wall_sign': 1,
  'minecraft:cherry_hanging_sign': 1,
  'minecraft:cherry_standing_sign': 1,
  'minecraft:cherry_wall_sign': 1,
  'minecraft:crimson_hanging_sign': 1,
  'minecraft:crimson_standing_sign': 1,
  'minecraft:crimson_wall_sign': 1,
  'minecraft:dark_oak_hanging_sign': 1,
  'minecraft:darkoak_standing_sign': 1,
  'minecraft:darkoak_wall_sign': 1,
  'minecraft:jungle_hanging_sign': 1,
  'minecraft:jungle_standing_sign': 1,
  'minecraft:jungle_wall_sign': 1,
  'minecraft:mangrove_hanging_sign': 1,
  'minecraft:mangrove_standing_sign': 1,
  'minecraft:mangrove_wall_sign': 1,
  'minecraft:oak_hanging_sign': 1,
  'minecraft:pale_oak_hanging_sign': 1,
  'minecraft:pale_oak_standing_sign': 1,
  'minecraft:pale_oak_wall_sign': 1,
  'minecraft:spruce_hanging_sign': 1,
  'minecraft:spruce_standing_sign': 1,
  'minecraft:spruce_wall_sign': 1,
  'minecraft:standing_sign': 1,
  'minecraft:wall_sign': 1,
  'minecraft:warped_hanging_sign': 1,
  'minecraft:warped_standing_sign': 1,
  'minecraft:warped_wall_sign': 1,
  'minecraft:brain_coral': 0,
  'minecraft:brain_coral_block': 1.5,
  'minecraft:brain_coral_fan': 0,
  'minecraft:brain_coral_wall_fan': 0,
  'minecraft:bubble_coral': 0,
  'minecraft:bubble_coral_block': 1.5,
  'minecraft:bubble_coral_fan': 0,
  'minecraft:bubble_coral_wall_fan': 0,
  'minecraft:dead_brain_coral': 0,
  'minecraft:dead_brain_coral_block': 1.5,
  'minecraft:dead_brain_coral_fan': 0,
  'minecraft:dead_brain_coral_wall_fan': 0,
  'minecraft:dead_bubble_coral': 0,
  'minecraft:dead_bubble_coral_block': 1.5,
  'minecraft:dead_bubble_coral_fan': 0,
  'minecraft:dead_bubble_coral_wall_fan': 0,
  'minecraft:dead_fire_coral': 0,
  'minecraft:dead_fire_coral_block': 1.5,
  'minecraft:dead_fire_coral_fan': 0,
  'minecraft:dead_fire_coral_wall_fan': 0,
  'minecraft:dead_horn_coral': 0,
  'minecraft:dead_horn_coral_block': 1.5,
  'minecraft:dead_horn_coral_fan': 0,
  'minecraft:dead_horn_coral_wall_fan': 0,
  'minecraft:dead_tube_coral': 0,
  'minecraft:dead_tube_coral_block': 1.5,
  'minecraft:dead_tube_coral_fan': 0,
  'minecraft:dead_tube_coral_wall_fan': 0,
  'minecraft:fire_coral': 0,
  'minecraft:fire_coral_block': 1.5,
  'minecraft:fire_coral_fan': 0,
  'minecraft:fire_coral_wall_fan': 0,
  'minecraft:horn_coral': 0,
  'minecraft:horn_coral_block': 1.5,
  'minecraft:horn_coral_fan': 0,
  'minecraft:horn_coral_wall_fan': 0,
  'minecraft:tube_coral': 0,
  'minecraft:tube_coral_block': 1.5,
  'minecraft:tube_coral_fan': 0,
  'minecraft:tube_coral_wall_fan': 0,
  'minecraft:acacia_double_slab': 2,
  'minecraft:acacia_pressure_plate': 0.5,
  'minecraft:acacia_slab': 2,
  'minecraft:acacia_stairs': 2,
  'minecraft:acacia_trapdoor': 2,
  'minecraft:birch_double_slab': 2,
  'minecraft:birch_pressure_plate': 0.5,
  'minecraft:birch_slab': 2,
  'minecraft:birch_stairs': 2,
  'minecraft:birch_trapdoor': 2,
  'minecraft:cherry_pressure_plate': 0.5,
  'minecraft:crimson_double_slab': 2,
  'minecraft:crimson_pressure_plate': 0.5,
  'minecraft:crimson_slab': 2,
  'minecraft:crimson_stairs': 2,
  'minecraft:crimson_trapdoor': 2,
  'minecraft:dark_oak_double_slab': 2,
  'minecraft:dark_oak_pressure_plate': 0.5,
  'minecraft:dark_oak_slab': 2,
  'minecraft:dark_oak_stairs': 2,
  'minecraft:dark_oak_trapdoor': 2,
  'minecraft:jungle_double_slab': 2,
  'minecraft:jungle_pressure_plate': 0.5,
  'minecraft:jungle_slab': 2,
  'minecraft:jungle_stairs': 2,
  'minecraft:jungle_trapdoor': 2,
  'minecraft:mangrove_double_slab': 2,
  'minecraft:mangrove_pressure_plate': 0.5,
  'minecraft:mangrove_slab': 2,
  'minecraft:mangrove_stairs': 2,
  'minecraft:mangrove_trapdoor': 2,
  'minecraft:oak_double_slab': 2,
  'minecraft:oak_slab': 2,
  'minecraft:oak_stairs': 2,
  'minecraft:pale_oak_door': 2,
  'minecraft:pale_oak_double_slab': 2,
  'minecraft:pale_oak_pressure_plate': 0.5,
  'minecraft:pale_oak_slab': 2,
  'minecraft:pale_oak_stairs': 2,
  'minecraft:pale_oak_trapdoor': 2,
  'minecraft:petrified_oak_double_slab': 2,
  'minecraft:spruce_double_slab': 2,
  'minecraft:spruce_pressure_plate': 0.5,
  'minecraft:spruce_slab': 2,
  'minecraft:spruce_stairs': 2,
  'minecraft:spruce_trapdoor': 2,
  'minecraft:warped_double_slab': 2,
  'minecraft:warped_pressure_plate': 0.5,
  'minecraft:warped_slab': 2,
  'minecraft:warped_stairs': 2,
  'minecraft:warped_trapdoor': 2,
  'minecraft:light_block_0': -1,
  'minecraft:light_block_1': -1,
  'minecraft:light_block_10': -1,
  'minecraft:light_block_11': -1,
  'minecraft:light_block_12': -1,
  'minecraft:light_block_13': -1,
  'minecraft:light_block_14': -1,
  'minecraft:light_block_15': -1,
  'minecraft:light_block_2': -1,
  'minecraft:light_block_3': -1,
  'minecraft:light_block_4': -1,
  'minecraft:light_block_5': -1,
  'minecraft:light_block_6': -1,
  'minecraft:light_block_7': -1,
  'minecraft:light_block_8': -1,
  'minecraft:light_block_9': -1,
  'minecraft:standing_banner': 1,
  'minecraft:wall_banner': 1,
  'minecraft:andesite_double_slab': 1.5,
  'minecraft:chipped_anvil': 5,
  'minecraft:damaged_anvil': 5,
  'minecraft:deprecated_anvil': 5,
  'minecraft:diorite_double_slab': 1.5,
  'minecraft:polished_andesite_double_slab': 1.5,
  'minecraft:polished_diorite_double_slab': 1.5,
  'minecraft:cherry_door': 2,
  'minecraft:cherry_double_slab': 2,
  'minecraft:cherry_slab': 2,
  'minecraft:cherry_stairs': 2,
  'minecraft:cherry_trapdoor': 2,
  'minecraft:end_brick_stairs': 3,
  'minecraft:end_bricks': 3,
  'minecraft:end_stone_brick_double_slab': 3,
  'minecraft:blackstone_double_slab': 1.5,
  'minecraft:colored_torch_blue': 0,
  'minecraft:colored_torch_green': 0,
  'minecraft:colored_torch_purple': 0,
  'minecraft:colored_torch_red': 0,
  'minecraft:lit_blast_furnace': 3.5,
  'minecraft:lit_furnace': 3.5,
  'minecraft:polished_blackstone_brick_double_slab': 1.5,
  'minecraft:polished_blackstone_double_slab': 1.5,
  'minecraft:powered_comparator': 0,
  'minecraft:powered_repeater': 0,
  'minecraft:quartz_double_slab': 2,
  'minecraft:smooth_quartz': 2,
  'minecraft:smooth_quartz_double_slab': 2,
  'minecraft:torchflower_crop': 0,
  'minecraft:unlit_redstone_torch': 0,
  'minecraft:unpowered_comparator': 0,
  'minecraft:unpowered_repeater': 0,
  'minecraft:cave_vines_body_with_berries': 0,
  'minecraft:cave_vines_head_with_berries': 0,
  'minecraft:double_cut_copper_slab': 3,
  'minecraft:exposed_chiseled_copper': 3,
  'minecraft:exposed_copper_bulb': 3,
  'minecraft:exposed_copper_door': 3,
  'minecraft:exposed_cut_copper_slab': 3,
  'minecraft:exposed_cut_copper_stairs': 3,
  'minecraft:exposed_double_cut_copper_slab': 3,
  'minecraft:normal_stone_double_slab': 2,
  'minecraft:normal_stone_slab': 2,
  'minecraft:normal_stone_stairs': 2,
  'minecraft:oxidized_chiseled_copper': 3,
  'minecraft:oxidized_copper_bulb': 3,
  'minecraft:oxidized_copper_door': 3,
  'minecraft:oxidized_cut_copper_slab': 3,
  'minecraft:oxidized_cut_copper_stairs': 3,
  'minecraft:oxidized_double_cut_copper_slab': 3,
  'minecraft:vine': 0.2,
  'minecraft:waxed_chiseled_copper': 3,
  'minecraft:waxed_copper_bulb': 3,
  'minecraft:waxed_copper_door': 3,
  'minecraft:waxed_cut_copper_slab': 3,
  'minecraft:waxed_cut_copper_stairs': 3,
  'minecraft:waxed_double_cut_copper_slab': 3,
  'minecraft:waxed_exposed_chiseled_copper': 3,
  'minecraft:waxed_exposed_copper_bulb': 3,
  'minecraft:waxed_exposed_copper_door': 3,
  'minecraft:waxed_exposed_cut_copper_slab': 3,
  'minecraft:waxed_exposed_cut_copper_stairs': 3,
  'minecraft:waxed_exposed_double_cut_copper_slab': 3,
  'minecraft:waxed_oxidized_chiseled_copper': 3,
  'minecraft:waxed_oxidized_copper_bulb': 3,
  'minecraft:waxed_oxidized_copper_door': 3,
  'minecraft:waxed_oxidized_cut_copper_slab': 3,
  'minecraft:waxed_oxidized_cut_copper_stairs': 3,
  'minecraft:waxed_oxidized_double_cut_copper_slab': 3,
  'minecraft:waxed_weathered_chiseled_copper': 3,
  'minecraft:waxed_weathered_copper_bulb': 3,
  'minecraft:waxed_weathered_copper_door': 3,
  'minecraft:waxed_weathered_cut_copper_slab': 3,
  'minecraft:waxed_weathered_cut_copper_stairs': 3,
  'minecraft:waxed_weathered_double_cut_copper_slab': 3,
  'minecraft:weathered_chiseled_copper': 3,
  'minecraft:weathered_copper_bulb': 3,
  'minecraft:weathered_copper_door': 3,
  'minecraft:weathered_cut_copper_slab': 3,
  'minecraft:weathered_cut_copper_stairs': 3,
  'minecraft:weathered_double_cut_copper_slab': 3,
  'minecraft:exposed_copper_trapdoor': 3,
  'minecraft:flowing_lava': 100,
  'minecraft:glowingobsidian': 50,
  'minecraft:oxidized_copper_trapdoor': 3,
  'minecraft:polished_tuff_double_slab': 1.5,
  'minecraft:slime': 0,
  'minecraft:tuff_brick_double_slab': 1.5,
  'minecraft:tuff_double_slab': 1.5,
  'minecraft:waterlily': 0,
  'minecraft:waxed_copper_trapdoor': 3,
  'minecraft:waxed_exposed_copper_trapdoor': 3,
  'minecraft:waxed_oxidized_copper_trapdoor': 3,
  'minecraft:waxed_weathered_copper_trapdoor': 3,
  'minecraft:weathered_copper_trapdoor': 3,
  'minecraft:daylight_detector_inverted': 0.2,
  'minecraft:exposed_copper': 3,
  'minecraft:exposed_copper_grate': 3,
  'minecraft:exposed_cut_copper': 3,
  'minecraft:oxidized_copper': 3,
  'minecraft:oxidized_copper_grate': 3,
  'minecraft:oxidized_cut_copper': 3,
  'minecraft:waxed_copper': 3,
  'minecraft:waxed_copper_grate': 3,
  'minecraft:waxed_cut_copper': 3,
  'minecraft:waxed_exposed_copper': 3,
  'minecraft:waxed_exposed_copper_grate': 3,
  'minecraft:waxed_exposed_cut_copper': 3,
  'minecraft:waxed_oxidized_copper': 3,
  'minecraft:waxed_oxidized_copper_grate': 3,
  'minecraft:waxed_oxidized_cut_copper': 3,
  'minecraft:waxed_weathered_copper': 3,
  'minecraft:waxed_weathered_copper_grate': 3,
  'minecraft:waxed_weathered_cut_copper': 3,
  'minecraft:weathered_copper': 3,
  'minecraft:weathered_copper_grate': 3,
  'minecraft:weathered_cut_copper': 3,
  'minecraft:cobbled_deepslate_double_slab': 3.5,
  'minecraft:deepslate_brick_double_slab': 3.5,
  'minecraft:deepslate_lapis_ore': 4.5,
  'minecraft:deepslate_tile_double_slab': 3.5,
  'minecraft:jigsaw': -1,
  'minecraft:lit_deepslate_redstone_ore': 4.5,
  'minecraft:polished_deepslate_double_slab': 3.5,
  'minecraft:grass_path': 0.5,
  'minecraft:brick_block': 2,
  'minecraft:brick_double_slab': 2,
  'minecraft:dirt_with_roots': 0.5,
  'minecraft:golden_rail': 0.7,
  'minecraft:magma': 0.5,
  'minecraft:mossy_stone_brick_double_slab': 1.5,
  'minecraft:mud_brick_double_slab': 1.5,
  'minecraft:nether_brick': 2,
  'minecraft:nether_brick_double_slab': 2,
  'minecraft:prismarine_brick_double_slab': 1.5,
  'minecraft:prismarine_bricks_stairs': 1.5,
  'minecraft:red_nether_brick': 2,
  'minecraft:red_nether_brick_double_slab': 2,
  'minecraft:resin_brick_double_slab': 1.5,
  'minecraft:stone_brick_double_slab': 1.5,
  'minecraft:beetroot': 0,
  'minecraft:carrots': 0,
  'minecraft:cobblestone_double_slab': 2,
  'minecraft:cut_red_sandstone_double_slab': 0.8,
  'minecraft:cut_sandstone_double_slab': 0.8,
  'minecraft:deadbush': 0,
  'minecraft:frame': 0,
  'minecraft:frog_spawn': 0,
  'minecraft:glow_frame': 0,
  'minecraft:granite_double_slab': 1.5,
  'minecraft:lit_pumpkin': 1,
  'minecraft:lit_redstone_lamp': 0.3,
  'minecraft:lit_redstone_ore': 3,
  'minecraft:lit_smoker': 3.5,
  'minecraft:mossy_cobblestone_double_slab': 2,
  'minecraft:noteblock': 0.8,
  'minecraft:polished_granite_double_slab': 1.5,
  'minecraft:sweet_berry_bush': 0,
  'minecraft:pitcher_crop': 0,
  'minecraft:red_sandstone_double_slab': 0.8,
  'minecraft:reeds': 0,
  'minecraft:sandstone_double_slab': 0.8,
  'minecraft:smooth_red_sandstone_double_slab': 0.8,
  'minecraft:smooth_sandstone_double_slab': 0.8,
  'minecraft:smooth_stone_double_slab': 2,
  'minecraft:trip_wire': 0,
  'minecraft:dark_prismarine_double_slab': 1.5,
  'minecraft:dried_ghast': 0,
  'minecraft:piston_arm_collision': 1.5,
  'minecraft:prismarine_double_slab': 1.5,
  'minecraft:purpur_double_slab': 1.5,
  'minecraft:sticky_piston_arm_collision': 1.5
};

const BLOCK_COLORS = {
  undefined: [
    { red: 1, green: 0, blue: 1, alpha: 1 },
    { red: 0, green: 0, blue: 0, alpha: 1 }
  ],
  'minecraft:air': [ { red: 0.9, green: 0.9, blue: 1, alpha: 0.5 } ],
  'minecraft:acacia_door': [
    { red: 0.796, green: 0.467, blue: 0.31, alpha: 1 },
    { red: 0.773, green: 0.447, blue: 0.29, alpha: 1 },
    { red: 0.51, green: 0.286, blue: 0.165, alpha: 1 }
  ],
  'minecraft:activator_rail': [
    { red: 0.384, green: 0.008, blue: 0.008, alpha: 1 },
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 }
  ],
  'minecraft:allium': [
    { red: 0.824, green: 0.651, blue: 0.965, alpha: 1 },
    { red: 0.722, green: 0.471, blue: 0.929, alpha: 1 },
    { red: 0.651, green: 0.369, blue: 0.882, alpha: 1 }
  ],
  'minecraft:allow': [
    { red: 0.549, green: 0.439, blue: 0.275, alpha: 1 },
    { red: 0.604, green: 0.482, blue: 0.306, alpha: 1 },
    { red: 0.502, green: 0.404, blue: 0.255, alpha: 1 }
  ],
  'minecraft:amethyst_block': [
    { red: 0.478, green: 0.357, blue: 0.71, alpha: 1 },
    { red: 0.392, green: 0.278, blue: 0.62, alpha: 1 },
    { red: 0.553, green: 0.416, blue: 0.8, alpha: 1 }
  ],
  'minecraft:amethyst_cluster': [
    { red: 0.812, green: 0.627, blue: 0.953, alpha: 1 },
    { red: 0.478, green: 0.357, blue: 0.71, alpha: 1 },
    { red: 0.553, green: 0.416, blue: 0.8, alpha: 1 }
  ],
  'minecraft:ancient_debris': [
    { red: 0.365, green: 0.204, blue: 0.173, alpha: 1 },
    { red: 0.396, green: 0.278, blue: 0.251, alpha: 1 },
    { red: 0.29, green: 0.173, blue: 0.137, alpha: 1 }
  ],
  'minecraft:andesite': [
    { red: 0.541, green: 0.541, blue: 0.557, alpha: 1 },
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 }
  ],
  'minecraft:andesite_slab': [
    { red: 0.541, green: 0.541, blue: 0.557, alpha: 1 },
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 }
  ],
  'minecraft:andesite_stairs': [
    { red: 0.541, green: 0.541, blue: 0.557, alpha: 1 },
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 }
  ],
  'minecraft:andesite_wall': [
    { red: 0.541, green: 0.541, blue: 0.557, alpha: 1 },
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 }
  ],
  'minecraft:anvil': [
    { red: 0.239, green: 0.239, blue: 0.239, alpha: 1 },
    { red: 0.259, green: 0.259, blue: 0.259, alpha: 1 },
    { red: 0.29, green: 0.29, blue: 0.29, alpha: 1 }
  ],
  'minecraft:azalea': [
    { red: 0.314, green: 0.412, blue: 0.173, alpha: 1 },
    { red: 0.439, green: 0.573, blue: 0.176, alpha: 1 },
    { red: 0.424, green: 0.502, blue: 0.192, alpha: 1 }
  ],
  'minecraft:azure_bluet': [
    { red: 0.333, green: 0.671, blue: 0.176, alpha: 1 },
    { red: 0.969, green: 0.969, blue: 0.969, alpha: 1 },
    { red: 0.839, green: 0.91, blue: 0.91, alpha: 1 }
  ],
  'minecraft:bamboo': [
    { red: 0.349, green: 0.565, blue: 0.012, alpha: 1 },
    { red: 0.325, green: 0.51, blue: 0.035, alpha: 1 },
    { red: 0.553, green: 0.761, blue: 0.31, alpha: 1 }
  ],
  'minecraft:bamboo_block': [
    { red: 0.502, green: 0.565, blue: 0.22, alpha: 1 },
    { red: 0.569, green: 0.651, blue: 0.263, alpha: 1 },
    { red: 0.396, green: 0.439, blue: 0.188, alpha: 1 }
  ],
  'minecraft:bamboo_mosaic': [
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 },
    { red: 0.6, green: 0.529, blue: 0.255, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:bamboo_mosaic_slab': [
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 },
    { red: 0.6, green: 0.529, blue: 0.255, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:bamboo_mosaic_stairs': [
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 },
    { red: 0.6, green: 0.529, blue: 0.255, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:barrel': [
    { red: 0.545, green: 0.404, blue: 0.235, alpha: 1 },
    { red: 0.502, green: 0.369, blue: 0.212, alpha: 1 },
    { red: 0.6, green: 0.443, blue: 0.251, alpha: 1 }
  ],
  'minecraft:barrier': [
    { red: 0.89, green: 0, blue: 0, alpha: 1 },
    { red: 0.694, green: 0, blue: 0, alpha: 1 },
    { red: 0.745, green: 0.004, blue: 0.004, alpha: 1 }
  ],
  'minecraft:basalt': [
    { red: 0.31, green: 0.294, blue: 0.31, alpha: 1 },
    { red: 0.361, green: 0.361, blue: 0.361, alpha: 1 },
    { red: 0.227, green: 0.231, blue: 0.282, alpha: 1 }
  ],
  'minecraft:beacon': [
    { red: 0.169, green: 0.796, blue: 0.753, alpha: 1 },
    { red: 0.286, green: 0.835, blue: 0.8, alpha: 1 },
    { red: 0.169, green: 0.725, blue: 0.69, alpha: 1 }
  ],
  'minecraft:bed': [
    { red: 0.51, green: 0.039, blue: 0.035, alpha: 1 },
    { red: 0.549, green: 0.082, blue: 0.082, alpha: 1 },
    { red: 0.549, green: 0.082, blue: 0.086, alpha: 1 }
  ],
  'minecraft:bedrock': [
    { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 },
    { red: 0.341, green: 0.341, blue: 0.341, alpha: 1 },
    { red: 0.592, green: 0.592, blue: 0.592, alpha: 1 }
  ],
  'minecraft:bee_nest': [
    { red: 0.851, green: 0.643, blue: 0.325, alpha: 1 },
    { red: 0.784, green: 0.525, blue: 0.267, alpha: 1 },
    { red: 0.969, green: 0.808, blue: 0.275, alpha: 1 }
  ],
  'minecraft:beehive': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.541, green: 0.412, blue: 0.22, alpha: 1 }
  ],
  'minecraft:bell': [
    { red: 0.996, green: 0.839, blue: 0.224, alpha: 1 },
    { red: 1, green: 0.965, blue: 0.553, alpha: 1 },
    { red: 1, green: 0.925, blue: 0.31, alpha: 1 }
  ],
  'minecraft:big_dripleaf': [
    { red: 0.424, green: 0.502, blue: 0.192, alpha: 1 },
    { red: 0.314, green: 0.412, blue: 0.173, alpha: 1 },
    { red: 0.259, green: 0.333, blue: 0.176, alpha: 1 }
  ],
  'minecraft:birch_door': [
    { red: 0.965, green: 0.949, blue: 0.871, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.835, alpha: 1 },
    { red: 0.859, green: 0.824, blue: 0.631, alpha: 1 }
  ],
  'minecraft:blackstone': [
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 },
    { red: 0.125, green: 0.075, blue: 0.11, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 }
  ],
  'minecraft:blackstone_slab': [
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 },
    { red: 0.125, green: 0.075, blue: 0.11, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 }
  ],
  'minecraft:blackstone_stairs': [
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 },
    { red: 0.125, green: 0.075, blue: 0.11, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 }
  ],
  'minecraft:blackstone_wall': [
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 },
    { red: 0.125, green: 0.075, blue: 0.11, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 }
  ],
  'minecraft:blast_furnace': [
    { red: 0.349, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.286, green: 0.282, blue: 0.282, alpha: 1 },
    { red: 0.247, green: 0.243, blue: 0.259, alpha: 1 }
  ],
  'minecraft:blue_ice': [
    { red: 0.424, green: 0.639, blue: 0.992, alpha: 1 },
    { red: 0.455, green: 0.671, blue: 0.996, alpha: 1 },
    { red: 0.42, green: 0.616, blue: 0.984, alpha: 1 }
  ],
  'minecraft:blue_orchid': [
    { red: 0.153, green: 0.663, blue: 0.957, alpha: 1 },
    { red: 0.11, green: 0.573, blue: 0.839, alpha: 1 },
    { red: 0.165, green: 0.749, blue: 0.992, alpha: 1 }
  ],
  'minecraft:bone_block': [
    { red: 0.914, green: 0.902, blue: 0.831, alpha: 1 },
    { red: 0.902, green: 0.886, blue: 0.824, alpha: 1 },
    { red: 0.871, green: 0.855, blue: 0.773, alpha: 1 }
  ],
  'minecraft:bookshelf': [
    { red: 0.702, green: 0.549, blue: 0.318, alpha: 1 },
    { red: 0.608, green: 0.467, blue: 0.259, alpha: 1 },
    { red: 0.569, green: 0.067, blue: 0.067, alpha: 1 }
  ],
  'minecraft:border_block': [
    { red: 0.835, green: 0.255, blue: 0.212, alpha: 1 },
    { red: 0.667, green: 0.212, blue: 0.176, alpha: 1 },
    { red: 0.702, green: 0.22, blue: 0.184, alpha: 1 }
  ],
  'minecraft:brewing_stand': [
    { red: 0.412, green: 0.365, blue: 0.365, alpha: 1 },
    { red: 0.455, green: 0.424, blue: 0.424, alpha: 1 },
    { red: 0.439, green: 0.392, blue: 0.392, alpha: 1 }
  ],
  'minecraft:brick_slab': [
    { red: 0.608, green: 0.337, blue: 0.263, alpha: 1 },
    { red: 0.545, green: 0.431, blue: 0.404, alpha: 1 },
    { red: 0.635, green: 0.525, blue: 0.49, alpha: 1 }
  ],
  'minecraft:brick_stairs': [
    { red: 0.608, green: 0.337, blue: 0.263, alpha: 1 },
    { red: 0.545, green: 0.431, blue: 0.404, alpha: 1 },
    { red: 0.635, green: 0.525, blue: 0.49, alpha: 1 }
  ],
  'minecraft:brick_wall': [
    { red: 0.608, green: 0.337, blue: 0.263, alpha: 1 },
    { red: 0.545, green: 0.431, blue: 0.404, alpha: 1 },
    { red: 0.635, green: 0.525, blue: 0.49, alpha: 1 }
  ],
  'minecraft:brown_mushroom': [
    { red: 0.8, green: 0.6, blue: 0.471, alpha: 1 },
    { red: 0.569, green: 0.427, blue: 0.333, alpha: 1 },
    { red: 0.447, green: 0.337, blue: 0.263, alpha: 1 }
  ],
  'minecraft:brown_mushroom_block': [
    { red: 0.592, green: 0.447, blue: 0.318, alpha: 1 },
    { red: 0.58, green: 0.427, blue: 0.322, alpha: 1 },
    { red: 0.553, green: 0.408, blue: 0.314, alpha: 1 }
  ],
  'minecraft:bubble_column': [
    { red: 0.129, green: 0.71, blue: 1, alpha: 1 },
    { red: 0.467, green: 0.851, blue: 1, alpha: 1 }
  ],
  'minecraft:budding_amethyst': [
    { red: 0.478, green: 0.357, blue: 0.71, alpha: 1 },
    { red: 0.392, green: 0.278, blue: 0.62, alpha: 1 },
    { red: 0.553, green: 0.416, blue: 0.8, alpha: 1 }
  ],
  'minecraft:bush': [
    { red: 0.42, green: 0.431, blue: 0.42, alpha: 1 },
    { red: 0.486, green: 0.494, blue: 0.486, alpha: 1 },
    { red: 0.345, green: 0.349, blue: 0.345, alpha: 1 }
  ],
  'minecraft:cactus': [
    { red: 0.322, green: 0.49, blue: 0.149, alpha: 1 },
    { red: 0.357, green: 0.549, blue: 0.169, alpha: 1 },
    { red: 0.392, green: 0.596, blue: 0.196, alpha: 1 }
  ],
  'minecraft:cactus_flower': [
    { red: 0.824, green: 0.439, blue: 0.533, alpha: 1 },
    { red: 0.631, green: 0.341, blue: 0.475, alpha: 1 },
    { red: 0.973, green: 0.522, blue: 0.518, alpha: 1 }
  ],
  'minecraft:cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:calcite': [
    { red: 0.851, green: 0.859, blue: 0.843, alpha: 1 },
    { red: 0.929, green: 0.925, blue: 0.902, alpha: 1 },
    { red: 0.788, green: 0.788, blue: 0.769, alpha: 1 }
  ],
  'minecraft:calibrated_sculk_sensor': [
    { red: 0.012, green: 0.255, blue: 0.314, alpha: 1 },
    { red: 0.027, green: 0.282, blue: 0.341, alpha: 1 },
    { red: 0.329, green: 0.392, blue: 0.608, alpha: 1 }
  ],
  'minecraft:camera': [
    { red: 0.184, green: 0.184, blue: 0.184, alpha: 1 },
    { red: 0.094, green: 0.094, blue: 0.094, alpha: 1 },
    { red: 0.294, green: 0.294, blue: 0.294, alpha: 1 }
  ],
  'minecraft:campfire': [
    { red: 0.937, green: 0.804, blue: 0.337, alpha: 1 },
    { red: 0.788, green: 0.424, blue: 0.012, alpha: 1 },
    { red: 0.914, green: 0.741, blue: 0.224, alpha: 1 }
  ],
  'minecraft:candle': [
    { red: 0.902, green: 0.725, blue: 0.549, alpha: 1 },
    { red: 0.98, green: 0.855, blue: 0.639, alpha: 1 },
    { red: 0.996, green: 0.941, blue: 0.702, alpha: 1 }
  ],
  'minecraft:cartography_table': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.325, green: 0.22, blue: 0.102, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:carved_pumpkin': [
    { red: 0.89, green: 0.541, blue: 0.114, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.043, alpha: 1 },
    { red: 0.769, green: 0.435, blue: 0.078, alpha: 1 }
  ],
  'minecraft:cauldron': [
    { red: 0.31, green: 0.31, blue: 0.31, alpha: 1 },
    { red: 0.349, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.286, green: 0.282, blue: 0.282, alpha: 1 }
  ],
  'minecraft:cave_vines': [
    { red: 0.314, green: 0.447, blue: 0.2, alpha: 1 },
    { red: 0.282, green: 0.38, blue: 0.141, alpha: 1 },
    { red: 0.439, green: 0.573, blue: 0.176, alpha: 1 }
  ],
  'minecraft:chain': [
    { red: 0.145, green: 0.173, blue: 0.239, alpha: 1 },
    { red: 0.243, green: 0.267, blue: 0.325, alpha: 1 },
    { red: 0.286, green: 0.314, blue: 0.396, alpha: 1 }
  ],
  'minecraft:chain_command_block': [
    { red: 0.463, green: 0.698, blue: 0.592, alpha: 1 },
    { red: 0.702, green: 0.69, blue: 0.725, alpha: 1 },
    { red: 0.373, green: 0.561, blue: 0.478, alpha: 1 }
  ],
  'minecraft:chest': [
    { red: 0.561, green: 0.412, blue: 0.114, alpha: 1 },
    { red: 0.671, green: 0.475, blue: 0.176, alpha: 1 },
    { red: 0.643, green: 0.447, blue: 0.153, alpha: 1 }
  ],
  'minecraft:chiseled_bookshelf': [
    { red: 0.588, green: 0.455, blue: 0.255, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 },
    { red: 0.761, green: 0.616, blue: 0.384, alpha: 1 }
  ],
  'minecraft:chiseled_copper': [
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.565, green: 0.286, blue: 0.192, alpha: 1 }
  ],
  'minecraft:chiseled_deepslate': [
    { red: 0.141, green: 0.141, blue: 0.141, alpha: 1 },
    { red: 0.294, green: 0.298, blue: 0.31, alpha: 1 },
    { red: 0.176, green: 0.176, blue: 0.176, alpha: 1 }
  ],
  'minecraft:chiseled_nether_bricks': [
    { red: 0.098, green: 0.051, blue: 0.063, alpha: 1 },
    { red: 0.188, green: 0.094, blue: 0.11, alpha: 1 },
    { red: 0.243, green: 0.118, blue: 0.141, alpha: 1 }
  ],
  'minecraft:chiseled_polished_blackstone': [
    { red: 0.306, green: 0.294, blue: 0.329, alpha: 1 },
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 }
  ],
  'minecraft:chiseled_quartz_block': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.867, green: 0.851, blue: 0.796, alpha: 1 },
    { red: 0.886, green: 0.871, blue: 0.816, alpha: 1 }
  ],
  'minecraft:chiseled_red_sandstone': [
    { red: 0.624, green: 0.306, blue: 0.043, alpha: 1 },
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 }
  ],
  'minecraft:chiseled_resin_bricks': [
    { red: 0.702, green: 0.243, blue: 0.075, alpha: 1 },
    { red: 0.651, green: 0.212, blue: 0.098, alpha: 1 },
    { red: 0.78, green: 0.286, blue: 0.039, alpha: 1 }
  ],
  'minecraft:chiseled_sandstone': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.776, green: 0.682, blue: 0.443, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 }
  ],
  'minecraft:chiseled_stone_bricks': [
    { red: 0.353, green: 0.349, blue: 0.353, alpha: 1 },
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.612, green: 0.6, blue: 0.612, alpha: 1 }
  ],
  'minecraft:chiseled_tuff': [
    { red: 0.271, green: 0.29, blue: 0.259, alpha: 1 },
    { red: 0.294, green: 0.318, blue: 0.271, alpha: 1 },
    { red: 0.463, green: 0.467, blue: 0.435, alpha: 1 }
  ],
  'minecraft:chiseled_tuff_bricks': [
    { red: 0.463, green: 0.467, blue: 0.435, alpha: 1 },
    { red: 0.294, green: 0.318, blue: 0.271, alpha: 1 },
    { red: 0.322, green: 0.353, blue: 0.318, alpha: 1 }
  ],
  'minecraft:chorus_flower': [
    { red: 0.357, green: 0.204, blue: 0.357, alpha: 1 },
    { red: 0.337, green: 0.18, blue: 0.337, alpha: 1 },
    { red: 0.984, green: 0.953, blue: 0.996, alpha: 1 }
  ],
  'minecraft:chorus_plant': [
    { red: 0.357, green: 0.204, blue: 0.357, alpha: 1 },
    { red: 0.337, green: 0.18, blue: 0.337, alpha: 1 },
    { red: 0.278, green: 0.129, blue: 0.278, alpha: 1 }
  ],
  'minecraft:clay': [
    { red: 0.631, green: 0.655, blue: 0.694, alpha: 1 },
    { red: 0.604, green: 0.639, blue: 0.702, alpha: 1 },
    { red: 0.675, green: 0.682, blue: 0.741, alpha: 1 }
  ],
  'minecraft:closed_eyeblossom': [
    { red: 0.357, green: 0.322, blue: 0.318, alpha: 1 },
    { red: 0.627, green: 0.584, blue: 0.604, alpha: 1 },
    { red: 0.506, green: 0.447, blue: 0.475, alpha: 1 }
  ],
  'minecraft:coal_block': [
    { red: 0.082, green: 0.082, blue: 0.082, alpha: 1 },
    { red: 0.02, green: 0.02, blue: 0.02, alpha: 1 },
    { red: 0.051, green: 0.051, blue: 0.051, alpha: 1 }
  ],
  'minecraft:coal_ore': [
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.361, green: 0.361, blue: 0.361, alpha: 1 }
  ],
  'minecraft:coarse_dirt': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.725, green: 0.522, blue: 0.361, alpha: 1 }
  ],
  'minecraft:cobbled_deepslate': [
    { red: 0.29, green: 0.29, blue: 0.31, alpha: 1 },
    { red: 0.247, green: 0.247, blue: 0.271, alpha: 1 },
    { red: 0.208, green: 0.208, blue: 0.224, alpha: 1 }
  ],
  'minecraft:cobbled_deepslate_slab': [
    { red: 0.29, green: 0.29, blue: 0.31, alpha: 1 },
    { red: 0.247, green: 0.247, blue: 0.271, alpha: 1 },
    { red: 0.208, green: 0.208, blue: 0.224, alpha: 1 }
  ],
  'minecraft:cobbled_deepslate_stairs': [
    { red: 0.29, green: 0.29, blue: 0.31, alpha: 1 },
    { red: 0.247, green: 0.247, blue: 0.271, alpha: 1 },
    { red: 0.208, green: 0.208, blue: 0.224, alpha: 1 }
  ],
  'minecraft:cobbled_deepslate_wall': [
    { red: 0.29, green: 0.29, blue: 0.31, alpha: 1 },
    { red: 0.247, green: 0.247, blue: 0.271, alpha: 1 },
    { red: 0.208, green: 0.208, blue: 0.224, alpha: 1 }
  ],
  'minecraft:cobblestone': [
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.38, green: 0.38, blue: 0.38, alpha: 1 },
    { red: 0.431, green: 0.427, blue: 0.427, alpha: 1 }
  ],
  'minecraft:cobblestone_slab': [
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.38, green: 0.38, blue: 0.38, alpha: 1 },
    { red: 0.431, green: 0.427, blue: 0.427, alpha: 1 }
  ],
  'minecraft:cobblestone_wall': [
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.38, green: 0.38, blue: 0.38, alpha: 1 },
    { red: 0.431, green: 0.427, blue: 0.427, alpha: 1 }
  ],
  'minecraft:cocoa': [
    { red: 0.467, green: 0.451, blue: 0.208, alpha: 1 },
    { red: 0.431, green: 0.443, blue: 0.208, alpha: 1 },
    { red: 0.404, green: 0.392, blue: 0.169, alpha: 1 }
  ],
  'minecraft:command_block': [
    { red: 0.78, green: 0.494, blue: 0.31, alpha: 1 },
    { red: 0.702, green: 0.69, blue: 0.725, alpha: 1 },
    { red: 0.651, green: 0.376, blue: 0.188, alpha: 1 }
  ],
  'minecraft:composter': [
    { red: 0.529, green: 0.345, blue: 0.18, alpha: 1 },
    { red: 0.318, green: 0.169, blue: 0.039, alpha: 1 },
    { red: 0.471, green: 0.286, blue: 0.122, alpha: 1 }
  ],
  'minecraft:compound_creator': undefined,
  'minecraft:conduit': [
    { red: 0.502, green: 0.447, blue: 0.322, alpha: 1 },
    { red: 0.729, green: 0.678, blue: 0.588, alpha: 1 },
    { red: 0.639, green: 0.6, blue: 0.522, alpha: 1 }
  ],
  'minecraft:copper_block': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:copper_bulb': [
    { red: 0.373, green: 0.2, blue: 0.082, alpha: 1 },
    { red: 0.451, green: 0.255, blue: 0.122, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 }
  ],
  'minecraft:copper_door': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 }
  ],
  'minecraft:copper_grate': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 }
  ],
  'minecraft:copper_ore': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 }
  ],
  'minecraft:copper_trapdoor': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.604, green: 0.314, blue: 0.22, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:cornflower': [
    { red: 0.341, green: 0.549, blue: 0.302, alpha: 1 },
    { red: 0.275, green: 0.416, blue: 0.922, alpha: 1 },
    { red: 0.447, green: 0.561, blue: 0.945, alpha: 1 }
  ],
  'minecraft:cracked_deepslate_bricks': [
    { red: 0.22, green: 0.216, blue: 0.216, alpha: 1 },
    { red: 0.345, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.141, green: 0.141, blue: 0.141, alpha: 1 }
  ],
  'minecraft:cracked_deepslate_tiles': [
    { red: 0.176, green: 0.176, blue: 0.176, alpha: 1 },
    { red: 0.141, green: 0.141, blue: 0.141, alpha: 1 },
    { red: 0.22, green: 0.216, blue: 0.216, alpha: 1 }
  ],
  'minecraft:cracked_nether_bricks': [
    { red: 0.098, green: 0.051, blue: 0.063, alpha: 1 },
    { red: 0.188, green: 0.094, blue: 0.11, alpha: 1 },
    { red: 0.129, green: 0.067, blue: 0.078, alpha: 1 }
  ],
  'minecraft:cracked_polished_blackstone_bricks': [
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.137, green: 0.086, blue: 0.122, alpha: 1 },
    { red: 0.086, green: 0.059, blue: 0.063, alpha: 1 }
  ],
  'minecraft:cracked_stone_bricks': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.388, green: 0.388, blue: 0.388, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 }
  ],
  'minecraft:crafter': [
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.631, green: 0.631, blue: 0.631, alpha: 1 }
  ],
  'minecraft:crafting_table': [
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.098, green: 0.078, blue: 0.047, alpha: 1 }
  ],
  'minecraft:creaking_heart': [
    { red: 0.431, green: 0.392, blue: 0.384, alpha: 1 },
    { red: 0.22, green: 0.169, blue: 0.149, alpha: 1 },
    { red: 0.275, green: 0.208, blue: 0.18, alpha: 1 }
  ],
  'minecraft:creeper_head': [
    { red: 0.502, green: 0.796, blue: 0.459, alpha: 1 },
    { red: 0.443, green: 0.796, blue: 0.384, alpha: 1 },
    { red: 0.506, green: 0.722, blue: 0.478, alpha: 1 }
  ],
  'minecraft:crimson_door': [
    { red: 0.525, green: 0.243, blue: 0.353, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 },
    { red: 0.573, green: 0.255, blue: 0.376, alpha: 1 }
  ],
  'minecraft:crimson_fungus': [
    { red: 0.322, green: 0.094, blue: 0.063, alpha: 1 },
    { red: 0.451, green: 0.016, blue: 0.031, alpha: 1 },
    { red: 0.773, green: 0.204, blue: 0.224, alpha: 1 }
  ],
  'minecraft:crimson_nylium': [
    { red: 0.447, green: 0.196, blue: 0.196, alpha: 1 },
    { red: 0.396, green: 0.157, blue: 0.157, alpha: 1 },
    { red: 0.353, green: 0, blue: 0, alpha: 1 }
  ],
  'minecraft:crimson_roots': [
    { red: 0.573, green: 0.024, blue: 0.212, alpha: 1 },
    { red: 0.4, green: 0.024, blue: 0.153, alpha: 1 },
    { red: 0.678, green: 0.063, blue: 0.11, alpha: 1 }
  ],
  'minecraft:crying_obsidian': [
    { red: 0.024, green: 0.012, blue: 0.043, alpha: 1 },
    { red: 0.063, green: 0.047, blue: 0.11, alpha: 1 },
    { red: 0, green: 0, blue: 0.004, alpha: 1 }
  ],
  'minecraft:cut_copper': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:cut_copper_stairs': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:cut_red_sandstone': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:cut_red_sandstone_slab': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:cut_sandstone': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:cut_sandstone_slab': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:dandelion': [
    { red: 1, green: 0.925, blue: 0.31, alpha: 1 },
    { red: 0.09, green: 0.486, blue: 0.016, alpha: 1 },
    { red: 0.29, green: 0.561, blue: 0.157, alpha: 1 }
  ],
  'minecraft:dark_oak_door': [
    { red: 0.286, green: 0.192, blue: 0.086, alpha: 1 },
    { red: 0.325, green: 0.212, blue: 0.102, alpha: 1 },
    { red: 0.353, green: 0.259, blue: 0.173, alpha: 1 }
  ],
  'minecraft:dark_prismarine': [
    { red: 0.192, green: 0.314, blue: 0.255, alpha: 1 },
    { red: 0.153, green: 0.243, blue: 0.212, alpha: 1 },
    { red: 0.247, green: 0.427, blue: 0.361, alpha: 1 }
  ],
  'minecraft:dark_prismarine_slab': [
    { red: 0.192, green: 0.314, blue: 0.255, alpha: 1 },
    { red: 0.153, green: 0.243, blue: 0.212, alpha: 1 },
    { red: 0.247, green: 0.427, blue: 0.361, alpha: 1 }
  ],
  'minecraft:dark_prismarine_stairs': [
    { red: 0.192, green: 0.314, blue: 0.255, alpha: 1 },
    { red: 0.153, green: 0.243, blue: 0.212, alpha: 1 },
    { red: 0.247, green: 0.427, blue: 0.361, alpha: 1 }
  ],
  'minecraft:daylight_detector': [
    { red: 0.235, green: 0.2, blue: 0.133, alpha: 1 },
    { red: 0.2, green: 0.169, blue: 0.106, alpha: 1 },
    { red: 0.337, green: 0.271, blue: 0.169, alpha: 1 }
  ],
  'minecraft:decorated_pot': [
    { red: 0.49, green: 0.275, blue: 0.224, alpha: 1 },
    { red: 0.514, green: 0.286, blue: 0.231, alpha: 1 },
    { red: 0.459, green: 0.259, blue: 0.212, alpha: 1 }
  ],
  'minecraft:deepslate': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 }
  ],
  'minecraft:deepslate_brick_slab': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 }
  ],
  'minecraft:deepslate_brick_stairs': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 }
  ],
  'minecraft:deepslate_brick_wall': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 }
  ],
  'minecraft:deepslate_bricks': [
    { red: 0.345, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.22, green: 0.216, blue: 0.216, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:deepslate_coal_ore': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 }
  ],
  'minecraft:deepslate_copper_ore': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 }
  ],
  'minecraft:deepslate_diamond_ore': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 }
  ],
  'minecraft:deepslate_emerald_ore': [
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 },
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 }
  ],
  'minecraft:deepslate_gold_ore': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.475, green: 0.475, blue: 0.475, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 }
  ],
  'minecraft:deepslate_iron_ore': [
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 },
    { red: 0.475, green: 0.475, blue: 0.475, alpha: 1 },
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 }
  ],
  'minecraft:deepslate_redstone_ore': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 }
  ],
  'minecraft:deepslate_tile_slab': [
    { red: 0.176, green: 0.176, blue: 0.176, alpha: 1 },
    { red: 0.22, green: 0.216, blue: 0.216, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:deepslate_tile_stairs': [
    { red: 0.176, green: 0.176, blue: 0.176, alpha: 1 },
    { red: 0.22, green: 0.216, blue: 0.216, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:deepslate_tile_wall': [
    { red: 0.176, green: 0.176, blue: 0.176, alpha: 1 },
    { red: 0.22, green: 0.216, blue: 0.216, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:deepslate_tiles': [
    { red: 0.176, green: 0.176, blue: 0.176, alpha: 1 },
    { red: 0.22, green: 0.216, blue: 0.216, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:deny': [
    { red: 0.416, green: 0.416, blue: 0.416, alpha: 1 },
    { red: 0.443, green: 0.443, blue: 0.443, alpha: 1 },
    { red: 0.478, green: 0.478, blue: 0.478, alpha: 1 }
  ],
  'minecraft:deprecated_purpur_block_2': [
    { red: 0.698, green: 0.525, blue: 0.698, alpha: 1 },
    { red: 0.675, green: 0.482, blue: 0.675, alpha: 1 },
    { red: 0.643, green: 0.447, blue: 0.639, alpha: 1 }
  ],
  'minecraft:detector_rail': [
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 },
    { red: 0.529, green: 0.427, blue: 0.271, alpha: 1 }
  ],
  'minecraft:diamond_block': [
    { red: 0.396, green: 0.961, blue: 0.89, alpha: 1 },
    { red: 0.294, green: 0.929, blue: 0.902, alpha: 1 },
    { red: 0.62, green: 0.996, blue: 0.922, alpha: 1 }
  ],
  'minecraft:diamond_ore': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 }
  ],
  'minecraft:diorite': [
    { red: 0.914, green: 0.914, blue: 0.914, alpha: 1 },
    { red: 0.643, green: 0.635, blue: 0.635, alpha: 1 },
    { red: 0.745, green: 0.749, blue: 0.757, alpha: 1 }
  ],
  'minecraft:diorite_slab': [
    { red: 0.914, green: 0.914, blue: 0.914, alpha: 1 },
    { red: 0.643, green: 0.635, blue: 0.635, alpha: 1 },
    { red: 0.745, green: 0.749, blue: 0.757, alpha: 1 }
  ],
  'minecraft:diorite_stairs': [
    { red: 0.914, green: 0.914, blue: 0.914, alpha: 1 },
    { red: 0.643, green: 0.635, blue: 0.635, alpha: 1 },
    { red: 0.745, green: 0.749, blue: 0.757, alpha: 1 }
  ],
  'minecraft:diorite_wall': [
    { red: 0.914, green: 0.914, blue: 0.914, alpha: 1 },
    { red: 0.643, green: 0.635, blue: 0.635, alpha: 1 },
    { red: 0.745, green: 0.749, blue: 0.757, alpha: 1 }
  ],
  'minecraft:dirt': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.725, green: 0.522, blue: 0.361, alpha: 1 }
  ],
  'minecraft:dispenser': [
    { red: 0.467, green: 0.467, blue: 0.467, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 },
    { red: 0.314, green: 0.306, blue: 0.306, alpha: 1 }
  ],
  'minecraft:dragon_egg': [
    { red: 0.031, green: 0.031, blue: 0.047, alpha: 1 },
    { red: 0.063, green: 0.063, blue: 0.063, alpha: 1 },
    { red: 0.176, green: 0.004, blue: 0.2, alpha: 1 }
  ],
  'minecraft:dragon_head': [
    { red: 0.031, green: 0.031, blue: 0.047, alpha: 1 },
    { red: 0.063, green: 0.063, blue: 0.063, alpha: 1 },
    { red: 0.176, green: 0.004, blue: 0.2, alpha: 1 }
  ],
  'minecraft:dried_kelp_block': [
    { red: 0.137, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.125, green: 0.165, blue: 0.086, alpha: 1 },
    { red: 0.075, green: 0.129, blue: 0.075, alpha: 1 }
  ],
  'minecraft:dripstone_block': [
    { red: 0.573, green: 0.475, blue: 0.396, alpha: 1 },
    { red: 0.514, green: 0.388, blue: 0.337, alpha: 1 },
    { red: 0.451, green: 0.329, blue: 0.314, alpha: 1 }
  ],
  'minecraft:dropper': [
    { red: 0.314, green: 0.306, blue: 0.306, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 },
    { red: 0.569, green: 0.569, blue: 0.569, alpha: 1 }
  ],
  'minecraft:emerald_block': [
    { red: 0.09, green: 0.773, blue: 0.267, alpha: 1 },
    { red: 0.102, green: 0.682, blue: 0.208, alpha: 1 },
    { red: 0.09, green: 0.867, blue: 0.384, alpha: 1 }
  ],
  'minecraft:emerald_ore': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 }
  ],
  'minecraft:enchanting_table': [
    { red: 0.063, green: 0.047, blue: 0.11, alpha: 1 },
    { red: 0.024, green: 0.012, blue: 0.043, alpha: 1 },
    { red: 0, green: 0, blue: 0.004, alpha: 1 }
  ],
  'minecraft:end_gateway': [
    { red: 0.071, green: 0.071, blue: 0.098, alpha: 1 },
    { red: 0.075, green: 0.075, blue: 0.075, alpha: 1 },
    { red: 0.008, green: 0.031, blue: 0.067, alpha: 1 }
  ],
  'minecraft:end_portal': [
    { red: 0.008, green: 0.031, blue: 0.067, alpha: 1 },
    { red: 0.031, green: 0.078, blue: 0.098, alpha: 1 },
    { red: 0.008, green: 0.016, blue: 0.027, alpha: 1 }
  ],
  'minecraft:end_portal_frame': [
    { red: 0.835, green: 0.855, blue: 0.58, alpha: 1 },
    { red: 0.075, green: 0.18, blue: 0.216, alpha: 1 },
    { red: 0.871, green: 0.902, blue: 0.643, alpha: 1 }
  ],
  'minecraft:end_rod': [
    { red: 0.541, green: 0.514, blue: 0.49, alpha: 1 },
    { red: 0.965, green: 0.886, blue: 0.804, alpha: 1 },
    { red: 1, green: 0.965, blue: 0.902, alpha: 1 }
  ],
  'minecraft:end_stone': [
    { red: 0.835, green: 0.855, blue: 0.58, alpha: 1 },
    { red: 0.933, green: 0.965, blue: 0.706, alpha: 1 },
    { red: 0.871, green: 0.902, blue: 0.643, alpha: 1 }
  ],
  'minecraft:end_stone_brick_slab': [
    { red: 0.91, green: 0.957, blue: 0.698, alpha: 1 },
    { red: 0.867, green: 0.894, blue: 0.647, alpha: 1 },
    { red: 0.839, green: 0.839, blue: 0.584, alpha: 1 }
  ],
  'minecraft:end_stone_brick_wall': [
    { red: 0.91, green: 0.957, blue: 0.698, alpha: 1 },
    { red: 0.867, green: 0.894, blue: 0.647, alpha: 1 },
    { red: 0.839, green: 0.839, blue: 0.584, alpha: 1 }
  ],
  'minecraft:ender_chest': [
    { red: 0.039, green: 0.098, blue: 0.125, alpha: 1 },
    { red: 0.008, green: 0.055, blue: 0.078, alpha: 1 },
    { red: 0.004, green: 0.047, blue: 0.067, alpha: 1 }
  ],
  'minecraft:farmland': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.725, green: 0.522, blue: 0.361, alpha: 1 }
  ],
  'minecraft:fence_gate': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:fern': [
    { red: 0.263, green: 0.4, blue: 0.141, alpha: 1 },
    { red: 0.216, green: 0.329, blue: 0.118, alpha: 1 },
    { red: 0.314, green: 0.475, blue: 0.169, alpha: 1 }
  ],
  'minecraft:fire': [
    { red: 1, green: 1, blue: 1, alpha: 1 },
    { red: 0.733, green: 0.318, blue: 0, alpha: 1 },
    { red: 0.71, green: 0.275, blue: 0, alpha: 1 }
  ],
  'minecraft:firefly_bush': [
    { red: 0.271, green: 0.286, blue: 0.149, alpha: 1 },
    { red: 0.212, green: 0.231, blue: 0.118, alpha: 1 },
    { red: 0.459, green: 0.424, blue: 0.255, alpha: 1 }
  ],
  'minecraft:fletching_table': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.894, green: 0.804, blue: 0.557, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 }
  ],
  'minecraft:flower_pot': [
    { red: 0.537, green: 0.298, blue: 0.231, alpha: 1 },
    { red: 0.514, green: 0.286, blue: 0.224, alpha: 1 },
    { red: 0.475, green: 0.263, blue: 0.204, alpha: 1 }
  ],
  'minecraft:flowering_azalea': [
    { red: 0.314, green: 0.412, blue: 0.173, alpha: 1 },
    { red: 0.439, green: 0.573, blue: 0.176, alpha: 1 },
    { red: 0.392, green: 0.447, blue: 0.2, alpha: 1 }
  ],
  'minecraft:flowing_water': [
    { red: 0.447, green: 0.525, blue: 1, alpha: 1 },
    { red: 0.439, green: 0.514, blue: 1, alpha: 1 },
    { red: 0.443, green: 0.518, blue: 1, alpha: 1 }
  ],
  'minecraft:frosted_ice': [
    { red: 0.502, green: 0.678, blue: 0.984, alpha: 1 },
    { red: 0.573, green: 0.725, blue: 0.996, alpha: 1 },
    { red: 0.631, green: 0.765, blue: 1, alpha: 1 }
  ],
  'minecraft:furnace': [
    { red: 0.314, green: 0.306, blue: 0.306, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 },
    { red: 0.522, green: 0.522, blue: 0.522, alpha: 1 }
  ],
  'minecraft:gilded_blackstone': [
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.125, green: 0.075, blue: 0.11, alpha: 1 }
  ],
  'minecraft:glass': [
    { red: 0.816, green: 0.918, blue: 0.914, alpha: 1 },
    { red: 0.545, green: 0.757, blue: 0.804, alpha: 1 },
    { red: 0.659, green: 0.816, blue: 0.851, alpha: 1 }
  ],
  'minecraft:glass_pane': [
    { red: 0.816, green: 0.918, blue: 0.914, alpha: 1 },
    { red: 0.545, green: 0.757, blue: 0.804, alpha: 1 },
    { red: 0.659, green: 0.816, blue: 0.851, alpha: 1 }
  ],
  'minecraft:glow_lichen': [
    { red: 0.431, green: 0.494, blue: 0.471, alpha: 1 },
    { red: 0.443, green: 0.525, blue: 0.494, alpha: 1 },
    { red: 0.388, green: 0.459, blue: 0.431, alpha: 1 }
  ],
  'minecraft:glowstone': [
    { red: 0.435, green: 0.271, blue: 0.133, alpha: 1 },
    { red: 0.8, green: 0.525, blue: 0.329, alpha: 1 },
    { red: 0.984, green: 0.855, blue: 0.455, alpha: 1 }
  ],
  'minecraft:gold_block': [
    { red: 1, green: 0.847, blue: 0.243, alpha: 1 },
    { red: 0.961, green: 0.8, blue: 0.153, alpha: 1 },
    { red: 1, green: 0.925, blue: 0.31, alpha: 1 }
  ],
  'minecraft:gold_ore': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:granite': [
    { red: 0.624, green: 0.42, blue: 0.345, alpha: 1 },
    { red: 0.498, green: 0.337, blue: 0.275, alpha: 1 },
    { red: 0.663, green: 0.467, blue: 0.392, alpha: 1 }
  ],
  'minecraft:granite_slab': [
    { red: 0.624, green: 0.42, blue: 0.345, alpha: 1 },
    { red: 0.498, green: 0.337, blue: 0.275, alpha: 1 },
    { red: 0.663, green: 0.467, blue: 0.392, alpha: 1 }
  ],
  'minecraft:granite_stairs': [
    { red: 0.624, green: 0.42, blue: 0.345, alpha: 1 },
    { red: 0.498, green: 0.337, blue: 0.275, alpha: 1 },
    { red: 0.663, green: 0.467, blue: 0.392, alpha: 1 }
  ],
  'minecraft:granite_wall': [
    { red: 0.624, green: 0.42, blue: 0.345, alpha: 1 },
    { red: 0.498, green: 0.337, blue: 0.275, alpha: 1 },
    { red: 0.663, green: 0.467, blue: 0.392, alpha: 1 }
  ],
  'minecraft:grass_block': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.725, green: 0.522, blue: 0.361, alpha: 1 }
  ],
  'minecraft:gravel': [
    { red: 0.506, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.537, green: 0.506, blue: 0.494, alpha: 1 },
    { red: 0.447, green: 0.42, blue: 0.412, alpha: 1 }
  ],
  'minecraft:grindstone': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:hanging_roots': [
    { red: 0.678, green: 0.49, blue: 0.396, alpha: 1 },
    { red: 0.565, green: 0.341, blue: 0.251, alpha: 1 },
    { red: 0.733, green: 0.592, blue: 0.537, alpha: 1 }
  ],
  'minecraft:hardened_clay': [
    { red: 0.588, green: 0.365, blue: 0.263, alpha: 1 },
    { red: 0.596, green: 0.373, blue: 0.271, alpha: 1 },
    { red: 0.608, green: 0.376, blue: 0.271, alpha: 1 }
  ],
  'minecraft:hay_block': [
    { red: 0.671, green: 0.573, blue: 0.145, alpha: 1 },
    { red: 0.58, green: 0.502, blue: 0.118, alpha: 1 },
    { red: 0.541, green: 0.451, blue: 0.125, alpha: 1 }
  ],
  'minecraft:heavy_core': [
    { red: 0.239, green: 0.247, blue: 0.263, alpha: 1 },
    { red: 0.369, green: 0.396, blue: 0.435, alpha: 1 },
    { red: 0.306, green: 0.322, blue: 0.349, alpha: 1 }
  ],
  'minecraft:heavy_weighted_pressure_plate': [
    { red: 0.902, green: 0.902, blue: 0.902, alpha: 1 },
    { red: 0.863, green: 0.863, blue: 0.863, alpha: 1 },
    { red: 0.757, green: 0.757, blue: 0.757, alpha: 1 }
  ],
  'minecraft:honey_block': [
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:honeycomb_block': [
    { red: 0.91, green: 0.549, blue: 0.031, alpha: 1 },
    { red: 0.784, green: 0.416, blue: 0.031, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 }
  ],
  'minecraft:hopper': [
    { red: 0.247, green: 0.243, blue: 0.259, alpha: 1 },
    { red: 0.204, green: 0.204, blue: 0.22, alpha: 1 },
    { red: 0.286, green: 0.282, blue: 0.282, alpha: 1 }
  ],
  'minecraft:ice': [
    { red: 0.573, green: 0.725, blue: 0.996, alpha: 1 },
    { red: 0.549, green: 0.702, blue: 0.996, alpha: 1 },
    { red: 0.525, green: 0.682, blue: 0.992, alpha: 1 }
  ],
  'minecraft:infested_chiseled_stone_bricks': [
    { red: 0.353, green: 0.349, blue: 0.353, alpha: 1 },
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.612, green: 0.6, blue: 0.612, alpha: 1 }
  ],
  'minecraft:infested_cobblestone': [
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.38, green: 0.38, blue: 0.38, alpha: 1 },
    { red: 0.431, green: 0.427, blue: 0.427, alpha: 1 }
  ],
  'minecraft:infested_cracked_stone_bricks': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.388, green: 0.388, blue: 0.388, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 }
  ],
  'minecraft:infested_deepslate': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 }
  ],
  'minecraft:infested_mossy_stone_bricks': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 }
  ],
  'minecraft:infested_stone': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:infested_stone_bricks': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 }
  ],
  'minecraft:invisible_bedrock': [
    { red: 0.51, green: 0.039, blue: 0.035, alpha: 1 },
    { red: 0.549, green: 0.082, blue: 0.082, alpha: 1 },
    { red: 0.549, green: 0.082, blue: 0.086, alpha: 1 }
  ],
  'minecraft:iron_bars': [
    { red: 0.447, green: 0.475, blue: 0.431, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 },
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 }
  ],
  'minecraft:iron_block': [
    { red: 0.902, green: 0.902, blue: 0.902, alpha: 1 },
    { red: 0.863, green: 0.863, blue: 0.863, alpha: 1 },
    { red: 0.757, green: 0.757, blue: 0.757, alpha: 1 }
  ],
  'minecraft:iron_door': [
    { red: 0.804, green: 0.792, blue: 0.792, alpha: 1 },
    { red: 0.694, green: 0.694, blue: 0.694, alpha: 1 },
    { red: 0.824, green: 0.824, blue: 0.824, alpha: 1 }
  ],
  'minecraft:iron_ore': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 }
  ],
  'minecraft:iron_trapdoor': [
    { red: 0.82, green: 0.812, blue: 0.812, alpha: 1 },
    { red: 0.757, green: 0.757, blue: 0.757, alpha: 1 },
    { red: 0.839, green: 0.839, blue: 0.839, alpha: 1 }
  ],
  'minecraft:jukebox': [
    { red: 0.161, green: 0.157, blue: 0.125, alpha: 1 },
    { red: 0.255, green: 0.157, blue: 0.094, alpha: 1 },
    { red: 0.58, green: 0.365, blue: 0.255, alpha: 1 }
  ],
  'minecraft:jungle_door': [
    { red: 0.725, green: 0.525, blue: 0.38, alpha: 1 },
    { red: 0.471, green: 0.329, blue: 0.216, alpha: 1 },
    { red: 0.682, green: 0.494, blue: 0.353, alpha: 1 }
  ],
  'minecraft:kelp': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.349, green: 0.239, blue: 0.161, alpha: 1 }
  ],
  'minecraft:lab_table': undefined,
  'minecraft:ladder': [
    { red: 0.404, green: 0.314, blue: 0.173, alpha: 1 },
    { red: 0.71, green: 0.553, blue: 0.314, alpha: 1 },
    { red: 0.318, green: 0.239, blue: 0.141, alpha: 1 }
  ],
  'minecraft:lantern': [
    { red: 0.243, green: 0.267, blue: 0.325, alpha: 1 },
    { red: 0.286, green: 0.314, blue: 0.396, alpha: 1 },
    { red: 0.259, green: 0.29, blue: 0.369, alpha: 1 }
  ],
  'minecraft:lapis_block': [
    { red: 0.118, green: 0.259, blue: 0.522, alpha: 1 },
    { red: 0.125, green: 0.29, blue: 0.541, alpha: 1 },
    { red: 0.11, green: 0.22, blue: 0.565, alpha: 1 }
  ],
  'minecraft:lapis_ore': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 }
  ],
  'minecraft:large_amethyst_bud': [
    { red: 0.553, green: 0.416, blue: 0.8, alpha: 1 },
    { red: 0.392, green: 0.278, blue: 0.62, alpha: 1 },
    { red: 0.812, green: 0.627, blue: 0.953, alpha: 1 }
  ],
  'minecraft:large_fern': [
    { red: 0.263, green: 0.4, blue: 0.141, alpha: 1 },
    { red: 0.216, green: 0.329, blue: 0.118, alpha: 1 },
    { red: 0.314, green: 0.475, blue: 0.169, alpha: 1 }
  ],
  'minecraft:lava': [
    { red: 0.784, green: 0.224, blue: 0.024, alpha: 1 },
    { red: 0.988, green: 0.988, blue: 0.498, alpha: 1 },
    { red: 0.886, green: 0.596, blue: 0.18, alpha: 1 }
  ],
  'minecraft:leaf_litter': [
    { red: 0.655, green: 0.655, blue: 0.655, alpha: 1 },
    { red: 0.604, green: 0.604, blue: 0.604, alpha: 1 },
    { red: 0.49, green: 0.49, blue: 0.49, alpha: 1 }
  ],
  'minecraft:lectern': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.71, green: 0.553, blue: 0.314, alpha: 1 },
    { red: 0.651, green: 0.51, blue: 0.302, alpha: 1 }
  ],
  'minecraft:lever': [
    { red: 0.584, green: 0.459, blue: 0.275, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 }
  ],
  'minecraft:light_weighted_pressure_plate': [
    { red: 1, green: 0.847, blue: 0.243, alpha: 1 },
    { red: 0.961, green: 0.8, blue: 0.153, alpha: 1 },
    { red: 1, green: 0.925, blue: 0.31, alpha: 1 }
  ],
  'minecraft:lightning_rod': [
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 },
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 }
  ],
  'minecraft:lilac': [
    { red: 0.102, green: 0.22, blue: 0.122, alpha: 1 },
    { red: 0.125, green: 0.275, blue: 0.149, alpha: 1 },
    { red: 0.149, green: 0.353, blue: 0.145, alpha: 1 }
  ],
  'minecraft:lily_of_the_valley': [
    { red: 0.216, green: 0.498, blue: 0.075, alpha: 1 },
    { red: 0.314, green: 0.573, blue: 0.184, alpha: 1 },
    { red: 0.392, green: 0.694, blue: 0.196, alpha: 1 }
  ],
  'minecraft:lodestone': [
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.635, green: 0.643, blue: 0.675, alpha: 1 }
  ],
  'minecraft:loom': [
    { red: 0.518, green: 0.31, blue: 0.259, alpha: 1 },
    { red: 0.435, green: 0.259, blue: 0.216, alpha: 1 },
    { red: 0.737, green: 0.576, blue: 0.353, alpha: 1 }
  ],
  'minecraft:mangrove_door': [
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 },
    { red: 0.365, green: 0.11, blue: 0.118, alpha: 1 },
    { red: 0.392, green: 0.141, blue: 0.137, alpha: 1 }
  ],
  'minecraft:mangrove_propagule': [
    { red: 0.329, green: 0.698, blue: 0.341, alpha: 1 },
    { red: 0.31, green: 0.765, blue: 0.325, alpha: 1 },
    { red: 0.451, green: 0.776, blue: 0.463, alpha: 1 }
  ],
  'minecraft:mangrove_roots': [
    { red: 0.353, green: 0.282, blue: 0.173, alpha: 1 },
    { red: 0.306, green: 0.247, blue: 0.153, alpha: 1 },
    { red: 0.267, green: 0.208, blue: 0.133, alpha: 1 }
  ],
  'minecraft:material_reducer': undefined,
  'minecraft:medium_amethyst_bud': [
    { red: 0.812, green: 0.627, blue: 0.953, alpha: 1 },
    { red: 0.392, green: 0.278, blue: 0.62, alpha: 1 },
    { red: 0.478, green: 0.357, blue: 0.71, alpha: 1 }
  ],
  'minecraft:melon_block': [
    { red: 0.655, green: 0.675, blue: 0.114, alpha: 1 },
    { red: 0.435, green: 0.576, blue: 0.137, alpha: 1 },
    { red: 0.322, green: 0.506, blue: 0.11, alpha: 1 }
  ],
  'minecraft:melon_stem': [
    { red: 0.545, green: 0.553, blue: 0.545, alpha: 1 },
    { red: 0.384, green: 0.38, blue: 0.384, alpha: 1 },
    { red: 0.773, green: 0.776, blue: 0.773, alpha: 1 }
  ],
  'minecraft:mob_spawner': [
    { red: 0.094, green: 0.173, blue: 0.224, alpha: 1 },
    { red: 0.118, green: 0.094, blue: 0.153, alpha: 1 },
    { red: 0.165, green: 0.141, blue: 0.208, alpha: 1 }
  ],
  'minecraft:moss_block': [
    { red: 0.392, green: 0.447, blue: 0.2, alpha: 1 },
    { red: 0.286, green: 0.369, blue: 0.153, alpha: 1 },
    { red: 0.314, green: 0.412, blue: 0.173, alpha: 1 }
  ],
  'minecraft:moss_carpet': [
    { red: 0.392, green: 0.447, blue: 0.2, alpha: 1 },
    { red: 0.286, green: 0.369, blue: 0.153, alpha: 1 },
    { red: 0.314, green: 0.412, blue: 0.173, alpha: 1 }
  ],
  'minecraft:mossy_cobblestone': [
    { red: 0.322, green: 0.365, blue: 0.224, alpha: 1 },
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.384, green: 0.475, blue: 0.255, alpha: 1 }
  ],
  'minecraft:mossy_cobblestone_slab': [
    { red: 0.322, green: 0.365, blue: 0.224, alpha: 1 },
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.384, green: 0.475, blue: 0.255, alpha: 1 }
  ],
  'minecraft:mossy_cobblestone_stairs': [
    { red: 0.322, green: 0.365, blue: 0.224, alpha: 1 },
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.384, green: 0.475, blue: 0.255, alpha: 1 }
  ],
  'minecraft:mossy_cobblestone_wall': [
    { red: 0.322, green: 0.365, blue: 0.224, alpha: 1 },
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.384, green: 0.475, blue: 0.255, alpha: 1 }
  ],
  'minecraft:mossy_stone_brick_slab': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 }
  ],
  'minecraft:mossy_stone_brick_stairs': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 }
  ],
  'minecraft:mossy_stone_brick_wall': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 }
  ],
  'minecraft:mossy_stone_bricks': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 }
  ],
  'minecraft:mud': [
    { red: 0.2, green: 0.196, blue: 0.227, alpha: 1 },
    { red: 0.227, green: 0.22, blue: 0.239, alpha: 1 },
    { red: 0.275, green: 0.251, blue: 0.243, alpha: 1 }
  ],
  'minecraft:mud_brick_slab': [
    { red: 0.584, green: 0.443, blue: 0.314, alpha: 1 },
    { red: 0.494, green: 0.365, blue: 0.282, alpha: 1 },
    { red: 0.616, green: 0.471, blue: 0.361, alpha: 1 }
  ],
  'minecraft:mud_brick_stairs': [
    { red: 0.584, green: 0.443, blue: 0.314, alpha: 1 },
    { red: 0.494, green: 0.365, blue: 0.282, alpha: 1 },
    { red: 0.616, green: 0.471, blue: 0.361, alpha: 1 }
  ],
  'minecraft:mud_brick_wall': [
    { red: 0.584, green: 0.443, blue: 0.314, alpha: 1 },
    { red: 0.494, green: 0.365, blue: 0.282, alpha: 1 },
    { red: 0.616, green: 0.471, blue: 0.361, alpha: 1 }
  ],
  'minecraft:mud_bricks': [
    { red: 0.584, green: 0.443, blue: 0.314, alpha: 1 },
    { red: 0.494, green: 0.365, blue: 0.282, alpha: 1 },
    { red: 0.616, green: 0.471, blue: 0.361, alpha: 1 }
  ],
  'minecraft:muddy_mangrove_roots': [
    { red: 0.353, green: 0.282, blue: 0.173, alpha: 1 },
    { red: 0.306, green: 0.247, blue: 0.153, alpha: 1 },
    { red: 0.267, green: 0.208, blue: 0.133, alpha: 1 }
  ],
  'minecraft:mycelium': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.416, green: 0.365, blue: 0.384, alpha: 1 }
  ],
  'minecraft:nether_brick_fence': [
    { red: 0.188, green: 0.094, blue: 0.11, alpha: 1 },
    { red: 0.098, green: 0.051, blue: 0.063, alpha: 1 },
    { red: 0.129, green: 0.067, blue: 0.078, alpha: 1 }
  ],
  'minecraft:nether_brick_slab': [
    { red: 0.188, green: 0.094, blue: 0.11, alpha: 1 },
    { red: 0.098, green: 0.051, blue: 0.063, alpha: 1 },
    { red: 0.129, green: 0.067, blue: 0.078, alpha: 1 }
  ],
  'minecraft:nether_brick_stairs': [
    { red: 0.188, green: 0.094, blue: 0.11, alpha: 1 },
    { red: 0.098, green: 0.051, blue: 0.063, alpha: 1 },
    { red: 0.129, green: 0.067, blue: 0.078, alpha: 1 }
  ],
  'minecraft:nether_brick_wall': [
    { red: 0.188, green: 0.094, blue: 0.11, alpha: 1 },
    { red: 0.098, green: 0.051, blue: 0.063, alpha: 1 },
    { red: 0.129, green: 0.067, blue: 0.078, alpha: 1 }
  ],
  'minecraft:nether_gold_ore': [
    { red: 0.396, green: 0.157, blue: 0.157, alpha: 1 },
    { red: 0.447, green: 0.196, blue: 0.196, alpha: 1 },
    { red: 0.314, green: 0.106, blue: 0.106, alpha: 1 }
  ],
  'minecraft:nether_sprouts': [
    { red: 0.067, green: 0.608, blue: 0.522, alpha: 1 },
    { red: 0.086, green: 0.494, blue: 0.525, alpha: 1 },
    { red: 0.078, green: 0.706, blue: 0.522, alpha: 1 }
  ],
  'minecraft:nether_wart': [
    { red: 0.514, green: 0.11, blue: 0.125, alpha: 1 },
    { red: 0.282, green: 0, blue: 0, alpha: 1 },
    { red: 0.643, green: 0.141, blue: 0.161, alpha: 1 }
  ],
  'minecraft:nether_wart_block': [
    { red: 0.482, green: 0, blue: 0, alpha: 1 },
    { red: 0.353, green: 0, blue: 0, alpha: 1 },
    { red: 0.416, green: 0.016, blue: 0, alpha: 1 }
  ],
  'minecraft:netherite_block': [
    { red: 0.302, green: 0.286, blue: 0.302, alpha: 1 },
    { red: 0.282, green: 0.271, blue: 0.282, alpha: 1 },
    { red: 0.235, green: 0.196, blue: 0.196, alpha: 1 }
  ],
  'minecraft:netherrack': [
    { red: 0.396, green: 0.157, blue: 0.157, alpha: 1 },
    { red: 0.447, green: 0.196, blue: 0.196, alpha: 1 },
    { red: 0.314, green: 0.106, blue: 0.106, alpha: 1 }
  ],
  'minecraft:observer': [
    { red: 0.275, green: 0.259, blue: 0.259, alpha: 1 },
    { red: 0.231, green: 0.231, blue: 0.231, alpha: 1 },
    { red: 0.239, green: 0.235, blue: 0.235, alpha: 1 }
  ],
  'minecraft:obsidian': [
    { red: 0.024, green: 0.012, blue: 0.043, alpha: 1 },
    { red: 0.063, green: 0.047, blue: 0.11, alpha: 1 },
    { red: 0, green: 0, blue: 0.004, alpha: 1 }
  ],
  'minecraft:ochre_froglight': [
    { red: 0.988, green: 0.98, blue: 0.804, alpha: 1 },
    { red: 0.996, green: 1, blue: 0.925, alpha: 1 },
    { red: 0.98, green: 0.937, blue: 0.698, alpha: 1 }
  ],
  'minecraft:open_eyeblossom': [
    { red: 0.357, green: 0.322, blue: 0.318, alpha: 1 },
    { red: 0.627, green: 0.584, blue: 0.604, alpha: 1 },
    { red: 0.506, green: 0.447, blue: 0.475, alpha: 1 }
  ],
  'minecraft:orange_tulip': [
    { red: 0.09, green: 0.486, blue: 0.016, alpha: 1 },
    { red: 0.333, green: 0.671, blue: 0.176, alpha: 1 },
    { red: 0.29, green: 0.561, blue: 0.157, alpha: 1 }
  ],
  'minecraft:oxeye_daisy': [
    { red: 0.969, green: 0.969, blue: 0.969, alpha: 1 },
    { red: 0.839, green: 0.91, blue: 0.91, alpha: 1 },
    { red: 0.09, green: 0.486, blue: 0.016, alpha: 1 }
  ],
  'minecraft:packed_ice': [
    { red: 0.573, green: 0.725, blue: 0.996, alpha: 1 },
    { red: 0.522, green: 0.678, blue: 0.973, alpha: 1 },
    { red: 0.486, green: 0.647, blue: 0.957, alpha: 1 }
  ],
  'minecraft:packed_mud': [
    { red: 0.537, green: 0.396, blue: 0.302, alpha: 1 },
    { red: 0.584, green: 0.443, blue: 0.314, alpha: 1 },
    { red: 0.608, green: 0.467, blue: 0.357, alpha: 1 }
  ],
  'minecraft:pale_hanging_moss': [
    { red: 0.318, green: 0.333, blue: 0.318, alpha: 1 },
    { red: 0.427, green: 0.447, blue: 0.42, alpha: 1 },
    { red: 0.478, green: 0.502, blue: 0.467, alpha: 1 }
  ],
  'minecraft:pale_moss_block': [
    { red: 0.349, green: 0.369, blue: 0.345, alpha: 1 },
    { red: 0.427, green: 0.447, blue: 0.42, alpha: 1 },
    { red: 0.478, green: 0.502, blue: 0.467, alpha: 1 }
  ],
  'minecraft:pale_moss_carpet': [
    { red: 0.427, green: 0.447, blue: 0.42, alpha: 1 },
    { red: 0.318, green: 0.333, blue: 0.318, alpha: 1 },
    { red: 0.478, green: 0.502, blue: 0.467, alpha: 1 }
  ],
  'minecraft:pearlescent_froglight': [
    { red: 0.976, green: 0.957, blue: 0.953, alpha: 1 },
    { red: 1, green: 0.996, blue: 0.992, alpha: 1 },
    { red: 0.937, green: 0.902, blue: 0.882, alpha: 1 }
  ],
  'minecraft:peony': [
    { red: 0.102, green: 0.22, blue: 0.122, alpha: 1 },
    { red: 0.125, green: 0.275, blue: 0.149, alpha: 1 },
    { red: 0.149, green: 0.353, blue: 0.145, alpha: 1 }
  ],
  'minecraft:petrified_oak_slab': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:piglin_head': [
    { red: 0.404, green: 0.212, blue: 0.133, alpha: 1 },
    { red: 0.62, green: 0.361, blue: 0.251, alpha: 1 },
    { red: 0.451, green: 0.239, blue: 0.153, alpha: 1 }
  ],
  'minecraft:pink_petals': [
    { red: 0.988, green: 0.796, blue: 0.906, alpha: 1 },
    { red: 0.961, green: 0.855, blue: 0.937, alpha: 1 },
    { red: 0.969, green: 0.725, blue: 0.863, alpha: 1 }
  ],
  'minecraft:pink_tulip': [
    { red: 0.09, green: 0.486, blue: 0.016, alpha: 1 },
    { red: 0.333, green: 0.671, blue: 0.176, alpha: 1 },
    { red: 0.29, green: 0.561, blue: 0.157, alpha: 1 }
  ],
  'minecraft:piston': [
    { red: 0.325, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 },
    { red: 0.267, green: 0.267, blue: 0.267, alpha: 1 }
  ],
  'minecraft:pitcher_plant': [
    { red: 0.467, green: 0.271, blue: 0.176, alpha: 1 },
    { red: 0.376, green: 0.22, blue: 0.137, alpha: 1 },
    { red: 0.286, green: 0.165, blue: 0.094, alpha: 1 }
  ],
  'minecraft:player_head': [
    { red: 0.024, green: 0.714, blue: 0.71, alpha: 1 },
    { red: 0.122, green: 0.561, blue: 0.541, alpha: 1 },
    { red: 0.247, green: 0.224, blue: 0.592, alpha: 1 }
  ],
  'minecraft:podzol': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.725, green: 0.522, blue: 0.361, alpha: 1 }
  ],
  'minecraft:pointed_dripstone': [
    { red: 0.573, green: 0.475, blue: 0.396, alpha: 1 },
    { red: 0.514, green: 0.388, blue: 0.337, alpha: 1 },
    { red: 0.451, green: 0.329, blue: 0.314, alpha: 1 }
  ],
  'minecraft:polished_andesite': [
    { red: 0.525, green: 0.533, blue: 0.529, alpha: 1 },
    { red: 0.486, green: 0.498, blue: 0.502, alpha: 1 },
    { red: 0.541, green: 0.565, blue: 0.565, alpha: 1 }
  ],
  'minecraft:polished_andesite_slab': [
    { red: 0.525, green: 0.533, blue: 0.529, alpha: 1 },
    { red: 0.486, green: 0.498, blue: 0.502, alpha: 1 },
    { red: 0.541, green: 0.565, blue: 0.565, alpha: 1 }
  ],
  'minecraft:polished_andesite_stairs': [
    { red: 0.525, green: 0.533, blue: 0.529, alpha: 1 },
    { red: 0.486, green: 0.498, blue: 0.502, alpha: 1 },
    { red: 0.541, green: 0.565, blue: 0.565, alpha: 1 }
  ],
  'minecraft:polished_basalt': [
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.361, green: 0.361, blue: 0.361, alpha: 1 },
    { red: 0.31, green: 0.294, blue: 0.31, alpha: 1 }
  ],
  'minecraft:polished_blackstone': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_brick_slab': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_brick_stairs': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_brick_wall': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_bricks': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_button': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_pressure_plate': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_slab': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_stairs': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_wall': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_deepslate': [
    { red: 0.345, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.294, green: 0.298, blue: 0.31, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:polished_deepslate_slab': [
    { red: 0.345, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.294, green: 0.298, blue: 0.31, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:polished_deepslate_stairs': [
    { red: 0.345, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.294, green: 0.298, blue: 0.31, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:polished_deepslate_wall': [
    { red: 0.345, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.294, green: 0.298, blue: 0.31, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:polished_diorite': [
    { red: 0.784, green: 0.788, blue: 0.784, alpha: 1 },
    { red: 0.851, green: 0.847, blue: 0.851, alpha: 1 },
    { red: 0.729, green: 0.733, blue: 0.753, alpha: 1 }
  ],
  'minecraft:polished_diorite_slab': [
    { red: 0.784, green: 0.788, blue: 0.784, alpha: 1 },
    { red: 0.851, green: 0.847, blue: 0.851, alpha: 1 },
    { red: 0.729, green: 0.733, blue: 0.753, alpha: 1 }
  ],
  'minecraft:polished_diorite_stairs': [
    { red: 0.784, green: 0.788, blue: 0.784, alpha: 1 },
    { red: 0.851, green: 0.847, blue: 0.851, alpha: 1 },
    { red: 0.729, green: 0.733, blue: 0.753, alpha: 1 }
  ],
  'minecraft:polished_granite': [
    { red: 0.624, green: 0.42, blue: 0.345, alpha: 1 },
    { red: 0.573, green: 0.384, blue: 0.318, alpha: 1 },
    { red: 0.663, green: 0.467, blue: 0.392, alpha: 1 }
  ],
  'minecraft:polished_granite_slab': [
    { red: 0.624, green: 0.42, blue: 0.345, alpha: 1 },
    { red: 0.573, green: 0.384, blue: 0.318, alpha: 1 },
    { red: 0.663, green: 0.467, blue: 0.392, alpha: 1 }
  ],
  'minecraft:polished_granite_stairs': [
    { red: 0.624, green: 0.42, blue: 0.345, alpha: 1 },
    { red: 0.573, green: 0.384, blue: 0.318, alpha: 1 },
    { red: 0.663, green: 0.467, blue: 0.392, alpha: 1 }
  ],
  'minecraft:polished_tuff': [
    { red: 0.388, green: 0.424, blue: 0.427, alpha: 1 },
    { red: 0.357, green: 0.384, blue: 0.369, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 }
  ],
  'minecraft:polished_tuff_slab': [
    { red: 0.388, green: 0.424, blue: 0.427, alpha: 1 },
    { red: 0.357, green: 0.384, blue: 0.369, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 }
  ],
  'minecraft:polished_tuff_stairs': [
    { red: 0.388, green: 0.424, blue: 0.427, alpha: 1 },
    { red: 0.357, green: 0.384, blue: 0.369, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 }
  ],
  'minecraft:polished_tuff_wall': [
    { red: 0.388, green: 0.424, blue: 0.427, alpha: 1 },
    { red: 0.357, green: 0.384, blue: 0.369, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 }
  ],
  'minecraft:poppy': [
    { red: 0.929, green: 0.188, blue: 0.173, alpha: 1 },
    { red: 0.125, green: 0.275, blue: 0.149, alpha: 1 },
    { red: 0.749, green: 0.145, blue: 0.161, alpha: 1 }
  ],
  'minecraft:portal': [
    { red: 0.231, green: 0, blue: 0.663, alpha: 1 },
    { red: 0.306, green: 0.012, blue: 0.741, alpha: 1 },
    { red: 0.224, green: 0, blue: 0.647, alpha: 1 }
  ],
  'minecraft:potatoes': [
    { red: 0.149, green: 0.388, blue: 0.145, alpha: 1 },
    { red: 0.333, green: 0.671, blue: 0.176, alpha: 1 },
    { red: 0.29, green: 0.561, blue: 0.157, alpha: 1 }
  ],
  'minecraft:powder_snow': [
    { red: 1, green: 1, blue: 1, alpha: 1 },
    { red: 0.957, green: 0.988, blue: 0.988, alpha: 1 },
    { red: 0.925, green: 0.984, blue: 0.984, alpha: 1 }
  ],
  'minecraft:prismarine': [
    { red: 0.369, green: 0.643, blue: 0.557, alpha: 1 },
    { red: 0.608, green: 0.796, blue: 0.749, alpha: 1 },
    { red: 0.369, green: 0.522, blue: 0.643, alpha: 1 }
  ],
  'minecraft:prismarine_brick_slab': [
    { red: 0.431, green: 0.725, blue: 0.682, alpha: 1 },
    { red: 0.353, green: 0.686, blue: 0.643, alpha: 1 },
    { red: 0.38, green: 0.647, blue: 0.604, alpha: 1 }
  ],
  'minecraft:prismarine_bricks': [
    { red: 0.431, green: 0.725, blue: 0.682, alpha: 1 },
    { red: 0.353, green: 0.686, blue: 0.643, alpha: 1 },
    { red: 0.38, green: 0.647, blue: 0.604, alpha: 1 }
  ],
  'minecraft:prismarine_slab': [
    { red: 0.369, green: 0.643, blue: 0.557, alpha: 1 },
    { red: 0.608, green: 0.796, blue: 0.749, alpha: 1 },
    { red: 0.369, green: 0.522, blue: 0.643, alpha: 1 }
  ],
  'minecraft:prismarine_stairs': [
    { red: 0.369, green: 0.643, blue: 0.557, alpha: 1 },
    { red: 0.608, green: 0.796, blue: 0.749, alpha: 1 },
    { red: 0.369, green: 0.522, blue: 0.643, alpha: 1 }
  ],
  'minecraft:prismarine_wall': [
    { red: 0.369, green: 0.643, blue: 0.557, alpha: 1 },
    { red: 0.608, green: 0.796, blue: 0.749, alpha: 1 },
    { red: 0.369, green: 0.522, blue: 0.643, alpha: 1 }
  ],
  'minecraft:pumpkin': [
    { red: 0.89, green: 0.541, blue: 0.114, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.043, alpha: 1 },
    { red: 0.769, green: 0.435, blue: 0.078, alpha: 1 }
  ],
  'minecraft:pumpkin_stem': [
    { red: 0.89, green: 0.541, blue: 0.114, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.043, alpha: 1 },
    { red: 0.769, green: 0.435, blue: 0.078, alpha: 1 }
  ],
  'minecraft:purpur_block': [
    { red: 0.698, green: 0.525, blue: 0.698, alpha: 1 },
    { red: 0.675, green: 0.482, blue: 0.675, alpha: 1 },
    { red: 0.643, green: 0.447, blue: 0.639, alpha: 1 }
  ],
  'minecraft:purpur_pillar': [
    { red: 0.698, green: 0.525, blue: 0.698, alpha: 1 },
    { red: 0.565, green: 0.396, blue: 0.565, alpha: 1 },
    { red: 0.729, green: 0.584, blue: 0.729, alpha: 1 }
  ],
  'minecraft:purpur_slab': [
    { red: 0.698, green: 0.525, blue: 0.698, alpha: 1 },
    { red: 0.675, green: 0.482, blue: 0.675, alpha: 1 },
    { red: 0.643, green: 0.447, blue: 0.639, alpha: 1 }
  ],
  'minecraft:purpur_stairs': [
    { red: 0.698, green: 0.525, blue: 0.698, alpha: 1 },
    { red: 0.675, green: 0.482, blue: 0.675, alpha: 1 },
    { red: 0.643, green: 0.447, blue: 0.639, alpha: 1 }
  ],
  'minecraft:quartz_block': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 }
  ],
  'minecraft:quartz_bricks': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 }
  ],
  'minecraft:quartz_ore': [
    { red: 0.447, green: 0.196, blue: 0.196, alpha: 1 },
    { red: 0.396, green: 0.157, blue: 0.157, alpha: 1 },
    { red: 0.314, green: 0.106, blue: 0.106, alpha: 1 }
  ],
  'minecraft:quartz_pillar': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 }
  ],
  'minecraft:quartz_slab': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 }
  ],
  'minecraft:quartz_stairs': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 }
  ],
  'minecraft:rail': [
    { red: 0.404, green: 0.314, blue: 0.173, alpha: 1 },
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 },
    { red: 0.494, green: 0.384, blue: 0.216, alpha: 1 }
  ],
  'minecraft:raw_copper_block': [
    { red: 0.616, green: 0.341, blue: 0.247, alpha: 1 },
    { red: 0.518, green: 0.302, blue: 0.231, alpha: 1 },
    { red: 0.443, green: 0.404, blue: 0.271, alpha: 1 }
  ],
  'minecraft:raw_gold_block': [
    { red: 0.788, green: 0.549, blue: 0.11, alpha: 1 },
    { red: 0.969, green: 0.769, blue: 0.192, alpha: 1 },
    { red: 0.933, green: 0.643, blue: 0.102, alpha: 1 }
  ],
  'minecraft:raw_iron_block': [
    { red: 0.686, green: 0.557, blue: 0.467, alpha: 1 },
    { red: 0.557, green: 0.455, blue: 0.329, alpha: 1 },
    { red: 0.486, green: 0.384, blue: 0.247, alpha: 1 }
  ],
  'minecraft:red_mushroom': [
    { red: 0.886, green: 0.071, blue: 0.071, alpha: 1 },
    { red: 0.996, green: 0.165, blue: 0.165, alpha: 1 },
    { red: 0.769, green: 0.114, blue: 0.149, alpha: 1 }
  ],
  'minecraft:red_mushroom_block': [
    { red: 0.765, green: 0.157, blue: 0.149, alpha: 1 },
    { red: 0.788, green: 0.169, blue: 0.161, alpha: 1 },
    { red: 0.745, green: 0.137, blue: 0.129, alpha: 1 }
  ],
  'minecraft:red_nether_brick_slab': [
    { red: 0.267, green: 0.02, blue: 0.027, alpha: 1 },
    { red: 0.18, green: 0, blue: 0.004, alpha: 1 },
    { red: 0.204, green: 0.004, blue: 0.012, alpha: 1 }
  ],
  'minecraft:red_nether_brick_stairs': [
    { red: 0.267, green: 0.02, blue: 0.027, alpha: 1 },
    { red: 0.18, green: 0, blue: 0.004, alpha: 1 },
    { red: 0.204, green: 0.004, blue: 0.012, alpha: 1 }
  ],
  'minecraft:red_nether_brick_wall': [
    { red: 0.267, green: 0.02, blue: 0.027, alpha: 1 },
    { red: 0.18, green: 0, blue: 0.004, alpha: 1 },
    { red: 0.204, green: 0.004, blue: 0.012, alpha: 1 }
  ],
  'minecraft:red_sand': [
    { red: 0.749, green: 0.404, blue: 0.129, alpha: 1 },
    { red: 0.698, green: 0.376, blue: 0.122, alpha: 1 },
    { red: 0.796, green: 0.431, blue: 0.141, alpha: 1 }
  ],
  'minecraft:red_sandstone': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:red_sandstone_slab': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:red_sandstone_stairs': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:red_sandstone_wall': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:red_tulip': [
    { red: 0.09, green: 0.486, blue: 0.016, alpha: 1 },
    { red: 0.333, green: 0.671, blue: 0.176, alpha: 1 },
    { red: 0.322, green: 0.604, blue: 0.18, alpha: 1 }
  ],
  'minecraft:redstone_block': [
    { red: 0.902, green: 0.125, blue: 0.031, alpha: 1 },
    { red: 0.451, green: 0.047, blue: 0, alpha: 1 },
    { red: 0.643, green: 0.094, blue: 0.031, alpha: 1 }
  ],
  'minecraft:redstone_lamp': [
    { red: 0.192, green: 0.102, blue: 0.067, alpha: 1 },
    { red: 0.525, green: 0.306, blue: 0.161, alpha: 1 },
    { red: 0.373, green: 0.2, blue: 0.082, alpha: 1 }
  ],
  'minecraft:redstone_ore': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.576, green: 0.549, blue: 0.549, alpha: 1 }
  ],
  'minecraft:redstone_torch': [
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.333, green: 0.271, blue: 0.18, alpha: 1 }
  ],
  'minecraft:redstone_wire': [
    { red: 0.902, green: 0.125, blue: 0.031, alpha: 1 },
    { red: 0.451, green: 0.047, blue: 0, alpha: 1 },
    { red: 0.643, green: 0.094, blue: 0.031, alpha: 1 }
  ],
  'minecraft:reinforced_deepslate': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 },
    { red: 0.22, green: 0.216, blue: 0.216, alpha: 1 }
  ],
  'minecraft:repeating_command_block': [
    { red: 0.416, green: 0.31, blue: 0.78, alpha: 1 },
    { red: 0.702, green: 0.69, blue: 0.725, alpha: 1 },
    { red: 0.333, green: 0.231, blue: 0.608, alpha: 1 }
  ],
  'minecraft:reserved6': undefined,
  'minecraft:resin_block': [
    { red: 0.89, green: 0.384, blue: 0.086, alpha: 1 },
    { red: 0.78, green: 0.286, blue: 0.039, alpha: 1 },
    { red: 0.702, green: 0.243, blue: 0.075, alpha: 1 }
  ],
  'minecraft:resin_brick_slab': [
    { red: 0.78, green: 0.286, blue: 0.039, alpha: 1 },
    { red: 0.89, green: 0.384, blue: 0.086, alpha: 1 },
    { red: 0.702, green: 0.243, blue: 0.075, alpha: 1 }
  ],
  'minecraft:resin_brick_stairs': [
    { red: 0.78, green: 0.286, blue: 0.039, alpha: 1 },
    { red: 0.89, green: 0.384, blue: 0.086, alpha: 1 },
    { red: 0.702, green: 0.243, blue: 0.075, alpha: 1 }
  ],
  'minecraft:resin_brick_wall': [
    { red: 0.78, green: 0.286, blue: 0.039, alpha: 1 },
    { red: 0.89, green: 0.384, blue: 0.086, alpha: 1 },
    { red: 0.702, green: 0.243, blue: 0.075, alpha: 1 }
  ],
  'minecraft:resin_bricks': [
    { red: 0.78, green: 0.286, blue: 0.039, alpha: 1 },
    { red: 0.89, green: 0.384, blue: 0.086, alpha: 1 },
    { red: 0.702, green: 0.243, blue: 0.075, alpha: 1 }
  ],
  'minecraft:resin_clump': [
    { red: 0.89, green: 0.384, blue: 0.086, alpha: 1 },
    { red: 0.71, green: 0.251, blue: 0.024, alpha: 1 },
    { red: 0.937, green: 0.529, blue: 0.216, alpha: 1 }
  ],
  'minecraft:respawn_anchor': [
    { red: 0.024, green: 0.012, blue: 0.043, alpha: 1 },
    { red: 0.282, green: 0.22, blue: 0.376, alpha: 1 },
    { red: 0.11, green: 0.078, blue: 0.129, alpha: 1 }
  ],
  'minecraft:rose_bush': [
    { red: 0.749, green: 0.145, blue: 0.161, alpha: 1 },
    { red: 0.929, green: 0.188, blue: 0.173, alpha: 1 },
    { red: 0.125, green: 0.275, blue: 0.149, alpha: 1 }
  ],
  'minecraft:sand': [
    { red: 0.855, green: 0.812, blue: 0.639, alpha: 1 },
    { red: 0.835, green: 0.769, blue: 0.588, alpha: 1 },
    { red: 0.89, green: 0.859, blue: 0.69, alpha: 1 }
  ],
  'minecraft:sandstone': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:sandstone_slab': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:sandstone_stairs': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:sandstone_wall': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:scaffolding': [
    { red: 0.671, green: 0.451, blue: 0.255, alpha: 1 },
    { red: 0.549, green: 0.408, blue: 0.278, alpha: 1 },
    { red: 0.757, green: 0.537, blue: 0.345, alpha: 1 }
  ],
  'minecraft:sculk': [
    { red: 0.051, green: 0.071, blue: 0.09, alpha: 1 },
    { red: 0.067, green: 0.106, blue: 0.129, alpha: 1 },
    { red: 0.02, green: 0.165, blue: 0.196, alpha: 1 }
  ],
  'minecraft:sculk_catalyst': [
    { red: 0.051, green: 0.071, blue: 0.09, alpha: 1 },
    { red: 0.067, green: 0.106, blue: 0.129, alpha: 1 },
    { red: 0.251, green: 0.341, blue: 0.424, alpha: 1 }
  ],
  'minecraft:sculk_sensor': [
    { red: 0.051, green: 0.071, blue: 0.09, alpha: 1 },
    { red: 0.024, green: 0.18, blue: 0.216, alpha: 1 },
    { red: 0.043, green: 0.129, blue: 0.165, alpha: 1 }
  ],
  'minecraft:sculk_shrieker': [
    { red: 0.024, green: 0.18, blue: 0.216, alpha: 1 },
    { red: 0.733, green: 0.765, blue: 0.608, alpha: 1 },
    { red: 0.067, green: 0.106, blue: 0.129, alpha: 1 }
  ],
  'minecraft:sculk_vein': [
    { red: 0.012, green: 0.255, blue: 0.314, alpha: 1 },
    { red: 0.02, green: 0.165, blue: 0.196, alpha: 1 },
    { red: 0.067, green: 0.106, blue: 0.129, alpha: 1 }
  ],
  'minecraft:sea_lantern': [
    { red: 0.89, green: 0.922, blue: 0.894, alpha: 1 },
    { red: 0.882, green: 0.918, blue: 0.882, alpha: 1 },
    { red: 0.875, green: 0.91, blue: 0.878, alpha: 1 }
  ],
  'minecraft:sea_pickle': [
    { red: 0.424, green: 0.447, blue: 0.165, alpha: 1 },
    { red: 0.294, green: 0.31, blue: 0.098, alpha: 1 },
    { red: 0.384, green: 0.408, blue: 0.141, alpha: 1 }
  ],
  'minecraft:seagrass': [
    { red: 0.184, green: 0.51, blue: 0, alpha: 1 },
    { red: 0.22, green: 0.576, blue: 0.024, alpha: 1 },
    { red: 0.129, green: 0.345, blue: 0, alpha: 1 }
  ],
  'minecraft:short_dry_grass': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.349, green: 0.239, blue: 0.161, alpha: 1 }
  ],
  'minecraft:short_grass': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.349, green: 0.239, blue: 0.161, alpha: 1 }
  ],
  'minecraft:shroomlight': [
    { red: 0.996, green: 0.675, blue: 0.427, alpha: 1 },
    { red: 0.894, green: 0.447, blue: 0.02, alpha: 1 },
    { red: 0.996, green: 0.529, blue: 0.22, alpha: 1 }
  ],
  'minecraft:skeleton_skull': [
    { red: 0.573, green: 0.573, blue: 0.573, alpha: 1 },
    { red: 0.553, green: 0.553, blue: 0.553, alpha: 1 },
    { red: 0.702, green: 0.702, blue: 0.702, alpha: 1 }
  ],
  'minecraft:small_amethyst_bud': [
    { red: 0.392, green: 0.278, blue: 0.62, alpha: 1 },
    { red: 0.478, green: 0.357, blue: 0.71, alpha: 1 },
    { red: 0.553, green: 0.416, blue: 0.8, alpha: 1 }
  ],
  'minecraft:small_dripleaf_block': [
    { red: 0.439, green: 0.573, blue: 0.176, alpha: 1 },
    { red: 0.314, green: 0.412, blue: 0.173, alpha: 1 },
    { red: 0.259, green: 0.333, blue: 0.176, alpha: 1 }
  ],
  'minecraft:smithing_table': [
    { red: 0.184, green: 0.078, blue: 0.067, alpha: 1 },
    { red: 0.29, green: 0.122, blue: 0.102, alpha: 1 },
    { red: 0.259, green: 0.11, blue: 0.09, alpha: 1 }
  ],
  'minecraft:smoker': [
    { red: 0.404, green: 0.314, blue: 0.173, alpha: 1 },
    { red: 0.318, green: 0.239, blue: 0.141, alpha: 1 },
    { red: 0.522, green: 0.522, blue: 0.522, alpha: 1 }
  ],
  'minecraft:smooth_basalt': [
    { red: 0.31, green: 0.294, blue: 0.31, alpha: 1 },
    { red: 0.361, green: 0.361, blue: 0.361, alpha: 1 },
    { red: 0.227, green: 0.231, blue: 0.282, alpha: 1 }
  ],
  'minecraft:smooth_quartz_slab': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 }
  ],
  'minecraft:smooth_quartz_stairs': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 }
  ],
  'minecraft:smooth_red_sandstone': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.698, green: 0.376, blue: 0.122, alpha: 1 },
    { red: 0.796, green: 0.431, blue: 0.141, alpha: 1 }
  ],
  'minecraft:smooth_red_sandstone_slab': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:smooth_red_sandstone_stairs': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:smooth_sandstone': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.835, green: 0.769, blue: 0.588, alpha: 1 },
    { red: 0.89, green: 0.859, blue: 0.69, alpha: 1 }
  ],
  'minecraft:smooth_sandstone_slab': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:smooth_sandstone_stairs': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:smooth_stone': [
    { red: 0.659, green: 0.659, blue: 0.659, alpha: 1 },
    { red: 0.639, green: 0.639, blue: 0.639, alpha: 1 },
    { red: 0.69, green: 0.69, blue: 0.69, alpha: 1 }
  ],
  'minecraft:smooth_stone_slab': [
    { red: 0.659, green: 0.659, blue: 0.659, alpha: 1 },
    { red: 0.639, green: 0.639, blue: 0.639, alpha: 1 },
    { red: 0.69, green: 0.69, blue: 0.69, alpha: 1 }
  ],
  'minecraft:sniffer_egg': [
    { red: 0.204, green: 0.475, blue: 0.302, alpha: 1 },
    { red: 0.486, green: 0.078, blue: 0.078, alpha: 1 },
    { red: 0.541, green: 0.129, blue: 0.098, alpha: 1 }
  ],
  'minecraft:snow': [
    { red: 1, green: 1, blue: 1, alpha: 1 },
    { red: 0.969, green: 0.996, blue: 0.996, alpha: 1 },
    { red: 0.941, green: 0.992, blue: 0.992, alpha: 1 }
  ],
  'minecraft:snow_layer': [
    { red: 1, green: 1, blue: 1, alpha: 1 },
    { red: 0.969, green: 0.996, blue: 0.996, alpha: 1 },
    { red: 0.941, green: 0.992, blue: 0.992, alpha: 1 }
  ],
  'minecraft:soul_campfire': [
    { red: 0.486, green: 0.949, blue: 0.961, alpha: 1 },
    { red: 0.075, green: 0.686, blue: 0.702, alpha: 1 },
    { red: 0.357, green: 0.89, blue: 0.91, alpha: 1 }
  ],
  'minecraft:soul_fire': [
    { red: 1, green: 1, blue: 1, alpha: 1 },
    { red: 0.004, green: 0.635, blue: 0.655, alpha: 1 },
    { red: 0.004, green: 0.518, blue: 0.533, alpha: 1 }
  ],
  'minecraft:soul_lantern': [
    { red: 0.243, green: 0.267, blue: 0.325, alpha: 1 },
    { red: 0.286, green: 0.314, blue: 0.396, alpha: 1 },
    { red: 0.259, green: 0.29, blue: 0.369, alpha: 1 }
  ],
  'minecraft:soul_sand': [
    { red: 0.286, green: 0.216, blue: 0.173, alpha: 1 },
    { red: 0.357, green: 0.271, blue: 0.22, alpha: 1 },
    { red: 0.416, green: 0.322, blue: 0.267, alpha: 1 }
  ],
  'minecraft:soul_soil': [
    { red: 0.286, green: 0.216, blue: 0.173, alpha: 1 },
    { red: 0.357, green: 0.271, blue: 0.22, alpha: 1 },
    { red: 0.239, green: 0.18, blue: 0.145, alpha: 1 }
  ],
  'minecraft:soul_torch': [
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.333, green: 0.271, blue: 0.18, alpha: 1 }
  ],
  'minecraft:sponge': [
    { red: 0.804, green: 0.808, blue: 0.29, alpha: 1 },
    { red: 0.757, green: 0.737, blue: 0.306, alpha: 1 },
    { red: 0.882, green: 0.89, blue: 0.318, alpha: 1 }
  ],
  'minecraft:spore_blossom': [
    { red: 0.439, green: 0.573, blue: 0.176, alpha: 1 },
    { red: 0.424, green: 0.502, blue: 0.192, alpha: 1 },
    { red: 0.518, green: 0.659, blue: 0.235, alpha: 1 }
  ],
  'minecraft:spruce_door': [
    { red: 0.502, green: 0.369, blue: 0.212, alpha: 1 },
    { red: 0.353, green: 0.267, blue: 0.141, alpha: 1 },
    { red: 0.42, green: 0.325, blue: 0.196, alpha: 1 }
  ],
  'minecraft:sticky_piston': [
    { red: 0.325, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 },
    { red: 0.267, green: 0.267, blue: 0.267, alpha: 1 }
  ],
  'minecraft:stone': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:stone_brick_slab': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 }
  ],
  'minecraft:stone_brick_stairs': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 }
  ],
  'minecraft:stone_brick_wall': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 }
  ],
  'minecraft:stone_bricks': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 }
  ],
  'minecraft:stone_button': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:stone_pressure_plate': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:stone_stairs': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:stonecutter': [
    { red: 0.714, green: 0.741, blue: 0.741, alpha: 1 },
    { red: 0.808, green: 0.839, blue: 0.839, alpha: 1 },
    { red: 0.639, green: 0.639, blue: 0.639, alpha: 1 }
  ],
  'minecraft:stonecutter_block': [
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.502, green: 0.502, blue: 0.502, alpha: 1 },
    { red: 0.322, green: 0.322, blue: 0.322, alpha: 1 }
  ],
  'minecraft:stripped_bamboo_block': [
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 },
    { red: 0.89, green: 0.8, blue: 0.416, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:structure_block': [
    { red: 0.149, green: 0.114, blue: 0.165, alpha: 1 },
    { red: 0.063, green: 0.063, blue: 0.063, alpha: 1 },
    { red: 0.588, green: 0.471, blue: 0.588, alpha: 1 }
  ],
  'minecraft:structure_void': [ { red: 1, green: 0, blue: 0, alpha: 1 } ],
  'minecraft:sunflower': [
    { red: 0.29, green: 0.561, blue: 0.157, alpha: 1 },
    { red: 0.09, green: 0.486, blue: 0.016, alpha: 1 },
    { red: 0.322, green: 0.604, blue: 0.18, alpha: 1 }
  ],
  'minecraft:suspicious_gravel': [
    { red: 0.506, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.537, green: 0.506, blue: 0.494, alpha: 1 },
    { red: 0.447, green: 0.42, blue: 0.412, alpha: 1 }
  ],
  'minecraft:suspicious_sand': [
    { red: 0.855, green: 0.812, blue: 0.639, alpha: 1 },
    { red: 0.835, green: 0.769, blue: 0.588, alpha: 1 },
    { red: 0.89, green: 0.859, blue: 0.69, alpha: 1 }
  ],
  'minecraft:tall_dry_grass': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.349, green: 0.239, blue: 0.161, alpha: 1 }
  ],
  'minecraft:tall_grass': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.349, green: 0.239, blue: 0.161, alpha: 1 }
  ],
  'minecraft:target': [
    { red: 0.937, green: 0.886, blue: 0.816, alpha: 1 },
    { red: 0.953, green: 0.922, blue: 0.875, alpha: 1 },
    { red: 0.996, green: 0.996, blue: 0.992, alpha: 1 }
  ],
  'minecraft:tinted_glass': [
    { red: 0.153, green: 0.145, blue: 0.157, alpha: 1 },
    { red: 0.208, green: 0.157, blue: 0.231, alpha: 1 },
    { red: 0.169, green: 0.125, blue: 0.188, alpha: 1 }
  ],
  'minecraft:tnt': [
    { red: 0.859, green: 0.184, blue: 0.102, alpha: 1 },
    { red: 0.694, green: 0.082, blue: 0.153, alpha: 1 },
    { red: 0.569, green: 0.176, blue: 0.067, alpha: 1 }
  ],
  'minecraft:torch': [
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.333, green: 0.271, blue: 0.18, alpha: 1 }
  ],
  'minecraft:torchflower': [
    { red: 0.11, green: 0.357, blue: 0.227, alpha: 1 },
    { red: 0.075, green: 0.271, blue: 0.196, alpha: 1 },
    { red: 0.153, green: 0.518, blue: 0.365, alpha: 1 }
  ],
  'minecraft:trapdoor': [
    { red: 0.612, green: 0.475, blue: 0.29, alpha: 1 },
    { red: 0.384, green: 0.314, blue: 0.161, alpha: 1 },
    { red: 0.29, green: 0.235, blue: 0.125, alpha: 1 }
  ],
  'minecraft:trapped_chest': [
    { red: 0.561, green: 0.412, blue: 0.114, alpha: 1 },
    { red: 0.671, green: 0.475, blue: 0.176, alpha: 1 },
    { red: 0.643, green: 0.447, blue: 0.153, alpha: 1 }
  ],
  'minecraft:trial_spawner': [
    { red: 0.165, green: 0.267, blue: 0.333, alpha: 1 },
    { red: 0.094, green: 0.173, blue: 0.224, alpha: 1 },
    { red: 0.251, green: 0.384, blue: 0.471, alpha: 1 }
  ],
  'minecraft:tripwire_hook': [
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.357, green: 0.357, blue: 0.357, alpha: 1 },
    { red: 0.467, green: 0.467, blue: 0.467, alpha: 1 }
  ],
  'minecraft:tuff': [
    { red: 0.416, green: 0.431, blue: 0.435, alpha: 1 },
    { red: 0.365, green: 0.365, blue: 0.322, alpha: 1 },
    { red: 0.522, green: 0.514, blue: 0.482, alpha: 1 }
  ],
  'minecraft:tuff_brick_slab': [
    { red: 0.522, green: 0.514, blue: 0.478, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 },
    { red: 0.322, green: 0.353, blue: 0.318, alpha: 1 }
  ],
  'minecraft:tuff_brick_stairs': [
    { red: 0.522, green: 0.514, blue: 0.478, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 },
    { red: 0.322, green: 0.353, blue: 0.318, alpha: 1 }
  ],
  'minecraft:tuff_brick_wall': [
    { red: 0.522, green: 0.514, blue: 0.478, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 },
    { red: 0.322, green: 0.353, blue: 0.318, alpha: 1 }
  ],
  'minecraft:tuff_bricks': [
    { red: 0.522, green: 0.514, blue: 0.478, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 },
    { red: 0.322, green: 0.353, blue: 0.318, alpha: 1 }
  ],
  'minecraft:tuff_slab': [
    { red: 0.416, green: 0.431, blue: 0.435, alpha: 1 },
    { red: 0.365, green: 0.365, blue: 0.322, alpha: 1 },
    { red: 0.522, green: 0.514, blue: 0.482, alpha: 1 }
  ],
  'minecraft:tuff_stairs': [
    { red: 0.416, green: 0.431, blue: 0.435, alpha: 1 },
    { red: 0.365, green: 0.365, blue: 0.322, alpha: 1 },
    { red: 0.522, green: 0.514, blue: 0.482, alpha: 1 }
  ],
  'minecraft:tuff_wall': [
    { red: 0.416, green: 0.431, blue: 0.435, alpha: 1 },
    { red: 0.365, green: 0.365, blue: 0.322, alpha: 1 },
    { red: 0.522, green: 0.514, blue: 0.482, alpha: 1 }
  ],
  'minecraft:turtle_egg': [
    { red: 0.969, green: 0.945, blue: 0.851, alpha: 1 },
    { red: 0.949, green: 0.914, blue: 0.78, alpha: 1 },
    { red: 0.949, green: 0.886, blue: 0.663, alpha: 1 }
  ],
  'minecraft:twisting_vines': [
    { red: 0.067, green: 0.608, blue: 0.522, alpha: 1 },
    { red: 0.086, green: 0.38, blue: 0.357, alpha: 1 },
    { red: 0.086, green: 0.494, blue: 0.525, alpha: 1 }
  ],
  'minecraft:underwater_tnt': [
    { red: 0.447, green: 0.525, blue: 1, alpha: 1 },
    { red: 0.439, green: 0.514, blue: 1, alpha: 1 },
    { red: 0.443, green: 0.518, blue: 1, alpha: 1 }
  ],
  'minecraft:underwater_torch': [
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.333, green: 0.271, blue: 0.18, alpha: 1 }
  ],
  'minecraft:vault': [
    { red: 0.063, green: 0.114, blue: 0.145, alpha: 1 },
    { red: 0.094, green: 0.173, blue: 0.224, alpha: 1 },
    { red: 0.345, green: 0.376, blue: 0.345, alpha: 1 }
  ],
  'minecraft:verdant_froglight': [
    { red: 0.922, green: 0.976, blue: 0.925, alpha: 1 },
    { red: 0.973, green: 0.992, blue: 0.973, alpha: 1 },
    { red: 0.843, green: 0.933, blue: 0.835, alpha: 1 }
  ],
  'minecraft:warped_door': [
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.122, green: 0.341, blue: 0.322, alpha: 1 },
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 }
  ],
  'minecraft:warped_fungus': [
    { red: 0.078, green: 0.706, blue: 0.522, alpha: 1 },
    { red: 0.086, green: 0.38, blue: 0.357, alpha: 1 },
    { red: 0.086, green: 0.494, blue: 0.525, alpha: 1 }
  ],
  'minecraft:warped_nylium': [
    { red: 0.447, green: 0.196, blue: 0.196, alpha: 1 },
    { red: 0.396, green: 0.157, blue: 0.157, alpha: 1 },
    { red: 0.188, green: 0.235, blue: 0.208, alpha: 1 }
  ],
  'minecraft:warped_roots': [
    { red: 0.086, green: 0.494, blue: 0.525, alpha: 1 },
    { red: 0.067, green: 0.608, blue: 0.522, alpha: 1 },
    { red: 0.086, green: 0.38, blue: 0.357, alpha: 1 }
  ],
  'minecraft:warped_wart_block': [
    { red: 0.086, green: 0.494, blue: 0.525, alpha: 1 },
    { red: 0.098, green: 0.388, blue: 0.404, alpha: 1 },
    { red: 0.094, green: 0.435, blue: 0.412, alpha: 1 }
  ],
  'minecraft:water': [
    { red: 0.447, green: 0.525, blue: 1, alpha: 1 },
    { red: 0.439, green: 0.514, blue: 1, alpha: 1 },
    { red: 0.443, green: 0.518, blue: 1, alpha: 1 }
  ],
  'minecraft:web': [
    { red: 1, green: 1, blue: 1, alpha: 1 },
    { red: 0.894, green: 0.914, blue: 0.914, alpha: 1 },
    { red: 0.769, green: 0.808, blue: 0.824, alpha: 1 }
  ],
  'minecraft:weeping_vines': [
    { red: 0.51, green: 0.02, blue: 0.173, alpha: 1 },
    { red: 0.4, green: 0.024, blue: 0.153, alpha: 1 },
    { red: 0.314, green: 0.024, blue: 0.165, alpha: 1 }
  ],
  'minecraft:wet_sponge': [
    { red: 0.69, green: 0.749, blue: 0.298, alpha: 1 },
    { red: 0.588, green: 0.659, blue: 0.275, alpha: 1 },
    { red: 0.804, green: 0.808, blue: 0.29, alpha: 1 }
  ],
  'minecraft:wheat': [
    { red: 0.031, green: 0.533, blue: 0.024, alpha: 1 },
    { red: 0.02, green: 0.416, blue: 0.02, alpha: 1 },
    { red: 0.067, green: 0.463, blue: 0.122, alpha: 1 }
  ],
  'minecraft:white_tulip': [
    { red: 0.333, green: 0.671, blue: 0.176, alpha: 1 },
    { red: 0.09, green: 0.486, blue: 0.016, alpha: 1 },
    { red: 0.322, green: 0.604, blue: 0.18, alpha: 1 }
  ],
  'minecraft:wildflowers': [
    { red: 0.996, green: 0.839, blue: 0.224, alpha: 1 },
    { red: 0.961, green: 0.729, blue: 0.153, alpha: 1 },
    { red: 0.839, green: 0.91, blue: 0.91, alpha: 1 }
  ],
  'minecraft:wither_rose': [
    { red: 0.22, green: 0.271, blue: 0.102, alpha: 1 },
    { red: 0.173, green: 0.208, blue: 0.09, alpha: 1 },
    { red: 0.259, green: 0.208, blue: 0.18, alpha: 1 }
  ],
  'minecraft:wither_skeleton_skull': [
    { red: 0.078, green: 0.078, blue: 0.078, alpha: 1 },
    { red: 0.133, green: 0.133, blue: 0.133, alpha: 1 },
    { red: 0.102, green: 0.102, blue: 0.102, alpha: 1 }
  ],
  'minecraft:wooden_button': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:wooden_door': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:wooden_pressure_plate': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:zombie_head': [
    { red: 0, green: 0.655, blue: 0.655, alpha: 1 },
    { red: 0.235, green: 0.396, blue: 0.18, alpha: 1 },
    { red: 0.247, green: 0.412, blue: 0.184, alpha: 1 }
  ],
  'minecraft:acacia_button': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_fence': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_fence_gate': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_log': [
    { red: 0.412, green: 0.384, blue: 0.349, alpha: 1 },
    { red: 0.482, green: 0.451, blue: 0.408, alpha: 1 },
    { red: 0.357, green: 0.333, blue: 0.302, alpha: 1 }
  ],
  'minecraft:bamboo_button': [
    { red: 0.349, green: 0.565, blue: 0.012, alpha: 1 },
    { red: 0.325, green: 0.51, blue: 0.035, alpha: 1 },
    { red: 0.553, green: 0.761, blue: 0.31, alpha: 1 }
  ],
  'minecraft:bamboo_fence': [
    { red: 0.89, green: 0.8, blue: 0.416, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 },
    { red: 0.733, green: 0.659, blue: 0.298, alpha: 1 }
  ],
  'minecraft:bamboo_fence_gate': [
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 },
    { red: 0.89, green: 0.8, blue: 0.416, alpha: 1 },
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 }
  ],
  'minecraft:birch_button': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_fence': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_fence_gate': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_log': [
    { red: 1, green: 1, blue: 1, alpha: 1 },
    { red: 0.941, green: 0.933, blue: 0.922, alpha: 1 },
    { red: 0.847, green: 0.847, blue: 0.808, alpha: 1 }
  ],
  'minecraft:cherry_button': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:cherry_fence': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:cherry_fence_gate': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:cherry_log': [
    { red: 0.188, green: 0.114, blue: 0.161, alpha: 1 },
    { red: 0.231, green: 0.137, blue: 0.176, alpha: 1 },
    { red: 0.153, green: 0.086, blue: 0.125, alpha: 1 }
  ],
  'minecraft:crimson_button': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:crimson_fence': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:crimson_fence_gate': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:crimson_stem': [
    { red: 0.322, green: 0.094, blue: 0.063, alpha: 1 },
    { red: 0.267, green: 0.129, blue: 0.192, alpha: 1 },
    { red: 0.294, green: 0.153, blue: 0.216, alpha: 1 }
  ],
  'minecraft:dark_oak_button': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:dark_oak_fence': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:dark_oak_fence_gate': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:dark_oak_log': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:jungle_button': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_fence': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_fence_gate': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_log': [
    { red: 0.349, green: 0.275, blue: 0.102, alpha: 1 },
    { red: 0.251, green: 0.212, blue: 0.071, alpha: 1 },
    { red: 0.314, green: 0.247, blue: 0.086, alpha: 1 }
  ],
  'minecraft:mangrove_button': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:mangrove_fence': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:mangrove_fence_gate': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:mangrove_log': [
    { red: 0.306, green: 0.247, blue: 0.153, alpha: 1 },
    { red: 0.353, green: 0.282, blue: 0.173, alpha: 1 },
    { red: 0.404, green: 0.322, blue: 0.188, alpha: 1 }
  ],
  'minecraft:mushroom_stem': [
    { red: 0.827, green: 0.8, blue: 0.769, alpha: 1 },
    { red: 0.804, green: 0.776, blue: 0.741, alpha: 1 },
    { red: 0.78, green: 0.757, blue: 0.706, alpha: 1 }
  ],
  'minecraft:oak_fence': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:oak_log': [
    { red: 0.455, green: 0.353, blue: 0.212, alpha: 1 },
    { red: 0.569, green: 0.443, blue: 0.259, alpha: 1 },
    { red: 0.373, green: 0.29, blue: 0.169, alpha: 1 }
  ],
  'minecraft:pale_oak_button': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_fence': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_fence_gate': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_log': [
    { red: 0.369, green: 0.325, blue: 0.314, alpha: 1 },
    { red: 0.306, green: 0.263, blue: 0.251, alpha: 1 },
    { red: 0.431, green: 0.392, blue: 0.384, alpha: 1 }
  ],
  'minecraft:spruce_button': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_fence': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_fence_gate': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_log': [
    { red: 0.231, green: 0.153, blue: 0.075, alpha: 1 },
    { red: 0.302, green: 0.2, blue: 0.09, alpha: 1 },
    { red: 0.18, green: 0.11, blue: 0.039, alpha: 1 }
  ],
  'minecraft:stripped_acacia_log': [
    { red: 0.698, green: 0.357, blue: 0.231, alpha: 1 },
    { red: 0.71, green: 0.376, blue: 0.243, alpha: 1 },
    { red: 0.588, green: 0.345, blue: 0.216, alpha: 1 }
  ],
  'minecraft:stripped_birch_log': [
    { red: 0.769, green: 0.675, blue: 0.447, alpha: 1 },
    { red: 0.729, green: 0.659, blue: 0.455, alpha: 1 },
    { red: 0.804, green: 0.722, blue: 0.49, alpha: 1 }
  ],
  'minecraft:stripped_cherry_log': [
    { red: 0.851, green: 0.58, blue: 0.6, alpha: 1 },
    { red: 0.863, green: 0.596, blue: 0.62, alpha: 1 },
    { red: 0.839, green: 0.561, blue: 0.576, alpha: 1 }
  ],
  'minecraft:stripped_crimson_stem': [
    { red: 0.537, green: 0.224, blue: 0.357, alpha: 1 },
    { red: 0.588, green: 0.243, blue: 0.384, alpha: 1 },
    { red: 0.502, green: 0.22, blue: 0.325, alpha: 1 }
  ],
  'minecraft:stripped_dark_oak_log': [
    { red: 0.271, green: 0.212, blue: 0.137, alpha: 1 },
    { red: 0.322, green: 0.247, blue: 0.153, alpha: 1 },
    { red: 0.231, green: 0.188, blue: 0.125, alpha: 1 }
  ],
  'minecraft:stripped_jungle_log': [
    { red: 0.706, green: 0.525, blue: 0.353, alpha: 1 },
    { red: 0.733, green: 0.553, blue: 0.38, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:stripped_mangrove_log': [
    { red: 0.478, green: 0.216, blue: 0.192, alpha: 1 },
    { red: 0.478, green: 0.239, blue: 0.184, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.192, alpha: 1 }
  ],
  'minecraft:stripped_oak_log': [
    { red: 0.725, green: 0.584, blue: 0.345, alpha: 1 },
    { red: 0.753, green: 0.616, blue: 0.384, alpha: 1 },
    { red: 0.682, green: 0.557, blue: 0.322, alpha: 1 }
  ],
  'minecraft:stripped_pale_oak_log': [
    { red: 0.973, green: 0.941, blue: 0.941, alpha: 1 },
    { red: 1, green: 0.984, blue: 0.973, alpha: 1 },
    { red: 0.941, green: 0.906, blue: 0.898, alpha: 1 }
  ],
  'minecraft:stripped_spruce_log': [
    { red: 0.275, green: 0.227, blue: 0.125, alpha: 1 },
    { red: 0.325, green: 0.243, blue: 0.141, alpha: 1 },
    { red: 0.302, green: 0.235, blue: 0.133, alpha: 1 }
  ],
  'minecraft:stripped_warped_stem': [
    { red: 0.231, green: 0.6, blue: 0.592, alpha: 1 },
    { red: 0.267, green: 0.631, blue: 0.624, alpha: 1 },
    { red: 0.192, green: 0.553, blue: 0.549, alpha: 1 }
  ],
  'minecraft:warped_button': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_fence': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_fence_gate': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_stem': [
    { red: 0.271, green: 0.176, blue: 0.361, alpha: 1 },
    { red: 0.267, green: 0.129, blue: 0.192, alpha: 1 },
    { red: 0.294, green: 0.153, blue: 0.216, alpha: 1 }
  ],
  'minecraft:acacia_leaves': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_sapling': [
    { red: 0.486, green: 0.369, blue: 0.071, alpha: 1 },
    { red: 0.404, green: 0.494, blue: 0.09, alpha: 1 },
    { red: 0.455, green: 0.549, blue: 0.11, alpha: 1 }
  ],
  'minecraft:azalea_leaves': [
    { red: 0.314, green: 0.412, blue: 0.173, alpha: 1 },
    { red: 0.439, green: 0.573, blue: 0.176, alpha: 1 },
    { red: 0.424, green: 0.502, blue: 0.192, alpha: 1 }
  ],
  'minecraft:azalea_leaves_flowered': [
    { red: 0.227, green: 0.298, blue: 0.149, alpha: 1 },
    { red: 0.314, green: 0.412, blue: 0.173, alpha: 1 },
    { red: 0.424, green: 0.502, blue: 0.192, alpha: 1 }
  ],
  'minecraft:bamboo_sapling': [
    { red: 0.396, green: 0.361, blue: 0.118, alpha: 1 },
    { red: 0.592, green: 0.561, blue: 0.329, alpha: 1 },
    { red: 0.341, green: 0.247, blue: 0.122, alpha: 1 }
  ],
  'minecraft:birch_leaves': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_sapling': [
    { red: 0.424, green: 0.62, blue: 0.22, alpha: 1 },
    { red: 0.353, green: 0.494, blue: 0.2, alpha: 1 },
    { red: 0.675, green: 0.749, blue: 0.384, alpha: 1 }
  ],
  'minecraft:black_glazed_terracotta': [
    { red: 0.557, green: 0.125, blue: 0.125, alpha: 1 },
    { red: 0.114, green: 0.114, blue: 0.129, alpha: 1 },
    { red: 0.6, green: 0.133, blue: 0.133, alpha: 1 }
  ],
  'minecraft:black_terracotta': [
    { red: 0.145, green: 0.086, blue: 0.063, alpha: 1 },
    { red: 0.145, green: 0.09, blue: 0.067, alpha: 1 },
    { red: 0.145, green: 0.09, blue: 0.063, alpha: 1 }
  ],
  'minecraft:black_wool': [
    { red: 0.11, green: 0.11, blue: 0.125, alpha: 1 },
    { red: 0.145, green: 0.145, blue: 0.161, alpha: 1 },
    { red: 0.059, green: 0.063, blue: 0.082, alpha: 1 }
  ],
  'minecraft:blue_glazed_terracotta': [
    { red: 0.173, green: 0.18, blue: 0.561, alpha: 1 },
    { red: 0.235, green: 0.267, blue: 0.667, alpha: 1 },
    { red: 0.271, green: 0.467, blue: 0.827, alpha: 1 }
  ],
  'minecraft:blue_terracotta': [
    { red: 0.29, green: 0.231, blue: 0.357, alpha: 1 },
    { red: 0.286, green: 0.227, blue: 0.353, alpha: 1 },
    { red: 0.29, green: 0.235, blue: 0.361, alpha: 1 }
  ],
  'minecraft:blue_wool': [
    { red: 0.243, green: 0.302, blue: 0.698, alpha: 1 },
    { red: 0.231, green: 0.251, blue: 0.651, alpha: 1 },
    { red: 0.192, green: 0.2, blue: 0.588, alpha: 1 }
  ],
  'minecraft:brown_glazed_terracotta': [
    { red: 0.514, green: 0.329, blue: 0.196, alpha: 1 },
    { red: 0.804, green: 0.569, blue: 0.486, alpha: 1 },
    { red: 0.643, green: 0.463, blue: 0.298, alpha: 1 }
  ],
  'minecraft:brown_terracotta': [
    { red: 0.302, green: 0.204, blue: 0.141, alpha: 1 },
    { red: 0.298, green: 0.196, blue: 0.137, alpha: 1 },
    { red: 0.302, green: 0.2, blue: 0.141, alpha: 1 }
  ],
  'minecraft:brown_wool': [
    { red: 0.494, green: 0.314, blue: 0.184, alpha: 1 },
    { red: 0.514, green: 0.329, blue: 0.196, alpha: 1 },
    { red: 0.427, green: 0.267, blue: 0.149, alpha: 1 }
  ],
  'minecraft:cherry_leaves': [
    { red: 0.988, green: 0.796, blue: 0.906, alpha: 1 },
    { red: 0.961, green: 0.855, blue: 0.937, alpha: 1 },
    { red: 0.922, green: 0.573, blue: 0.757, alpha: 1 }
  ],
  'minecraft:cherry_sapling': [
    { red: 0.969, green: 0.725, blue: 0.863, alpha: 1 },
    { red: 0.153, green: 0.086, blue: 0.125, alpha: 1 },
    { red: 0.937, green: 0.655, blue: 0.804, alpha: 1 }
  ],
  'minecraft:cyan_glazed_terracotta': [
    { red: 0.082, green: 0.467, blue: 0.533, alpha: 1 },
    { red: 0.212, green: 0.224, blue: 0.239, alpha: 1 },
    { red: 0.086, green: 0.612, blue: 0.612, alpha: 1 }
  ],
  'minecraft:cyan_terracotta': [
    { red: 0.337, green: 0.353, blue: 0.353, alpha: 1 },
    { red: 0.333, green: 0.349, blue: 0.353, alpha: 1 },
    { red: 0.341, green: 0.361, blue: 0.361, alpha: 1 }
  ],
  'minecraft:cyan_wool': [
    { red: 0.086, green: 0.588, blue: 0.596, alpha: 1 },
    { red: 0.086, green: 0.608, blue: 0.612, alpha: 1 },
    { red: 0.082, green: 0.498, blue: 0.549, alpha: 1 }
  ],
  'minecraft:dark_oak_leaves': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:dark_oak_sapling': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:gray_glazed_terracotta': [
    { red: 0.212, green: 0.224, blue: 0.239, alpha: 1 },
    { red: 0.278, green: 0.31, blue: 0.322, alpha: 1 },
    { red: 0.357, green: 0.424, blue: 0.443, alpha: 1 }
  ],
  'minecraft:gray_terracotta': [
    { red: 0.227, green: 0.169, blue: 0.141, alpha: 1 },
    { red: 0.224, green: 0.165, blue: 0.137, alpha: 1 },
    { red: 0.224, green: 0.161, blue: 0.137, alpha: 1 }
  ],
  'minecraft:gray_wool': [
    { red: 0.278, green: 0.31, blue: 0.322, alpha: 1 },
    { red: 0.271, green: 0.298, blue: 0.31, alpha: 1 },
    { red: 0.267, green: 0.294, blue: 0.306, alpha: 1 }
  ],
  'minecraft:green_glazed_terracotta': [
    { red: 0.286, green: 0.357, blue: 0.141, alpha: 1 },
    { red: 0.447, green: 0.608, blue: 0.141, alpha: 1 },
    { red: 0.369, green: 0.486, blue: 0.086, alpha: 1 }
  ],
  'minecraft:green_terracotta': [
    { red: 0.294, green: 0.322, blue: 0.161, alpha: 1 },
    { red: 0.294, green: 0.322, blue: 0.165, alpha: 1 },
    { red: 0.298, green: 0.325, blue: 0.165, alpha: 1 }
  ],
  'minecraft:green_wool': [
    { red: 0.396, green: 0.525, blue: 0.098, alpha: 1 },
    { red: 0.314, green: 0.4, blue: 0.118, alpha: 1 },
    { red: 0.318, green: 0.408, blue: 0.114, alpha: 1 }
  ],
  'minecraft:jungle_leaves': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_sapling': [
    { red: 0.169, green: 0.29, blue: 0.047, alpha: 1 },
    { red: 0.184, green: 0.188, blue: 0.031, alpha: 1 },
    { red: 0.173, green: 0.424, blue: 0.094, alpha: 1 }
  ],
  'minecraft:light_blue_glazed_terracotta': [
    { red: 0.227, green: 0.702, blue: 0.855, alpha: 1 },
    { red: 0.137, green: 0.537, blue: 0.78, alpha: 1 },
    { red: 0.302, green: 0.725, blue: 0.867, alpha: 1 }
  ],
  'minecraft:light_blue_terracotta': [
    { red: 0.439, green: 0.424, blue: 0.541, alpha: 1 },
    { red: 0.447, green: 0.424, blue: 0.541, alpha: 1 },
    { red: 0.435, green: 0.42, blue: 0.537, alpha: 1 }
  ],
  'minecraft:light_blue_wool': [
    { red: 0.306, green: 0.773, blue: 0.906, alpha: 1 },
    { red: 0.286, green: 0.761, blue: 0.894, alpha: 1 },
    { red: 0.192, green: 0.647, blue: 0.827, alpha: 1 }
  ],
  'minecraft:light_gray_terracotta': [
    { red: 0.529, green: 0.42, blue: 0.384, alpha: 1 },
    { red: 0.522, green: 0.412, blue: 0.376, alpha: 1 },
    { red: 0.529, green: 0.416, blue: 0.38, alpha: 1 }
  ],
  'minecraft:light_gray_wool': [
    { red: 0.6, green: 0.6, blue: 0.576, alpha: 1 },
    { red: 0.616, green: 0.616, blue: 0.592, alpha: 1 },
    { red: 0.529, green: 0.529, blue: 0.498, alpha: 1 }
  ],
  'minecraft:lime_glazed_terracotta': [
    { red: 0.502, green: 0.78, blue: 0.122, alpha: 1 },
    { red: 0.667, green: 0.914, blue: 0.396, alpha: 1 },
    { red: 0.349, green: 0.627, blue: 0.09, alpha: 1 }
  ],
  'minecraft:lime_terracotta': [
    { red: 0.404, green: 0.459, blue: 0.204, alpha: 1 },
    { red: 0.408, green: 0.467, blue: 0.212, alpha: 1 },
    { red: 0.404, green: 0.455, blue: 0.2, alpha: 1 }
  ],
  'minecraft:lime_wool': [
    { red: 0.525, green: 0.8, blue: 0.149, alpha: 1 },
    { red: 0.486, green: 0.765, blue: 0.106, alpha: 1 },
    { red: 0.404, green: 0.694, blue: 0.094, alpha: 1 }
  ],
  'minecraft:magenta_glazed_terracotta': [
    { red: 0.78, green: 0.306, blue: 0.741, alpha: 1 },
    { red: 0.867, green: 0.408, blue: 0.855, alpha: 1 },
    { red: 0.957, green: 0.71, blue: 0.796, alpha: 1 }
  ],
  'minecraft:magenta_terracotta': [
    { red: 0.584, green: 0.341, blue: 0.424, alpha: 1 },
    { red: 0.584, green: 0.337, blue: 0.42, alpha: 1 },
    { red: 0.576, green: 0.337, blue: 0.42, alpha: 1 }
  ],
  'minecraft:magenta_wool': [
    { red: 0.839, green: 0.376, blue: 0.82, alpha: 1 },
    { red: 0.792, green: 0.322, blue: 0.757, alpha: 1 },
    { red: 0.698, green: 0.224, blue: 0.659, alpha: 1 }
  ],
  'minecraft:mangrove_leaves': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:oak_leaves': [
    { red: 0.227, green: 0.298, blue: 0.149, alpha: 1 },
    { red: 0.314, green: 0.412, blue: 0.173, alpha: 1 },
    { red: 0.424, green: 0.502, blue: 0.192, alpha: 1 }
  ],
  'minecraft:oak_sapling': [
    { red: 0.439, green: 0.325, blue: 0.18, alpha: 1 },
    { red: 0.251, green: 0.561, blue: 0.184, alpha: 1 },
    { red: 0.341, green: 0.678, blue: 0.247, alpha: 1 }
  ],
  'minecraft:orange_glazed_terracotta': [
    { red: 0.976, green: 0.502, blue: 0.114, alpha: 1 },
    { red: 0.882, green: 0.38, blue: 0, alpha: 1 },
    { red: 0.086, green: 0.612, blue: 0.612, alpha: 1 }
  ],
  'minecraft:orange_terracotta': [
    { red: 0.624, green: 0.322, blue: 0.141, alpha: 1 },
    { red: 0.635, green: 0.325, blue: 0.149, alpha: 1 },
    { red: 0.627, green: 0.325, blue: 0.145, alpha: 1 }
  ],
  'minecraft:orange_wool': [
    { red: 0.976, green: 0.576, blue: 0.169, alpha: 1 },
    { red: 0.976, green: 0.518, blue: 0.125, alpha: 1 },
    { red: 0.925, green: 0.427, blue: 0.043, alpha: 1 }
  ],
  'minecraft:pale_oak_leaves': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_sapling': [
    { red: 0.478, green: 0.502, blue: 0.467, alpha: 1 },
    { red: 0.537, green: 0.573, blue: 0.529, alpha: 1 },
    { red: 0.263, green: 0.231, blue: 0.224, alpha: 1 }
  ],
  'minecraft:pink_glazed_terracotta': [
    { red: 0.957, green: 0.71, blue: 0.796, alpha: 1 },
    { red: 0.953, green: 0.545, blue: 0.667, alpha: 1 },
    { red: 0.851, green: 0.443, blue: 0.596, alpha: 1 }
  ],
  'minecraft:pink_terracotta': [
    { red: 0.627, green: 0.302, blue: 0.306, alpha: 1 },
    { red: 0.624, green: 0.298, blue: 0.302, alpha: 1 },
    { red: 0.635, green: 0.306, blue: 0.31, alpha: 1 }
  ],
  'minecraft:pink_wool': [
    { red: 0.957, green: 0.698, blue: 0.788, alpha: 1 },
    { red: 0.957, green: 0.655, blue: 0.753, alpha: 1 },
    { red: 0.925, green: 0.494, blue: 0.631, alpha: 1 }
  ],
  'minecraft:purple_glazed_terracotta': [
    { red: 0.537, green: 0.196, blue: 0.722, alpha: 1 },
    { red: 0.173, green: 0.173, blue: 0.196, alpha: 1 },
    { red: 0.392, green: 0.122, blue: 0.612, alpha: 1 }
  ],
  'minecraft:purple_terracotta': [
    { red: 0.451, green: 0.267, blue: 0.329, alpha: 1 },
    { red: 0.463, green: 0.275, blue: 0.337, alpha: 1 },
    { red: 0.463, green: 0.271, blue: 0.337, alpha: 1 }
  ],
  'minecraft:purple_wool': [
    { red: 0.592, green: 0.263, blue: 0.804, alpha: 1 },
    { red: 0.525, green: 0.188, blue: 0.71, alpha: 1 },
    { red: 0.443, green: 0.141, blue: 0.647, alpha: 1 }
  ],
  'minecraft:red_glazed_terracotta': [
    { red: 0.69, green: 0.18, blue: 0.149, alpha: 1 },
    { red: 0.808, green: 0.294, blue: 0.267, alpha: 1 },
    { red: 0.557, green: 0.125, blue: 0.125, alpha: 1 }
  ],
  'minecraft:red_terracotta': [
    { red: 0.553, green: 0.231, blue: 0.18, alpha: 1 },
    { red: 0.557, green: 0.239, blue: 0.184, alpha: 1 },
    { red: 0.557, green: 0.235, blue: 0.18, alpha: 1 }
  ],
  'minecraft:red_wool': [
    { red: 0.722, green: 0.204, blue: 0.173, alpha: 1 },
    { red: 0.6, green: 0.141, blue: 0.129, alpha: 1 },
    { red: 0.675, green: 0.173, blue: 0.141, alpha: 1 }
  ],
  'minecraft:silver_glazed_terracotta': [
    { red: 0.8, green: 0.816, blue: 0.824, alpha: 1 },
    { red: 0.6, green: 0.6, blue: 0.6, alpha: 1 },
    { red: 0.376, green: 0.447, blue: 0.467, alpha: 1 }
  ],
  'minecraft:spruce_leaves': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_sapling': [
    { red: 0.133, green: 0.208, blue: 0.133, alpha: 1 },
    { red: 0.18, green: 0.286, blue: 0.18, alpha: 1 },
    { red: 0.224, green: 0.353, blue: 0.224, alpha: 1 }
  ],
  'minecraft:white_glazed_terracotta': [
    { red: 0.976, green: 1, blue: 0.996, alpha: 1 },
    { red: 0.137, green: 0.537, blue: 0.78, alpha: 1 },
    { red: 0.996, green: 0.847, blue: 0.239, alpha: 1 }
  ],
  'minecraft:white_terracotta': [
    { red: 0.824, green: 0.694, blue: 0.631, alpha: 1 },
    { red: 0.82, green: 0.694, blue: 0.631, alpha: 1 },
    { red: 0.812, green: 0.686, blue: 0.627, alpha: 1 }
  ],
  'minecraft:white_wool': [
    { red: 0.996, green: 0.996, blue: 0.996, alpha: 1 },
    { red: 0.98, green: 0.98, blue: 0.98, alpha: 1 },
    { red: 0.871, green: 0.886, blue: 0.89, alpha: 1 }
  ],
  'minecraft:yellow_glazed_terracotta': [
    { red: 1, green: 0.925, blue: 0.616, alpha: 1 },
    { red: 0.949, green: 0.69, blue: 0.082, alpha: 1 },
    { red: 0.643, green: 0.463, blue: 0.298, alpha: 1 }
  ],
  'minecraft:yellow_terracotta': [
    { red: 0.722, green: 0.514, blue: 0.133, alpha: 1 },
    { red: 0.729, green: 0.525, blue: 0.141, alpha: 1 },
    { red: 0.729, green: 0.522, blue: 0.141, alpha: 1 }
  ],
  'minecraft:yellow_wool': [
    { red: 0.996, green: 0.851, blue: 0.247, alpha: 1 },
    { red: 0.992, green: 0.831, blue: 0.208, alpha: 1 },
    { red: 0.965, green: 0.741, blue: 0.122, alpha: 1 }
  ],
  'minecraft:black_stained_glass': [ { red: 0.098, green: 0.098, blue: 0.098, alpha: 1 } ],
  'minecraft:black_stained_glass_pane': [ { red: 0.098, green: 0.098, blue: 0.098, alpha: 1 } ],
  'minecraft:blue_stained_glass': [ { red: 0.2, green: 0.298, blue: 0.698, alpha: 1 } ],
  'minecraft:blue_stained_glass_pane': [ { red: 0.2, green: 0.298, blue: 0.698, alpha: 1 } ],
  'minecraft:brown_stained_glass': [ { red: 0.4, green: 0.298, blue: 0.2, alpha: 1 } ],
  'minecraft:brown_stained_glass_pane': [ { red: 0.4, green: 0.298, blue: 0.2, alpha: 1 } ],
  'minecraft:cyan_stained_glass': [ { red: 0.298, green: 0.498, blue: 0.6, alpha: 1 } ],
  'minecraft:cyan_stained_glass_pane': [ { red: 0.298, green: 0.498, blue: 0.6, alpha: 1 } ],
  'minecraft:gray_stained_glass': [ { red: 0.298, green: 0.298, blue: 0.298, alpha: 1 } ],
  'minecraft:gray_stained_glass_pane': [ { red: 0.298, green: 0.298, blue: 0.298, alpha: 1 } ],
  'minecraft:green_stained_glass': [ { red: 0.4, green: 0.498, blue: 0.2, alpha: 1 } ],
  'minecraft:green_stained_glass_pane': [ { red: 0.4, green: 0.498, blue: 0.2, alpha: 1 } ],
  'minecraft:light_blue_stained_glass': [ { red: 0.4, green: 0.6, blue: 0.847, alpha: 1 } ],
  'minecraft:light_blue_stained_glass_pane': [ { red: 0.4, green: 0.6, blue: 0.847, alpha: 1 } ],
  'minecraft:light_gray_stained_glass': [ { red: 0.6, green: 0.6, blue: 0.6, alpha: 1 } ],
  'minecraft:light_gray_stained_glass_pane': [ { red: 0.6, green: 0.6, blue: 0.6, alpha: 1 } ],
  'minecraft:lime_stained_glass': [ { red: 0.498, green: 0.8, blue: 0.098, alpha: 1 } ],
  'minecraft:lime_stained_glass_pane': [ { red: 0.498, green: 0.8, blue: 0.098, alpha: 1 } ],
  'minecraft:magenta_stained_glass': [ { red: 0.698, green: 0.298, blue: 0.847, alpha: 1 } ],
  'minecraft:magenta_stained_glass_pane': [ { red: 0.698, green: 0.298, blue: 0.847, alpha: 1 } ],
  'minecraft:orange_stained_glass': [ { red: 0.847, green: 0.498, blue: 0.2, alpha: 1 } ],
  'minecraft:orange_stained_glass_pane': [ { red: 0.847, green: 0.498, blue: 0.2, alpha: 1 } ],
  'minecraft:pink_stained_glass': [ { red: 0.949, green: 0.498, blue: 0.647, alpha: 1 } ],
  'minecraft:pink_stained_glass_pane': [ { red: 0.949, green: 0.498, blue: 0.647, alpha: 1 } ],
  'minecraft:purple_stained_glass': [ { red: 0.498, green: 0.247, blue: 0.698, alpha: 1 } ],
  'minecraft:purple_stained_glass_pane': [ { red: 0.498, green: 0.247, blue: 0.698, alpha: 1 } ],
  'minecraft:red_stained_glass': [ { red: 0.6, green: 0.2, blue: 0.2, alpha: 1 } ],
  'minecraft:red_stained_glass_pane': [ { red: 0.6, green: 0.2, blue: 0.2, alpha: 1 } ],
  'minecraft:white_stained_glass': [ { red: 1, green: 1, blue: 1, alpha: 1 } ],
  'minecraft:white_stained_glass_pane': [ { red: 1, green: 1, blue: 1, alpha: 1 } ],
  'minecraft:yellow_stained_glass': [ { red: 0.898, green: 0.898, blue: 0.2, alpha: 1 } ],
  'minecraft:yellow_stained_glass_pane': [ { red: 0.898, green: 0.898, blue: 0.2, alpha: 1 } ],
  'minecraft:black_shulker_box': [
    { red: 0.122, green: 0.122, blue: 0.137, alpha: 1 },
    { red: 0.09, green: 0.09, blue: 0.106, alpha: 1 },
    { red: 0.059, green: 0.063, blue: 0.082, alpha: 1 }
  ],
  'minecraft:blue_shulker_box': [
    { red: 0.2, green: 0.208, blue: 0.608, alpha: 1 },
    { red: 0.161, green: 0.169, blue: 0.537, alpha: 1 },
    { red: 0.196, green: 0.208, blue: 0.604, alpha: 1 }
  ],
  'minecraft:brown_shulker_box': [
    { red: 0.451, green: 0.282, blue: 0.157, alpha: 1 },
    { red: 0.404, green: 0.251, blue: 0.133, alpha: 1 },
    { red: 0.447, green: 0.278, blue: 0.157, alpha: 1 }
  ],
  'minecraft:cyan_shulker_box': [
    { red: 0.086, green: 0.529, blue: 0.573, alpha: 1 },
    { red: 0.082, green: 0.467, blue: 0.533, alpha: 1 },
    { red: 0.086, green: 0.525, blue: 0.569, alpha: 1 }
  ],
  'minecraft:gray_shulker_box': [
    { red: 0.243, green: 0.259, blue: 0.275, alpha: 1 },
    { red: 0.212, green: 0.224, blue: 0.239, alpha: 1 },
    { red: 0.239, green: 0.259, blue: 0.271, alpha: 1 }
  ],
  'minecraft:green_shulker_box': [
    { red: 0.329, green: 0.427, blue: 0.11, alpha: 1 },
    { red: 0.302, green: 0.38, blue: 0.133, alpha: 1 },
    { red: 0.329, green: 0.424, blue: 0.114, alpha: 1 }
  ],
  'minecraft:light_blue_shulker_box': [
    { red: 0.231, green: 0.706, blue: 0.859, alpha: 1 },
    { red: 0.173, green: 0.616, blue: 0.827, alpha: 1 },
    { red: 0.227, green: 0.702, blue: 0.855, alpha: 1 }
  ],
  'minecraft:light_gray_shulker_box': [
    { red: 0.549, green: 0.549, blue: 0.514, alpha: 1 },
    { red: 0.478, green: 0.478, blue: 0.439, alpha: 1 },
    { red: 0.545, green: 0.545, blue: 0.51, alpha: 1 }
  ],
  'minecraft:lime_shulker_box': [
    { red: 0.443, green: 0.737, blue: 0.094, alpha: 1 },
    { red: 0.38, green: 0.678, blue: 0.098, alpha: 1 },
    { red: 0.435, green: 0.733, blue: 0.094, alpha: 1 }
  ],
  'minecraft:magenta_shulker_box': [
    { red: 0.729, green: 0.247, blue: 0.686, alpha: 1 },
    { red: 0.671, green: 0.192, blue: 0.631, alpha: 1 },
    { red: 0.725, green: 0.243, blue: 0.682, alpha: 1 }
  ],
  'minecraft:orange_shulker_box': [
    { red: 0.961, green: 0.455, blue: 0.063, alpha: 1 },
    { red: 0.922, green: 0.408, blue: 0.016, alpha: 1 },
    { red: 0.957, green: 0.451, blue: 0.059, alpha: 1 }
  ],
  'minecraft:pink_shulker_box': [
    { red: 0.953, green: 0.545, blue: 0.667, alpha: 1 },
    { red: 0.894, green: 0.447, blue: 0.604, alpha: 1 },
    { red: 0.949, green: 0.537, blue: 0.659, alpha: 1 }
  ],
  'minecraft:purple_shulker_box': [
    { red: 0.455, green: 0.149, blue: 0.663, alpha: 1 },
    { red: 0.384, green: 0.118, blue: 0.604, alpha: 1 },
    { red: 0.447, green: 0.145, blue: 0.659, alpha: 1 }
  ],
  'minecraft:red_shulker_box': [
    { red: 0.612, green: 0.145, blue: 0.133, alpha: 1 },
    { red: 0.529, green: 0.114, blue: 0.118, alpha: 1 },
    { red: 0.604, green: 0.141, blue: 0.133, alpha: 1 }
  ],
  'minecraft:undyed_shulker_box': [
    { red: 0.592, green: 0.412, blue: 0.592, alpha: 1 },
    { red: 0.592, green: 0.404, blue: 0.592, alpha: 1 },
    { red: 0.592, green: 0.416, blue: 0.592, alpha: 1 }
  ],
  'minecraft:white_shulker_box': [
    { red: 0.902, green: 0.918, blue: 0.918, alpha: 1 },
    { red: 0.835, green: 0.855, blue: 0.859, alpha: 1 },
    { red: 0.894, green: 0.914, blue: 0.914, alpha: 1 }
  ],
  'minecraft:yellow_shulker_box': [
    { red: 0.988, green: 0.78, blue: 0.141, alpha: 1 },
    { red: 0.973, green: 0.725, blue: 0.102, alpha: 1 },
    { red: 0.988, green: 0.776, blue: 0.137, alpha: 1 }
  ],
  'minecraft:black_candle': [
    { red: 0.102, green: 0.094, blue: 0.153, alpha: 1 },
    { red: 0.153, green: 0.149, blue: 0.239, alpha: 1 },
    { red: 0.22, green: 0.216, blue: 0.318, alpha: 1 }
  ],
  'minecraft:black_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:black_carpet': [
    { red: 0.11, green: 0.11, blue: 0.125, alpha: 1 },
    { red: 0.145, green: 0.145, blue: 0.161, alpha: 1 },
    { red: 0.059, green: 0.063, blue: 0.082, alpha: 1 }
  ],
  'minecraft:black_concrete': [
    { red: 0.035, green: 0.043, blue: 0.063, alpha: 1 },
    { red: 0.031, green: 0.039, blue: 0.059, alpha: 1 },
    { red: 0.027, green: 0.035, blue: 0.055, alpha: 1 }
  ],
  'minecraft:black_concrete_powder': [
    { red: 0.11, green: 0.118, blue: 0.133, alpha: 1 },
    { red: 0.098, green: 0.106, blue: 0.122, alpha: 1 },
    { red: 0.071, green: 0.082, blue: 0.106, alpha: 1 }
  ],
  'minecraft:blue_candle': [
    { red: 0.208, green: 0.278, blue: 0.604, alpha: 1 },
    { red: 0.227, green: 0.302, blue: 0.647, alpha: 1 },
    { red: 0.271, green: 0.353, blue: 0.745, alpha: 1 }
  ],
  'minecraft:blue_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:blue_carpet': [
    { red: 0.243, green: 0.302, blue: 0.698, alpha: 1 },
    { red: 0.231, green: 0.251, blue: 0.651, alpha: 1 },
    { red: 0.192, green: 0.2, blue: 0.588, alpha: 1 }
  ],
  'minecraft:blue_concrete': [
    { red: 0.173, green: 0.18, blue: 0.561, alpha: 1 },
    { red: 0.176, green: 0.184, blue: 0.565, alpha: 1 },
    { red: 0.18, green: 0.188, blue: 0.565, alpha: 1 }
  ],
  'minecraft:blue_concrete_powder': [
    { red: 0.271, green: 0.282, blue: 0.647, alpha: 1 },
    { red: 0.259, green: 0.271, blue: 0.631, alpha: 1 },
    { red: 0.259, green: 0.271, blue: 0.635, alpha: 1 }
  ],
  'minecraft:brown_candle': [
    { red: 0.392, green: 0.239, blue: 0.129, alpha: 1 },
    { red: 0.447, green: 0.278, blue: 0.157, alpha: 1 },
    { red: 0.561, green: 0.357, blue: 0.208, alpha: 1 }
  ],
  'minecraft:brown_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:brown_carpet': [
    { red: 0.494, green: 0.314, blue: 0.184, alpha: 1 },
    { red: 0.514, green: 0.329, blue: 0.196, alpha: 1 },
    { red: 0.427, green: 0.267, blue: 0.149, alpha: 1 }
  ],
  'minecraft:brown_concrete': [
    { red: 0.38, green: 0.235, blue: 0.125, alpha: 1 },
    { red: 0.376, green: 0.231, blue: 0.122, alpha: 1 },
    { red: 0.373, green: 0.231, blue: 0.122, alpha: 1 }
  ],
  'minecraft:brown_concrete_powder': [
    { red: 0.486, green: 0.322, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.318, blue: 0.196, alpha: 1 },
    { red: 0.475, green: 0.318, blue: 0.2, alpha: 1 }
  ],
  'minecraft:candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:cyan_candle': [
    { red: 0.059, green: 0.412, blue: 0.408, alpha: 1 },
    { red: 0.063, green: 0.533, blue: 0.529, alpha: 1 },
    { red: 0.071, green: 0.62, blue: 0.616, alpha: 1 }
  ],
  'minecraft:cyan_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:cyan_carpet': [
    { red: 0.086, green: 0.588, blue: 0.596, alpha: 1 },
    { red: 0.086, green: 0.608, blue: 0.612, alpha: 1 },
    { red: 0.082, green: 0.498, blue: 0.549, alpha: 1 }
  ],
  'minecraft:cyan_concrete': [
    { red: 0.082, green: 0.467, blue: 0.533, alpha: 1 },
    { red: 0.086, green: 0.471, blue: 0.537, alpha: 1 },
    { red: 0.082, green: 0.463, blue: 0.529, alpha: 1 }
  ],
  'minecraft:cyan_concrete_powder': [
    { red: 0.145, green: 0.549, blue: 0.604, alpha: 1 },
    { red: 0.145, green: 0.553, blue: 0.604, alpha: 1 },
    { red: 0.145, green: 0.565, blue: 0.608, alpha: 1 }
  ],
  'minecraft:gray_candle': [
    { red: 0.29, green: 0.349, blue: 0.353, alpha: 1 },
    { red: 0.322, green: 0.38, blue: 0.384, alpha: 1 },
    { red: 0.384, green: 0.443, blue: 0.451, alpha: 1 }
  ],
  'minecraft:gray_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:gray_carpet': [
    { red: 0.278, green: 0.31, blue: 0.322, alpha: 1 },
    { red: 0.271, green: 0.298, blue: 0.31, alpha: 1 },
    { red: 0.267, green: 0.294, blue: 0.306, alpha: 1 }
  ],
  'minecraft:gray_concrete': [
    { red: 0.216, green: 0.227, blue: 0.243, alpha: 1 },
    { red: 0.212, green: 0.224, blue: 0.239, alpha: 1 },
    { red: 0.22, green: 0.231, blue: 0.247, alpha: 1 }
  ],
  'minecraft:gray_concrete_powder': [
    { red: 0.298, green: 0.314, blue: 0.325, alpha: 1 },
    { red: 0.29, green: 0.302, blue: 0.318, alpha: 1 },
    { red: 0.314, green: 0.325, blue: 0.341, alpha: 1 }
  ],
  'minecraft:green_candle': [
    { red: 0.247, green: 0.325, blue: 0.071, alpha: 1 },
    { red: 0.29, green: 0.388, blue: 0.075, alpha: 1 },
    { red: 0.376, green: 0.506, blue: 0.086, alpha: 1 }
  ],
  'minecraft:green_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:green_carpet': [
    { red: 0.396, green: 0.525, blue: 0.098, alpha: 1 },
    { red: 0.314, green: 0.4, blue: 0.118, alpha: 1 },
    { red: 0.318, green: 0.408, blue: 0.114, alpha: 1 }
  ],
  'minecraft:green_concrete': [
    { red: 0.286, green: 0.357, blue: 0.141, alpha: 1 },
    { red: 0.29, green: 0.361, blue: 0.145, alpha: 1 },
    { red: 0.286, green: 0.353, blue: 0.141, alpha: 1 }
  ],
  'minecraft:green_concrete_powder': [
    { red: 0.365, green: 0.443, blue: 0.188, alpha: 1 },
    { red: 0.365, green: 0.435, blue: 0.196, alpha: 1 },
    { red: 0.369, green: 0.447, blue: 0.184, alpha: 1 }
  ],
  'minecraft:light_blue_candle': [
    { red: 0.125, green: 0.522, blue: 0.773, alpha: 1 },
    { red: 0.125, green: 0.553, blue: 0.804, alpha: 1 },
    { red: 0.161, green: 0.631, blue: 0.835, alpha: 1 }
  ],
  'minecraft:light_blue_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:light_blue_carpet': [
    { red: 0.306, green: 0.773, blue: 0.906, alpha: 1 },
    { red: 0.286, green: 0.761, blue: 0.894, alpha: 1 },
    { red: 0.192, green: 0.647, blue: 0.827, alpha: 1 }
  ],
  'minecraft:light_blue_concrete': [
    { red: 0.137, green: 0.537, blue: 0.78, alpha: 1 },
    { red: 0.141, green: 0.541, blue: 0.784, alpha: 1 },
    { red: 0.137, green: 0.533, blue: 0.776, alpha: 1 }
  ],
  'minecraft:light_blue_concrete_powder': [
    { red: 0.29, green: 0.714, blue: 0.831, alpha: 1 },
    { red: 0.271, green: 0.682, blue: 0.82, alpha: 1 },
    { red: 0.263, green: 0.675, blue: 0.812, alpha: 1 }
  ],
  'minecraft:light_gray_candle': [
    { red: 0.416, green: 0.427, blue: 0.384, alpha: 1 },
    { red: 0.49, green: 0.498, blue: 0.467, alpha: 1 },
    { red: 0.576, green: 0.584, blue: 0.549, alpha: 1 }
  ],
  'minecraft:light_gray_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:light_gray_carpet': [
    { red: 0.6, green: 0.6, blue: 0.576, alpha: 1 },
    { red: 0.616, green: 0.616, blue: 0.592, alpha: 1 },
    { red: 0.529, green: 0.529, blue: 0.498, alpha: 1 }
  ],
  'minecraft:light_gray_concrete': [
    { red: 0.49, green: 0.49, blue: 0.451, alpha: 1 },
    { red: 0.494, green: 0.494, blue: 0.455, alpha: 1 },
    { red: 0.486, green: 0.486, blue: 0.447, alpha: 1 }
  ],
  'minecraft:light_gray_concrete_powder': [
    { red: 0.616, green: 0.616, blue: 0.592, alpha: 1 },
    { red: 0.576, green: 0.576, blue: 0.545, alpha: 1 },
    { red: 0.6, green: 0.6, blue: 0.573, alpha: 1 }
  ],
  'minecraft:lime_candle': [
    { red: 0.353, green: 0.647, blue: 0.063, alpha: 1 },
    { red: 0.384, green: 0.714, blue: 0.094, alpha: 1 },
    { red: 0.482, green: 0.776, blue: 0.094, alpha: 1 }
  ],
  'minecraft:lime_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:lime_carpet': [
    { red: 0.525, green: 0.8, blue: 0.149, alpha: 1 },
    { red: 0.486, green: 0.765, blue: 0.106, alpha: 1 },
    { red: 0.404, green: 0.694, blue: 0.094, alpha: 1 }
  ],
  'minecraft:lime_concrete': [
    { red: 0.369, green: 0.663, blue: 0.094, alpha: 1 },
    { red: 0.373, green: 0.667, blue: 0.098, alpha: 1 },
    { red: 0.365, green: 0.659, blue: 0.094, alpha: 1 }
  ],
  'minecraft:lime_concrete_powder': [
    { red: 0.478, green: 0.729, blue: 0.157, alpha: 1 },
    { red: 0.486, green: 0.737, blue: 0.157, alpha: 1 },
    { red: 0.494, green: 0.749, blue: 0.161, alpha: 1 }
  ],
  'minecraft:magenta_candle': [
    { red: 0.612, green: 0.157, blue: 0.58, alpha: 1 },
    { red: 0.643, green: 0.173, blue: 0.612, alpha: 1 },
    { red: 0.741, green: 0.235, blue: 0.706, alpha: 1 }
  ],
  'minecraft:magenta_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:magenta_carpet': [
    { red: 0.839, green: 0.376, blue: 0.82, alpha: 1 },
    { red: 0.792, green: 0.322, blue: 0.757, alpha: 1 },
    { red: 0.698, green: 0.224, blue: 0.659, alpha: 1 }
  ],
  'minecraft:magenta_concrete': [
    { red: 0.663, green: 0.188, blue: 0.624, alpha: 1 },
    { red: 0.667, green: 0.192, blue: 0.627, alpha: 1 },
    { red: 0.667, green: 0.196, blue: 0.627, alpha: 1 }
  ],
  'minecraft:magenta_concrete_powder': [
    { red: 0.773, green: 0.357, blue: 0.737, alpha: 1 },
    { red: 0.733, green: 0.286, blue: 0.698, alpha: 1 },
    { red: 0.733, green: 0.298, blue: 0.698, alpha: 1 }
  ],
  'minecraft:orange_candle': [
    { red: 0.835, green: 0.349, blue: 0, alpha: 1 },
    { red: 0.902, green: 0.396, blue: 0, alpha: 1 },
    { red: 1, green: 0.506, blue: 0.094, alpha: 1 }
  ],
  'minecraft:orange_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:orange_carpet': [
    { red: 0.976, green: 0.576, blue: 0.169, alpha: 1 },
    { red: 0.976, green: 0.518, blue: 0.125, alpha: 1 },
    { red: 0.925, green: 0.427, blue: 0.043, alpha: 1 }
  ],
  'minecraft:orange_concrete': [
    { red: 0.882, green: 0.38, blue: 0, alpha: 1 },
    { red: 0.875, green: 0.376, blue: 0, alpha: 1 },
    { red: 0.882, green: 0.384, blue: 0.008, alpha: 1 }
  ],
  'minecraft:orange_concrete_powder': [
    { red: 0.871, green: 0.475, blue: 0.075, alpha: 1 },
    { red: 0.894, green: 0.537, blue: 0.157, alpha: 1 },
    { red: 0.875, green: 0.49, blue: 0.098, alpha: 1 }
  ],
  'minecraft:pink_candle': [
    { red: 0.773, green: 0.349, blue: 0.514, alpha: 1 },
    { red: 0.871, green: 0.396, blue: 0.58, alpha: 1 },
    { red: 0.965, green: 0.537, blue: 0.675, alpha: 1 }
  ],
  'minecraft:pink_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:pink_carpet': [
    { red: 0.957, green: 0.698, blue: 0.788, alpha: 1 },
    { red: 0.957, green: 0.655, blue: 0.753, alpha: 1 },
    { red: 0.925, green: 0.494, blue: 0.631, alpha: 1 }
  ],
  'minecraft:pink_concrete': [
    { red: 0.839, green: 0.396, blue: 0.561, alpha: 1 },
    { red: 0.835, green: 0.392, blue: 0.557, alpha: 1 },
    { red: 0.839, green: 0.4, blue: 0.565, alpha: 1 }
  ],
  'minecraft:pink_concrete_powder': [
    { red: 0.902, green: 0.584, blue: 0.702, alpha: 1 },
    { red: 0.867, green: 0.522, blue: 0.659, alpha: 1 },
    { red: 0.898, green: 0.58, blue: 0.698, alpha: 1 }
  ],
  'minecraft:purple_candle': [
    { red: 0.384, green: 0.11, blue: 0.612, alpha: 1 },
    { red: 0.416, green: 0.141, blue: 0.643, alpha: 1 },
    { red: 0.514, green: 0.173, blue: 0.706, alpha: 1 }
  ],
  'minecraft:purple_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:purple_carpet': [
    { red: 0.592, green: 0.263, blue: 0.804, alpha: 1 },
    { red: 0.525, green: 0.188, blue: 0.71, alpha: 1 },
    { red: 0.443, green: 0.141, blue: 0.647, alpha: 1 }
  ],
  'minecraft:purple_concrete': [
    { red: 0.396, green: 0.125, blue: 0.616, alpha: 1 },
    { red: 0.392, green: 0.122, blue: 0.612, alpha: 1 },
    { red: 0.396, green: 0.129, blue: 0.616, alpha: 1 }
  ],
  'minecraft:purple_concrete_powder': [
    { red: 0.486, green: 0.2, blue: 0.675, alpha: 1 },
    { red: 0.502, green: 0.212, blue: 0.686, alpha: 1 },
    { red: 0.498, green: 0.204, blue: 0.686, alpha: 1 }
  ],
  'minecraft:red_candle': [
    { red: 0.565, green: 0.129, blue: 0.125, alpha: 1 },
    { red: 0.635, green: 0.153, blue: 0.133, alpha: 1 },
    { red: 0.71, green: 0.192, blue: 0.161, alpha: 1 }
  ],
  'minecraft:red_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:red_carpet': [
    { red: 0.722, green: 0.204, blue: 0.173, alpha: 1 },
    { red: 0.6, green: 0.141, blue: 0.129, alpha: 1 },
    { red: 0.675, green: 0.173, blue: 0.141, alpha: 1 }
  ],
  'minecraft:red_concrete': [
    { red: 0.557, green: 0.125, blue: 0.125, alpha: 1 },
    { red: 0.561, green: 0.129, blue: 0.129, alpha: 1 },
    { red: 0.561, green: 0.133, blue: 0.133, alpha: 1 }
  ],
  'minecraft:red_concrete_powder': [
    { red: 0.643, green: 0.2, blue: 0.196, alpha: 1 },
    { red: 0.651, green: 0.204, blue: 0.196, alpha: 1 },
    { red: 0.647, green: 0.204, blue: 0.2, alpha: 1 }
  ],
  'minecraft:white_candle': [
    { red: 0.78, green: 0.827, blue: 0.827, alpha: 1 },
    { red: 0.878, green: 0.898, blue: 0.898, alpha: 1 },
    { red: 0.973, green: 0.973, blue: 0.973, alpha: 1 }
  ],
  'minecraft:white_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:white_carpet': [
    { red: 0.996, green: 0.996, blue: 0.996, alpha: 1 },
    { red: 0.98, green: 0.98, blue: 0.98, alpha: 1 },
    { red: 0.871, green: 0.886, blue: 0.89, alpha: 1 }
  ],
  'minecraft:white_concrete': [
    { red: 0.812, green: 0.835, blue: 0.839, alpha: 1 },
    { red: 0.816, green: 0.839, blue: 0.843, alpha: 1 },
    { red: 0.808, green: 0.831, blue: 0.835, alpha: 1 }
  ],
  'minecraft:white_concrete_powder': [
    { red: 0.878, green: 0.886, blue: 0.886, alpha: 1 },
    { red: 0.886, green: 0.894, blue: 0.894, alpha: 1 },
    { red: 0.894, green: 0.902, blue: 0.902, alpha: 1 }
  ],
  'minecraft:yellow_candle': [
    { red: 0.773, green: 0.596, blue: 0.145, alpha: 1 },
    { red: 0.855, green: 0.671, blue: 0.204, alpha: 1 },
    { red: 1, green: 0.8, blue: 0.294, alpha: 1 }
  ],
  'minecraft:yellow_candle_cake': [
    { red: 1, green: 0.992, blue: 0.996, alpha: 1 },
    { red: 0.553, green: 0.263, blue: 0.141, alpha: 1 },
    { red: 0.78, green: 0.38, blue: 0.141, alpha: 1 }
  ],
  'minecraft:yellow_carpet': [
    { red: 0.996, green: 0.851, blue: 0.247, alpha: 1 },
    { red: 0.992, green: 0.831, blue: 0.208, alpha: 1 },
    { red: 0.965, green: 0.741, blue: 0.122, alpha: 1 }
  ],
  'minecraft:yellow_concrete': [
    { red: 0.945, green: 0.686, blue: 0.082, alpha: 1 },
    { red: 0.949, green: 0.69, blue: 0.082, alpha: 1 },
    { red: 0.941, green: 0.686, blue: 0.082, alpha: 1 }
  ],
  'minecraft:yellow_concrete_powder': [
    { red: 0.929, green: 0.788, blue: 0.2, alpha: 1 },
    { red: 0.906, green: 0.765, blue: 0.196, alpha: 1 },
    { red: 0.89, green: 0.749, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_wood': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:birch_wood': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:cherry_wood': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:crimson_hyphae': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:dark_oak_wood': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:jungle_wood': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:mangrove_wood': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:oak_wood': [
    { red: 0.455, green: 0.353, blue: 0.212, alpha: 1 },
    { red: 0.569, green: 0.443, blue: 0.259, alpha: 1 },
    { red: 0.373, green: 0.29, blue: 0.169, alpha: 1 }
  ],
  'minecraft:pale_oak_wood': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:spruce_wood': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:stripped_acacia_wood': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:stripped_birch_wood': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:stripped_cherry_wood': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:stripped_crimson_hyphae': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:stripped_dark_oak_wood': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:stripped_jungle_wood': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:stripped_mangrove_wood': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:stripped_oak_wood': [
    { red: 0.725, green: 0.584, blue: 0.345, alpha: 1 },
    { red: 0.753, green: 0.616, blue: 0.384, alpha: 1 },
    { red: 0.682, green: 0.557, blue: 0.322, alpha: 1 }
  ],
  'minecraft:stripped_pale_oak_wood': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:stripped_spruce_wood': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:stripped_warped_hyphae': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_hyphae': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:acacia_planks': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:bamboo_planks': [
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 },
    { red: 0.89, green: 0.8, blue: 0.416, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:birch_planks': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:cherry_planks': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:crimson_planks': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:dark_oak_planks': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:jungle_planks': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:mangrove_planks': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:oak_planks': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:pale_oak_planks': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:spruce_planks': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:warped_planks': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:acacia_hanging_sign': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_standing_sign': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_wall_sign': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:bamboo_door': [
    { red: 0.663, green: 0.596, blue: 0.275, alpha: 1 },
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:bamboo_double_slab': [
    { red: 0.349, green: 0.565, blue: 0.012, alpha: 1 },
    { red: 0.325, green: 0.51, blue: 0.035, alpha: 1 },
    { red: 0.553, green: 0.761, blue: 0.31, alpha: 1 }
  ],
  'minecraft:bamboo_hanging_sign': [
    { red: 0.349, green: 0.565, blue: 0.012, alpha: 1 },
    { red: 0.325, green: 0.51, blue: 0.035, alpha: 1 },
    { red: 0.553, green: 0.761, blue: 0.31, alpha: 1 }
  ],
  'minecraft:bamboo_mosaic_double_slab': [
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 },
    { red: 0.6, green: 0.529, blue: 0.255, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:bamboo_pressure_plate': [
    { red: 0.349, green: 0.565, blue: 0.012, alpha: 1 },
    { red: 0.325, green: 0.51, blue: 0.035, alpha: 1 },
    { red: 0.553, green: 0.761, blue: 0.31, alpha: 1 }
  ],
  'minecraft:bamboo_slab': [
    { red: 0.349, green: 0.565, blue: 0.012, alpha: 1 },
    { red: 0.325, green: 0.51, blue: 0.035, alpha: 1 },
    { red: 0.553, green: 0.761, blue: 0.31, alpha: 1 }
  ],
  'minecraft:bamboo_stairs': [
    { red: 0.349, green: 0.565, blue: 0.012, alpha: 1 },
    { red: 0.325, green: 0.51, blue: 0.035, alpha: 1 },
    { red: 0.553, green: 0.761, blue: 0.31, alpha: 1 }
  ],
  'minecraft:bamboo_standing_sign': [
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 },
    { red: 0.89, green: 0.8, blue: 0.416, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:bamboo_trapdoor': [
    { red: 0.89, green: 0.8, blue: 0.416, alpha: 1 },
    { red: 0.663, green: 0.596, blue: 0.275, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:bamboo_wall_sign': [
    { red: 0.784, green: 0.694, blue: 0.302, alpha: 1 },
    { red: 0.89, green: 0.8, blue: 0.416, alpha: 1 },
    { red: 0.851, green: 0.761, blue: 0.369, alpha: 1 }
  ],
  'minecraft:birch_hanging_sign': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_standing_sign': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_wall_sign': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:cherry_hanging_sign': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:cherry_standing_sign': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:cherry_wall_sign': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:crimson_hanging_sign': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:crimson_standing_sign': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:crimson_wall_sign': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:dark_oak_hanging_sign': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:darkoak_standing_sign': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:darkoak_wall_sign': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:jungle_hanging_sign': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_standing_sign': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_wall_sign': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:mangrove_hanging_sign': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:mangrove_standing_sign': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:mangrove_wall_sign': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:oak_hanging_sign': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:pale_oak_hanging_sign': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_standing_sign': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_wall_sign': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:spruce_hanging_sign': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_standing_sign': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_wall_sign': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:standing_sign': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:wall_sign': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:warped_hanging_sign': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_standing_sign': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_wall_sign': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:brain_coral': [
    { red: 0.616, green: 0.184, blue: 0.467, alpha: 1 },
    { red: 0.839, green: 0.329, blue: 0.608, alpha: 1 },
    { red: 0.91, green: 0.557, blue: 0.757, alpha: 1 }
  ],
  'minecraft:brain_coral_block': [
    { red: 0.749, green: 0.275, blue: 0.573, alpha: 1 },
    { red: 0.851, green: 0.384, blue: 0.639, alpha: 1 },
    { red: 0.894, green: 0.494, blue: 0.725, alpha: 1 }
  ],
  'minecraft:brain_coral_fan': [
    { red: 0.749, green: 0.275, blue: 0.573, alpha: 1 },
    { red: 0.839, green: 0.329, blue: 0.608, alpha: 1 },
    { red: 0.894, green: 0.494, blue: 0.725, alpha: 1 }
  ],
  'minecraft:brain_coral_wall_fan': [
    { red: 0.749, green: 0.275, blue: 0.573, alpha: 1 },
    { red: 0.839, green: 0.329, blue: 0.608, alpha: 1 },
    { red: 0.894, green: 0.494, blue: 0.725, alpha: 1 }
  ],
  'minecraft:bubble_coral': [
    { red: 0.647, green: 0.114, blue: 0.647, alpha: 1 },
    { red: 0.784, green: 0.098, blue: 0.729, alpha: 1 },
    { red: 0.494, green: 0.035, blue: 0.529, alpha: 1 }
  ],
  'minecraft:bubble_coral_block': [
    { red: 0.722, green: 0.137, blue: 0.722, alpha: 1 },
    { red: 0.647, green: 0.118, blue: 0.647, alpha: 1 },
    { red: 0.855, green: 0.114, blue: 0.796, alpha: 1 }
  ],
  'minecraft:bubble_coral_fan': [
    { red: 0.647, green: 0.114, blue: 0.647, alpha: 1 },
    { red: 0.804, green: 0.271, blue: 0.749, alpha: 1 },
    { red: 0.494, green: 0.035, blue: 0.529, alpha: 1 }
  ],
  'minecraft:bubble_coral_wall_fan': [
    { red: 0.647, green: 0.114, blue: 0.647, alpha: 1 },
    { red: 0.804, green: 0.271, blue: 0.749, alpha: 1 },
    { red: 0.494, green: 0.035, blue: 0.529, alpha: 1 }
  ],
  'minecraft:dead_brain_coral': [
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.643, green: 0.627, blue: 0.612, alpha: 1 }
  ],
  'minecraft:dead_brain_coral_block': [
    { red: 0.408, green: 0.392, blue: 0.388, alpha: 1 },
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_brain_coral_fan': [
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_brain_coral_wall_fan': [
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_bubble_coral': [
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 }
  ],
  'minecraft:dead_bubble_coral_block': [
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_bubble_coral_fan': [
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 },
    { red: 0.643, green: 0.627, blue: 0.612, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 }
  ],
  'minecraft:dead_bubble_coral_wall_fan': [
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 },
    { red: 0.643, green: 0.627, blue: 0.612, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 }
  ],
  'minecraft:dead_fire_coral': [
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_fire_coral_block': [
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 }
  ],
  'minecraft:dead_fire_coral_fan': [
    { red: 0.365, green: 0.353, blue: 0.349, alpha: 1 },
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_fire_coral_wall_fan': [
    { red: 0.365, green: 0.353, blue: 0.349, alpha: 1 },
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_horn_coral': [
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 },
    { red: 0.541, green: 0.502, blue: 0.482, alpha: 1 },
    { red: 0.482, green: 0.447, blue: 0.431, alpha: 1 }
  ],
  'minecraft:dead_horn_coral_block': [
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.643, green: 0.627, blue: 0.612, alpha: 1 }
  ],
  'minecraft:dead_horn_coral_fan': [
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_horn_coral_wall_fan': [
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_tube_coral': [
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.365, green: 0.353, blue: 0.349, alpha: 1 },
    { red: 0.541, green: 0.502, blue: 0.482, alpha: 1 }
  ],
  'minecraft:dead_tube_coral_block': [
    { red: 0.525, green: 0.482, blue: 0.467, alpha: 1 },
    { red: 0.408, green: 0.392, blue: 0.388, alpha: 1 },
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 }
  ],
  'minecraft:dead_tube_coral_fan': [
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.408, green: 0.392, blue: 0.388, alpha: 1 }
  ],
  'minecraft:dead_tube_coral_wall_fan': [
    { red: 0.6, green: 0.576, blue: 0.553, alpha: 1 },
    { red: 0.455, green: 0.416, blue: 0.4, alpha: 1 },
    { red: 0.408, green: 0.392, blue: 0.388, alpha: 1 }
  ],
  'minecraft:fire_coral': [
    { red: 0.475, green: 0.102, blue: 0.149, alpha: 1 },
    { red: 0.643, green: 0.133, blue: 0.184, alpha: 1 },
    { red: 0.776, green: 0.165, blue: 0.216, alpha: 1 }
  ],
  'minecraft:fire_coral_block': [
    { red: 0.643, green: 0.133, blue: 0.184, alpha: 1 },
    { red: 0.776, green: 0.165, blue: 0.216, alpha: 1 },
    { red: 0.549, green: 0.114, blue: 0.165, alpha: 1 }
  ],
  'minecraft:fire_coral_fan': [
    { red: 0.475, green: 0.102, blue: 0.149, alpha: 1 },
    { red: 0.643, green: 0.133, blue: 0.184, alpha: 1 },
    { red: 0.776, green: 0.165, blue: 0.216, alpha: 1 }
  ],
  'minecraft:fire_coral_wall_fan': [
    { red: 0.475, green: 0.102, blue: 0.149, alpha: 1 },
    { red: 0.643, green: 0.133, blue: 0.184, alpha: 1 },
    { red: 0.776, green: 0.165, blue: 0.216, alpha: 1 }
  ],
  'minecraft:horn_coral': [
    { red: 0.82, green: 0.702, blue: 0.255, alpha: 1 },
    { red: 0.714, green: 0.537, blue: 0.188, alpha: 1 },
    { red: 0.835, green: 0.796, blue: 0.243, alpha: 1 }
  ],
  'minecraft:horn_coral_block': [
    { red: 0.835, green: 0.796, blue: 0.243, alpha: 1 },
    { red: 0.82, green: 0.702, blue: 0.255, alpha: 1 },
    { red: 0.929, green: 0.925, blue: 0.298, alpha: 1 }
  ],
  'minecraft:horn_coral_fan': [
    { red: 0.82, green: 0.702, blue: 0.255, alpha: 1 },
    { red: 0.745, green: 0.627, blue: 0.208, alpha: 1 },
    { red: 0.835, green: 0.796, blue: 0.243, alpha: 1 }
  ],
  'minecraft:horn_coral_wall_fan': [
    { red: 0.82, green: 0.702, blue: 0.255, alpha: 1 },
    { red: 0.745, green: 0.627, blue: 0.208, alpha: 1 },
    { red: 0.835, green: 0.796, blue: 0.243, alpha: 1 }
  ],
  'minecraft:tube_coral': [
    { red: 0.192, green: 0.31, blue: 0.867, alpha: 1 },
    { red: 0.11, green: 0.216, blue: 0.533, alpha: 1 },
    { red: 0.247, green: 0.424, blue: 0.898, alpha: 1 }
  ],
  'minecraft:tube_coral_block': [
    { red: 0.192, green: 0.31, blue: 0.867, alpha: 1 },
    { red: 0.129, green: 0.263, blue: 0.643, alpha: 1 },
    { red: 0.247, green: 0.424, blue: 0.898, alpha: 1 }
  ],
  'minecraft:tube_coral_fan': [
    { red: 0.247, green: 0.424, blue: 0.898, alpha: 1 },
    { red: 0.192, green: 0.31, blue: 0.867, alpha: 1 },
    { red: 0.129, green: 0.263, blue: 0.643, alpha: 1 }
  ],
  'minecraft:tube_coral_wall_fan': [
    { red: 0.247, green: 0.424, blue: 0.898, alpha: 1 },
    { red: 0.192, green: 0.31, blue: 0.867, alpha: 1 },
    { red: 0.129, green: 0.263, blue: 0.643, alpha: 1 }
  ],
  'minecraft:acacia_double_slab': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_pressure_plate': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_slab': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_stairs': [
    { red: 0.729, green: 0.388, blue: 0.216, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.188, alpha: 1 }
  ],
  'minecraft:acacia_trapdoor': [
    { red: 0.533, green: 0.278, blue: 0.157, alpha: 1 },
    { red: 0.678, green: 0.365, blue: 0.196, alpha: 1 },
    { red: 0.729, green: 0.408, blue: 0.231, alpha: 1 }
  ],
  'minecraft:birch_double_slab': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_pressure_plate': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_slab': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_stairs': [
    { red: 0.843, green: 0.757, blue: 0.522, alpha: 1 },
    { red: 0.784, green: 0.718, blue: 0.478, alpha: 1 },
    { red: 0.722, green: 0.659, blue: 0.459, alpha: 1 }
  ],
  'minecraft:birch_trapdoor': [
    { red: 0.62, green: 0.545, blue: 0.38, alpha: 1 },
    { red: 0.647, green: 0.58, blue: 0.404, alpha: 1 },
    { red: 0.843, green: 0.796, blue: 0.553, alpha: 1 }
  ],
  'minecraft:cherry_pressure_plate': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:crimson_double_slab': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:crimson_pressure_plate': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:crimson_slab': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:crimson_stairs': [
    { red: 0.494, green: 0.227, blue: 0.337, alpha: 1 },
    { red: 0.416, green: 0.204, blue: 0.294, alpha: 1 },
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 }
  ],
  'minecraft:crimson_trapdoor': [
    { red: 0.361, green: 0.188, blue: 0.259, alpha: 1 },
    { red: 0.294, green: 0.153, blue: 0.216, alpha: 1 },
    { red: 0.573, green: 0.255, blue: 0.376, alpha: 1 }
  ],
  'minecraft:dark_oak_double_slab': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:dark_oak_pressure_plate': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:dark_oak_slab': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:dark_oak_stairs': [
    { red: 0.31, green: 0.196, blue: 0.094, alpha: 1 },
    { red: 0.286, green: 0.184, blue: 0.09, alpha: 1 },
    { red: 0.243, green: 0.161, blue: 0.071, alpha: 1 }
  ],
  'minecraft:dark_oak_trapdoor': [
    { red: 0.286, green: 0.192, blue: 0.086, alpha: 1 },
    { red: 0.325, green: 0.212, blue: 0.102, alpha: 1 },
    { red: 0.161, green: 0.102, blue: 0.047, alpha: 1 }
  ],
  'minecraft:jungle_double_slab': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_pressure_plate': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_slab': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_stairs': [
    { red: 0.722, green: 0.529, blue: 0.392, alpha: 1 },
    { red: 0.667, green: 0.475, blue: 0.329, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 }
  ],
  'minecraft:jungle_trapdoor': [
    { red: 0.694, green: 0.502, blue: 0.361, alpha: 1 },
    { red: 0.624, green: 0.443, blue: 0.29, alpha: 1 },
    { red: 0.447, green: 0.314, blue: 0.208, alpha: 1 }
  ],
  'minecraft:mangrove_double_slab': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:mangrove_pressure_plate': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:mangrove_slab': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:mangrove_stairs': [
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 },
    { red: 0.467, green: 0.224, blue: 0.204, alpha: 1 },
    { red: 0.459, green: 0.192, blue: 0.212, alpha: 1 }
  ],
  'minecraft:mangrove_trapdoor': [
    { red: 0.392, green: 0.141, blue: 0.137, alpha: 1 },
    { red: 0.365, green: 0.11, blue: 0.118, alpha: 1 },
    { red: 0.498, green: 0.259, blue: 0.204, alpha: 1 }
  ],
  'minecraft:oak_double_slab': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:oak_slab': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:oak_stairs': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:pale_oak_door': [
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 },
    { red: 0.78, green: 0.722, blue: 0.722, alpha: 1 },
    { red: 0.69, green: 0.643, blue: 0.643, alpha: 1 }
  ],
  'minecraft:pale_oak_double_slab': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_pressure_plate': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_slab': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_stairs': [
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.906, green: 0.89, blue: 0.882, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:pale_oak_trapdoor': [
    { red: 1, green: 0.984, blue: 0.973, alpha: 1 },
    { red: 0.98, green: 0.937, blue: 0.933, alpha: 1 },
    { red: 0.867, green: 0.808, blue: 0.804, alpha: 1 }
  ],
  'minecraft:petrified_oak_double_slab': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:spruce_double_slab': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_pressure_plate': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_slab': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_stairs': [
    { red: 0.51, green: 0.38, blue: 0.227, alpha: 1 },
    { red: 0.478, green: 0.353, blue: 0.204, alpha: 1 },
    { red: 0.439, green: 0.322, blue: 0.18, alpha: 1 }
  ],
  'minecraft:spruce_trapdoor': [
    { red: 0.4, green: 0.302, blue: 0.157, alpha: 1 },
    { red: 0.42, green: 0.325, blue: 0.196, alpha: 1 },
    { red: 0.502, green: 0.369, blue: 0.212, alpha: 1 }
  ],
  'minecraft:warped_double_slab': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_pressure_plate': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_slab': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_stairs': [
    { red: 0.224, green: 0.514, blue: 0.51, alpha: 1 },
    { red: 0.157, green: 0.439, blue: 0.404, alpha: 1 },
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 }
  ],
  'minecraft:warped_trapdoor': [
    { red: 0.18, green: 0.373, blue: 0.318, alpha: 1 },
    { red: 0.212, green: 0.616, blue: 0.569, alpha: 1 },
    { red: 0.122, green: 0.341, blue: 0.322, alpha: 1 }
  ],
  'minecraft:light_block_0': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_1': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_10': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_11': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_12': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_13': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_14': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_15': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_2': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_3': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_4': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_5': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_6': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_7': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_8': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:light_block_9': [
    { red: 0.992, green: 0.757, blue: 0.204, alpha: 1 },
    { red: 0.98, green: 0.671, blue: 0.11, alpha: 1 },
    { red: 1, green: 0.808, blue: 0.365, alpha: 1 }
  ],
  'minecraft:standing_banner': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:wall_banner': [
    { red: 0.722, green: 0.58, blue: 0.373, alpha: 1 },
    { red: 0.686, green: 0.561, blue: 0.333, alpha: 1 },
    { red: 0.624, green: 0.518, blue: 0.302, alpha: 1 }
  ],
  'minecraft:andesite_double_slab': [
    { red: 0.541, green: 0.541, blue: 0.557, alpha: 1 },
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 }
  ],
  'minecraft:chipped_anvil': [
    { red: 0.239, green: 0.239, blue: 0.239, alpha: 1 },
    { red: 0.259, green: 0.259, blue: 0.259, alpha: 1 },
    { red: 0.29, green: 0.29, blue: 0.29, alpha: 1 }
  ],
  'minecraft:damaged_anvil': [
    { red: 0.239, green: 0.239, blue: 0.239, alpha: 1 },
    { red: 0.259, green: 0.259, blue: 0.259, alpha: 1 },
    { red: 0.29, green: 0.29, blue: 0.29, alpha: 1 }
  ],
  'minecraft:deprecated_anvil': [
    { red: 0.239, green: 0.239, blue: 0.239, alpha: 1 },
    { red: 0.259, green: 0.259, blue: 0.259, alpha: 1 },
    { red: 0.29, green: 0.29, blue: 0.29, alpha: 1 }
  ],
  'minecraft:diorite_double_slab': [
    { red: 0.914, green: 0.914, blue: 0.914, alpha: 1 },
    { red: 0.643, green: 0.635, blue: 0.635, alpha: 1 },
    { red: 0.745, green: 0.749, blue: 0.757, alpha: 1 }
  ],
  'minecraft:polished_andesite_double_slab': [
    { red: 0.525, green: 0.533, blue: 0.529, alpha: 1 },
    { red: 0.486, green: 0.498, blue: 0.502, alpha: 1 },
    { red: 0.541, green: 0.565, blue: 0.565, alpha: 1 }
  ],
  'minecraft:polished_diorite_double_slab': [
    { red: 0.784, green: 0.788, blue: 0.784, alpha: 1 },
    { red: 0.851, green: 0.847, blue: 0.851, alpha: 1 },
    { red: 0.729, green: 0.733, blue: 0.753, alpha: 1 }
  ],
  'minecraft:cherry_door': [
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 }
  ],
  'minecraft:cherry_double_slab': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:cherry_slab': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:cherry_stairs': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 }
  ],
  'minecraft:cherry_trapdoor': [
    { red: 0.906, green: 0.761, blue: 0.733, alpha: 1 },
    { red: 0.902, green: 0.702, blue: 0.678, alpha: 1 },
    { red: 0.906, green: 0.729, blue: 0.706, alpha: 1 }
  ],
  'minecraft:end_brick_stairs': [
    { red: 0.91, green: 0.957, blue: 0.698, alpha: 1 },
    { red: 0.867, green: 0.894, blue: 0.647, alpha: 1 },
    { red: 0.839, green: 0.839, blue: 0.584, alpha: 1 }
  ],
  'minecraft:end_bricks': [
    { red: 0.91, green: 0.957, blue: 0.698, alpha: 1 },
    { red: 0.867, green: 0.894, blue: 0.647, alpha: 1 },
    { red: 0.839, green: 0.839, blue: 0.584, alpha: 1 }
  ],
  'minecraft:end_stone_brick_double_slab': [
    { red: 0.91, green: 0.957, blue: 0.698, alpha: 1 },
    { red: 0.867, green: 0.894, blue: 0.647, alpha: 1 },
    { red: 0.839, green: 0.839, blue: 0.584, alpha: 1 }
  ],
  'minecraft:blackstone_double_slab': [
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 },
    { red: 0.125, green: 0.075, blue: 0.11, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 }
  ],
  'minecraft:colored_torch_blue': [
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.333, green: 0.271, blue: 0.18, alpha: 1 }
  ],
  'minecraft:colored_torch_green': [
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.333, green: 0.271, blue: 0.18, alpha: 1 }
  ],
  'minecraft:colored_torch_purple': [
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.333, green: 0.271, blue: 0.18, alpha: 1 }
  ],
  'minecraft:colored_torch_red': [
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.333, green: 0.271, blue: 0.18, alpha: 1 }
  ],
  'minecraft:lit_blast_furnace': [
    { red: 0.349, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.286, green: 0.282, blue: 0.282, alpha: 1 },
    { red: 0.247, green: 0.243, blue: 0.259, alpha: 1 }
  ],
  'minecraft:lit_furnace': [
    { red: 0.314, green: 0.306, blue: 0.306, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 },
    { red: 0.522, green: 0.522, blue: 0.522, alpha: 1 }
  ],
  'minecraft:polished_blackstone_brick_double_slab': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:polished_blackstone_double_slab': [
    { red: 0.235, green: 0.224, blue: 0.278, alpha: 1 },
    { red: 0.192, green: 0.173, blue: 0.212, alpha: 1 },
    { red: 0.153, green: 0.133, blue: 0.11, alpha: 1 }
  ],
  'minecraft:powered_comparator': [
    { red: 0.733, green: 0.733, blue: 0.733, alpha: 1 },
    { red: 0.545, green: 0.553, blue: 0.545, alpha: 1 },
    { red: 0.773, green: 0.792, blue: 0.773, alpha: 1 }
  ],
  'minecraft:powered_repeater': [
    { red: 0.545, green: 0.553, blue: 0.545, alpha: 1 },
    { red: 0.733, green: 0.733, blue: 0.733, alpha: 1 },
    { red: 0.675, green: 0.667, blue: 0.675, alpha: 1 }
  ],
  'minecraft:quartz_double_slab': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 }
  ],
  'minecraft:smooth_quartz': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 }
  ],
  'minecraft:smooth_quartz_double_slab': [
    { red: 0.933, green: 0.918, blue: 0.902, alpha: 1 },
    { red: 0.933, green: 0.902, blue: 0.871, alpha: 1 },
    { red: 0.918, green: 0.886, blue: 0.855, alpha: 1 }
  ],
  'minecraft:torchflower_crop': [
    { red: 0.153, green: 0.518, blue: 0.365, alpha: 1 },
    { red: 0.075, green: 0.271, blue: 0.196, alpha: 1 },
    { red: 0.11, green: 0.357, blue: 0.227, alpha: 1 }
  ],
  'minecraft:unlit_redstone_torch': [
    { red: 0.624, green: 0.498, blue: 0.314, alpha: 1 },
    { red: 0.427, green: 0.341, blue: 0.212, alpha: 1 },
    { red: 0.333, green: 0.271, blue: 0.18, alpha: 1 }
  ],
  'minecraft:unpowered_comparator': [
    { red: 0.733, green: 0.733, blue: 0.733, alpha: 1 },
    { red: 0.545, green: 0.553, blue: 0.545, alpha: 1 },
    { red: 0.773, green: 0.792, blue: 0.773, alpha: 1 }
  ],
  'minecraft:unpowered_repeater': [
    { red: 0.545, green: 0.553, blue: 0.545, alpha: 1 },
    { red: 0.733, green: 0.733, blue: 0.733, alpha: 1 },
    { red: 0.675, green: 0.667, blue: 0.675, alpha: 1 }
  ],
  'minecraft:cave_vines_body_with_berries': [
    { red: 0.314, green: 0.447, blue: 0.2, alpha: 1 },
    { red: 0.282, green: 0.38, blue: 0.141, alpha: 1 },
    { red: 0.439, green: 0.573, blue: 0.176, alpha: 1 }
  ],
  'minecraft:cave_vines_head_with_berries': [
    { red: 0.314, green: 0.447, blue: 0.2, alpha: 1 },
    { red: 0.282, green: 0.38, blue: 0.141, alpha: 1 },
    { red: 0.439, green: 0.573, blue: 0.176, alpha: 1 }
  ],
  'minecraft:double_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:exposed_chiseled_copper': [
    { red: 0.58, green: 0.463, blue: 0.38, alpha: 1 },
    { red: 0.659, green: 0.467, blue: 0.384, alpha: 1 },
    { red: 0.49, green: 0.435, blue: 0.353, alpha: 1 }
  ],
  'minecraft:exposed_copper_bulb': [
    { red: 0.329, green: 0.302, blue: 0.239, alpha: 1 },
    { red: 0.475, green: 0.392, blue: 0.329, alpha: 1 },
    { red: 0.42, green: 0.345, blue: 0.294, alpha: 1 }
  ],
  'minecraft:exposed_copper_door': [
    { red: 0.58, green: 0.463, blue: 0.38, alpha: 1 },
    { red: 0.69, green: 0.486, blue: 0.424, alpha: 1 },
    { red: 0.475, green: 0.392, blue: 0.329, alpha: 1 }
  ],
  'minecraft:exposed_cut_copper_slab': [
    { red: 0.498, green: 0.447, blue: 0.341, alpha: 1 },
    { red: 0.58, green: 0.463, blue: 0.38, alpha: 1 },
    { red: 0.729, green: 0.51, blue: 0.467, alpha: 1 }
  ],
  'minecraft:exposed_cut_copper_stairs': [
    { red: 0.498, green: 0.447, blue: 0.341, alpha: 1 },
    { red: 0.58, green: 0.463, blue: 0.38, alpha: 1 },
    { red: 0.729, green: 0.51, blue: 0.467, alpha: 1 }
  ],
  'minecraft:exposed_double_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:normal_stone_double_slab': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:normal_stone_slab': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:normal_stone_stairs': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.455, green: 0.455, blue: 0.455, alpha: 1 },
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 }
  ],
  'minecraft:oxidized_chiseled_copper': [
    { red: 0.349, green: 0.698, blue: 0.573, alpha: 1 },
    { red: 0.431, green: 0.773, blue: 0.624, alpha: 1 },
    { red: 0.235, green: 0.451, blue: 0.365, alpha: 1 }
  ],
  'minecraft:oxidized_copper_bulb': [
    { red: 0.231, green: 0.4, blue: 0.333, alpha: 1 },
    { red: 0.192, green: 0.329, blue: 0.275, alpha: 1 },
    { red: 0.224, green: 0.431, blue: 0.349, alpha: 1 }
  ],
  'minecraft:oxidized_copper_door': [
    { red: 0.31, green: 0.671, blue: 0.565, alpha: 1 },
    { red: 0.349, green: 0.698, blue: 0.573, alpha: 1 },
    { red: 0.298, green: 0.58, blue: 0.518, alpha: 1 }
  ],
  'minecraft:oxidized_cut_copper_slab': [
    { red: 0.318, green: 0.643, blue: 0.545, alpha: 1 },
    { red: 0.298, green: 0.58, blue: 0.518, alpha: 1 },
    { red: 0.325, green: 0.631, blue: 0.471, alpha: 1 }
  ],
  'minecraft:oxidized_cut_copper_stairs': [
    { red: 0.318, green: 0.643, blue: 0.545, alpha: 1 },
    { red: 0.298, green: 0.58, blue: 0.518, alpha: 1 },
    { red: 0.325, green: 0.631, blue: 0.471, alpha: 1 }
  ],
  'minecraft:oxidized_double_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:vine': [
    { red: 0.514, green: 0.514, blue: 0.514, alpha: 1 },
    { red: 0.329, green: 0.329, blue: 0.329, alpha: 1 },
    { red: 0.42, green: 0.42, blue: 0.42, alpha: 1 }
  ],
  'minecraft:waxed_chiseled_copper': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_copper_bulb': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_copper_door': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_cut_copper_stairs': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_double_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_exposed_chiseled_copper': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_exposed_copper_bulb': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_exposed_copper_door': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_exposed_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_exposed_cut_copper_stairs': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_exposed_double_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_chiseled_copper': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_copper_bulb': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_copper_door': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_cut_copper_stairs': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_double_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_weathered_chiseled_copper': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_weathered_copper_bulb': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_weathered_copper_door': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_weathered_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_weathered_cut_copper_stairs': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_weathered_double_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:weathered_chiseled_copper': [
    { red: 0.4, green: 0.663, blue: 0.467, alpha: 1 },
    { red: 0.478, green: 0.718, blue: 0.6, alpha: 1 },
    { red: 0.286, green: 0.443, blue: 0.392, alpha: 1 }
  ],
  'minecraft:weathered_copper_bulb': [
    { red: 0.31, green: 0.322, blue: 0.282, alpha: 1 },
    { red: 0.286, green: 0.443, blue: 0.392, alpha: 1 },
    { red: 0.255, green: 0.388, blue: 0.345, alpha: 1 }
  ],
  'minecraft:weathered_copper_door': [
    { red: 0.455, green: 0.553, blue: 0.341, alpha: 1 },
    { red: 0.392, green: 0.627, blue: 0.467, alpha: 1 },
    { red: 0.424, green: 0.592, blue: 0.361, alpha: 1 }
  ],
  'minecraft:weathered_cut_copper_slab': [
    { red: 0.392, green: 0.627, blue: 0.467, alpha: 1 },
    { red: 0.553, green: 0.529, blue: 0.439, alpha: 1 },
    { red: 0.416, green: 0.443, blue: 0.278, alpha: 1 }
  ],
  'minecraft:weathered_cut_copper_stairs': [
    { red: 0.392, green: 0.627, blue: 0.467, alpha: 1 },
    { red: 0.553, green: 0.529, blue: 0.439, alpha: 1 },
    { red: 0.416, green: 0.443, blue: 0.278, alpha: 1 }
  ],
  'minecraft:weathered_double_cut_copper_slab': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:exposed_copper_trapdoor': [
    { red: 0.498, green: 0.447, blue: 0.341, alpha: 1 },
    { red: 0.808, green: 0.553, blue: 0.514, alpha: 1 },
    { red: 0.659, green: 0.467, blue: 0.384, alpha: 1 }
  ],
  'minecraft:flowing_lava': [
    { red: 0.784, green: 0.224, blue: 0.024, alpha: 1 },
    { red: 0.988, green: 0.988, blue: 0.498, alpha: 1 },
    { red: 0.886, green: 0.596, blue: 0.18, alpha: 1 }
  ],
  'minecraft:glowingobsidian': undefined,
  'minecraft:oxidized_copper_trapdoor': [
    { red: 0.349, green: 0.698, blue: 0.573, alpha: 1 },
    { red: 0.431, green: 0.773, blue: 0.624, alpha: 1 },
    { red: 0.298, green: 0.58, blue: 0.518, alpha: 1 }
  ],
  'minecraft:polished_tuff_double_slab': [
    { red: 0.388, green: 0.424, blue: 0.427, alpha: 1 },
    { red: 0.357, green: 0.384, blue: 0.369, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 }
  ],
  'minecraft:slime': [
    { red: 0.451, green: 0.761, blue: 0.384, alpha: 1 },
    { red: 0.384, green: 0.714, blue: 0.29, alpha: 1 },
    { red: 0.482, green: 0.792, blue: 0.384, alpha: 1 }
  ],
  'minecraft:tuff_brick_double_slab': [
    { red: 0.522, green: 0.514, blue: 0.478, alpha: 1 },
    { red: 0.424, green: 0.443, blue: 0.42, alpha: 1 },
    { red: 0.322, green: 0.353, blue: 0.318, alpha: 1 }
  ],
  'minecraft:tuff_double_slab': [
    { red: 0.416, green: 0.431, blue: 0.435, alpha: 1 },
    { red: 0.365, green: 0.365, blue: 0.322, alpha: 1 },
    { red: 0.522, green: 0.514, blue: 0.482, alpha: 1 }
  ],
  'minecraft:waterlily': [
    { red: 0.588, green: 0.588, blue: 0.588, alpha: 1 },
    { red: 0.361, green: 0.361, blue: 0.361, alpha: 1 },
    { red: 0.639, green: 0.639, blue: 0.639, alpha: 1 }
  ],
  'minecraft:waxed_copper_trapdoor': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_exposed_copper_trapdoor': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_copper_trapdoor': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_weathered_copper_trapdoor': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:weathered_copper_trapdoor': [
    { red: 0.478, green: 0.718, blue: 0.6, alpha: 1 },
    { red: 0.455, green: 0.553, blue: 0.341, alpha: 1 },
    { red: 0.4, green: 0.663, blue: 0.467, alpha: 1 }
  ],
  'minecraft:daylight_detector_inverted': [
    { red: 0.235, green: 0.2, blue: 0.133, alpha: 1 },
    { red: 0.2, green: 0.169, blue: 0.106, alpha: 1 },
    { red: 0.337, green: 0.271, blue: 0.169, alpha: 1 }
  ],
  'minecraft:exposed_copper': [
    { red: 0.659, green: 0.467, blue: 0.384, alpha: 1 },
    { red: 0.596, green: 0.549, blue: 0.412, alpha: 1 },
    { red: 0.729, green: 0.51, blue: 0.467, alpha: 1 }
  ],
  'minecraft:exposed_copper_grate': [
    { red: 0.659, green: 0.467, blue: 0.384, alpha: 1 },
    { red: 0.596, green: 0.549, blue: 0.412, alpha: 1 },
    { red: 0.729, green: 0.51, blue: 0.467, alpha: 1 }
  ],
  'minecraft:exposed_cut_copper': [
    { red: 0.498, green: 0.447, blue: 0.341, alpha: 1 },
    { red: 0.58, green: 0.463, blue: 0.38, alpha: 1 },
    { red: 0.729, green: 0.51, blue: 0.467, alpha: 1 }
  ],
  'minecraft:oxidized_copper': [
    { red: 0.349, green: 0.698, blue: 0.573, alpha: 1 },
    { red: 0.31, green: 0.671, blue: 0.565, alpha: 1 },
    { red: 0.325, green: 0.631, blue: 0.471, alpha: 1 }
  ],
  'minecraft:oxidized_copper_grate': [
    { red: 0.349, green: 0.698, blue: 0.573, alpha: 1 },
    { red: 0.31, green: 0.671, blue: 0.565, alpha: 1 },
    { red: 0.325, green: 0.631, blue: 0.471, alpha: 1 }
  ],
  'minecraft:oxidized_cut_copper': [
    { red: 0.318, green: 0.643, blue: 0.545, alpha: 1 },
    { red: 0.298, green: 0.58, blue: 0.518, alpha: 1 },
    { red: 0.325, green: 0.631, blue: 0.471, alpha: 1 }
  ],
  'minecraft:waxed_copper': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_copper_grate': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_cut_copper': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_exposed_copper': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_exposed_copper_grate': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_exposed_cut_copper': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_copper': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_copper_grate': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_oxidized_cut_copper': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:waxed_weathered_copper': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_weathered_copper_grate': [
    { red: 0.784, green: 0.455, blue: 0.337, alpha: 1 },
    { red: 0.761, green: 0.42, blue: 0.298, alpha: 1 },
    { red: 0.839, green: 0.482, blue: 0.357, alpha: 1 }
  ],
  'minecraft:waxed_weathered_cut_copper': [
    { red: 0.89, green: 0.51, blue: 0.424, alpha: 1 },
    { red: 0.655, green: 0.353, blue: 0.251, alpha: 1 },
    { red: 0.698, green: 0.384, blue: 0.278, alpha: 1 }
  ],
  'minecraft:weathered_copper': [
    { red: 0.392, green: 0.627, blue: 0.467, alpha: 1 },
    { red: 0.4, green: 0.663, blue: 0.467, alpha: 1 },
    { red: 0.424, green: 0.592, blue: 0.361, alpha: 1 }
  ],
  'minecraft:weathered_copper_grate': [
    { red: 0.392, green: 0.627, blue: 0.467, alpha: 1 },
    { red: 0.424, green: 0.592, blue: 0.361, alpha: 1 },
    { red: 0.4, green: 0.663, blue: 0.467, alpha: 1 }
  ],
  'minecraft:weathered_cut_copper': [
    { red: 0.392, green: 0.627, blue: 0.467, alpha: 1 },
    { red: 0.553, green: 0.529, blue: 0.439, alpha: 1 },
    { red: 0.416, green: 0.443, blue: 0.278, alpha: 1 }
  ],
  'minecraft:cobbled_deepslate_double_slab': [
    { red: 0.29, green: 0.29, blue: 0.31, alpha: 1 },
    { red: 0.247, green: 0.247, blue: 0.271, alpha: 1 },
    { red: 0.208, green: 0.208, blue: 0.224, alpha: 1 }
  ],
  'minecraft:deepslate_brick_double_slab': [
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 },
    { red: 0.239, green: 0.239, blue: 0.263, alpha: 1 },
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 }
  ],
  'minecraft:deepslate_lapis_ore': [
    { red: 0.392, green: 0.392, blue: 0.392, alpha: 1 },
    { red: 0.475, green: 0.475, blue: 0.475, alpha: 1 },
    { red: 0.318, green: 0.318, blue: 0.318, alpha: 1 }
  ],
  'minecraft:deepslate_tile_double_slab': [
    { red: 0.176, green: 0.176, blue: 0.176, alpha: 1 },
    { red: 0.22, green: 0.216, blue: 0.216, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:jigsaw': [
    { red: 0.063, green: 0.063, blue: 0.063, alpha: 1 },
    { red: 0.149, green: 0.114, blue: 0.165, alpha: 1 },
    { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 }
  ],
  'minecraft:lit_deepslate_redstone_ore': [
    { red: 0.902, green: 0.125, blue: 0.031, alpha: 1 },
    { red: 0.451, green: 0.047, blue: 0, alpha: 1 },
    { red: 0.643, green: 0.094, blue: 0.031, alpha: 1 }
  ],
  'minecraft:polished_deepslate_double_slab': [
    { red: 0.345, green: 0.345, blue: 0.345, alpha: 1 },
    { red: 0.294, green: 0.298, blue: 0.31, alpha: 1 },
    { red: 0.255, green: 0.255, blue: 0.255, alpha: 1 }
  ],
  'minecraft:grass_path': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.349, green: 0.239, blue: 0.161, alpha: 1 }
  ],
  'minecraft:brick_block': [
    { red: 0.608, green: 0.337, blue: 0.263, alpha: 1 },
    { red: 0.545, green: 0.431, blue: 0.404, alpha: 1 },
    { red: 0.635, green: 0.525, blue: 0.49, alpha: 1 }
  ],
  'minecraft:brick_double_slab': [
    { red: 0.608, green: 0.337, blue: 0.263, alpha: 1 },
    { red: 0.545, green: 0.431, blue: 0.404, alpha: 1 },
    { red: 0.635, green: 0.525, blue: 0.49, alpha: 1 }
  ],
  'minecraft:dirt_with_roots': [
    { red: 0.475, green: 0.333, blue: 0.227, alpha: 1 },
    { red: 0.588, green: 0.424, blue: 0.29, alpha: 1 },
    { red: 0.678, green: 0.49, blue: 0.396, alpha: 1 }
  ],
  'minecraft:golden_rail': [
    { red: 0.612, green: 0.612, blue: 0.612, alpha: 1 },
    { red: 0.408, green: 0.408, blue: 0.408, alpha: 1 },
    { red: 0.361, green: 0.302, blue: 0.188, alpha: 1 }
  ],
  'minecraft:magma': [
    { red: 0.396, green: 0.157, blue: 0.157, alpha: 1 },
    { red: 0.314, green: 0.106, blue: 0.106, alpha: 1 },
    { red: 0.902, green: 0.392, blue: 0.063, alpha: 1 }
  ],
  'minecraft:mossy_stone_brick_double_slab': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 }
  ],
  'minecraft:mud_brick_double_slab': [
    { red: 0.584, green: 0.443, blue: 0.314, alpha: 1 },
    { red: 0.494, green: 0.365, blue: 0.282, alpha: 1 },
    { red: 0.616, green: 0.471, blue: 0.361, alpha: 1 }
  ],
  'minecraft:nether_brick': [
    { red: 0.188, green: 0.094, blue: 0.11, alpha: 1 },
    { red: 0.098, green: 0.051, blue: 0.063, alpha: 1 },
    { red: 0.129, green: 0.067, blue: 0.078, alpha: 1 }
  ],
  'minecraft:nether_brick_double_slab': [
    { red: 0.188, green: 0.094, blue: 0.11, alpha: 1 },
    { red: 0.098, green: 0.051, blue: 0.063, alpha: 1 },
    { red: 0.129, green: 0.067, blue: 0.078, alpha: 1 }
  ],
  'minecraft:prismarine_brick_double_slab': [
    { red: 0.431, green: 0.725, blue: 0.682, alpha: 1 },
    { red: 0.353, green: 0.686, blue: 0.643, alpha: 1 },
    { red: 0.38, green: 0.647, blue: 0.604, alpha: 1 }
  ],
  'minecraft:prismarine_bricks_stairs': [
    { red: 0.431, green: 0.725, blue: 0.682, alpha: 1 },
    { red: 0.353, green: 0.686, blue: 0.643, alpha: 1 },
    { red: 0.38, green: 0.647, blue: 0.604, alpha: 1 }
  ],
  'minecraft:red_nether_brick': [
    { red: 0.267, green: 0.02, blue: 0.027, alpha: 1 },
    { red: 0.18, green: 0, blue: 0.004, alpha: 1 },
    { red: 0.204, green: 0.004, blue: 0.012, alpha: 1 }
  ],
  'minecraft:red_nether_brick_double_slab': [
    { red: 0.267, green: 0.02, blue: 0.027, alpha: 1 },
    { red: 0.18, green: 0, blue: 0.004, alpha: 1 },
    { red: 0.204, green: 0.004, blue: 0.012, alpha: 1 }
  ],
  'minecraft:resin_brick_double_slab': [
    { red: 0.78, green: 0.286, blue: 0.039, alpha: 1 },
    { red: 0.89, green: 0.384, blue: 0.086, alpha: 1 },
    { red: 0.702, green: 0.243, blue: 0.075, alpha: 1 }
  ],
  'minecraft:stone_brick_double_slab': [
    { red: 0.498, green: 0.498, blue: 0.498, alpha: 1 },
    { red: 0.545, green: 0.537, blue: 0.545, alpha: 1 },
    { red: 0.471, green: 0.463, blue: 0.471, alpha: 1 }
  ],
  'minecraft:beetroot': [
    { red: 0.29, green: 0.561, blue: 0.157, alpha: 1 },
    { red: 0.333, green: 0.671, blue: 0.176, alpha: 1 },
    { red: 0.149, green: 0.388, blue: 0.145, alpha: 1 }
  ],
  'minecraft:carrots': [
    { red: 0.169, green: 0.439, blue: 0.165, alpha: 1 },
    { red: 0.149, green: 0.388, blue: 0.145, alpha: 1 },
    { red: 0.29, green: 0.561, blue: 0.157, alpha: 1 }
  ],
  'minecraft:cobblestone_double_slab': [
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.38, green: 0.38, blue: 0.38, alpha: 1 },
    { red: 0.431, green: 0.427, blue: 0.427, alpha: 1 }
  ],
  'minecraft:cut_red_sandstone_double_slab': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:cut_sandstone_double_slab': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:deadbush': [
    { red: 0.318, green: 0.239, blue: 0.141, alpha: 1 },
    { red: 0.404, green: 0.314, blue: 0.173, alpha: 1 },
    { red: 0.58, green: 0.392, blue: 0.157, alpha: 1 }
  ],
  'minecraft:frame': [
    { red: 0.514, green: 0.282, blue: 0.161, alpha: 1 },
    { red: 0.482, green: 0.267, blue: 0.161, alpha: 1 },
    { red: 0.643, green: 0.333, blue: 0.192, alpha: 1 }
  ],
  'minecraft:frog_spawn': [
    { red: 0.494, green: 0.435, blue: 0.404, alpha: 1 },
    { red: 0.451, green: 0.388, blue: 0.357, alpha: 1 },
    { red: 0.592, green: 0.529, blue: 0.498, alpha: 1 }
  ],
  'minecraft:glow_frame': [
    { red: 0.514, green: 0.282, blue: 0.161, alpha: 1 },
    { red: 0.482, green: 0.267, blue: 0.161, alpha: 1 },
    { red: 0.643, green: 0.333, blue: 0.192, alpha: 1 }
  ],
  'minecraft:granite_double_slab': [
    { red: 0.624, green: 0.42, blue: 0.345, alpha: 1 },
    { red: 0.498, green: 0.337, blue: 0.275, alpha: 1 },
    { red: 0.663, green: 0.467, blue: 0.392, alpha: 1 }
  ],
  'minecraft:lit_pumpkin': [
    { red: 0.89, green: 0.541, blue: 0.114, alpha: 1 },
    { red: 0.627, green: 0.337, blue: 0.043, alpha: 1 },
    { red: 0.769, green: 0.435, blue: 0.078, alpha: 1 }
  ],
  'minecraft:lit_redstone_lamp': [
    { red: 0.192, green: 0.102, blue: 0.067, alpha: 1 },
    { red: 0.525, green: 0.306, blue: 0.161, alpha: 1 },
    { red: 0.373, green: 0.2, blue: 0.082, alpha: 1 }
  ],
  'minecraft:lit_redstone_ore': [
    { red: 0.902, green: 0.125, blue: 0.031, alpha: 1 },
    { red: 0.451, green: 0.047, blue: 0, alpha: 1 },
    { red: 0.643, green: 0.094, blue: 0.031, alpha: 1 }
  ],
  'minecraft:lit_smoker': [
    { red: 0.404, green: 0.314, blue: 0.173, alpha: 1 },
    { red: 0.318, green: 0.239, blue: 0.141, alpha: 1 },
    { red: 0.522, green: 0.522, blue: 0.522, alpha: 1 }
  ],
  'minecraft:mossy_cobblestone_double_slab': [
    { red: 0.322, green: 0.365, blue: 0.224, alpha: 1 },
    { red: 0.533, green: 0.529, blue: 0.533, alpha: 1 },
    { red: 0.384, green: 0.475, blue: 0.255, alpha: 1 }
  ],
  'minecraft:noteblock': [
    { red: 0.161, green: 0.157, blue: 0.125, alpha: 1 },
    { red: 0.255, green: 0.157, blue: 0.094, alpha: 1 },
    { red: 0.58, green: 0.365, blue: 0.255, alpha: 1 }
  ],
  'minecraft:polished_granite_double_slab': [
    { red: 0.624, green: 0.42, blue: 0.345, alpha: 1 },
    { red: 0.573, green: 0.384, blue: 0.318, alpha: 1 },
    { red: 0.663, green: 0.467, blue: 0.392, alpha: 1 }
  ],
  'minecraft:sweet_berry_bush': [
    { red: 0.161, green: 0.322, blue: 0.188, alpha: 1 },
    { red: 0.235, green: 0.431, blue: 0.259, alpha: 1 },
    { red: 0.157, green: 0.384, blue: 0.251, alpha: 1 }
  ],
  'minecraft:pitcher_crop': [
    { red: 0.624, green: 0.376, blue: 0.247, alpha: 1 },
    { red: 0.78, green: 0.647, blue: 0.408, alpha: 1 },
    { red: 0.769, green: 0.612, blue: 0.388, alpha: 1 }
  ],
  'minecraft:red_sandstone_double_slab': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:reeds': [
    { red: 0.51, green: 0.659, blue: 0.349, alpha: 1 },
    { red: 0.667, green: 0.859, blue: 0.455, alpha: 1 },
    { red: 0.898, green: 0.937, blue: 0.855, alpha: 1 }
  ],
  'minecraft:sandstone_double_slab': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:smooth_red_sandstone_double_slab': [
    { red: 0.753, green: 0.408, blue: 0.133, alpha: 1 },
    { red: 0.675, green: 0.341, blue: 0.071, alpha: 1 },
    { red: 0.824, green: 0.459, blue: 0.169, alpha: 1 }
  ],
  'minecraft:smooth_sandstone_double_slab': [
    { red: 0.855, green: 0.824, blue: 0.639, alpha: 1 },
    { red: 0.82, green: 0.729, blue: 0.541, alpha: 1 },
    { red: 0.906, green: 0.894, blue: 0.733, alpha: 1 }
  ],
  'minecraft:smooth_stone_double_slab': [
    { red: 0.659, green: 0.659, blue: 0.659, alpha: 1 },
    { red: 0.639, green: 0.639, blue: 0.639, alpha: 1 },
    { red: 0.69, green: 0.69, blue: 0.69, alpha: 1 }
  ],
  'minecraft:trip_wire': [
    { red: 0.561, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.357, green: 0.357, blue: 0.357, alpha: 1 },
    { red: 0.467, green: 0.467, blue: 0.467, alpha: 1 }
  ],
  'minecraft:dark_prismarine_double_slab': [
    { red: 0.192, green: 0.314, blue: 0.255, alpha: 1 },
    { red: 0.153, green: 0.243, blue: 0.212, alpha: 1 },
    { red: 0.247, green: 0.427, blue: 0.361, alpha: 1 }
  ],
  'minecraft:dried_ghast': [
    { red: 0.616, green: 0.561, blue: 0.561, alpha: 1 },
    { red: 0.443, green: 0.439, blue: 0.439, alpha: 1 },
    { red: 0.682, green: 0.612, blue: 0.612, alpha: 1 }
  ],
  'minecraft:piston_arm_collision': [
    { red: 0.369, green: 0.612, blue: 0.31, alpha: 1 },
    { red: 0.518, green: 0.78, blue: 0.455, alpha: 1 },
    { red: 0.42, green: 0.725, blue: 0.349, alpha: 1 }
  ],
  'minecraft:prismarine_double_slab': [
    { red: 0.369, green: 0.643, blue: 0.557, alpha: 1 },
    { red: 0.608, green: 0.796, blue: 0.749, alpha: 1 },
    { red: 0.369, green: 0.522, blue: 0.643, alpha: 1 }
  ],
  'minecraft:purpur_double_slab': [
    { red: 0.698, green: 0.525, blue: 0.698, alpha: 1 },
    { red: 0.675, green: 0.482, blue: 0.675, alpha: 1 },
    { red: 0.643, green: 0.447, blue: 0.639, alpha: 1 }
  ],
  'minecraft:sticky_piston_arm_collision': [
    { red: 0.369, green: 0.612, blue: 0.31, alpha: 1 },
    { red: 0.518, green: 0.78, blue: 0.455, alpha: 1 },
    { red: 0.42, green: 0.725, blue: 0.349, alpha: 1 }
  ]
};