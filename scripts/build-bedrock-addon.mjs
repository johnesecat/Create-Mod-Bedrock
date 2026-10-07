#!/usr/bin/env node
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stage = await mkdtemp(path.join(os.tmpdir(), 'create-bedrock-package-'))
const behaviorPack = path.join(stage, 'Create-Behavior')
const resourcePack = path.join(stage, 'Create-Resources')
const output = path.join(root, 'Create-Bedrock.mcaddon')

async function removeJsonBoms(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
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

async function addDirectory(zip, directory, archivePrefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    const archivePath = archivePrefix ? `${archivePrefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      await addDirectory(zip, fullPath, archivePath)
    } else if (entry.isFile() && entry.name.toLowerCase() !== 'desktop.ini') {
      zip.file(archivePath, await readFile(fullPath), { date: new Date('2000-01-01T00:00:00.000Z'), createFolders: false })
    }
  }
}

async function makePack(source, destination, compatibilityReadme) {
  await cp(source, destination, {
    recursive: true,
    filter: (file) => file !== compatibilityReadme,
  })
  await removeJsonBoms(destination)
  const zip = new JSZip()
  await addDirectory(zip, destination)
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    platform: 'DOS',
    streamFiles: false,
  })
}

try {
  const behaviorManifest = JSON.parse((await readFile(path.join(root, 'Create (BE)', 'manifest.json'), 'utf8')).replace(/^\uFEFF/, ''))
  const resourceManifest = JSON.parse((await readFile(path.join(root, 'Create (RE)', 'manifest.json'), 'utf8')).replace(/^\uFEFF/, ''))
  const behaviorDependency = behaviorManifest.dependencies?.find((dependency) => dependency.uuid)
  const resourceDependency = resourceManifest.dependencies?.find((dependency) => dependency.uuid)
  if (behaviorDependency?.uuid !== resourceManifest.header?.uuid || JSON.stringify(behaviorDependency.version) !== JSON.stringify(resourceManifest.header?.version)) {
    throw new Error('Behavior pack dependency does not match the resource pack header')
  }
  if (resourceDependency?.uuid !== behaviorManifest.header?.uuid || JSON.stringify(resourceDependency.version) !== JSON.stringify(behaviorManifest.header?.version)) {
    throw new Error('Resource pack dependency does not match the behavior pack header')
  }

  await mkdir(stage, { recursive: true })
  const [behaviorBytes, resourceBytes] = await Promise.all([
    makePack(path.join(root, 'Create (BE)'), behaviorPack, path.join(root, 'Create (BE)', 'scripts', 'create', 'compatibility', 'README.md')),
    makePack(path.join(root, 'Create (RE)'), resourcePack, ''),
  ])
  const addon = new JSZip()
  addon.file('Create-Behavior.mcpack', behaviorBytes, { date: new Date('2000-01-01T00:00:00.000Z'), createFolders: false })
  addon.file('Create-Resources.mcpack', resourceBytes, { date: new Date('2000-01-01T00:00:00.000Z'), createFolders: false })
  const bytes = await addon.generateAsync({
    type: 'nodebuffer',
    compression: 'STORE',
    platform: 'DOS',
    streamFiles: false,
  })
  await writeFile(output, bytes)
  console.log(`Built ${path.relative(root, output)} (${bytes.length.toLocaleString()} bytes)`)
  console.log(`Behavior pack: ${behaviorBytes.length.toLocaleString()} bytes; resource pack: ${resourceBytes.length.toLocaleString()} bytes`)
} finally {
  await rm(stage, { recursive: true, force: true })
}
