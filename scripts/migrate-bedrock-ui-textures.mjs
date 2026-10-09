import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rmdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
assert(args.length <= 1 && args.every(arg => arg === '--apply'), 'Usage: node scripts/migrate-bedrock-ui-textures.mjs [--apply]')
const fromPrefix = 'textures/ui/'
const toPrefix = 'textures/create/bedrock/ui/'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
// Only pack-owned crafters/pause textures move; vanilla textures/ui references stay.
const forward = /textures\/ui\/(?=(?:crafters|pause)\/)/g
const reverse = /textures\/create\/bedrock\/ui\/(?=(?:crafters|pause)\/)/g
const moves = []
async function list(folder) {
  for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
    const from = `${folder}/${entry.name}`
    if (entry.isDirectory()) { await list(from); continue }
    assert(entry.isFile(), `Unsupported texture entry: ${from}`)
    const to = from.replace(fromPrefix, toPrefix)
    assert.equal(await stat(path.join(root, to)).then(() => true, error => {
      if (error.code === 'ENOENT') return false
      throw error
    }), false, `Destination exists: ${to}`)
    moves.push({ from, to, sha256: hash(await readFile(path.join(root, from))) })
  }
}
await list('Create (RE)/textures/ui')
assert.equal(moves.length, 147)
assert(moves.every(move => /textures\/ui\/(crafters|pause)\//.test(move.from)))
const previousAudit = JSON.parse(await readFile(path.join(root, 'scripts/bedrock-folder-migration.json'), 'utf8'))
const edits = []
async function inspect(folder) {
  for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
    const file = `${folder}/${entry.name}`
    if (entry.isDirectory()) { await inspect(file); continue }
    if (!/\.(json|js|ts|lang|md|material)$/.test(entry.name)) continue
    const source = await readFile(path.join(root, file), 'utf8')
    assert.equal([...source.matchAll(reverse)].length, 0, `Destination already referenced: ${file}`)
    const migrated = source.replace(forward, toPrefix).replace(/"ui\/crafters\//g, '"create/bedrock/ui/crafters/')
    if (source === migrated) continue
    assert.equal(file, 'Create (RE)/ui/pause_screen.json', `Unexpected reference-bearing file: ${file}`)
    assert.equal(hash(source), previousAudit.edits.find(edit => edit.file === file)?.afterSha256, 'Prior folder migration must be intact')
    assert.equal(migrated.replace(reverse, fromPrefix).replace(/"create\/bedrock\/ui\/crafters\//g, '"ui/crafters/'), source)
    JSON.parse(migrated.replace(/^\uFEFF/, ''))
    const references = [...source.matchAll(forward)].length
    assert.equal(references, 117)
    const relativeReferences = [...source.matchAll(/"ui\/crafters\//g)].length
    assert.equal(relativeReferences, 200)
    edits.push({ file, source, migrated, references, relativeReferences })
  }
}
await inspect('Create (BE)')
await inspect('Create (RE)')
assert.equal(edits.length, 1)
if (args.includes('--apply')) {
  for (const move of moves) {
    await mkdir(path.dirname(path.join(root, move.to)), { recursive: true })
    await rename(path.join(root, move.from), path.join(root, move.to))
    assert.equal(hash(await readFile(path.join(root, move.to))), move.sha256)
  }
  async function removeEmptyDirectories(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      assert(entry.isDirectory(), `Unexpected file left in old texture tree: ${entry.name}`)
      await removeEmptyDirectories(path.join(folder, entry.name))
    }
    await rmdir(folder)
  }
  await removeEmptyDirectories(path.join(root, 'Create (RE)/textures/ui'))
  for (const edit of edits) {
    await writeFile(path.join(root, edit.file), edit.migrated)
    assert.equal(await readFile(path.join(root, edit.file), 'utf8'), edit.migrated)
  }
  await writeFile(path.join(root, 'scripts/bedrock-ui-texture-migration.json'), JSON.stringify({
    fromPrefix, toPrefix, moves,
    edits: edits.map(({ file, source, migrated, references, relativeReferences }) => ({ file, beforeSha256: hash(source), afterSha256: hash(migrated), references, relativeReferences })),
  }, null, 2) + '\n')
}
console.log(`${args.includes('--apply') ? 'Moved' : 'Would move'} 147 byte-identical texture/metadata files; updated 117 owned texture prefixes, including both dynamic expressions. UI structure and vanilla references preserved.`)
