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

## Required in-game verification

Import `Create-Bedrock.mcaddon` into Minecraft Preview supporting the declared APIs. Enable both packs in a test world. Turn on **Settings > Creator > Content Log GUI** and **Content Log File**. Reload the world and test wrench/potato-cannon names and icons, inventory transfers into nonempty inventories, tank reload visuals, motor/speed-controller form cancellation, shafts/gears/network updates, and precision-mechanism assembly. Inspect **Content Log History** for errors.

Also test both RPM forms and the funnel form at the smallest GUI scale and on keyboard/mouse, controller and touch: translated titles/labels, submit, cancel/back, positive/reversed RPM, zero/stale defaults, exact/up-to extraction, opening ordinary non-Create forms, and breaking a machine while its form is open. Check the retained pause-menu guide and goggles HUD with another UI resource pack enabled. This workspace has no Minecraft client, so visual layout and actual gameplay remain unverified.

Static checking and isolated function tests cannot prove complete gameplay behavior, chunk lifecycle correctness, or performance under large kinetic networks. No performance speedup is claimed.
