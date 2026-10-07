import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const entityRoot = path.join(root, 'Create (BE)', 'entities')
const obsoletePushable = /"minecraft:pushable"\s*:\s*\{\s*"is_pushable"\s*:\s*false\s*,\s*"is_pushable_by_piston"\s*:\s*false\s*\}\s*,?/g

async function migrate(directory) {
  let files = 0
  let components = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      const nested = await migrate(file)
      files += nested.files
      components += nested.components
      continue
    }
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue

    const source = await readFile(file, 'utf8')
    const matches = source.match(obsoletePushable) ?? []
    const migrated = source.replace(obsoletePushable, '').replace(/^[\t ]+(?=\r?$)/gm, '')
    if (migrated === source) continue
    try {
      JSON.parse(migrated.replace(/^\uFEFF/, ''))
    } catch (error) {
      throw new Error(`Migration would invalidate ${path.relative(root, file)}: ${error.message}`)
    }
    await writeFile(file, migrated)
    files++
    components += matches.length
  }
  return { files, components }
}

const result = await migrate(entityRoot)
console.log(`Removed ${result.components} obsolete no-op pushable components from ${result.files} entity files.`)
