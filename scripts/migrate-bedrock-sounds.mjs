import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
assert(args.every(arg => arg === '--apply') && args.length <= 1, 'Usage: node scripts/migrate-bedrock-sounds.mjs [--apply]')
const folder = path.join(root, 'Create (RE)/sounds')
const destination = 'sounds/create/bedrock'
const catalogFile = 'Create (RE)/sounds/sound_definitions.json'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const files = (await readdir(folder)).filter(name => name.endsWith('.ogg')).sort()
assert.equal(files.length, 39, 'Expected the 39 reviewed loose audio files; migration is one-time')
const moves = []
for (const name of files) {
  const from = `Create (RE)/sounds/${name}`
  const to = `Create (RE)/${destination}/${name}`
  assert.equal(await stat(path.join(root, to)).then(() => true, error => {
    if (error.code === 'ENOENT') return false
    throw error
  }), false, `Destination already exists: ${to}`)
  moves.push({ from, to, sha256: hash(await readFile(path.join(root, from))) })
}
const original = await readFile(path.join(root, catalogFile), 'utf8')
const catalog = JSON.parse(original)
const renames = Object.fromEntries(files.map(name => [`sounds/${name.slice(0, -4)}`, `${destination}/${name.slice(0, -4)}`]))
let references = 0
const migrated = original.replace(/"sounds\/[^"\r\n]+"/g, token => {
  const name = JSON.parse(token)
  if (!renames[name]) return token
  references++
  return JSON.stringify(renames[name])
})
assert.equal(references, 9, 'Expected nine catalog references to loose audio')
const reverse = new Map(Object.entries(renames).map(([from, to]) => [to, from]))
assert.equal(migrated.replace(/"sounds\/[^"\r\n]+"/g, token => JSON.stringify(reverse.get(JSON.parse(token)) ?? JSON.parse(token))), original)
assert.deepEqual(Object.keys(JSON.parse(migrated).sound_definitions), Object.keys(catalog.sound_definitions))
// Refuse to apply if any other authored pack text references a moved path.
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) await inspect(file)
    else if (/\.(json|js|ts|lang|md|material)$/.test(entry.name) && file !== path.join(root, catalogFile)) {
      const text = await readFile(file, 'utf8')
      for (const from of Object.keys(renames)) {
        const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        assert(!new RegExp(`${escaped}(?![a-zA-Z0-9_])`).test(text), `Additional reference requires review: ${path.relative(root, file)}: ${from}`)
      }
    }
  }
}
await inspect(path.join(root, 'Create (BE)'))
await inspect(path.join(root, 'Create (RE)'))
if (args.includes('--apply')) {
  await mkdir(path.join(root, 'Create (RE)', destination), { recursive: true })
  for (const move of moves) {
    await rename(path.join(root, move.from), path.join(root, move.to))
    assert.equal(hash(await readFile(path.join(root, move.to))), move.sha256)
  }
  await writeFile(path.join(root, catalogFile), migrated)
  assert.equal(await readFile(path.join(root, catalogFile), 'utf8'), migrated)
  await writeFile(path.join(root, 'scripts/bedrock-sound-migration.json'), JSON.stringify({
    moves, renames, catalogFile, beforeSha256: hash(original), afterSha256: hash(migrated),
  }, null, 2) + '\n')
}
console.log(`${args.includes('--apply') ? 'Moved' : 'Would move'} ${moves.length} unchanged audio files into ${destination}; ${references} catalog paths updated; public sound IDs and playback settings preserved.`)
