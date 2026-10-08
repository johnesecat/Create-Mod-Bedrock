import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import jsonlint from 'jsonlint'
import Ajv from 'ajv'

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
