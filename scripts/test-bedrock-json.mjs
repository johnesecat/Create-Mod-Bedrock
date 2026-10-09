import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import jsonlint from 'jsonlint'
import Ajv from 'ajv'
import { verifyOptimizedPng } from './optimize-bedrock-png.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ajv = new Ajv({ allErrors: true })
const version = { type: 'array', items: { type: 'integer', minimum: 0 }, minItems: 3, maxItems: 3 }
const uuid = { type: 'string', pattern: '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' }
const identifier = { type: 'string', pattern: '^[a-z0-9_.-]+:[a-z0-9_./-]+$' }
const contentSchema = ajv.compile({
  type: 'object', required: ['description'],
  properties: {
    description: { type: 'object', required: ['identifier'], properties: { identifier } },
    components: { type: 'object' },
  },
})
const manifestSchema = ajv.compile({
  type: 'object', required: ['format_version', 'header', 'modules'],
  properties: {
    format_version: { const: 2 },
    header: { type: 'object', required: ['uuid', 'version', 'min_engine_version', 'name', 'description'], properties: { uuid, version, min_engine_version: version, name: { type: 'string' }, description: { type: 'string' } } },
    modules: { type: 'array', minItems: 1, items: { type: 'object', required: ['type', 'uuid', 'version'], properties: { uuid, version, type: { enum: ['data', 'resources', 'script'] }, entry: { type: 'string' } } } },
    dependencies: { type: 'array', items: { type: 'object', anyOf: [{ required: ['uuid', 'version'] }, { required: ['module_name', 'version'] }] } },
  },
})
let count = 0
let structures = 0
const failures = []
const manifests = []
const definitions = new Map()
function assertNoRemovedEntityComponents(value) {
  if (!value || typeof value !== 'object') return
  if (Object.hasOwn(value, 'minecraft:pushable')) {
    throw new Error('minecraft:pushable was removed in Bedrock 1.26.10; use minecraft:pushable_by_entity and/or minecraft:pushable_by_block')
  }
  for (const child of Object.values(value)) assertNoRemovedEntityComponents(child)
}
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name)
    if (entry.isDirectory()) await walk(file)
    else if (entry.name.endsWith('.json')) {
      try {
        const text = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '')
        const data = jsonlint.parse(text)
        JSON.parse(text) // Also reject extensions accepted by a permissive parser.
        assertNoRemovedEntityComponents(data)
        count++
        if (entry.name === 'manifest.json') {
          assert(manifestSchema(data), ajv.errorsText(manifestSchema.errors))
          if (path.resolve(file) === path.join(root, 'Create (BE)', 'manifest.json') || path.resolve(file) === path.join(root, 'Create (RE)', 'manifest.json')) {
            assert.deepEqual(data.header.min_engine_version, [1, 26, 50], `${path.relative(root, file)} must declare the supported Minecraft minimum 1.26.50`)
          }
          manifests.push(data)
          structures++
        }
        for (const key of ['minecraft:entity', 'minecraft:client_entity', 'minecraft:block', 'minecraft:item']) {
          if (!data[key]) continue
          assert(typeof data.format_version === 'string', 'Missing content format_version')
          assert(contentSchema(data[key]), ajv.errorsText(contentSchema.errors))
          const id = data[key].description.identifier
          const unique = `${key}:${id}`
          assert(!definitions.has(unique), `Duplicate definition ${unique}: ${definitions.get(unique)}`)
          definitions.set(unique, file)
          structures++
        }
        for (const [key, recipe] of Object.entries(data).filter(([key]) => key.startsWith('minecraft:recipe_'))) {
          assert(contentSchema(recipe), `${key}: ${ajv.errorsText(contentSchema.errors)}`)
          if (recipe.pattern) {
            assert(Array.isArray(recipe.pattern) && recipe.pattern.length > 0 && recipe.pattern.length <= 3, 'Invalid recipe pattern')
            assert(recipe.pattern.every((row) => typeof row === 'string' && row.length > 0 && row.length <= 3 && row.length === recipe.pattern[0].length), 'Inconsistent recipe row widths')
            for (const character of recipe.pattern.join('')) if (character !== ' ') assert(recipe.key?.[character], `Missing recipe symbol: ${character}`)
          }
          structures++
        }
      } catch (error) { failures.push(`${path.relative(root, file)}: ${error.message}`) }
    }
  }
}
await walk(path.join(root, 'Create (BE)'))
await walk(path.join(root, 'Create (RE)'))
const pngOptimization = JSON.parse(await readFile(path.join(root, 'scripts/bedrock-png-optimization.json'), 'utf8'))
const optimizedPngs = new Map(pngOptimization.files.map(record => [record.file, record]))
try {
  assert.equal(optimizedPngs.size, pngOptimization.files.length)
  let saved = 0
  for (const record of pngOptimization.files) {
    assert(/^Create \((BE|RE)\)\/.+\.png$/.test(record.file) && !record.file.split('/').includes('..'))
    assert(record.beforeBytes - record.afterBytes >= 1000)
    await verifyOptimizedPng(record.file, record)
    saved += record.beforeBytes - record.afterBytes
  }
  assert.equal(saved, pngOptimization.savedBytes)
  assert(saved > 320051)
  console.log(`PASS: ${optimizedPngs.size} optimized PNG CRCs, dimensions, scanlines, pixels and metadata; ${saved} binary bytes saved`)
} catch (error) { failures.push(error.message) }
async function hashBeforePngOptimization(file) {
  const record = optimizedPngs.get(file)
  if (record) {
    // Only use the historical digest after independently validating the current PNG.
    await verifyOptimizedPng(file, record)
    return record.beforeSha256
  }
  return createHash('sha256').update(await readFile(path.join(root, file))).digest('hex')
}
// Undo only the separately verified later texture edit when checking historical audits.
const uiTextureAudit = JSON.parse(await readFile(path.join(root, 'scripts/bedrock-ui-texture-migration.json'), 'utf8'))
function beforeUiTextureMigration(file, text) {
  if (!uiTextureAudit.edits.some(edit => edit.file === file)) return text
  return text.replace(/textures\/create\/bedrock\/ui\/(?=(?:crafters|pause)\/)/g, 'textures/ui/').replace(/"create\/bedrock\/ui\/crafters\//g, '"ui/crafters/')
}
try {
  const audit = uiTextureAudit
  assert.equal(audit.fromPrefix, 'textures/ui/')
  assert.equal(audit.toPrefix, 'textures/create/bedrock/ui/')
  assert.equal(audit.moves.length, 147)
  assert.equal(new Set(audit.moves.map(move => move.to)).size, 147)
  const hash = content => createHash('sha256').update(content).digest('hex')
  for (const move of audit.moves) {
    assert(/^Create \(RE\)\/textures\/ui\/(crafters|pause)\//.test(move.from) && !move.from.split('/').includes('..'))
    assert.equal(move.to, move.from.replace(audit.fromPrefix, audit.toPrefix))
    assert.equal(await hashBeforePngOptimization(move.to), move.sha256, `UI texture baseline changed: ${move.to}`)
  }
  assert.equal(await stat(path.join(root, 'Create (RE)/textures/ui')).then(() => true, error => {
    if (error.code === 'ENOENT') return false
    throw error
  }), false, 'Old owned texture directory remains')
  assert.equal(audit.edits.length, 1)
  const edit = audit.edits[0]
  assert.equal(edit.file, 'Create (RE)/ui/pause_screen.json')
  assert.equal(edit.references, 117)
  assert.equal(edit.relativeReferences, 200)
  const text = await readFile(path.join(root, edit.file), 'utf8')
  assert.equal(hash(text), edit.afterSha256)
  assert.equal(hash(beforeUiTextureMigration(edit.file, text)), edit.beforeSha256, 'UI structure or non-owned references changed')
  const data = JSON.parse(text.replace(/^\uFEFF/, ''))
  const values = []
  function collect(value) {
    if (typeof value === 'string') values.push(value)
    else if (value && typeof value === 'object') Object.values(value).forEach(collect)
  }
  collect(data)
  assert.equal(values.filter(value => value.includes(audit.toPrefix)).length, 117)
  const relativeImages = values.filter(value => value.startsWith('create/bedrock/ui/crafters/'))
  assert.equal(relativeImages.length, 200)
  for (const name of relativeImages) assert((await stat(path.join(root, 'Create (RE)/textures', name + '.png'))).isFile(), `Missing relative UI image: ${name}`)
  const expressions = values.filter(value => value.includes(audit.toPrefix) && value.includes('+'))
  assert.deepEqual(expressions, [
    "('textures/create/bedrock/ui/crafters/' + $recipe_folder + '/num_' + $crafting_bp_num)",
    "('textures/create/bedrock/ui/crafters/aditaments/num_' + $crafting_bp_num)",
  ])
  // Verify the authored default recipe expression resolves to its moved image.
  assert((await stat(path.join(root, 'Create (RE)/textures/create/bedrock/ui/crafters/recipies/num_1.png'))).isFile())
  for (const name of ['textures/ui/Black', 'textures/ui/cell_image_normal', 'textures/ui/recipe_book_touch_cell_selected']) assert(values.includes(name), `Vanilla reference changed: ${name}`)
  async function checkOwnedPrefixes(folder) {
    for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
      const file = `${folder}/${entry.name}`
      if (entry.isDirectory()) await checkOwnedPrefixes(file)
      else if (/\.(json|js|ts|lang|md|material)$/.test(entry.name)) {
        assert(!/(?:textures\/ui\/(crafters|pause)\/|"ui\/crafters\/)/.test(await readFile(path.join(root, file), 'utf8')), `Stale owned texture prefix: ${file}`)
      }
    }
  }
  await checkOwnedPrefixes('Create (BE)')
  await checkOwnedPrefixes('Create (RE)')
  console.log('PASS: 147 preserved UI texture baselines (lossless PNGs verified), 117 reversible prefixes, dynamic expressions and vanilla references')
} catch (error) { failures.push(error.message) }
try {
  const audit = JSON.parse(await readFile(path.join(root, 'scripts/bedrock-folder-migration.json'), 'utf8'))
  assert.equal(audit.moves.length, 7)
  assert.equal(new Set(audit.moves.map(move => move.to)).size, 7)
  const hash = content => createHash('sha256').update(content).digest('hex')
  for (const move of audit.moves) {
    assert(/^(Create \(BE\)\/loot_tables\/create\/[a-z0-9_.]+\.json|Create \(RE\)\/textures\/(blueprint|jei_background)\.png)$/.test(move.from))
    assert.equal(move.to, move.from.startsWith('Create (BE)') ? move.from.replace('/create/', '/create/bedrock/') : move.from.replace('/textures/', '/textures/create/bedrock/'))
    assert.equal(await hashBeforePngOptimization(move.to), move.sha256, `Folder migration payload changed: ${move.to}`)
    assert.equal(await stat(path.join(root, move.from)).then(() => true, error => {
      if (error.code === 'ENOENT') return false
      throw error
    }), false, `Old folder path remains: ${move.from}`)
  }
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const reverseNames = Object.fromEntries(Object.entries(audit.renames).map(([from, to]) => [to, from]))
  const tokens = names => new RegExp(`(?<![a-zA-Z0-9_./-])(?:${names.map(escape).join('|')})(?![a-zA-Z0-9_./-])`, 'g')
  const reverse = tokens(Object.keys(reverseNames))
  assert.equal(audit.edits.length, 6)
  for (const edit of audit.edits) {
    assert(edit.file.startsWith('Create (') && !edit.file.split('/').includes('..'))
    const text = beforeUiTextureMigration(edit.file, await readFile(path.join(root, edit.file), 'utf8'))
    assert.equal(hash(text), edit.afterSha256, `Folder references changed: ${edit.file}`)
    assert.equal(hash(text.replace(reverse, name => reverseNames[name])), edit.beforeSha256, `Non-path content changed: ${edit.file}`)
  }
  async function checkFolderLinks(folder) {
    for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
      const file = `${folder}/${entry.name}`
      if (entry.isDirectory()) { await checkFolderLinks(file); continue }
      if (!/\.(json|js|ts|lang|md|material)$/.test(entry.name)) continue
      const text = await readFile(path.join(root, file), 'utf8')
      assert.equal([...text.matchAll(tokens(Object.keys(audit.renames)))].length, 0, `Stale folder reference: ${file}`)
      if (!entry.name.endsWith('.json')) continue
      const data = JSON.parse(text.replace(/^\uFEFF/, ''))
      function visit(value) {
        if (!value || typeof value !== 'object') return
        if (typeof value['minecraft:loot'] === 'string') {
          const name = value['minecraft:loot']
          assert(name.startsWith('loot_tables/') && !name.split('/').includes('..'))
          // Queue existence checks outside this synchronous object traversal.
          lootPaths.add(name)
        }
        for (const child of Object.values(value)) visit(child)
      }
      visit(data)
    }
  }
  const lootPaths = new Set()
  await checkFolderLinks('Create (BE)')
  await checkFolderLinks('Create (RE)')
  for (const name of lootPaths) assert((await stat(path.join(root, 'Create (BE)', name))).isFile(), `Missing loot table: ${name}`)
  console.log(`PASS: 7 preserved folder asset baselines, 6 reversible reference edits and ${lootPaths.size} loot-file links`)
} catch (error) { failures.push(error.message) }
try {
  const audit = JSON.parse(await readFile(path.join(root, 'scripts/bedrock-sound-migration.json'), 'utf8'))
  assert.equal(audit.moves.length, 39)
  assert.equal(new Set(audit.moves.map(move => move.to)).size, 39)
  const hash = content => createHash('sha256').update(content).digest('hex')
  for (const move of audit.moves) {
    assert(/^Create \(RE\)\/sounds\/[a-z0-9_]+\.ogg$/.test(move.from))
    assert.equal(move.to, move.from.replace('/sounds/', '/sounds/create/bedrock/'))
    assert.equal(hash(await readFile(path.join(root, move.to))), move.sha256, `Audio bytes changed: ${move.to}`)
    assert.equal(await stat(path.join(root, move.from)).then(() => true, error => {
      if (error.code === 'ENOENT') return false
      throw error
    }), false, `Old audio path remains: ${move.from}`)
    const from = move.from.replace('Create (RE)/', '').replace(/\.ogg$/, '')
    assert.equal(audit.renames[from], move.to.replace('Create (RE)/', '').replace(/\.ogg$/, ''))
  }
  assert.equal(audit.catalogFile, 'Create (RE)/sounds/sound_definitions.json')
  const text = await readFile(path.join(root, audit.catalogFile), 'utf8')
  assert.equal(hash(text), audit.afterSha256, 'Sound catalog changed; review and refresh the migration audit')
  const reverse = new Map(Object.entries(audit.renames).map(([from, to]) => [to, from]))
  const original = text.replace(/"sounds\/[^"\r\n]+"/g, token => JSON.stringify(reverse.get(JSON.parse(token)) ?? JSON.parse(token)))
  assert.equal(hash(original), audit.beforeSha256, 'Sound IDs or playback settings changed during path migration')
  const catalog = JSON.parse(text)
  let links = 0
  for (const sound of Object.values(catalog.sound_definitions)) {
    for (const entry of sound.sounds) {
      const name = typeof entry === 'string' ? entry : entry.name
      assert(/^sounds\/[a-z0-9_/]+$/.test(name), `Invalid audio path: ${name}`)
      assert((await stat(path.join(root, 'Create (RE)', name + '.ogg'))).isFile(), `Missing sound: ${name}`)
      links++
    }
  }
  console.log(`PASS: 39 unchanged audio assets, reversible catalog edit and ${links} sound-file links`)
} catch (error) { failures.push(error.message) }
try {
  const audit = JSON.parse(await readFile(path.join(root, 'scripts/bedrock-resource-migration.json'), 'utf8'))
  assert.equal(Object.keys(audit.renames).length, 269)
  assert.equal(new Set(Object.values(audit.renames)).size, 269)
  const reverse = new Map(Object.entries(audit.renames).map(([old, next]) => [next, old]))
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const tokens = new RegExp(`(?<![a-zA-Z0-9_.])(?:${[...reverse.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})(?![a-zA-Z0-9_.])`, 'g')
  for (const record of audit.files) {
    assert(record.file.startsWith('Create (') && !record.file.split('/').includes('..'))
    const text = await readFile(path.join(root, record.file), 'utf8')
    const hash = content => createHash('sha256').update(content).digest('hex')
    assert.equal(hash(text), record.afterSha256, `Resource migration changed: ${record.file}`)
    assert.equal(hash(text.replace(tokens, name => reverse.get(name))), record.beforeSha256, `Non-rename resource change: ${record.file}`)
  }
  const resources = new Set()
  for (const record of audit.files.filter(record => record.file.startsWith('Create (RE)/') && /\.(json|material)$/.test(record.file))) {
    const data = JSON.parse((await readFile(path.join(root, record.file), 'utf8')).replace(/^\uFEFF/, ''))
    for (const key of ['animations', 'animation_controllers', 'render_controllers']) for (const name of Object.keys(data[key] ?? {})) resources.add(name)
    for (const geometry of data['minecraft:geometry'] ?? []) resources.add(geometry.description.identifier)
    for (const key of Object.keys(data)) if (key.startsWith('geometry.')) resources.add(key)
    for (const name of Object.keys(data.materials ?? {})) resources.add(name.split(':')[0])
  }
  for (const next of Object.values(audit.renames)) assert(resources.has(next), `Renamed resource definition missing: ${next}`)
  console.log(`PASS: 269 collision-free resource names and ${audit.files.length} exact reversible file edits`)
} catch (error) { failures.push(error.message) }
try {
  // Guard this report-driven migration against content loss and stale versions.
  // Only the version token is excluded from the baseline byte hash.
  const audit = JSON.parse(await readFile(path.join(root, 'scripts/bedrock-format-migration.json'), 'utf8'))
  assert.equal(audit.files.length, 613)
  const seen = new Set()
  for (const record of audit.files) {
    assert(!seen.has(record.file), `Duplicate migration audit path: ${record.file}`)
    seen.add(record.file)
    assert(/^(Create \(BE\)\/recipes\/|Create \(RE\)\/(animations|entity)\/)/.test(record.file) && !record.file.split('/').includes('..'), 'Invalid migration audit path')
    const text = await readFile(path.join(root, record.file), 'utf8')
    const data = JSON.parse(text.replace(/^\uFEFF/, ''))
    assert.equal(data.format_version, record.to, `Migrated format version regressed: ${record.file}`)
    const tokens = /("format_version"\s*:\s*")[^"]+(")/g
    assert.equal([...text.matchAll(tokens)].length, 1)
    const digest = createHash('sha256').update(text.replace(tokens, '$1<VERSION>$2')).digest('hex')
    assert.equal(digest, record.contentSha256, `Migrated payload changed: ${record.file}; review and refresh its audit after intentional content edits`)
  }
  for (const [rule, expected] of [['FORMATVER[156]', 474], ['FORMATVER[216]', 43], ['FORMATVER[296]', 96]]) {
    assert.equal(audit.files.filter(record => record.rule === rule).length, expected)
  }
  console.log('PASS: all 613 migrated versions and non-version byte hashes')
} catch (error) { failures.push(error.message) }
try {
  assert.equal(manifests.length, 2)
  const uuids = new Set()
  for (const manifest of manifests) {
    for (const entry of [manifest.header, ...manifest.modules]) {
      assert(!uuids.has(entry.uuid), `Duplicate UUID: ${entry.uuid}`)
      uuids.add(entry.uuid)
    }
    for (const dependency of manifest.dependencies.filter((entry) => entry.uuid)) {
      const other = manifests.find((candidate) => candidate.header.uuid === dependency.uuid)
      assert(other, `Missing dependency pack: ${dependency.uuid}`)
      assert.deepEqual(dependency.version, other.header.version)
    }
  }
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  for (const dependency of manifests.flatMap((manifest) => manifest.dependencies).filter((entry) => entry.module_name)) {
    assert.equal(packageJson.devDependencies[dependency.module_name], dependency.version, `Manifest/npm mismatch: ${dependency.module_name}`)
  }
} catch (error) { failures.push(error.message) }
console.log(`JSON lint: ${count} files; AJV: ${structures} structural checks (not complete Minecraft component schemas)`)
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else console.log('PASS: syntax, content structure, recipe patterns, UUIDs, manifest dependencies and retired-component checks')
