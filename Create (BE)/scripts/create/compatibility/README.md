# Create Compatibility API v1

This folder is the public entry point for integrations. Recipes, fluids, and kinetic blocks can be registered by another behavior pack through `system.sendScriptEvent`.

```js
import { system } from "@minecraft/server";

system.run(() => system.sendScriptEvent("create_compat:register_recipe", JSON.stringify({
  machine: "millstone",
  recipe: {
    input: "my_addon:mineral",
    duration: 100,
    outputs: [{ item: "my_addon:dust", count: 2, chance: 1 }]
  }
})));

system.run(() => system.sendScriptEvent("create_compat:register_fluid", JSON.stringify({
  id: "my_addon:oil_bucket",
  bucket: "my_addon:oil_bucket",
  visualType: "water",
  color: "#302010"
})));

system.run(() => system.sendScriptEvent("create_compat:register_kinetic", JSON.stringify({
  blockId: "my_addon:motor",
  config: {
    rotationState: "minecraft:facing_direction",
    isGenerator: true,
    stressCapacity: 128,
    entityType: "my_addon:motor_visual",
    faces: { north: { type: "shaft" } }
  }
})));
```

Supported machines are `millstone`, `crushing`, `pressing`, `mixing`,
`spouting`, `blasting`, `smoking`, `splashing`, `haunting`, `sequenced`,
`crafting`, and `crafting_shapeless`. Tank quantities use millibuckets: one
bucket equals `1000` mB.

## API v2 recipe examples

Fan recipes use the same output format as crushing recipes:

```js
system.sendScriptEvent("create_compat:register_recipe", JSON.stringify({
  machine: "splashing",
  recipe: {
    input: "my_addon:dirty_dust",
    outputs: [{ item: "my_addon:clean_dust", count: 1, chance: 1 }]
  }
}));
```

Mechanical Crafter recipes use the normal shaped or shapeless recipe format:

```js
system.sendScriptEvent("create_compat:register_recipe", JSON.stringify({
  machine: "crafting_shapeless",
  recipe: {
    ingredients: [{ item: "my_addon:part" }, { item: "minecraft:redstone" }],
    result: { id: "my_addon:powered_part", amount: 1 }
  }
}));
```

Sequenced recipes require a unique `id`, an input, an in-progress item, at
least one step, and a result. Known operation names are `deploy`, `press`,
`spout`, and `cut`. The current deployer executor processes `deploy` steps;
the other operation names are reserved for machine-specific executors.

```js
system.sendScriptEvent("create_compat:register_recipe", JSON.stringify({
  machine: "sequenced",
  recipe: {
    id: "my_addon:precision_part",
    input: "my_addon:sheet",
    inProgress: "my_addon:incomplete_precision_part",
    passes: 2,
    sequence: [{ operation: "deploy", item: "create:cogwheel" }],
    output: "my_addon:precision_part"
  }
}));
```

## Custom fluids in drains, tanks, and pipes

`id` is the logical fluid ID and `bucket` is the item that carries it. They may
be different. `fluidType`/`visualType` must match a fluid type supported by the
Create visual entities, such as `water`, `lava`, `honey`, `chocolate`, or
`milk`. A custom `block` is optional; without one, the fluid can move between
containers but will not be placed into the world.

```js
system.sendScriptEvent("create_compat:register_fluid", JSON.stringify({
  id: "my_addon:oil",
  bucket: "my_addon:oil_bucket",
  empty: "minecraft:bucket",
  fluidType: "water",
  translationKey: "fluid.my_addon.oil",
  block: "my_addon:oil_block",
  particle: "minecraft:water_drip_particle",
  sound: "bucket.empty_water"
}));
```

The compatibility system indexes each registered fluid by its logical `id`,
filled `bucket`/container, and optional world `block`. The container item does
not need to end in `_bucket`. Custom empty containers are supported through
the `empty` field.

Registered fluids can be inserted into and extracted from Fluid Tanks,
Creative Fluid Tanks, Item Drains, Basins, and Spouts. Mechanical Pumps move
them through regular pipes and Smart Fluid Pipes, and custom filled containers
can be used as Smart Fluid Pipe filters. If `block` is provided, the standard
fluid-container interaction can place and collect it in the world. Without a
world block, the fluid remains fully usable between machines and containers.

`visualType` (or `fluidType`) must be one of `water`, `lava`, `honey`,
`chocolate`, or `milk`, because these are the visual states declared by the
Create fluid entities. `translationKey` is optional and lets Engineer's
Goggles display the custom fluid name when the integration Resource Pack
defines that language key.

Registrations emit `create_compat:registration_ack`. Add a `requestId` to the
registration payload to match the acknowledgement to the original request.

Integrations stored inside this behavior pack can import `CreateCompatibility` from `index.js`. The kinetic API provides `kinetics.registerBlock(blockId, config)`, using the same face format as `rpmConfigs.js`, and `kinetics.refreshNetwork(block)` for recalculating a network after a generator changes.

The block JSON must use the `create:rpm_system` component. Its visual entity must declare the `create:rpm` property. Adjustable generators must store their speed in the `create:generator_rpm` dynamic property.

## Adding an animated shaft to another machine

A machine needs three parts: a kinetic block in the Behavior Pack, a visual entity placed over that block, and a geometry bone named `rpm`. The system calculates network speed and direction, writes the result to `create:rpm`, and the animation rotates that bone. Positive and negative RPM automatically rotate in opposite directions.

### 1. Machine block (Behavior Pack)

Add the `create:rpm_system` component. If the machine script should tick only while powered by rotation, also declare the following state:

```json
{
  "minecraft:block": {
    "description": {
      "identifier": "my_addon:my_machine",
      "states": { "create:is_spinning": [false, true] },
      "traits": {
        "minecraft:placement_direction": {
          "enabled_states": ["minecraft:cardinal_direction"]
        }
      }
    },
    "components": { "create:rpm_system": {} }
  }
}
```

The Behavior Pack containing this block must depend on the Create Behavior Pack. Its Resource Pack must be active together with the Create Resource Pack because the shared animation uses the identifier `animation.create.rpm.rotation`.

### 2. Registering shaft connection points

This example creates a consuming machine with a shaft passing through its front and back sides:

```js
system.run(() => system.sendScriptEvent("create_compat:register_kinetic", JSON.stringify({
  blockId: "my_addon:my_machine",
  config: {
    rotationState: "minecraft:cardinal_direction",
    entityType: "my_addon:my_machine_visual",
    hasSpinningState: true,
    stressImpact: 4,
    faces: {
      north: { type: "shaft" },
      south: { type: "shaft" }
    }
  }
})));
```

Faces are relative to the model before the block is rotated. The system uses `rotationState` to convert them to their actual directions in the world:

- `north` and `south`: a horizontal shaft passing through the machine;
- `above` and `below`: a vertical connection;
- `east` and `west`: a sideways horizontal shaft;
- one face only: input/output on that side only.

To accept both a regular shaft and a Steam Engine shaft, use:

```json
{
  "type": "shaft",
  "accepts": ["shaft", "steam_engine_shaft"],
  "ratios": { "steam_engine_shaft": 1 }
}
```

The most important configuration values are:

- `stressImpact`: stress consumed by the machine;
- `stressCapacity`: stress capacity produced by a generator;
- `isGenerator`: turns the block into an RPM source;
- `entityType`: visual entity containing the shaft;
- `entityOffset`: entity offset, such as `{ "x": 0, "y": 0, "z": 0 }`;
- `hasSpinningState`: updates the block's `create:is_spinning` state;
- `rotationState`: block state controlling model orientation.

### 3. Visual entity (Behavior Pack)

The entity specified by `entityType` needs at least these synchronized properties. The RPM range must support the network limit, currently 256 RPM:

```json
"properties": {
  "create:rpm": {
    "client_sync": true,
    "type": "float",
    "range": [-256.0, 256.0],
    "default": 0.0
  },
  "create:cardinal_rotation": {
    "client_sync": true,
    "type": "enum",
    "values": ["north", "south", "east", "west", "up", "down"],
    "default": "south"
  },
  "create:offset": {
    "client_sync": true,
    "type": "bool",
    "default": false
  }
}
```

Use an entity with no gravity, collision, or pushing. The kinetic system creates, positions, orients, and removes this entity with the machine.

### 4. Client Entity and geometry (Resource Pack)

In the geometry, place the shaft and every part that should rotate under a bone named `rpm`. The local rotation axis of this bone must be Z. Then use:

```json
"animations": {
  "rotation": "animation.create.rpm.rotation",
  "offset": "animation.create.rpm.offsets"
},
"scripts": {
  "animate": ["rotation", "offset"],
  "pre_animation": [
    "v.rotation = q.property('create:cardinal_rotation');",
    "v.offset_sign = 1;",
    "v.visual_sign = 1;",
    "v.rpm = ((q.frame_alpha + q.time_stamp) / 3.33) * -q.property('create:rpm');",
    "v.rpm2 = 0;"
  ]
}
```

If the shaft visually rotates in the wrong direction, change only `v.visual_sign` from `1` to `-1`. Do not invert RPM in the machine script because the visual direction would then disagree with the real mechanical direction of the network.

To orient the entire model with the machine face, place its visual bones under `facing_rotation`, or reproduce that rotation in the model. The shared animation's `shaft_rotation` bone can also be used when a shaft must change between the X, Y, and Z axes.

### 5. Custom RPM source

An RPM source uses `isGenerator: true` and `stressCapacity`. After its logic changes the speed, store `create:generator_rpm` on the visual entity and request a network update through the internal API:

```js
entity.setDynamicProperty("create:generator_rpm", 64);
CreateCompatibility.kinetics.refreshNetwork(block);
```

For cross-pack generators, do not write `create:generator_rpm` directly because
dynamic properties are isolated by behavior-pack ownership. Ask Create to write
the value and recalculate the network instead:

```js
system.sendScriptEvent("create_compat:set_generator_rpm", JSON.stringify({
  dimension: "overworld",
  x: 10,
  y: 64,
  z: 10,
  rpm: 64
}));
```

The event can also be emitted with the generator as `sourceBlock`, in which
case coordinates are unnecessary. Use values from `-256` through `256`; the
sign controls rotation direction.
