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

The manifest and npm API declarations target `@minecraft/server` 2.10.0 and `@minecraft/server-ui` 2.2.0. The behavior pack minimum engine is `[1,26,50]`; older Preview builds cannot be assumed compatible.

The latest local run passed 1,404 JSON syntax checks, 1,031 AJV structural checks, ESLint, four Vitest regressions, and npm audit (zero vulnerabilities).

**The full npm test suite is NOT green.** TypeScript checking reports 3,781 diagnostics across legacy JavaScript, including missing parameter annotations, custom block-state typing, possible undefined values, and API/type mismatches. No errors are suppressed, no files are excluded, and no assertions are disabled to manufacture a passing result. The archive is a diagnostic checkpoint, not a fully verified release.

`validate-bedrock.mjs` was not executed during this pipeline. CI uses `npm test` instead.

## Required in-game verification

Import `Create-Bedrock.mcaddon` into Minecraft Preview supporting the declared APIs. Enable both packs in a test world. Turn on **Settings > Creator > Content Log GUI** and **Content Log File**. Reload the world and test wrench/potato-cannon names and icons, inventory transfers into nonempty inventories, tank reload visuals, motor/speed-controller form cancellation, shafts/gears/network updates, and precision-mechanism assembly. Inspect **Content Log History** for errors.

Static checking and isolated function tests cannot prove complete gameplay behavior, chunk lifecycle correctness, or performance under large kinetic networks.
