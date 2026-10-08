import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
assert(args.length === 1 || (args.length === 2 && args[1] === '--apply'), 'Usage: node scripts/migrate-bedrock-format-versions.mjs <baseline.mcr.json> [--apply]')
const report = JSON.parse(await readFile(path.resolve(root, args[0]), 'utf8'))
assert.equal(report.generatorName, 'Minecraft Creator Tools')
const rules = new Map([
  [156, { prefix: '/Create-Behavior.mcpack#/', folder: 'Create (BE)/recipes/', target: '1.26.50', old: ['1.12', '1.12.0', '1.20.10'], kind: 'recipe' }],
  [216, { prefix: '/Create-Resources.mcpack#/', folder: 'Create (RE)/animations/', target: '1.10.0', old: ['1.8.0'], kind: 'animation' }],
  [296, { prefix: '/Create-Resources.mcpack#/', folder: 'Create (RE)/entity/', target: '1.26.50', old: ['1.10.0', '1.12.0'], kind: 'client_entity' }],
])
const findings = report.items.filter(issue => issue.iTp === 3 || issue.iTp === 5)
assert.equal(findings.length, 613, 'Expected the reviewed 613-error baseline')
const plans = []
const seen = new Set()
const hash = text => createHash('sha256').update(text).digest('hex')
for (const issue of findings) {
  assert.equal(issue.gId, 'FORMATVER')
  const rule = rules.get(issue.gIx)
  assert(rule, `Unexpected rule: ${issue.gIx}`)
  assert(issue.p.startsWith(rule.prefix), `Unexpected archive path: ${issue.p}`)
  const file = (rule.folder.startsWith('Create (BE)') ? 'Create (BE)/' : 'Create (RE)/') + issue.p.slice(rule.prefix.length)
  assert(file.startsWith(rule.folder) && !file.split('/').includes('..'), `Unsafe path: ${file}`)
  assert(!seen.has(file), `Duplicate finding: ${file}`)
  seen.add(file)
  const source = await readFile(path.join(root, file), 'utf8')
  const original = JSON.parse(source.replace(/^\uFEFF/, ''))
  assert(rule.old.includes(original.format_version) || original.format_version === rule.target, `Unexpected version in ${file}`)
  if (rule.kind === 'recipe') assert(Object.keys(original).some(key => key.startsWith('minecraft:recipe_')))
  if (rule.kind === 'animation') assert(original.animations)
  if (rule.kind === 'client_entity') assert(original['minecraft:client_entity'])
  const matcher = /("format_version"\s*:\s*")[^"]+(")/g
  assert.equal([...source.matchAll(matcher)].length, 1, `Expected exactly one version token in ${file}`)
  const migrated = source.replace(matcher, (_match, before, after) => before + rule.target + after)
  const updated = JSON.parse(migrated.replace(/^\uFEFF/, ''))
  assert.equal(updated.format_version, rule.target)
  delete original.format_version
  delete updated.format_version
  assert.deepEqual(updated, original, `Content would change in ${file}`)
  const withoutVersion = source.replace(matcher, '$1<VERSION>$2')
  assert.equal(migrated.replace(matcher, '$1<VERSION>$2'), withoutVersion, `Non-version bytes would change in ${file}`)
  plans.push({ file, rule: `FORMATVER[${issue.gIx}]`, from: JSON.parse(source.replace(/^\uFEFF/, '')).format_version, to: rule.target, contentSha256: hash(withoutVersion), source, migrated })
}
for (const [index, count] of [[156, 474], [216, 43], [296, 96]]) {
  assert.equal(plans.filter(plan => plan.rule === `FORMATVER[${index}]`).length, count)
}
console.log('Reviewed migration: 474 recipes → 1.26.50; 43 animations → 1.10.0; 96 client entities → 1.26.50')
console.log('All 613 payloads and all bytes outside format_version are preserved.')
if (args[1] === '--apply') {
  for (const plan of plans) {
    if (plan.migrated !== plan.source) await writeFile(path.join(root, plan.file), plan.migrated)
    assert.equal(await readFile(path.join(root, plan.file), 'utf8'), plan.migrated, `Write verification failed: ${plan.file}`)
  }
  const audit = { baseline: args[0], files: plans.map(({ source, migrated, ...record }) => record) }
  await writeFile(path.join(root, 'scripts/bedrock-format-migration.json'), JSON.stringify(audit, null, 2) + '\n')
  console.log('Applied and reread every file; audit saved to scripts/bedrock-format-migration.json')
} else console.log('Dry run only; use --apply to perform the reviewed migration.')
