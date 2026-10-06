#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'acorn'
import JSZip from 'jszip'
import { PNG } from 'pngjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
assert.equal(process.argv.length, 2, 'Usage: npm run debug:bedrock')
const packNames = ['Create (BE)', 'Create (RE)']
const json = (bytes) => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''))
const normalize = (name, bytes) => name.endsWith('.json') && bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) ? bytes.subarray(3) : bytes

async function filesIn(folder, prefix = '') {
  const files = new Map()
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const name = prefix + entry.name
    if (entry.isDirectory()) {
      for (const [key, value] of await filesIn(path.join(folder, entry.name), name + '/')) files.set(key, value)
    } else if (entry.isFile()) files.set(name, await readFile(path.join(folder, entry.name)))
  }
  return files
}

const [behavior, resources] = await Promise.all(packNames.map((name) => filesIn(path.join(root, name))))
let jsonCount = 0
for (const files of [behavior, resources]) {
  for (const [name, bytes] of files) {
    if (name.endsWith('.json')) {
      try { json(bytes) } catch (error) { throw new Error(`Invalid JSON: ${name}`, { cause: error }) }
      jsonCount++
    }
  }
  const icon = PNG.sync.read(files.get('pack_icon.png'))
  assert.equal(icon.width, 256, 'Pack icon width')
  assert.equal(icon.height, 256, 'Pack icon height')
}
console.log(`PASS: ${jsonCount} strict JSON files and both decoded pack icons`)

const manifests = [behavior, resources].map((files) => json(files.get('manifest.json')))
const uuids = new Set()
for (const [index, manifest] of manifests.entries()) {
  for (const entry of [manifest.header, ...manifest.modules]) {
    assert(!uuids.has(entry.uuid), `Duplicate manifest UUID: ${entry.uuid}`)
    uuids.add(entry.uuid)
    assert(Array.isArray(entry.version) && entry.version.length === 3 && entry.version.every((part) => Number.isInteger(part) && part >= 0), 'Invalid manifest version triple')
  }
  const other = manifests[1 - index].header
  assert.deepEqual(manifest.dependencies.find((dependency) => dependency.uuid === other.uuid)?.version, other.version, 'Pack dependency mismatch')
}
const packageJson = json(await readFile(path.join(root, 'package.json')))
for (const dependency of manifests[0].dependencies.filter((entry) => entry.module_name)) {
  assert.equal(packageJson.devDependencies[dependency.module_name], dependency.version, 'Script dependency/npm mismatch')
}
const entry = manifests[0].modules.find((module) => module.type === 'script')?.entry
assert(behavior.has(entry), `Missing script entry: ${entry}`)

// Parse real ES modules rather than searching imports in comments or strings.
const modules = new Map()
for (const [name, bytes] of behavior) {
  if (!name.endsWith('.js')) continue
  const ast = parse(bytes.toString('utf8'), { ecmaVersion: 'latest', sourceType: 'module' })
  const record = { dependencies: [], exports: new Set(), stars: [] }
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration' || node.source) {
      record.dependencies.push({ source: node.source.value, names: node.specifiers?.filter((s) => s.type === 'ImportSpecifier').map((s) => s.imported.name) ?? [] })
    }
    if (node.type === 'ExportDefaultDeclaration') record.exports.add('default')
    if (node.type === 'ExportAllDeclaration') record.stars.push(node.source.value)
    if (node.type === 'ExportNamedDeclaration') {
      for (const specifier of node.specifiers) record.exports.add(specifier.exported.name)
      if (node.declaration?.id) record.exports.add(node.declaration.id.name)
      for (const declaration of node.declaration?.declarations ?? []) {
        assert.equal(declaration.id.type, 'Identifier', `Unsupported destructured export in ${name}`)
        record.exports.add(declaration.id.name)
      }
    }
  }
  modules.set(name, record)
}
function resolve(from, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier))
  const target = [base, base + '.js', base + '/index.js'].find((candidate) => modules.has(candidate))
  assert(target, `Missing script import: ${from} -> ${specifier}`)
  return target
}
function hasExport(name, symbol, seen = new Set()) {
  if (seen.has(name)) return false
  seen.add(name)
  const record = modules.get(name)
  return record.exports.has(symbol) || record.stars.some((source) => hasExport(resolve(name, source), symbol, seen))
}
let imports = 0
for (const [name, record] of modules) {
  for (const dependency of record.dependencies) {
    imports++
    if (dependency.source.startsWith('.')) {
      const target = resolve(name, dependency.source)
      for (const symbol of dependency.names) assert(hasExport(target, symbol), `Missing export ${symbol}: ${name} -> ${target}`)
    } else {
      assert(manifests[0].dependencies.some((entry) => entry.module_name === dependency.source), `Undeclared script dependency: ${dependency.source}`)
      const declarations = await readFile(path.join(root, 'node_modules', dependency.source, 'index.d.ts'), 'utf8')
      for (const symbol of dependency.names) {
        assert(new RegExp(`export (?:declare )?(?:class|const|enum|function|interface|type|let|var) ${symbol}\\b`).test(declarations), `Unknown API export: ${dependency.source}.${symbol}`)
      }
    }
  }
}
console.log(`PASS: ${modules.size} JavaScript modules, ${imports} imports and named exports (not gameplay execution)`)

const definitions = []
for (const [name, bytes] of behavior) {
  if (!name.endsWith('.json') || !/^(items|blocks)\//.test(name)) continue
  const data = json(bytes)
  for (const [kind, key] of [['item', 'minecraft:item'], ['tile', 'minecraft:block']]) {
    if (data[key]) definitions.push({ kind, name, ...data[key] })
  }
}
const languages = json(resources.get('texts/languages.json'))
for (const language of languages) {
  const name = `texts/${language}.lang`
  assert(resources.has(name), `Missing declared locale: ${name}`)
  const values = new Map()
  for (const [index, line] of resources.get(name).toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    if (!line.trim() || /^\s*(#|\/\/)/.test(line)) continue
    const separator = line.indexOf('=')
    assert(separator > 0, `Malformed locale: ${name}:${index + 1}`)
    const key = line.slice(0, separator)
    assert(!values.has(key), `Duplicate locale key: ${name}:${key}`)
    values.set(key, line.slice(separator + 1).trim())
  }
  for (const definition of definitions) {
    const canonical = `${definition.kind}.${definition.description.identifier}.name`
    assert(values.get(canonical), `Missing localized name: ${name}:${canonical}`)
    const display = definition.components?.['minecraft:display_name']
    const explicit = typeof display === 'object' ? display?.value : display
    if (typeof explicit === 'string' && /^(item|tile)\./.test(explicit)) assert(values.get(explicit), `Missing explicit name: ${name}:${explicit}`)
  }
}
const atlas = json(resources.get('textures/item_texture.json')).texture_data
let icons = 0
for (const definition of definitions.filter((definition) => definition.kind === 'item')) {
  const component = definition.components?.['minecraft:icon']
  assert(component, `Missing item icon: ${definition.name}`)
  const key = typeof component === 'string' ? component : component.textures?.default ?? component.texture
  assert(key, `Unrecognized item icon: ${definition.name}`)
  if (!key.startsWith('create:')) continue // Vanilla atlas entries belong to the game.
  assert(atlas[key], `Missing custom item atlas key: ${key}`)
  const textures = atlas[key].textures
  for (const texture of Array.isArray(textures) ? textures : [textures]) {
    assert.equal(typeof texture, 'string', `Unsupported atlas entry: ${key}`)
    const name = [texture + '.png', texture + '.tga'].find((candidate) => resources.has(candidate))
    assert(name, `Missing icon image: ${key} -> ${texture}`)
    if (name.endsWith('.png')) PNG.sync.read(resources.get(name))
  }
  icons++
}
console.log(`PASS: ${definitions.length} localized definitions in ${languages.length} locales and ${icons} custom item icons`)

const addonBytes = await readFile(path.join(root, 'Create-Bedrock.mcaddon'))
const addon = await JSZip.loadAsync(addonBytes, { checkCRC32: true })
const packFiles = ['Create-Behavior.mcpack', 'Create-Resources.mcpack']
assert.deepEqual(Object.keys(addon.files).sort(), [...packFiles].sort(), 'Unexpected outer archive entries')
for (const [index, packFile] of packFiles.entries()) {
  const zip = await JSZip.loadAsync(await addon.file(packFile).async('nodebuffer'), { checkCRC32: true })
  const source = [behavior, resources][index]
  const expected = [...source.keys()].filter((name) => path.posix.basename(name).toLowerCase() !== 'desktop.ini' && !(index === 0 && name === 'scripts/create/compatibility/README.md')).sort()
  assert.deepEqual(Object.keys(zip.files).filter((name) => !zip.files[name].dir).sort(), expected, `Pack file list mismatch: ${packFile}`)
  for (const name of expected) {
    assert((await zip.file(name).async('nodebuffer')).equals(normalize(name, source.get(name))), `Stale or changed packaged file: ${packFile}/${name}; run npm run build:bedrock`)
  }
  console.log(`PASS: ${packFile}, ${expected.length} files match source exactly; ZIP CRCs valid`)
}
console.log(`PASS: root Create-Bedrock.mcaddon (${addonBytes.length} bytes)`)
console.log('Runtime still requires Minecraft Preview: import the addon, enable both packs, reload the world, and inspect Settings > Creator > Content Log History while testing machines and items.')
