# Bedrock diagnostics

Behavior pack: `Create (BE)` (BP). Resource pack: `Create (RE)` (RP).
The repository intentionally retains these paths; no duplicate BP/RP packs are created.

## Commands

- `npm run test:json`: recursively runs jsonlint over both packs, then AJV structural checks for manifests, entities, blocks, items, and recipes. These are structural checks, not exhaustive Minecraft component schemas.
- `npm run test:types`: `tsc --noEmit` with JavaScript checking enabled across the behavior-pack scripts.
- `npm run test:lint`: correctness rules including undefined names across all behavior-pack JavaScript.
- `npm run test:unit`: Vitest tests executing actual source functions in isolation for inventory transfer, tank visual reload, sequenced assembly outcomes, and kinetic particle orientation.
- `npm test`: all four stages; fails immediately if any stage fails.
- `npm run pack`: tests, icon resizing, and packaging. A failed test intentionally prevents this release pipeline.
- `npm run debug:bedrock`: source/import/localization/icon checks and CRC/source comparison of the root archive.
- `npm run resize` / `npm run build`: explicit asset processing / packaging, useful for inspecting an unreleased diagnostic checkpoint.

The jsonlint CLI accepts one file at a time. A recursive runner is required instead of passing `BP/**/*.json RP/**/*.json`, which would use nonexistent paths and would not reliably validate every file.

## Current checkpoint

The manifests and npm API declarations target `@minecraft/server` 2.10.0 and `@minecraft/server-ui` 2.2.0. Both packs declare Minecraft 1.26.50 as the minimum engine; the behavior pack uses script APIs first released in 1.26.10. Older versions cannot be assumed compatible.

Bedrock 1.26.10 removed `minecraft:pushable` and split it into `minecraft:pushable_by_entity` and `minecraft:pushable_by_block`. The addon had 92 legacy declarations, all setting both push flags to false. Those no-op declarations were removed: with neither new component present, entities are not pushable, preserving the authored intent. JSON checks now reject the retired component. `npm run validate:bedrock` on Creator Tools 0.20.0 reports zero errors and 1,335 warnings (resource texture-atlas schema/link warnings, unused audio assets, missing custom-item links, and geometry cube-count advisories); this is not warning-free validation. One format-version warning was corrected, though the full validator remains warning-positive. Some findings are Creator Tools schema/link coverage limitations: Microsoft’s custom-block guide documents atlas `textures` as a string, while this validator requires an array, and its render-controller form marks `uv_anim` optional while its emitted warning treats it as required. The remaining geometry counts are genuine performance advisories and need model-specific optimization; orphaned audio and links need in-game/content review before assets are removed.

The latest verified run passed `npm test`: 1,404 JSON syntax checks, 1,031 AJV structural checks, TypeScript, ESLint, and all 171 Vitest regressions. The add-on was rebuilt, and `npm run debug:bedrock` verified both embedded packs against their source files, including archive CRCs, manifests, and the behavior script entry.

Creator Tools validation was run against staged copies of both packs: zero errors, 1,335 warnings. The diagnostics are summarized above; they are not represented as clean validation, and this check is not a runtime simulation.

## Required in-game verification

Import `Create-Bedrock.mcaddon` into Minecraft Preview supporting the declared APIs. Enable both packs in a test world. Turn on **Settings > Creator > Content Log GUI** and **Content Log File**. Reload the world and test wrench/potato-cannon names and icons, inventory transfers into nonempty inventories, tank reload visuals, motor/speed-controller form cancellation, shafts/gears/network updates, and precision-mechanism assembly. Inspect **Content Log History** for errors.

Static checking and isolated function tests cannot prove complete gameplay behavior, chunk lifecycle correctness, or performance under large kinetic networks.
