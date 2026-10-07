import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
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
