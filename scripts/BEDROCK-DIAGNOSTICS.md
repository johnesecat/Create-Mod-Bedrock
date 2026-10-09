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

## Custom UI rework and unfiltered verification (2026-10-08)

RPM and brass-funnel panels now use a viewport-bounded, content-sized vertical layout rather than a fixed 58px horizontal row. Native server-form toggle/slider controls retain their labels, input handling and accessibility, while the Create background and submit button remain themed. The server-form extension no longer replaces the base screen or its cancel mappings/animations. Form titles, funnel labels and submit text are localized in en_US, zh_CN and pt_BR. Speed-controller defaults are finite and bounded to 1–256; malformed funnel responses cannot overwrite extraction settings. Cancellation and block/entity revalidation remain in place. Pause-menu guides and Engineer's Goggles HUD are retained unchanged.

`npm test` passed: 1,404 JSON syntax checks, 1,031 structural checks, TypeScript, ESLint and 191 unit tests (20 new UI/configuration regressions). The UI tests inspect authored controls and execute real form-handler functions with mocked Minecraft APIs; they do **not** render Minecraft screens.

`Create-Bedrock.mcaddon` was rebuilt at the repository root: 21,049,978 compressed bytes. Archive verification passed for all 1,038 behavior-pack files and 1,309 resource-pack files, including CRCs and byte-for-byte source matching after documented BOM normalization. The compatibility README remains source documentation and is intentionally not a runtime release file.

The validation wrapper no longer excludes any check, defaults to online mode, and preserves errors and failure exits. Creator Tools 0.20.0 maps its misleading CLI `all` alias to main only, so the wrapper explicitly executes main, addon and currentplatform, even after another suite fails. Use `npm run validate:bedrock -- --archive` for the delivered archive; `--suite=main|addon|currentplatform` selects one suite; `--offline` explicitly requests reduced network/vanilla coverage; `--verbose` prints every finding. Source mode stages every file, including documentation, so it also exposes the source README's forbidden-extension finding rather than filtering it out.

Unfiltered online archive results:

| Suite | Errors | Warnings | Failed check summaries |
| --- | ---: | ---: | ---: |
| main | 0 | 1,335 | 0 |
| addon | 362 | 0 | 3 |
| currentplatform | 613 | 0 | 1 |

Add-on findings: 304 public/resource naming findings, 57 folder/UI findings and one recommended uncompressed-size finding (25,300,833 bytes; this differs from compressed download size). The suite explicitly rejects any JSON UI, including the retained pause guide and goggles HUD. Current-platform findings: 474 recipe-format, 43 animation-format and 96 client-entity-format findings. Their migration has **not** been implemented or runtime-verified. Changing declared versions or identifiers without reviewing their semantics is not proof of compatibility. Main warnings remain atlas representation, render-controller UV, audio/link and model-complexity findings. No asset/functionality was removed to lower these counts, and the full validation command returns a failure.

Latest detailed archive reports are under `.mct-debug/run-Ob4RKe` (main), `.mct-debug/run-7sWXJZ` (addon), and `.mct-debug/run-8IwvDR` (currentplatform); subsequent runs create new report directories. Earlier checkpoint counts above describe the earlier, narrower validation only, not complete compliance.

## Current-platform format migration (2026-10-08)

The 613 `FORMATVER` errors are now eliminated on both the source packs and rebuilt archive, with **no exclusions or severity changes**. The baseline was `.mct-debug/run-8IwvDR/create-bedrock.mcr.json`; every error path was mapped to its existing source file:

| Rule | Files | Original format versions | Updated format version |
| --- | ---: | --- | --- |
| `FORMATVER[156]` | 474 recipes | `1.12` (458), `1.12.0` (2), `1.20.10` (14) | `1.26.50` |
| `FORMATVER[216]` | 43 resource animations | `1.8.0` (43) | `1.10.0` |
| `FORMATVER[296]` | 96 client entities | `1.10.0` (95), `1.12.0` (1) | `1.26.50` |

Recipes comprise 265 shaped, 202 shapeless and 7 furnace definitions. All ingredient tags, patterns, quantities, outputs and station tags are retained. No legacy recipe `data` fields required conversion. Client entities already use the post-1.10 `minecraft:client_entity.description` structure; animation mappings, scripts, render controllers, materials, textures, geometry references and every animation keyframe remain unchanged. The minimum-engine versions stay at 1.26.50, so pack-versioned Molang parsing rules are unchanged.

Targets follow Creator Tools' observed expected version (1.26.50 for recipes/client entities and 1.10.0 for animations) and Microsoft's [latest platform guidance](https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/latestplatformversion?view=minecraft-bedrock-stable). Microsoft's [Molang syntax guide](https://learn.microsoft.com/en-us/minecraft/creator/documents/molang/syntax-guide?view=minecraft-bedrock-stable) documents that versioned Molang changes are selected by pack `min_engine_version`. Static review and validation are not a substitute for in-game testing of per-file version semantics.

`node scripts/migrate-bedrock-format-versions.mjs <baseline.mcr.json>` provides a guarded dry run; `--apply` performs this specific reviewed migration. It validates all 613 baseline paths, checks the JSON payload before/after, replaces only the version token, rereads every written file and generates `scripts/bedrock-format-migration.json`. That audit lists **every exact file path**, finding ID, old/new version and SHA-256 of its non-version bytes. `npm run test:json` checks this audit, guarding against version regression or silent content loss. Future intentional edits to these assets require review and refresh of the corresponding audit digest.

Verification after migration:

- `npm test`: 1,404 JSON checks, 1,031 structural checks, 613 migrated-version/payload-hash checks, TypeScript, ESLint and all 191 unit tests passed.
- Independent git comparison: all 613 source pack files differ from HEAD only in their `format_version` token; no content was removed, renamed or disabled.
- `npm run build:bedrock`: rebuilt root `Create-Bedrock.mcaddon`, **21,052,336 bytes**.
- `npm run debug:bedrock`: all 1,038 behavior-pack and 1,309 resource-pack files match source, and embedded/outer ZIP CRCs pass.
- Unfiltered online currentplatform validation: **0 errors, 0 warnings, 0 failed summaries**, both archive (`.mct-debug/run-9TIx7s`) and source (`.mct-debug/run-Rx7QK8`). Both commands exited successfully.
- Full online archive run: main still has **0 errors, 1,335 warnings** (`.mct-debug/run-eGHM4l`); addon still has **362 errors** (`.mct-debug/run-kLf5bZ`); currentplatform has **0 errors** (`.mct-debug/run-e8T2S6`). The combined command correctly exits with failure because the unrelated add-on policy checks still fail.

Earlier checkpoint tables are historical, superseded for currentplatform by this migration. No features, capability declarations, identifiers, scripts, assets or UI were removed to make this validation pass. Actual Minecraft rendering/gameplay remains unverified in this workspace.

## Add-on-policy resource naming migration (2026-10-08)

Add-on-policy errors on the rebuilt archive decreased from **362 to 92** (270 findings resolved, approximately 75%). No checks were excluded, no severities were downgraded, and no functionality or capability declarations were removed.

Using `.mct-debug/run-kLf5bZ/create-bedrock.mcr.json`, migrated 269 distinct resource identifiers across 438 files:

- Private animation and animation-controller identifiers now have the `create_bedrock` namespace segment.
- Render-controller and geometry identifiers now have the same namespace segment.
- `create_additive` became `create_bedrock_additive`; its inheritance and render states are unchanged.
- All matching references in both packs were migrated, including script `playAnimation` calls, client entities, blocks, attachables and resource definitions. Original segments are retained after the namespace to prevent collisions (e.g. `geometry.create.basin` becomes `geometry.create_bedrock.create.basin`).

`create:` world-facing IDs and the documented cross-pack animation API (`animation.create.rpm.rotation` and `animation.create.rpm.offsets`) are preserved. Do not rename these without a saved-world/integration migration strategy. Internal resource names changed; external packs that reference these undocumented names directly must adopt the mapping in `scripts/bedrock-resource-migration.json`. No duplicate legacy aliases were added simply to hide policy errors.

`scripts/migrate-bedrock-resource-names.mjs` is a guarded one-time, report-driven migration. Before writing, it checks target collisions, baseline format-audit hashes, JSON parsing and exact reverse replacement back to the original bytes. It rereads each written file. The persistent audit records every old/new identifier and before/after file hash. `npm run test:json` verifies all 438 reverse transformations, hashes, target definitions and the 269 collision-free names. Format-migration hashes were refreshed only after baseline and reverse verification, because identifier changes legitimately alter those previously audited payloads; version assertions remain intact.

Verification:

- `npm test` passed: 1,404 JSON checks, 1,031 structural checks, both migration audits, TypeScript, ESLint and 191 unit tests.
- Root `Create-Bedrock.mcaddon` rebuilt successfully: **21,056,237 bytes**.
- `npm run debug:bedrock` passed: all 1,038 behavior-pack and 1,309 resource-pack files match source exactly; embedded/outer archive CRCs valid.
- Unfiltered online archive validation: addon **92 errors, 0 warnings** (`.mct-debug/run-ovoUKK`); main **0 errors, 1,335 warnings** (`.mct-debug/run-eu9RgT`); currentplatform **0 errors, 0 warnings** (`.mct-debug/run-duBn6K`). The combined command returns failure because the remaining policy errors are not suppressed.

Remaining add-on-policy errors: 32 world-facing JSON identifier findings, 2 published animation-name findings, 57 folder/UI findings and 1 recommended uncompressed-size finding (25,318,091 bytes). The JSON UI prohibition remains visible; the machine forms, pause guide and goggles HUD are retained. Folder restructuring and size optimization were not performed in this pass. Earlier checkpoint counts are historical. In-game rendering, machine animation and external-pack compatibility still require Minecraft testing; static reversibility proves content preservation, not actual runtime behavior.

## Add-on-policy audio folder migration

Moved all 39 loose `.ogg` files from `Create (RE)/sounds/` to `Create (RE)/sounds/create/bedrock/`. The existing `sounds/create/common/` assets remain in place. Nine paths in `sound_definitions.json` were updated; every public `create:` sound identifier, category, distance, volume and other playback setting is unchanged. Unreferenced audio is retained, not deleted to lower validation counts. External packs that directly reference the former loose file paths must use the new paths; public sound-event names remain compatible.

`node scripts/migrate-bedrock-sounds.mjs` provides a guarded dry run, and `--apply` performs this one-time migration. It checks destination collisions and additional pack-text references before moving anything. `scripts/bedrock-sound-migration.json` records the exact source/destination paths and SHA-256 for every audio asset, plus the reversible catalog edit. `npm run test:json` verifies all 39 file hashes, absence of the old paths, catalog reverse transformation and all 11 catalog-to-audio links. No audio was re-encoded.

Verification:

- `npm test` passed: 1,404 JSON checks, 1,031 structural checks, all migration audits, TypeScript, ESLint and all 191 unit tests.
- Root `Create-Bedrock.mcaddon` rebuilt: **21,057,415 bytes**.
- `npm run debug:bedrock` passed: all 1,038 behavior-pack and 1,309 resource-pack files match source, with valid archive CRCs.
- Unfiltered online archive validation: main **0 errors, 1,335 warnings** (`.mct-debug/run-sv3dS5`); addon **53 errors, 0 warnings, 3 failed summaries** (`.mct-debug/run-WoGAcE`); currentplatform **0 errors, 0 warnings, 0 failed summaries** (`.mct-debug/run-V3LnVQ`). The combined command correctly exits with failure.

This resolves exactly 39 loose-audio folder findings, reducing add-on-policy errors from 92 to 53. Remaining errors: 32 world-facing identifier findings, 2 published animation-name findings, 18 folder/UI findings and 1 recommended uncompressed-size finding (**25,318,226 bytes**). Texture, loot-table and block-culling folder migrations are not included in this pass. Pack-size optimization is also pending; this was not a size-reduction change.

The custom machine forms, pause guide and goggles HUD remain at their existing paths. Microsoft's [cooperative validation rules](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/mctoolsvalreference/caddonreq?view=minecraft-bedrock-stable) prohibit custom UI under CADDONREQ133. The [JSON UI definitions reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuicomponents/ui_defs?view=minecraft-bedrock-stable) describes pack-relative file paths, but that loading mechanism is not an exemption from cooperative policy. Relocating UI to conceal it from the validator would not establish compliance. World-facing IDs and the published RPM animation API likewise remain unchanged to avoid breaking saved worlds and integrations. Full cooperative compliance is **not** claimed.

Actual audio playback, JSON UI rendering and gameplay still require Minecraft verification; static file/link checks and archive validation do not simulate the game.

## Add-on-policy loot-table and loose-texture folder migration

Add-on-policy errors on the rebuilt archive decreased from **53 to 46**: seven folder findings resolved without deleting content, changing public IDs, excluding checks or downgrading severity.

- Moved all five loot tables from `Create (BE)/loot_tables/create/` into `Create (BE)/loot_tables/create/bedrock/`: `creative_fluid_tank.json`, `empty.json`, `fluid_tank.json`, `glass_pipe.json` and `zinc_ore.loot.json`. Updated five block references (including both zinc ores). Loot payloads, quantities and conditions are byte-identical; the currently unreferenced empty table is retained.
- Moved `Create (RE)/textures/blueprint.png` and `jei_background.png` into `Create (RE)/textures/create/bedrock/`. Updated the two pause-guide texture paths. Images are byte-identical; the guide's controls and layout are otherwise unchanged.

`node scripts/migrate-bedrock-folders.mjs` provides a guarded dry run; `--apply` performs the one-time migration. It checks destination collisions, scans authored pack text, verifies expected reference counts and exact reverse substitution, and refuses edits to files protected by prior resource/format audits. `scripts/bedrock-folder-migration.json` records every move and SHA-256, plus before/after hashes for all six reference-bearing files. `npm run test:json` now checks all seven moved-file hashes, old-path absence, six reversible edits, stale pack-text references and the existence of all four referenced loot tables. Existing audio/resource/format audits remain unchanged and pass. External integrations using the old loot-table or image paths must adopt the recorded mapping; world-facing IDs are unchanged.

Verification:

- `npm test` passed: 1,404 JSON checks, 1,031 structural checks, all migration audits, TypeScript, ESLint and all 191 unit tests.
- Rebuilt root **`Create-Bedrock.mcaddon`**, **21,057,597 bytes**.
- `npm run debug:bedrock` passed: all 1,038 behavior-pack and 1,309 resource-pack files match their sources; outer and embedded archive CRCs are valid.
- Unfiltered online archive validation: main **0 errors, 1,335 warnings** (`.mct-debug/run-8rJpU2`); addon **46 errors, 0 warnings, 3 failed summaries** (`.mct-debug/run-Q5rfsj`); currentplatform **0 errors, 0 warnings, 0 failed summaries** (`.mct-debug/run-wBXytz`). The combined command still exits with failure, correctly reflecting remaining policy errors.

Remaining errors: 32 world-facing identifier findings, 2 published RPM animation-name findings, 11 folder/UI findings and 1 recommended uncompressed-size finding (**25,318,296 bytes**). Remaining folder/UI work comprises one loose block-culling file, two texture-directory findings and eight JSON-UI findings. The block-culling file is still at its original path pending confirmation of nested-directory game discovery; its public culling ID is unchanged. The `textures/ui/` tree has not been migrated in this pass: dynamic recipe-image expressions and existing texture references need a separate preservation review. Custom UI remains prohibited by cooperative policy and has not been concealed or removed. Pack-size optimization, saved-world/public-API compatibility and actual Minecraft runtime verification remain open.

In-game verification must additionally check fluid-tank/glass-pipe/zinc-ore drops and the pause guide's blueprint/background images. Static payload preservation and link checks do not prove Minecraft rendering or loot execution.

## Add-on-policy owned UI-texture directory migration

Add-on-policy errors on the rebuilt archive decreased from **46 to 44**, resolving `CADDONREQ[102]` and `CADDONREQ[108]` for the former `textures/ui/` tree.

Moved all **147** owned image/metadata files from `Create (RE)/textures/ui/{crafters,pause}/` into `Create (RE)/textures/create/bedrock/ui/{crafters,pause}/`. All image bytes, dimensions, names and nine-slice metadata are unchanged. Updated **117** owned texture-prefix references in `Create (RE)/ui/pause_screen.json`, including both dynamic recipe-image expressions; their variables, concatenation and suffixes are preserved. The authored default recipe expression still resolves to `crafters/recipies/num_1.png`. Vanilla `textures/ui/Black`, `cell_image_normal` and `recipe_book_touch_cell_selected` references are deliberately unchanged, as are machine-form `textures/ui/control` and goggles-background references. No custom UI definition was removed or relocated and no public identifier changed.

`node scripts/migrate-bedrock-ui-textures.mjs` provides a guarded dry run; `--apply` performs the one-time migration. The persistent `scripts/bedrock-ui-texture-migration.json` records every moved-file hash and the exact reversible pause-screen edit. Tests verify all 147 hashes, the absent old owned directory, all 117 prefixes, both dynamic expressions, vanilla references and absence of stale owned prefixes throughout the packs. The previous folder audit is retained unchanged: its pause-screen assertions first reverse the independently verified later texture edit, preserving both historical byte-level checks rather than refreshing or weakening them.

Verification:

- `npm test` passed: 1,404 JSON checks, 1,031 structural checks, all preservation audits, TypeScript, ESLint and all 191 unit tests.
- Root **`Create-Bedrock.mcaddon`** rebuilt: **21,062,048 bytes**.
- `npm run debug:bedrock` passed: all 1,038 behavior-pack and 1,309 resource-pack files match source; embedded and outer CRCs are valid.
- Unfiltered online archive addon validation: **44 errors, 0 warnings, 3 failed summaries** (`.mct-debug/run-BuFJ96`). Currentplatform: **0 errors, 0 warnings, 0 failed summaries** (`.mct-debug/run-XessxT`).
- Main validation now reports **1 error, 1,492 warnings, 1 failed summary** (`.mct-debug/run-2tqJmH`): `TEXTUREIMAGE[403]` reports **269,652,176 bytes** against the **157,286,400-byte** base texture-memory budget. The relocation exposes additional texture accounting, including 25 highest-mip warnings and tier-budget warnings; unchanged image hashes prove that this pass did not increase image dimensions or pixel payloads. This is a newly reported validation failure, not a passing main check. It has not been suppressed by concealing assets, adding artificial subpacks, or reducing image quality. Image-resolution/tiering optimization requires a separate visual-preservation review. The combined validation command exits with failure.

The remaining **44 add-on-policy errors** comprise 32 world-facing identifier findings, 2 published RPM animation-name findings, 9 folder/UI findings (one loose block-culling file and eight JSON-UI findings), and 1 uncompressed-size finding (**25,320,051 bytes**). Block-culling nested-directory discovery still needs review before that file is moved. Custom UI is retained despite cooperative policy prohibition. Public-ID migration, pack size, texture-memory optimization and actual Minecraft rendering remain open.

The pre-existing dynamic `crafters/aditaments/num_1.png` image target was absent before this migration and remains absent; the migration preserves that authored expression rather than inventing an asset or silently changing UI behavior. External packs using the old owned image paths must adopt the mapping in the new audit. In-game verification must include pause-guide images, hover/pressed states, dynamic recipe slots and nine-slice rendering; no Minecraft client is available here.

## Follow-up review: no safe immediate folder reduction

Re-evaluated the remaining 44 findings while preserving custom UI and public identifiers. No further folder migration is delivered in this pass:

- The only non-UI loose file is `Create (RE)/block_culling/industrial_iron_window.json`. Mojang's [schema catalog](https://github.com/Mojang/bedrock-schemas/blob/main/catalog.json) associates nested `block_culling/**/*.json` paths with the schema, and Creator Tools recognizes nested paths, but these establish tooling recognition, **not Minecraft runtime discovery**. Microsoft's [culling tutorial](https://learn.microsoft.com/en-us/minecraft/creator/documents/customblockoversized?view=minecraft-bedrock-stable) demonstrates a direct child file, while its [rule reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockcullingreference/examples/blockcullingrules/block_culling?view=minecraft-bedrock-stable) documents identifier-based references without promising recursive discovery. Without a Minecraft client to test nested loading, the rule stays at its known-working path with its public ID unchanged.
- Eight JSON-UI findings remain. Moving custom screens to conceal them would not resolve the cooperative UI prohibition; UI remains intact.
- Thirty-two world-facing identifier findings and two published RPM animation names remain unchanged to preserve saved worlds and integrations.
- Tested whitespace-only compaction of the culling file and `copycat_panel.b.json`. It saved **427,357 physical source bytes**, preserved JSON tokens/semantics and passed all tests, but **did not reduce PACKSIZE[401]**: the validator still measured **25,320,051**, above its **25,000,000** threshold. Inspection of Creator Tools' `FileBase.coreContentLength` explains why: text sizes already exclude all whitespace. ZIP compression level likewise cannot resolve this content-size rule. The experiment was reverted by verifying each original/current hash before restoration; no experimental compaction or audit changes remain. Reducing binary assets losslessly is possible future work, but no verified binary optimization is delivered here.

Final verification after restoring the experiment:

- `npm test` passed again: 1,404 JSON checks, 1,031 structural checks, all prior audits, TypeScript, ESLint and all 191 unit tests.
- Root `Create-Bedrock.mcaddon` rebuilt: **21,062,048 bytes**, matching the previous artifact size.
- `npm run debug:bedrock` passed: 1,038 behavior files and 1,309 resource files match source, with valid archive CRCs.
- Unfiltered online final archive addon validation: **44 errors, 0 warnings, 3 failed summaries**, exit failure (`.mct-debug/run-aF45nO`). There is **no reduction** in this pass; no checks were suppressed.
- Full-suite validation during the compaction experiment still reported main **1 texture-memory error / 1,492 warnings** (`.mct-debug/run-yOBQbx`) and currentplatform **0 errors / 0 warnings** (`.mct-debug/run-seqgJl`). Main/currentplatform were not rerun after restoration; their previously recorded results describe the same restored pack sources. Only addon was rerun on the final archive.

The next compatibility-preserving folder step requires an in-game nested-culling test. Other remaining work is binary-size/texture-memory optimization with visual preservation, or compatibility-sensitive changes outside the current UI/public-ID constraints. Actual Minecraft runtime verification remains unavailable.

## Lossless PNG binary-size optimization

Add-on-policy errors decreased from **44 to 43** by resolving `PACKSIZE[401]`, without changing custom UI, public IDs, texture paths, dimensions or image content.

Optimized **143 PNG files** by recompressing only the existing concatenated `IDAT` zlib stream at level 9 and combining its chunks. The **exact filtered scanline bytes**, decoded RGBA pixels and all non-IDAT chunks (including IHDR, palette, transparency, color profiles, gamma, EXIF and other ancillary metadata when present) are preserved. Chunk CRCs are validated and regenerated for the replacement IDAT. There is no resize, quantization, recoloring, metadata stripping, audio change or asset deletion. This includes UI images but changes only their lossless binary encoding, not their visuals or layout. Decoded texture memory is deliberately unchanged.

- Binary source savings: **588,844 bytes**.
- Creator Tools content-size metric: **25,320,051 → 24,731,207**, now **268,793 below** the 25,000,000 add-on threshold.
- Root `Create-Bedrock.mcaddon`: **21,062,048 → 20,521,388 bytes**, a measured **540,660-byte** compressed archive reduction.

`node scripts/optimize-bedrock-png.mjs` provides a dry run; `--apply` performs the guarded one-time optimization and writes `scripts/bedrock-png-optimization.json`. Only files saving at least 1,000 bytes are selected. The script checks signature/chunk boundaries, CRCs and contiguous IDAT; animated PNGs require separate review and are not silently rewritten. Every candidate is decoded before/after with the existing pngjs dependency; exact scanlines, pixels, dimensions and non-IDAT bytes must match before writing, and every written file is reread and verified. The audit records original/optimized byte hashes and sizes, pixel/scanline/metadata hashes and dimensions. Prior folder/texture audits remain unchanged: tests use a historical byte digest only after independently validating the optimized asset against its preservation audit. Independent verification also compared all 143 original Git assets (accounting for prior folder moves) with the delivered images: all scanlines, pixels and metadata match.

Verification:

- `npm test` passed after the final code edits: 1,404 JSON checks, 1,031 structural checks, all optimization/migration preservation audits, TypeScript, ESLint and all 191 unit tests.
- Rebuilt root **`Create-Bedrock.mcaddon`**, **20,521,388 bytes**.
- `npm run debug:bedrock` passed: all 1,038 behavior and 1,309 resource files match source; embedded and outer ZIP CRCs are valid.
- Unfiltered online archive addon validation: **43 errors, 0 warnings, 2 failed summaries**, no PACKSIZE error (`.mct-debug/run-lm3YKt`). Currentplatform: **0 errors, 0 warnings, 0 failed summaries** (`.mct-debug/run-sbOrGB`).
- Main: **1 texture-memory error, 1,492 warnings, 1 failed summary** (`.mct-debug/run-Md3gMA`). `TEXTUREIMAGE[403]` still measures **269,652,176** against **157,286,400** bytes: lossless PNG compression affects disk/content size, not decoded texture memory. The combined command correctly exits with failure. No rules were excluded or weakened.

Remaining 43 add-on-policy errors: 32 world-facing identifier findings, 2 published RPM animation names and 9 folder/UI findings. The separate texture-memory error cannot be fixed by recompressing identical pixels; resizing, asset removal or tiered texture delivery would require visual/runtime review beyond this pass's constraints. General Minecraft rendering/gameplay remains unverified, but this optimization's content-preservation claim is backed by exact scanline, decoded-pixel and metadata equality rather than a runtime assumption. No runtime speedup is claimed.

## Remaining-policy review after PNG optimization

Rebuilt and revalidated the delivered archive; **43 add-on-policy errors remain**, with no safe reduction identified under the requirements to preserve custom UI/public identifiers and avoid runtime-dependent changes. All remaining errors have been classified, rather than inferred from a summary:

| Rule | Count | Constraint preventing a verified fix now |
| --- | ---: | --- |
| `CADDONIREQ[112]` | 32 | World-facing `create:` block/entity/item IDs. Correcting their namespace changes public identifiers; duplicate aliases would retain the original findings. |
| `CADDONIREQ[131]` | 2 | Published `animation.create.rpm.offsets` and `animation.create.rpm.rotation` API names. Renaming breaks the preserved public interface. |
| `CADDONREQ[101]` | 5 | Four canonical JSON-UI files plus the loose industrial-window culling file. UI files remain intact; nested culling runtime discovery remains unverified as documented above. |
| `CADDONREQ[104]` | 3 | Custom UI files in `ui/create/`. Relocation would alter the UI and would not establish compliance with the separate custom-UI prohibition. |
| `CADDONREQ[133]` | 1 | Cooperative policy prohibits the retained custom JSON UI itself. |

There are no remaining pack-size, audio-folder, texture-folder or private-resource naming errors to resolve with the methods already verified. Further lossless compression cannot reduce these five rule groups, which concern identifiers and folder/UI presence, not byte counts. The main-suite texture-memory error is a separate check and does not account for any of these 43 errors; identical-pixel recompression cannot lower decoded-memory accounting.

No pack source, UI, identifier, validator rule or test was changed in this pass. Updated this diagnostic explanation and rebuilt the requested root `Create-Bedrock.mcaddon`: **20,521,388 bytes**. `npm run debug:bedrock` passed (1,404 strict JSON files, module/import/localization/icon checks, all 1,038 behavior files and 1,309 resource files source-matched, and valid embedded/outer CRCs). Final unfiltered online archive addon validation reports **43 errors, 0 warnings, 2 failed summaries**, correctly exiting with failure (`.mct-debug/run-0ualJE`). The size finding remains resolved. TypeScript/ESLint/unit checks and main/currentplatform were not redundantly rerun because the relevant source/test files are unchanged; their latest verified results are in the preceding section.

A further compatibility-preserving folder reduction would require confirming nested culling loading in Minecraft; changes to the other groups require relaxing the preserved UI/public-interface constraints. Neither is assumed authorized here. No reduction or full compliance is claimed, and no finding was hidden or downgraded.

## Delivery verification and relative UI reference repair

The repository's existing CI saw-asset check exposed 200 texture-root-relative `ui/crafters/...` icon references that were not covered by the prior full `textures/ui/...` prefix migration. Updated those relative values to `create/bedrock/ui/crafters/...`, preserving the existing `textures/` concatenation and all control behavior. All 200 values now resolve to existing PNGs. Updated the guarded texture migration and its audit; exact reverse substitution of both full and relative paths matches the original audited baseline hash. Extended regression checks to verify every relative image and reject stale prefixes. CI retains its saw-reference assertions at the migrated paths; no checks were skipped or weakened.

`npm test` passed (including all 191 unit tests), `npm run debug:bedrock` passed, and the workflow's complete Python JSON/saw/localization/icon step passed locally. Rebuilt root `Create-Bedrock.mcaddon`: **20,521,396 bytes**. Final unfiltered online archive addon validation remains **43 errors, 0 warnings, 2 failed summaries** (`.mct-debug/run-wb2Xy8`), correctly returning failure for the documented constraints. Green repository CI is not a claim of full Creator Tools policy compliance. Public identifiers, custom UI control structure, PNG pixels and metadata remain intact; actual Minecraft runtime verification remains open.

## Required in-game verification

Import `Create-Bedrock.mcaddon` into Minecraft Preview supporting the declared APIs. Enable both packs in a test world. Turn on **Settings > Creator > Content Log GUI** and **Content Log File**. Reload the world and test wrench/potato-cannon names and icons, inventory transfers into nonempty inventories, tank reload visuals, motor/speed-controller form cancellation, shafts/gears/network updates, and precision-mechanism assembly. Inspect **Content Log History** for errors.

Also test both RPM forms and the funnel form at the smallest GUI scale and on keyboard/mouse, controller and touch: translated titles/labels, submit, cancel/back, positive/reversed RPM, zero/stale defaults, exact/up-to extraction, opening ordinary non-Create forms, and breaking a machine while its form is open. Check the retained pause-menu guide and goggles HUD with another UI resource pack enabled. This workspace has no Minecraft client, so visual layout and actual gameplay remain unverified.

Static checking and isolated function tests cannot prove complete gameplay behavior, chunk lifecycle correctness, or performance under large kinetic networks. No performance speedup is claimed.
