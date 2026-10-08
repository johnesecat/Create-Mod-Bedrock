#!/usr/bin/env node
import { cp, mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const reportsRoot = path.join(root, '.mct-debug')
await mkdir(reportsRoot, { recursive: true })
const mctCli = path.join(root, 'node_modules', '@minecraft', 'creator-tools', 'cli', 'index.mjs')
const options = process.argv.slice(2)
const verbose = options.includes('--verbose')
const offline = options.includes('--offline')
const archive = options.includes('--archive')
const suite = options.find((arg) => arg.startsWith('--suite='))?.slice(8) ?? 'all'

// Creator Tools 0.20.0 maps its "all" CLI argument to main and omits add-on checks.
// Run each supported suite explicitly instead of relying on that misleading alias.
if (suite === 'all') {
  let failed = false
  for (const name of ['main', 'addon', 'currentplatform']) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...options.filter((arg) => !arg.startsWith('--suite=')), `--suite=${name}`], { cwd: root, stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) failed = true
  }
  process.exit(failed ? 1 : 0)
}
const stage = await mkdtemp(path.join(os.tmpdir(), 'create-bedrock-validation-'))
const reportsDir = await mkdtemp(path.join(reportsRoot, 'run-'))
const behaviorPack = path.join(stage, 'behavior_packs', 'Create')
const resourcePack = path.join(stage, 'resource_packs', 'Create')

async function copyPack(source, destination) {
  await cp(source, destination, { recursive: true })
}

async function removeJsonBoms(folder) {
  const entries = await readdir(folder, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name)
    if (entry.isDirectory()) {
      await removeJsonBoms(fullPath)
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      const contents = await readFile(fullPath)
      if (contents.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
        await writeFile(fullPath, contents.subarray(3))
      }
    }
  }
}

async function validateManifestLinks() {
  const behaviorRoot = path.join(root, 'Create (BE)')
  const behaviorManifestText = await readFile(path.join(behaviorRoot, 'manifest.json'), 'utf8')
  const resourceManifestText = await readFile(path.join(root, 'Create (RE)', 'manifest.json'), 'utf8')
  const behaviorManifest = JSON.parse(behaviorManifestText.charCodeAt(0) === 0xfeff ? behaviorManifestText.slice(1) : behaviorManifestText)
  const resourceManifest = JSON.parse(resourceManifestText.charCodeAt(0) === 0xfeff ? resourceManifestText.slice(1) : resourceManifestText)
  const packageManifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const behaviorResourceDependency = behaviorManifest.dependencies?.find((dependency) => dependency.uuid)
  const resourceBehaviorDependency = resourceManifest.dependencies?.find((dependency) => dependency.uuid)
  const scriptModule = behaviorManifest.modules?.find((module) => module.type === 'script')
  const scriptEntry = scriptModule?.entry ? path.resolve(behaviorRoot, scriptModule.entry) : ''
  const relativeScriptEntry = scriptEntry ? path.relative(behaviorRoot, scriptEntry) : ''
  const checks = [
    ['BE → RP UUID and version', behaviorResourceDependency?.uuid === resourceManifest.header?.uuid && JSON.stringify(behaviorResourceDependency.version) === JSON.stringify(resourceManifest.header?.version)],
    ['RP → BE UUID and version', resourceBehaviorDependency?.uuid === behaviorManifest.header?.uuid && JSON.stringify(resourceBehaviorDependency.version) === JSON.stringify(behaviorManifest.header?.version)],
    ['Script entry exists inside the behavior pack', Boolean(relativeScriptEntry) && !relativeScriptEntry.startsWith('..') && !path.isAbsolute(relativeScriptEntry) && await stat(scriptEntry).then((fileStat) => fileStat.isFile()).catch(() => false)],
    ['@minecraft/server version matches npm setup', packageManifest.devDependencies?.['@minecraft/server'] === behaviorManifest.dependencies?.find((dependency) => dependency.module_name === '@minecraft/server')?.version],
    ['@minecraft/server-ui version matches npm setup', packageManifest.devDependencies?.['@minecraft/server-ui'] === behaviorManifest.dependencies?.find((dependency) => dependency.module_name === '@minecraft/server-ui')?.version],
  ]
  const failed = checks.filter(([, passed]) => !passed).map(([name]) => name)
  console.log(`Manifest/npm consistency: ${checks.length - failed.length}/${checks.length} checks passed`)
  if (failed.length) throw new Error(`Manifest/package consistency check failed: ${failed.join('; ')}`)
}

function describeIssue(issue, summary) {
  const rule = summary?.[issue.gId]?.[issue.gIx]
  return {
    type: issue.iTp,
    rule: `${issue.gId}[${issue.gIx}]`,
    message: issue.m ?? rule?.defaultMessage ?? 'Creator Tools reported an issue',
    path: issue.p,
    data: issue.d,
  }
}

function printIssues(title, issues, report, limit = 2) {
  if (!issues.length) return
  const groups = new Map()
  for (const issue of issues) {
    const key = `${issue.iTp}:${issue.gId}:${issue.gIx}`
    const group = groups.get(key) ?? { count: 0, samples: [] }
    group.count += 1
    if (group.samples.length < limit) group.samples.push(describeIssue(issue, report.info?.summary))
    groups.set(key, group)
  }

  console.log(`${title}: ${issues.length} across ${groups.size} rule(s)`)
  for (const [key, group] of groups) {
    const [, generatorId, generatorIndex] = key.split(':')
    const first = group.samples[0]
    console.log(`  ${generatorId}[${generatorIndex}] x${group.count}: ${first.message}`)
    for (const sample of group.samples) {
      if (sample.path) console.log(`    ${sample.path}`)
      if (sample.data && sample.data !== sample.message) console.log(`    ${sample.data}`)
    }
    if (!verbose && group.count > group.samples.length) {
      console.log(`    … ${group.count - group.samples.length} similar finding(s); rerun with --verbose for every instance`)
    }
  }
}

try {
  const unexpectedArgs = options.filter((arg) => !['--verbose', '--offline', '--archive', `--suite=${suite}`].includes(arg))
  if (unexpectedArgs.length || !['all', 'main', 'addon', 'currentplatform'].includes(suite)) {
    throw new Error('Usage: npm run validate:bedrock [-- --verbose --offline --archive --suite=all|main|addon|currentplatform]')
  }

  await mkdir(path.dirname(behaviorPack), { recursive: true })
  await validateManifestLinks()
  if (archive) {
    const addon = await JSZip.loadAsync(await readFile(path.join(root, 'Create-Bedrock.mcaddon')), { checkCRC32: true })
    const entries = Object.values(addon.files).filter((entry) => !entry.dir)
    if (entries.length !== 2) throw new Error('Expected exactly two embedded packs')
    for (const [packFile, source] of [['Create-Behavior.mcpack', 'Create (BE)'], ['Create-Resources.mcpack', 'Create (RE)']]) {
      const embedded = addon.file(packFile)
      if (!embedded) throw new Error(`Missing ${packFile}`)
      const pack = await JSZip.loadAsync(await embedded.async('nodebuffer'), { checkCRC32: true })
      const manifestFile = pack.file('manifest.json')
      if (!manifestFile) throw new Error(`Missing manifest in ${packFile}`)
      const manifest = JSON.parse(await manifestFile.async('string'))
      const expected = JSON.parse((await readFile(path.join(root, source, 'manifest.json'), 'utf8')).replace(/^\uFEFF/, ''))
      if (JSON.stringify(manifest) !== JSON.stringify(expected)) throw new Error(`Archive manifest does not match ${source}`)
    }
  }
  const iconDimensions = await Promise.all([
    path.join(root, 'Create (BE)', 'pack_icon.png'),
    path.join(root, 'Create (RE)', 'pack_icon.png'),
  ].map(async (iconPath) => {
    const header = await readFile(iconPath)
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) }
  }))
  if (iconDimensions.some(({ width, height }) => width !== 256 || height !== 256)) {
    throw new Error('Pack icons must both be 256x256; run npm run fix:bedrock-icons first')
  }
  await copyPack(path.join(root, 'Create (BE)'), behaviorPack)
  await copyPack(path.join(root, 'Create (RE)'), resourcePack)
  await removeJsonBoms(behaviorPack)
  await removeJsonBoms(resourcePack)

  const args = [
    mctCli,
    'validate',
    ...(archive ? ['--input-file', path.join(root, 'Create-Bedrock.mcaddon')] : ['-i', stage]),
    suite,
    ...(offline ? ['--offline'] : []),
    '--quiet',
    '--json',
    '-o', reportsDir,
  ]
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
  })
  if (result.error) throw result.error

  const reportName = (await readdir(reportsDir)).find((name) => name.endsWith('.mcr.json'))
  if (!reportName) {
    if (result.stdout) process.stderr.write(result.stdout.slice(0, 4000))
    if (result.stderr) process.stderr.write(result.stderr.slice(0, 4000))
    throw new Error(`Creator Tools did not produce a JSON report (exit ${result.status ?? 'unknown'})`)
  }

  const report = JSON.parse(await readFile(path.join(reportsDir, reportName), 'utf8'))
  if (report.generatorName !== 'Minecraft Creator Tools' || !Array.isArray(report.items) || !report.info) {
    throw new Error('Creator Tools report has an unexpected schema; validation status cannot be trusted')
  }
  // Only main populates summary manifest counters in Creator Tools 0.20.0.
  // Other suites leave them at zero even when they inspect both packs; preflight above
  // verifies the actual source/archive manifests instead of trusting absent counters.
  if (suite === 'main' && (report.info.behaviorPackManifestCount !== 1 || report.info.resourcePackManifestCount !== 1)) {
    throw new Error('Creator Tools did not load exactly one behavior pack and one resource pack')
  }
  const issues = report.items
  const errors = issues.filter((issue) => issue.iTp === 3 || issue.iTp === 5)
  const warnings = issues.filter((issue) => issue.iTp === 4)
  const failures = issues.filter((issue) => issue.iTp === 0)
  console.log(`Creator Tools ${report.generatorVersion ?? ''} ${suite} validation (${archive ? 'shipped archive' : 'source packs'})`)
  console.log(suite === 'main' ? `Packs: ${report.info.behaviorPackManifestCount} behavior, ${report.info.resourcePackManifestCount} resource` : 'Packs: both manifests verified in preflight; this suite does not populate manifest counters.')
  console.log(`Findings: ${errors.length} errors, ${warnings.length} warnings, ${failures.length} failed check summaries`)
  console.log('Excluded checks: none. Errors retain their original severity; warnings are not a clean pass.')
  console.log(offline ? 'Offline mode explicitly requested: vanilla-resource and network coverage is limited.' : 'Online mode: vanilla resources are enabled.')
  console.log('Creator Tools CPACKICON rule is enabled; it requires pack icons <=256px.')
  printIssues('Errors', errors, report, verbose ? Number.POSITIVE_INFINITY : 2)
  printIssues('Failed check summaries', failures, report, verbose ? Number.POSITIVE_INFINITY : 2)
  printIssues('Warnings', warnings, report, verbose ? Number.POSITIVE_INFINITY : 2)
  console.log(`Detailed JSON/HTML/CSV reports: ${reportsDir}`)
  console.log('Note: source validation stages every source file, including documentation; only JSON BOMs are normalized to match packaging.')

  if (result.status !== 0 || errors.length > 0 || failures.length > 0) {
    process.exitCode = 1
    console.error(`Creator Tools validation did not pass (CLI exit ${result.status ?? 'unknown'}).`)
  }
} finally {
  await rm(stage, { recursive: true, force: true })
}
