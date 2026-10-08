import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
assert(process.argv.length === 3, 'Usage: node scripts/migrate-bedrock-resource-names.mjs <addon-report.mcr.json>')
const report = JSON.parse(await readFile(path.resolve(root, process.argv[2]), 'utf8'))
assert.equal(report.generatorName, 'Minecraft Creator Tools')
const published = new Set(['animation.create.rpm.rotation', 'animation.create.rpm.offsets'])
const renames = new Map()
for (const issue of report.items) {
  if (issue.iTp !== 3 || issue.gId !== 'CADDONIREQ' || ![121, 131, 141, 151, 161].includes(issue.gIx)) continue
  const old = issue.d
  assert.equal(typeof old, 'string')
  if (published.has(old)) continue // Documented cross-pack API, not a private rendering detail.
  let next
  if (issue.gIx === 161) {
    assert.equal(old, 'create_additive:entity_alphablend')
    renames.set('create_additive', 'create_bedrock_additive')
    continue
  }
  const parts = old.split('.')
  const index = [121, 141].includes(issue.gIx) ? 2 : 1
  // Preserve non-create segments as part of the new identifier to avoid collisions.
  parts.splice(index, 0, 'create_bedrock')
  next = parts.join('.')
  assert(!renames.has(old) || renames.get(old) === next)
  renames.set(old, next)
}
assert(renames.size >= 250, 'Expected the reviewed private resource findings')
assert.equal(new Set(renames.values()).size, renames.size, 'Rename collision')
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function matcher(names) {
  // Material inheritance keys append :base; other identifiers must match in full.
  return new RegExp(`(?<![a-zA-Z0-9_.])(?:${names.sort((a, b) => b.length - a.length).map(escape).join('|')})(?![a-zA-Z0-9_.])`, 'g')
}
const forward = matcher([...renames.keys()])
const reverseMap = new Map([...renames].map(([old, next]) => [next, old]))
const reverse = matcher([...reverseMap.keys()])
const hash = text => createHash('sha256').update(text).digest('hex')
const versionToken = /("format_version"\s*:\s*")[^"]+(")/g
const formatAudit = JSON.parse(await readFile(path.join(root, 'scripts/bedrock-format-migration.json'), 'utf8'))
const formatRecords = new Map(formatAudit.files.map(record => [record.file, record]))
const plans = []
async function inspect(folder) {
  for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
    const file = `${folder}/${entry.name}`
    if (entry.isDirectory()) { await inspect(file); continue }
    if (!/\.(json|js|material|md|lang)$/.test(entry.name)) continue
    const source = await readFile(path.join(root, file), 'utf8')
    // New names must not already exist, or reverse verification could be ambiguous.
    assert(!reverse.test(source), `Destination identifier already exists in ${file}`)
    reverse.lastIndex = 0
    const migrated = source.replace(forward, name => renames.get(name))
    if (migrated === source) continue
    assert.equal(migrated.replace(reverse, name => reverseMap.get(name)), source, `Non-rename change in ${file}`)
    if (/\.(json|material)$/.test(file)) JSON.parse(migrated.replace(/^\uFEFF/, ''))
    const formatRecord = formatRecords.get(file)
    if (formatRecord) {
      assert.equal(hash(source.replace(versionToken, '$1<VERSION>$2')), formatRecord.contentSha256, `Baseline integrity failed: ${file}`)
      formatRecord.contentSha256 = hash(migrated.replace(versionToken, '$1<VERSION>$2'))
    }
    plans.push({ file, source, migrated })
  }
}
await inspect('Create (BE)')
await inspect('Create (RE)')
// Verify every requested name really has a definition, not just an incidental reference.
for (const [old] of renames) {
  assert(plans.some(plan => plan.file.startsWith('Create (RE)/') && new RegExp(`"${escape(old)}(?:[:"])`).test(plan.source)), `Missing definition for ${old}`)
}
for (const plan of plans) {
  await writeFile(path.join(root, plan.file), plan.migrated)
  assert.equal(await readFile(path.join(root, plan.file), 'utf8'), plan.migrated)
}
await writeFile(path.join(root, 'scripts/bedrock-format-migration.json'), JSON.stringify(formatAudit, null, 2) + '\n')
await writeFile(path.join(root, 'scripts/bedrock-resource-migration.json'), JSON.stringify({
  baseline: process.argv[2],
  preservedPublicAnimations: [...published],
  renames: Object.fromEntries(renames),
  files: plans.map(({ file, source, migrated }) => ({ file, beforeSha256: hash(source), afterSha256: hash(migrated) })),
}, null, 2) + '\n')
console.log(`Renamed ${renames.size} private resource identifiers in ${plans.length} files; every edit passed exact reverse/byte verification.`)
console.log('Preserved world-facing create: IDs and the documented shared RPM animation API. Refreshed format audit only after baseline and reverse verification.')
