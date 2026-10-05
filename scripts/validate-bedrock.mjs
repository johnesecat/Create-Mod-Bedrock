#!/usr/bin/env node
import { cp, mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const reportsRoot = path.join(root, '.mct-debug')
await mkdir(reportsRoot, { recursive: true })
const stage = await mkdtemp(path.join(os.tmpdir(), 'create-bedrock-validation-'))
const reportsDir = await mkdtemp(path.join(reportsRoot, 'run-'))
const behaviorPack = path.join(stage, 'behavior_packs', 'Create')
const resourcePack = path.join(stage, 'resource_packs', 'Create')
const mctCli = path.join(root, 'node_modules', '@minecraft', 'creator-tools', 'cli', 'index.mjs')
const verbose = process.argv.slice(2).includes('--verbose')

async function copyPack(source, destination) {
  await cp(source, destination, {
    recursive: true,
    filter: (file) => file !== path.join(root, 'Create (BE)', 'scripts', 'create', 'compatibility', 'README.md'),
  })
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
  const unexpectedArgs = process.argv.slice(2).filter((arg) => arg !== '--verbose')
  if (unexpectedArgs.length) throw new Error('Usage: npm run validate:bedrock [-- --verbose]')

  await mkdir(path.dirname(behaviorPack), { recursive: true })
  await validateManifestLinks()
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
    '-i', stage,
    'main',
    'CADDONIREQ,FORBFILE',
    '--offline',
    '--quiet',
    '--json',
    '-o', reportsDir,
  ]
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
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
  if (report.info.behaviorPackManifestCount !== 1 || report.info.resourcePackManifestCount !== 1) {
    throw new Error('Creator Tools did not load exactly one behavior pack and one resource pack')
  }
  const issues = report.items
  const errors = issues.filter((issue) => issue.iTp === 3 || issue.iTp === 5)
  const warnings = issues.filter((issue) => issue.iTp === 4)
  const failures = issues.filter((issue) => issue.iTp === 0)
  console.log(`Creator Tools ${report.generatorVersion ?? ''} main validation`)
  console.log(`Packs: ${report.info?.behaviorPackManifestCount ?? 0} behavior, ${report.info?.resourcePackManifestCount ?? 0} resource`)
  console.log(`Findings: ${errors.length} errors, ${warnings.length} warnings, ${failures.length} failed check summaries`)
  console.log('Excluded checks: CADDONIREQ (cooperative-authoring structure) and FORBFILE (the source compatibility README).')
  console.log('Creator Tools CPACKICON rule is enabled; it requires pack icons <=256px.')
  printIssues('Errors', errors, report, verbose ? Number.POSITIVE_INFINITY : 2)
  printIssues('Warnings', warnings, report, verbose ? Number.POSITIVE_INFINITY : 2)
  console.log(`Detailed JSON/HTML/CSV reports: ${reportsDir}`)
  console.log('Note: validation runs on staged copies; BOMs are stripped there and compatibility README files are omitted, not changed in the source packs.')

  if (result.status !== 0 || errors.length > 0 || failures.length > 0) {
    process.exitCode = 1
    console.error(`Creator Tools validation did not pass (CLI exit ${result.status ?? 'unknown'}).`)
  }
} finally {
  await rm(stage, { recursive: true, force: true })
}
