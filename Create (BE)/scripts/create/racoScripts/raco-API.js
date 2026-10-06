import * as mc from "@minecraft/server";

export function removeEntityItems(thisItemEntity, amount){
    const thisItem = thisItemEntity?.getComponent('item')?.itemStack
    if (thisItem){
        if (thisItem?.amount > amount){
            thisItem.amount = thisItem.amount-amount
            const newEntityItem = thisItemEntity?.dimension.spawnItem(thisItem, thisItemEntity?.location)
            newEntityItem?.teleport(thisItemEntity?.location)
            thisItemEntity?.remove()
        } else if (thisItem?.amount == amount){
            thisItemEntity?.remove()
        }
    }
}

export function clearItem(container, slot, count) {
   let selectedSlot = container.getItem(slot);
   if (selectedSlot.amount > count) {
      selectedSlot.amount = selectedSlot.amount - count;
      container.setItem(slot, selectedSlot);
   } else {
      container.setItem(slot, );
   }
}
export function calcularDistancia(vetorA, vetorB) {
    if (!vetorA || !vetorB) return undefined;
    const dx = (vetorA.x || 0) - (vetorB.x || 0);
    const dy = (vetorA.y || 0) - (vetorB.y || 0);
    const dz = (vetorA.z || 0) - (vetorB.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
export function calculateMovement(start, end) {
    return {
        x: end.x - start.x,
        y: end.y - start.y,
        z: end.z - start.z
    }
}
export function clearMainhand(player, count, inCreativeToo = false) {
    if (!inCreativeToo && player?.getGameMode?.() === 'Creative') return 0
    const eq = player?.getComponent?.('equippable'), st = eq?.getEquipment?.('Mainhand')
    if (!st?.amount) return 0
    const rem = Math.min(st.amount, Math.max(1, Math.floor(Number.isFinite(count) ? count : 1)))
    rem < st.amount ? (st.amount -= rem, eq.setEquipment('Mainhand', st)) : eq.setEquipment('Mainhand')
    return rem
}

export function clearOffhand(player, count) {
   let selectedSlot = player.getComponent("equippable").getEquipment("Offhand")
   if (selectedSlot.amount > count) {
      selectedSlot.amount = selectedSlot.amount - count;
      player.getComponent("equippable").setEquipment("Offhand", selectedSlot);
   } else {
      let air = new mc.ItemStack("minecraft:air");
      player.getComponent("equippable").setEquipment("Offhand", air);
   }
}
export function setPermutation(block, stateAdd, stateValue) {
   const result = block.permutation.getAllStates();
   result[stateAdd] = stateValue;
   block.setPermutation(mc.BlockPermutation.resolve(block?.typeId, result));
}
export function isBlockId(block, id){
    let cm = block?.dimension?.runCommand(`testforblock ${block?.location.x} ${block?.location.y} ${block?.location.z} ${id}`).successCount
    if (cm > 0) return true; else return false
}

export function applyDurability(item, amount){
   if (item && amount){
      const durability = item.getComponent('minecraft:durability')
      const currentValue = durability.maxDurability - durability.damage
      if (durability.damage+amount >= durability.maxDurability){
         return new mc.ItemStack('minecraft:air')
      } else if (durability.damage+amount < durability.maxDurability){
         item.getComponent('minecraft:durability').damage = item.getComponent('minecraft:durability').damage+amount
         return item
      }
   }
}

mc.system.afterEvents.scriptEventReceive.subscribe((data) => {
   if (data.id == 'rc_fb:despawn'){data.sourceEntity.remove()}
})

export function isJSONParsable(str) {
   try {
       JSON.parse(str);
       return true;
   } catch (e) {
       return false;
   }
}

export function removeStringFromArray(arr, str) {
   return arr.filter(item => item !== str);
}

export function generateCircleVectors(n, r, center) {
   let vectors = [];
   let angleIncrement = (2 * Math.PI) / n;

   for (let i = 0; i < n; i++) {
       let angle = i * angleIncrement;
       let x = center.x + r * Math.cos(angle);
       let y = center.y; // Presumindo que o círculo está no plano XZ
       let z = center.z + r * Math.sin(angle);
       vectors.push({ x: x, y: y, z: z });
   }

   return vectors;
}
export function calculateRelativeVector(vector1, vector2) {
    return {
        x: vector2.x - vector1.x,
        y: vector2.y - vector1.y,
        z: vector2.z - vector1.z
    };
}


export function blockFaceToDirection(face){
   if (face == 'Up') return 'above'; else
   if (face == 'Down') return 'below'; else
   if (face?.includes('up')) return 'above'; else
   if (face?.includes('down')) return 'below'; else
   if (face == 'North') return 'north'; else
   if (face == 'South') return 'south'; else
   if (face == 'West') return 'west'; else
   if (face == 'East') return 'east'; else return (face)
}
export function invertFace(face){
   if (face == 'above') return 'below'
   if (face == 'below') return 'above'
   if (face == 'north') return 'south'
   if (face == 'south') return 'north'
   if (face == 'west') return 'east'
   if (face == 'east') return 'west'
       
}
export function blockFaceToTraits(face){
    if (face == 'above') return 'up'; else
    if (face == 'below') return 'down'; else
    if (face == 'Up') return 'up'; else
    if (face == 'Down') return 'down'; else
    if (face == 'North') return 'north'; else
    if (face == 'South') return 'south'; else
    if (face == 'West') return 'west'; else
    if (face == 'East') return 'east'; else return (face)
}
export function includesAnyIndex(str, arr) {
   return arr.findIndex(subStr => str.includes(subStr));
 }
export function generateRandomID(length) {
   let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   let randomID = '';
   for (let i = 0; i < length; i++) {
       randomID += characters.charAt(Math.floor(Math.random() * characters.length));
   }
   return randomID;
}

export const transformKey = str => 
   str.split(':')[1].replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

const normalize = str => str.toLowerCase().replace(/[_ :]/g, '')
const filterProperties = (obj, search) => Object.fromEntries(
   Object.entries(obj).filter(([k]) => normalize(k).includes(normalize(search)))
)
export function numToDirection(number){
    if (number == 0) return "up"
    if (number == 1) return "down"
    if (number == 2) return "north"
    if (number == 3) return "south"
    if (number == 4) return "west"
    if (number == 5) return "east"
}
export function invertUpDown(face){
    if (face == 'below') return 'above'; else
    if (face == 'above') return 'below'; else
    if (face == 'up') return 'down'; else
    if (face == 'down') return 'up'; else return face
}

export function includesAny(str, arr) {
   return arr.some(subStr => str.includes(subStr));
 }
export function createDashedLine(viewDirection, playerPosition, numSegments, segmentLength, segmentStart) {
   const directionMagnitude = Math.sqrt(viewDirection.x * viewDirection.x + viewDirection.y * viewDirection.y + viewDirection.z * viewDirection.z)
   viewDirection.x /= directionMagnitude
   viewDirection.y /= directionMagnitude
   viewDirection.z /= directionMagnitude
   let points = []
   for (let i = segmentStart; i < numSegments; i++) {
       let distance = i * segmentLength
       let point = {
           x: playerPosition.x + viewDirection.x * distance,
           y: playerPosition.y + viewDirection.y * distance,
           z: playerPosition.z + viewDirection.z * distance
       }
       points.push(point)
   }
   return points
}
export function addVectors(v1, v2) {
   return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
}
export function divideVectorBy(vector, times) {
   return { x: vector.x / times, y: vector.y / times, z: vector.z / times };
}
export function rotateVector(vector, times) {
   const rotations = times % 4
   let { x, y, z } = vector
   for (let i = 0; i < rotations; i++) {
       [x, z] = [z, -x]
   }
   return { x, y, z };
}
export function relativeToAbsolute(base, relative) {
   return {
       x: base.x + relative.x,
       y: base.y + relative.y,
       z: base.z + relative.z
   };
}

export function getDirection(vectorA, vectorB) {
   const direction = {
       x: vectorB.x - vectorA.x,
       y: vectorB.y - vectorA.y,
       z: vectorB.z - vectorA.z
   };

   // Normaliza a direção
   const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
   
   return {
       x: direction.x / magnitude,
       y: direction.y / magnitude,
       z: direction.z / magnitude
   };
}
export function blockFloorCenter(block){
    return {x:block.center().x, y:block.location.y, z:block.center().z}
}
export function operationWithVectorPLUS(vector, x, y, z){
    let newVector = {x:vector.x+x, y:vector.y-0.4, z:vector.z+z}
    if (newVector) return newVector
}
export function operationWithVectorMINUS(vector, x, y, z){
    let newVector = {x:vector.x-x, y:vector.y-0.4, z:vector.z-z}
    if (newVector) return newVector
}
export function trueFace(block, face, stateId = "minecraft:cardinal_direction"){
    //console.warn(block.typeId, face, block?.permutation?.getState(stateId))
   const state = block?.permutation?.getState(stateId)
   if (state){
       if (state == 'north'){
           if (face == 'north') return 'north'; else
           if (face == 'south') return 'south'; else
           if (face == 'west') return 'west'; else
           if (face == 'east') return 'east'; else return face
       } else 
       if (state == 'west'){
           if (face == 'north') return 'east'; else
           if (face == 'south') return 'west'; else
           if (face == 'west') return 'north'; else
           if (face == 'east') return 'south'; else return face
       } else 
       if (state == 'south'){
           if (face == 'north') return 'south'; else
           if (face == 'south') return 'north'; else
           if (face == 'west') return 'east'; else
           if (face == 'east') return 'west'; else return face
       } else 
       if (state == 'east'){
           if (face == 'north') return 'west'; else
           if (face == 'south') return 'east'; else
           if (face == 'west') return 'south'; else
           if (face == 'east') return 'north'; else return face
       }
   } else return face
}

export function convergeDirection(direction){
   if (direction == 'north') return 'north'; else
   if (direction == 'south') return 'north'; else
   if (direction == 'west') return 'west'; else
   if (direction == 'east') return 'west'; else
   if (direction == 'up') return 'up'; else
   if (direction == 'down') return 'up'; else
   if (direction == 'above') return 'above'; else
   if (direction == 'below') return 'above'; else direction

}
export function itemIsBlock(block, item) {
    if (
        item?.typeId == 'minecraft:bedrock'
    )
    {
        return true
    } else
   if (
       item?.typeId?.includes("kelp") || 
       item?.typeId?.includes("coral") || 
       item?.typeId?.includes("vine") ||   
       item?.typeId?.includes("glowstone_dust") ||          
       item?.typeId?.includes("hopper") ||                  
       item?.typeId?.includes("chain") ||                   
       item?.typeId?.includes("dripstone") ||               
       item?.typeId == "minecraft:bamboo" ||                  
       item?.typeId?.includes("candle") ||                  
       item?.typeId?.includes("campfire") ||                
       item?.typeId?.includes("cauldron") ||                
       item?.typeId?.includes("armor_stand") ||             
       item?.typeId?.includes("sign") ||                    
       item?.typeId?.includes("item_frame") ||              
       item?.typeId?.includes("painting") ||                
       item?.typeId?.includes("mushroom") ||                
       item?.typeId?.includes("bell") ||                    
       item?.typeId?.includes("rail") ||                    
       item?.typeId?.includes("shovel") ||                  
       item?.typeId?.includes("torch") ||                   
       item?.typeId?.includes("amethyst_cluster") ||        
       item?.typeId?.includes("blud") ||        
       item?.typeId?.includes("door") ||                    
       item?.typeId?.includes("ladder") ||                  
       item?.typeId?.includes("iron_bars") ||               
       item?.typeId?.includes("bed") ||
       item?.typeId == "minecraft:bamboo" ||
       item?.typeId == "minecraft:lantern" ||
       item?.typeId == "minecraft:soul_lantern" ||
       item?.typeId == "minecraft:deadbush" ||
       item?.typeId == "minecraft:sniffer_egg" ||
       item?.typeId?.includes("sea_pickle") ||
       item?.typeId?.includes("brewing_stand") ||
       item?.typeId?.includes("frame") ||
       item?.typeId?.includes("tripwire_hook") ||
       item?.typeId?.includes("minecraft:lever") ||
       item?.typeId?.includes("amethyst") ||
       item?.typeId?.includes("poppy") ||
       item?.typeId?.includes("sapling")
   ){
       return false
   } else
   {
       try {
           if (block.dimension.runCommand(`setblock ${block.x} -64 ${block.z} ${item?.typeId}`).successCount > 0) {
               block.dimension.runCommand(`setblock ${block.x} -64 ${block.z} bedrock`)
               return true;
           } else {
               return false;
           }
       } catch (error) {
           return false;
       }
   }
}
export function transferItem(containerA, containerB, i, amountRequested){
   const itemA = containerA?.getItem(i)
   if (itemA && itemA?.amount >= amountRequested){
       let hasSpace = false
       if (containerB.emptySlotsCount > 0) hasSpace = true; else
       for (let o = 0; o < containerB.size; o++){
           const containerItem = containerB.getItem(o)
           if (containerItem?.isStackableWith(itemA) && containerItem.amount + amountRequested <= containerItem.maxAmount){
               hasSpace = true
           }
       }
       if (hasSpace){
           if (itemA.amount > amountRequested){
               itemA.amount -= amountRequested
               containerA.setItem(i, itemA)
               itemA.amount = amountRequested
               containerB.addItem(itemA)
           } else
           if (itemA.amount == amountRequested){
               containerA.setItem(i, )
               itemA.amount = amountRequested
               containerB.addItem(itemA)
           }
       }
   }
}
export function transferEntityItem(entityItem, containerB, amountRequested){
   const itemA = entityItem.getComponent('minecraft:item').itemStack
   if (itemA && itemA?.amount >= amountRequested){
       let hasSpace = false
       if (containerB?.emptySlotsCount > 0) hasSpace = true; else
       for (let o = 0; o < containerB?.size; o++){
           const containerItem = containerB.getItem(o)
           if (containerItem?.isStackableWith(itemA) && containerItem.amount + amountRequested <= containerItem.maxAmount){
               hasSpace = true
           }
       }
       if (hasSpace){
           if (itemA.amount > amountRequested){
               const itemfudido = entityItem.dimension.spawnItem(new mc.ItemStack(itemA?.typeId, itemA.amount-amountRequested), entityItem.location)
               itemfudido.teleport(itemfudido.location)
               itemA.amount = amountRequested
               entityItem?.remove()
               containerB.addItem(itemA)
           } else
           if (itemA.amount == amountRequested){
               entityItem.remove()
               itemA.amount = amountRequested
               containerB.addItem(itemA)
           }
       }
   }
}






export function randomString(list) {
    if (!Array.isArray(list) || list.length === 0) {
        throw new Error('Passe um array com pelo menos 1 string.');
    }
    const i = Math.floor(Math.random() * list.length);
    const v = list[i];
    if (typeof v !== 'string') {
        throw new Error('O array deve conter apenas strings.');
    }
    return v;
}



export function directionToVector(direction, distance = 1) {
    switch (direction) {
        case 'south': return { x: 0, y: 0, z: 1 * distance }
        case 'west': return { x: -1 * distance, y: 0, z: 0 }
        case 'north': return { x: 0, y: 0, z: -1 * distance }
        case 'east': return { x: 1, y: 0, z: 0 }
        case 'above': return { x: 0, y: 1 * distance, z: 0 }
        case 'below': return { x: 0, y: -1 * distance, z: 0 }
        default: return { x: 0, y: 0, z: 1 * distance }
    }
}


export function pontoMedio(base, distancia, direcao) {
    const middleDistance = distancia
    const absoluteVector = { x: base.x + (direcao.x * middleDistance), y: base.y + (direcao.y * middleDistance), z: base.z + (direcao.z * middleDistance) }
    return absoluteVector
}
export function distanciaEntrePontos(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}









/**
 * @param {mc.ItemStack} item
 * @param {mc.Entity} entity
 * @param {'Mainhand'|'Offhand'} slotName
 * @param {'0'|'1'} slot
 * @param {'rc_fb:filter_type'} propertyName
 */
export function setItemInHand(item, entity, slotName, slot, propertyName) {
    if (!entity?.isValid || !item) return false

    const slotLowCase = slotName.toLowerCase()
    let itemIs = itemStackIs(item)
    const filterEntity = entity?.typeId === "create:chute_smart_filter"
        || entity?.typeId === "create:brass_funnel_entity"
        || entity?.typeId === "create:brass_tunnel_entity_x"
        || entity?.typeId === "create:brass_tunnel_entity_z"
        || entity?.typeId === "create:smart_observer_entity"
        || entity?.typeId === "create:mechanical_arm_entity"
    if (filterEntity && itemIs === "item" && isHandEquippedFilterItem(item?.typeId)) {
        itemIs = "hand_equipped"
    }
    try { entity?.runCommand(`replaceitem entity @s slot.weapon.${slotLowCase} 0 air`) } catch {}
    try { entity?.getComponent('inventory')?.container?.setItem(slot, undefined) } catch {}
    if (itemIs === "hand_equipped") {
        try { entity.setProperty(propertyName, "hand_equipped") } catch {}
        try { entity.runCommand(`replaceitem entity @s slot.weapon.${slotLowCase} 0 ${item.typeId}`) } catch {}
        try { entity.getComponent('inventory')?.container?.setItem(slot, item) } catch {}
        return true
    }
    if (itemIs != 'block' && itemIs != 'item'){//se é fake item..
        try { entity.setProperty(propertyName, 'item') } catch {}
        try { entity.runCommand(`replaceitem entity @s slot.weapon.${slotLowCase} 0 ${item.typeId}`) } catch {}
        try { entity.getComponent('inventory')?.container?.setItem(slot, item) } catch {}
    } else {
        try { entity.setProperty(propertyName, itemIs) } catch {}
        try { entity.runCommand(`replaceitem entity @s slot.weapon.${slotLowCase} 0 ${item.typeId}`) } catch {}
        try { entity.getComponent('inventory')?.container?.setItem(slot, item) } catch {}
    }
    return true
}

const FILTER_HAND_EQUIPPED = /sword|pickaxe|axe|shovel|hoe|spear|wrench|hammer|drill|saw|knife|dagger|mace|bow|crossbow|trident|fishing_rod|carrot_on_a_stick|warped_fungus_on_a_stick|stick|staff|cannon/

export function isHandEquippedFilterItem(itemId) {
    return typeof itemId === "string" && FILTER_HAND_EQUIPPED.test(itemId)
}

export function processOneConveyorItem(conveyorItem, resultItem, outputLocation) {
    const container = conveyorItem?.getComponent("minecraft:inventory")?.container
    const inputItem = container?.getItem(0)
    if (!conveyorItem?.isValid || !inputItem || !resultItem) return false

    const processAmount = 1
    const outputItem = resultItem.clone()
    outputItem.amount = processAmount

    if (inputItem.amount > processAmount) {
        const remainingItem = inputItem.clone()
        remainingItem.amount -= processAmount
        setItemInHand(remainingItem, conveyorItem, "Mainhand", 0, "create:item_visual")

        try {
            const spawnLocation = outputLocation
                ? { x: outputLocation.x, y: outputLocation.y + 0.08, z: outputLocation.z }
                : conveyorItem.location
            const dropped = conveyorItem.dimension.spawnItem(outputItem, spawnLocation)
            dropped?.clearVelocity?.()
        } catch {}
        return true
    }

    setItemInHand(outputItem, conveyorItem, "Mainhand", 0, "create:item_visual")
    return true
}

/**
 * @param {mc.Entity} filterEntity
 * @param {'0'|'1'} filterSlot
 */
export function idIncludedInFilter(id, filterEntity, filterSlot){
    if (!filterEntity) return true
    const container = filterEntity?.getComponent('inventory')?.container
    const item = container?.getItem(filterSlot)
    if (item){
        //console.warn(item?.typeId, id)
        if (item?.typeId == id) return true; else
        if (item?.typeId == 'rc_fb:item_filter'){
            if (isJSONParsable(item?.getDynamicProperty('rc_fb:filter'))){
                const filter = JSON.parse(item?.getDynamicProperty('rc_fb:filter'))
                if (filter?.includes(id)) return true
            }
        };
        return false
    } else return true
}

export function itemStackIs(itemStack) {
    const id = itemStack?.typeId
    if (fakeId[id]) {
        return fakeId[id]
    } else {
        let hit = false
        for (const k of SUBSTRINGS) if (id.includes(k)) hit = true
        if (mc.BlockTypes.get(id) && !EXACT.has(id) && !hit) {
            return "block"
        } else return "item"
    }
} 
const EXACT = new Set([
    // Itens finos que tambem possuem um BlockType. Nos filtros eles precisam
    // usar a exibicao normal de item, e nao a rotacao de bloco.
    "minecraft:wheat",
    "minecraft:wheat_seeds",
    "minecraft:resin_clump",
    "minecraft:beetroot",
    "minecraft:beetroot_seeds",
    "minecraft:carrot",
    "minecraft:potato",
    "minecraft:poisonous_potato",
    "minecraft:melon_seeds",
    "minecraft:pumpkin_seeds",
    "minecraft:torchflower_seeds",
    "minecraft:pitcher_pod",
    "minecraft:cocoa_beans",
    "minecraft:sugar_cane",
    "minecraft:sweet_berries",
    "minecraft:glow_berries",
    "minecraft:bamboo",
    "minecraft:lantern",
    "minecraft:soul_lantern",
    "minecraft:deadbush",
    "minecraft:sniffer_egg",
    "minecraft:lever",
    "minecraft:short_grass",
    "minecraft:tall_grass",
    "minecraft:fern",
    "minecraft:large_fern",
    "minecraft:hopper"
])
const SUBSTRINGS = [
    "kelp", "coral", "vine", "glowstone_dust", "hopper", "chain", "dripstone",
    "candle", "campfire", "cauldron", "armor_stand", "sign", "item_frame", "painting",
    "mushroom", "bell", "rail", "shovel", "torch", "amethyst_cluster", "blud",
    "door", "ladder", "iron_bars", "bed", "sea_pickle", "brewing_stand", "frame",
    "amethyst", "poppy", "sapling"
]
const fakeId = {
    "minecraft:bamboo": "rc_fb:fake_bamboo",
    "minecraft:blaze_rod": "rc_fb:fake_blaze_rod",
    "minecraft:bow": "rc_fb:fake_bow",
    "minecraft:breeze_rod": "rc_fb:fake_breeze_rod",
    "rc_fb:replace_wand": "rc_fb:fake_replace_wand",
    "rc_fb:chainsaw": "rc_fb:fake_chainsaw",
    "rc_fb:compound_bow": "rc_fb:fake_compound_bow",
    "minecraft:crossbow": "rc_fb:fake_crossbow",
    "minecraft:diamond_axe": "rc_fb:fake_diamond_axe",
    "minecraft:diamond_hoe": "rc_fb:fake_diamond_hoe",
    "minecraft:diamond_pickaxe": "rc_fb:fake_diamond_pickaxe",
    "minecraft:diamond_shovel": "rc_fb:fake_diamond_shovel",
    "minecraft:diamond_sword": "rc_fb:fake_diamond_sword",
    "minecraft:fishing_rod": "rc_fb:fake_fishing_rod",
    "rc_fb:flamethrower": "rc_fb:fake_flamethrower",
    "rc_fb:fuel_gallon": "rc_fb:fake_fuel_gallon",
    "minecraft:golden_axe": "rc_fb:fake_golden_axe",
    "minecraft:golden_hoe": "rc_fb:fake_golden_hoe",
    "minecraft:golden_pickaxe": "rc_fb:fake_golden_pickaxe",
    "minecraft:golden_shovel": "rc_fb:fake_golden_shovel",
    "minecraft:golden_sword": "rc_fb:fake_golden_sword",
    "rc_fb:grappling_hook": "rc_fb:fake_grappling_hook",
    "rc_fb:hand_drill": "rc_fb:fake_hand_drill",
    "minecraft:iron_hoe": "rc_fb:fake_iron_hoe",
    "minecraft:iron_pickaxe": "rc_fb:fake_iron_pickaxe",
    "minecraft:iron_shovel": "rc_fb:fake_iron_shovel",
    "minecraft:iron_sword": "rc_fb:fake_iron_sword",
    "minecraft:mace": "rc_fb:fake_mace",
    "minecraft:netherite_axe": "rc_fb:fake_netherite_axe",
    "minecraft:netherite_hoe": "rc_fb:fake_netherite_hoe",
    "minecraft:netherite_pickaxe": "rc_fb:fake_netherite_pickaxe",
    "minecraft:netherite_shovel": "rc_fb:fake_netherite_shovel",
    "minecraft:netherite_sword": "rc_fb:fake_netherite_sword",
    "rc_fb:ore_locator": "rc_fb:fake_ore_locator",
    "minecraft:pointed_dripstone": "rc_fb:fake_pointed_dripstone",
    "rc_fb:remote_redstone": "rc_fb:fake_remote_redstone",
    "rc_fb:combat_scythe": "rc_fb:fake_combat_scythe",
    "minecraft:shield": "rc_fb:fake_shield",
    "rc_fb:sledgehammer": "rc_fb:fake_sledgehammer",
    "minecraft:spyglass": "rc_fb:fake_spyglass",
    "minecraft:stick": "rc_fb:fake_stick",
    "minecraft:stone_axe": "rc_fb:fake_stone_axe",
    "minecraft:stone_hoe": "rc_fb:fake_stone_hoe",
    "minecraft:stone_pickaxe": "rc_fb:fake_stone_pickaxe",
    "minecraft:stone_shovel": "rc_fb:fake_stone_shovel",
    "minecraft:stone_sword": "rc_fb:fake_stone_sword",
    "minecraft:trident": "rc_fb:fake_trident",
    "minecraft:wooden_axe": "rc_fb:fake_wooden_axe",
    "minecraft:wooden_hoe": "rc_fb:fake_wooden_hoe",
    "minecraft:wooden_pickaxe": "rc_fb:fake_wooden_pickaxe",
    "minecraft:wooden_shovel": "rc_fb:fake_wooden_shovel",
    "minecraft:wooden_sword": "rc_fb:fake_wooden_sword",
    "rc_fb:wrench": "rc_fb:fake_wrench"
}

export function getFakeItemId(itemStackOrId) {
    const id = typeof itemStackOrId === "string" ? itemStackOrId : itemStackOrId?.typeId
    return fakeId[id]
}



export function shortestAngle(currentAngle, targetAngle) {
    const normalizeAngle = (angle) => ((angle + 180) % 360) - 180
    const normalizedCurrent = normalizeAngle(currentAngle)
    const normalizedTarget = normalizeAngle(targetAngle)
    let angleDifference = normalizeAngle(normalizedTarget - normalizedCurrent)
    let closestAngleToReturn = normalizedCurrent + angleDifference
    return normalizeAngle(closestAngleToReturn);
}

export function randIntBetween(a, b) {
    const min = Math.ceil(Math.min(a, b));
    const max = Math.floor(Math.max(a, b));
    return Math.floor(Math.random() * (max - min + 1)) + min; // [min, max]
}

/**
 * @param {mc.Entity} itemEntity 
*/
export function separeItemEntity(itemEntity, pileAmount){
    if (itemEntity?.typeId == 'minecraft:item'){
        const itemStack = itemEntity?.getComponent('minecraft:item')?.itemStack
        const firstAmount = Math.min(pileAmount, itemStack?.amount)
        const secondAmount = itemStack?.amount-firstAmount
        let firstItem = itemStack.clone()
        let secondItem = itemStack.clone()
        firstItem.amount = firstAmount
        if (secondAmount > 0){
            secondItem.amount = secondAmount
        } else secondItem = undefined
        return { firstItem: firstItem, secondItem: secondItem }
    } else return false
}



/**
 * @param {mc.ItemStack} itemStack 
*/
export function separeItemStack(itemStack, pileAmount) {
    const firstAmount = Math.min(pileAmount, itemStack?.amount)
    const secondAmount = itemStack?.amount - firstAmount
    let firstItem = itemStack.clone()
    let secondItem = itemStack.clone()
    firstItem.amount = firstAmount
    if (secondAmount > 0) {
        secondItem.amount = secondAmount
    } else secondItem = undefined
    return { firstItem: firstItem, secondItem: secondItem }
}



export function randomId(length = 10) {
    // Bedrock does not expose Web Crypto; these are non-security identifiers.
    return 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}









/**
 * Retorna a face cardinal (north, south, west, east) do target
 * em relação ao base.
 *
 * @param {{x:number, y:number, z:number}} base
 * @param {{x:number, y:number, z:number}} target
 * @returns {"north" | "south" | "west" | "east" | null}
 */
export function getCardinalFromVectors(base, target) {
    const dx = target.x - base.x;
    const dz = target.z - base.z;

    // Se estiverem praticamente no mesmo lugar no plano XZ
    if (dx === 0 && dz === 0) {
        return null;
    }

    // Decide pela componente dominante (X ou Z)
    if (Math.abs(dx) > Math.abs(dz)) {
        // Lado leste/oeste
        return dx > 0 ? "east" : "west";
    } else {
        // Lado norte/sul (lembrando: +Z = south, -Z = north)
        return dz > 0 ? "south" : "north";
    }
}



/**
 * Classe utilitária de vetor 3D.
 * - Representa um ponto/direção no espaço com x, y, z.
 */
export class Vector {
    /**
     * @param {number} [x=0] Coordenada X
     * @param {number} [y=0] Coordenada Y
     * @param {number} [z=0] Coordenada Z
     */
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Soma dois vetores (x+y+z).
     * @param {{x:number,y:number,z:number}} vetorA
     * @param {{x:number,y:number,z:number}} vetorB
     * @returns {Vector} Novo Vector com a soma
     */
    static sum(vetorA, vetorB) {
        return new Vector(
            (vetorA?.x || 0) + (vetorB?.x || 0),
            (vetorA?.y || 0) + (vetorB?.y || 0),
            (vetorA?.z || 0) + (vetorB?.z || 0)
        );
    }

    /**
     * Multiplica um vetor por um escalar.
     * @param {{x:number,y:number,z:number}} vetor
     * @param {number} num
     * @returns {Vector}
     */
    static multiply(vetor, num) {
        return new Vector((vetor?.x || 0) * num, (vetor?.y || 0) * num, (vetor?.z || 0) * num);
    }

    /**
     * Distância Euclidiana 3D entre dois vetores (com Y).
     * @param {{x:number,y:number,z:number}} vetorA
     * @param {{x:number,y:number,z:number}} vetorB
     * @returns {number|undefined} Distância, ou undefined se faltar parâmetro
     */
    static distance(vetorA, vetorB) {
        if (!vetorA || !vetorB) return undefined;
        const dx = (vetorA.x || 0) - (vetorB.x || 0);
        const dy = (vetorA.y || 0) - (vetorB.y || 0);
        const dz = (vetorA.z || 0) - (vetorB.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Distância no plano XZ (ignora Y).
     * @param {{x:number,y?:number,z:number}} vetorA
     * @param {{x:number,y?:number,z:number}} vetorB
     * @returns {number|undefined}
     */
    static distanceXZ(vetorA, vetorB) {
        if (!vetorA || !vetorB) return undefined;
        const dx = (vetorA.x || 0) - (vetorB.x || 0);
        const dz = (vetorA.z || 0) - (vetorB.z || 0);
        return Math.sqrt(dx * dx + dz * dz);
    }

    /**
     * Subtrai vetorB de vetorA (A - B).
     * @param {{x:number,y:number,z:number}} vetorA
     * @param {{x:number,y:number,z:number}} vetorB
     * @returns {Vector|undefined}
     */
    static subtract(vetorA, vetorB) {
        if (!vetorA || !vetorB) return undefined;
        return new Vector((vetorA.x || 0) - (vetorB.x || 0), (vetorA.y || 0) - (vetorB.y || 0), (vetorA.z || 0) - (vetorB.z || 0));
    }

    /**
     * Compara igualdade estrita de coordenadas.
     * @param {{x:number,y:number,z:number}} a
     * @param {{x:number,y:number,z:number}} b
     * @returns {boolean}
     */
    static compare(a, b) {
        return a?.x === b?.x && a?.y === b?.y && a?.z === b?.z;
    }

    /**
     * Normaliza (transforma em vetor unitário).
     * @param {{x:number,y:number,z:number}} vetor
     * @returns {{x:number,y:number,z:number}} Objeto normalizado
     */
    static normalize(vetor) {
        const m = Math.hypot(vetor?.x || 0, vetor?.y || 0, vetor?.z || 0) || 1;
        return { x: (vetor?.x || 0) / m, y: (vetor?.y || 0) / m, z: (vetor?.z || 0) / m };
    }

    /**
     * Cria uma lista de posições formando um círculo no plano XZ, no Y do bloco.
     * @param {mc.Block} startblock Bloco de referência (usa center())
     * @param {number} radius Raio do círculo
     * @param {number} numBlocks Quantidade de pontos no círculo
     * @returns {Vector[]} Lista de vetores (posições)
     */
    static createCircle(startblock, radius, numBlocks) {
        if (!startblock || !radius || !numBlocks) return [];
        const softness = (2 * Math.PI) / numBlocks;
        const blockLocations = [];
        const startBlockCenter = startblock.center();

        for (let i = 0; i < numBlocks; i++) {
            const x = startBlockCenter.x + radius * Math.cos(i * softness);
            const z = startBlockCenter.z + radius * Math.sin(i * softness);
            const y = startBlockCenter.y;
            blockLocations.push(new Vector(x, y, z));
        }
        return blockLocations;
    }

    /**
     * Converte um vetor relativo (offset) para absoluto somando no "base".
     * @param {{x:number,y:number,z:number}} base
     * @param {{x:number,y:number,z:number}} relative
     * @returns {{x:number,y:number,z:number}}
     */
    static relativeToAbsolute(base, relative) {
        return { x: base.x + relative.x, y: base.y + relative.y, z: base.z + relative.z };
    }
}



export function rotateVectorByFace(vector, face) {
    switch (face) {
        case 'north': return { x: vector.x, y: vector.y, z: vector.z }
        case 'south': return { x: -vector.x, y: vector.y, z: -vector.z }
        case 'west': return { x: vector.z, y: vector.y, z: -vector.x }
        case 'east': return { x: -vector.z, y: vector.y, z: vector.x }
        case 'below': return { x: vector.x, y: vector.z, z: -vector.y }
        case 'above': return { x: vector.x, y: -vector.z, z: vector.y }
        default: return vector
    }
}


export function directionToRotation(vector) {
    const { x, y, z } = vector
    const yaw = Math.atan2(-x, -z) * (180 / Math.PI)
    const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI)
    return { x: pitch, y: yaw }
}
