import { system } from "@minecraft/server";
import { removeItem } from "../xZ-Utils";

export function seatInteract(player, block, dimension) {
    const seatEntity = dimension.getEntities({location: block.center(), maxDistance: 0.25, type: `create:seat_entity`})[0] ?? dimension.spawnEntity("create:seat_entity", block.center());
    const rideable = seatEntity.getComponent("rideable");

    if (rideable.getRiders().length == 0) rideable.addRider(player);
    else player.sendMessage({ translate: "create.text.seat_occupied" });
};


export function seatBreak(block, dimension) {
    const seatEntity = dimension.getEntities({location: block.center(), maxDistance: 0.25, type: `create:seat_entity`})[0];
    if (seatEntity) seatEntity.remove();
};


export function slabPlacement(data) {    
    const { block, blockFace, itemStack, player, faceLocation } = data;
    if (!data.isFirstEvent) return;

    let targetBlock;
    let clickingOnSlab = false;

    // Caso 1: clicando diretamente numa slab do mesmo tipo
    if (itemStack?.typeId === block.typeId && !block.permutation.getState("create:is_full_block")) {
        targetBlock = block;
        clickingOnSlab = true;
    }
    // Caso 2: clicando num bloco adjacente (a slab está acima ou abaixo)
    else if (blockFace === "Up" || blockFace === "Down") {
        const adjacent = blockFace === "Up" ? block.above() : block.below();
        if (adjacent?.typeId === itemStack?.typeId && !adjacent.permutation.getState("create:is_full_block")) {
            targetBlock = adjacent;
        }
    }

    if (!targetBlock) return;

    const verticalHalf = targetBlock.permutation.getState("minecraft:vertical_half");

    // Clicando direto na slab: só completa se o clique vem do lado "vazio"
    if (clickingOnSlab) {
        const shouldComplete =
            (verticalHalf === "bottom" && (blockFace === "Up" || (blockFace !== "Down" && faceLocation.y > 0.5))) ||
            (verticalHalf === "top" && (blockFace === "Down" || (blockFace !== "Up" && faceLocation.y <= 0.5)));
        if (!shouldComplete) return;
    }

    data.cancel = true;
    system.run(() => {
        removeItem(player, itemStack.typeId, 1);
        player.dimension.playSound("dig.stone", player.location);
        targetBlock.setPermutation(targetBlock.permutation.withState("create:is_full_block", true));
    });
};

export const connectableBlocks = [
    "create:cut_andesite_pillar",
    "create:cut_calcite_pillar",
    "create:cut_deepslate_pillar",
    "create:cut_diorite_pillar",
    "create:cut_dripstone_pillar",
    "create:cut_granite_pillar",
    "create:cut_tuff_pillar",
    "create:cut_asurine_pillar",
    "create:cut_veridium_pillar",
    "create:cut_ochrum_pillar",
    "create:cut_limestone_pillar",
    "create:cut_crimsite_pillar",
    "create:industrial_iron_window",
    "create:weathered_iron_window",
    
    "create:andesite_casing",
    "create:brass_casing",
    "create:copper_casing",
    "create:creative_casing"
];

const directions = {
    up: { x: 0, y: 1, z: 0, opposite: "down" },
    down: { x: 0, y: -1, z: 0, opposite: "up" },
    north: { x: 0, y: 0, z: -1, opposite: "south" },
    south: { x: 0, y: 0, z: 1, opposite: "north" },
    east: { x: 1, y: 0, z: 0, opposite: "west" },
    west: { x: -1, y: 0, z: 0, opposite: "east" }
};

export function connectableBlockPlace(data) {
    const { block, permutationToPlace } = data;
    const typeId = permutationToPlace.type.id;
    let permutation = permutationToPlace;

    for (const [dir, data] of Object.entries(directions)) {
        const neighbor = block.dimension.getBlock({ x: block.x + data.x, y: block.y + data.y, z: block.z + data.z });

        const connected = neighbor?.typeId === typeId;
        permutation = permutation.withState(`create:${dir}`, connected);
    };

    data.permutationToPlace = permutation;
    updateConnections(block, typeId);
};

export function connectableBlockBreak(block, brokenBlockPermutation) {
    const typeId = brokenBlockPermutation.type.id;

    system.run(() => {
        for (const [dir, data] of Object.entries(directions)) {
            const neighbor = block.dimension.getBlock({ x: block.x + data.x, y: block.y + data.y, z: block.z + data.z });

            if (neighbor?.typeId === typeId) neighbor.setPermutation(neighbor.permutation.withState(`create:${data.opposite}`, false));
        };
    });
};

function updateConnections(block, typeId) {
    system.run(() => {
        const placed = block.dimension.getBlock(block.location);
        if (!placed) return;

        for (const [dir, data] of Object.entries(directions)) {
            const neighbor = placed.dimension.getBlock({
                x: placed.x + data.x,
                y: placed.y + data.y,
                z: placed.z + data.z
            });

            if (neighbor?.typeId === typeId) {
                neighbor.setPermutation(
                    neighbor.permutation.withState(`create:${data.opposite}`, true)
                );
            };
        };
    });
};
