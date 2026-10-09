import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
assert(args.length <= 1 && args.every(arg => arg === '--apply'), 'Usage: node scripts/migrate-bedrock-folders.mjs [--apply]')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const exists = file => stat(path.join(root, file)).then(() => true, error => {
  if (error.code === 'ENOENT') return false
  throw error
})
const renames = {}
const moves = []
for (const name of ['creative_fluid_tank.json', 'empty.json', 'fluid_tank.json', 'glass_pipe.json', 'zinc_ore.loot.json']) {
  const from = `loot_tables/create/${name}`
  renames[from] = `loot_tables/create/bedrock/${name}`
  moves.push({ from: `Create (BE)/${from}`, to: `Create (BE)/${renames[from]}` })
}
for (const name of ['blueprint', 'jei_background']) {
  const from = `textures/${name}`
  renames[from] = `textures/create/bedrock/${name}`
  moves.push({ from: `Create (RE)/${from}.png`, to: `Create (RE)/${renames[from]}.png` })
}
for (const move of moves) {
  assert.equal(await exists(move.to), false, `Destination exists: ${move.to}`)
  move.sha256 = hash(await readFile(path.join(root, move.from)))
}
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const matcher = names => new RegExp(`(?<![a-zA-Z0-9_./-])(?:${names.map(escape).join('|')})(?![a-zA-Z0-9_./-])`, 'g')
const forward = matcher(Object.keys(renames))
const reverseNames = Object.fromEntries(Object.entries(renames).map(([from, to]) => [to, from]))
const reverse = matcher(Object.keys(reverseNames))
const edits = []
const counts = Object.fromEntries(Object.keys(renames).map(name => [name, 0]))
const protectedFiles = new Set([
  ...JSON.parse(await readFile(path.join(root, 'scripts/bedrock-resource-migration.json'), 'utf8')).files.map(record => record.file),
  ...JSON.parse(await readFile(path.join(root, 'scripts/bedrock-format-migration.json'), 'utf8')).files.map(record => record.file),
])
async function inspect(folder) {
  for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
    const file = `${folder}/${entry.name}`
    if (entry.isDirectory()) { await inspect(file); continue }
    if (!/\.(json|js|ts|lang|md|material)$/.test(entry.name)) continue
    const source = await readFile(path.join(root, file), 'utf8')
    assert.equal([...source.matchAll(reverse)].length, 0, `New path already referenced: ${file}`)
    const migrated = source.replace(forward, name => { counts[name]++; return renames[name] })
    if (source === migrated) continue
    assert(!protectedFiles.has(file), `Existing migration audit requires review: ${file}`)
    assert.equal(migrated.replace(reverse, name => reverseNames[name]), source, `Non-path edit: ${file}`)
    if (/\.(json|material)$/.test(file)) JSON.parse(migrated.replace(/^\uFEFF/, ''))
    edits.push({ file, source, migrated })
  }
}
await inspect('Create (BE)')
await inspect('Create (RE)')
assert.deepEqual(Object.values(counts), [1, 0, 1, 1, 2, 1, 1], 'Unexpected references; review before migrating')
if (args.includes('--apply')) {
  for (const move of moves) {
    await mkdir(path.dirname(path.join(root, move.to)), { recursive: true })
    await rename(path.join(root, move.from), path.join(root, move.to))
    assert.equal(hash(await readFile(path.join(root, move.to))), move.sha256)
  }
  for (const edit of edits) {
    await writeFile(path.join(root, edit.file), edit.migrated)
    assert.equal(await readFile(path.join(root, edit.file), 'utf8'), edit.migrated)
  }
  await writeFile(path.join(root, 'scripts/bedrock-folder-migration.json'), JSON.stringify({
    moves, renames, references: counts,
    edits: edits.map(({ file, source, migrated }) => ({ file, beforeSha256: hash(source), afterSha256: hash(migrated) })),
  }, null, 2) + '\n')
}
console.log(`${args.includes('--apply') ? 'Moved' : 'Would move'} ${moves.length} byte-identical files; updated ${Object.values(counts).reduce((sum, count) => sum + count, 0)} references in ${edits.length} files. Public IDs and all non-path content preserved.`)
