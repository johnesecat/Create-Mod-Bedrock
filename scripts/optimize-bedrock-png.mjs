import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { deflateSync, inflateSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
export function inspectPng(bytes) {
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
  const chunks = []
  let offset = 8
  while (offset < bytes.length) {
    assert(offset + 12 <= bytes.length, 'Truncated PNG chunk')
    const size = bytes.readUInt32BE(offset)
    assert(offset + size + 12 <= bytes.length, 'Truncated PNG payload')
    const chunk = bytes.subarray(offset, offset + size + 12)
    assert.equal(crc32(chunk.subarray(4, 8 + size)), chunk.readUInt32BE(8 + size), 'PNG chunk CRC mismatch')
    chunks.push({ type: chunk.toString('ascii', 4, 8), bytes: chunk, data: chunk.subarray(8, 8 + size) })
    offset += size + 12
  }
  assert.equal(chunks[0]?.type, 'IHDR')
  assert.equal(chunks.at(-1)?.type, 'IEND')
  const idats = chunks.filter(chunk => chunk.type === 'IDAT')
  assert(idats.length > 0)
  const first = chunks.findIndex(chunk => chunk.type === 'IDAT')
  assert(chunks.slice(first, first + idats.length).every(chunk => chunk.type === 'IDAT'), 'Non-contiguous IDAT')
  // Preserve ancillary metadata verbatim, and do not optimize animated PNGs.
  assert(!chunks.some(chunk => ['acTL', 'fcTL', 'fdAT'].includes(chunk.type)), 'Animated PNG requires separate review')
  const raw = inflateSync(Buffer.concat(idats.map(chunk => chunk.data)))
  const decoded = PNG.sync.read(bytes, { checkCRC: true })
  return { chunks, raw, decoded, rawSha256: sha256(raw), pixelsSha256: sha256(decoded.data), metadataSha256: sha256(Buffer.concat(chunks.filter(chunk => chunk.type !== 'IDAT').map(chunk => chunk.bytes))) }
}
function idatChunk(data) {
  const chunk = Buffer.alloc(data.length + 12)
  chunk.writeUInt32BE(data.length)
  chunk.write('IDAT', 4, 'ascii')
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length)
  return chunk
}
export async function verifyOptimizedPng(file, record) {
  const bytes = await readFile(path.join(root, file))
  assert.equal(bytes.length, record.afterBytes, `Optimized PNG size changed: ${file}`)
  assert.equal(sha256(bytes), record.afterSha256, `Optimized PNG bytes changed: ${file}`)
  const image = inspectPng(bytes)
  assert.equal(image.rawSha256, record.rawSha256, `PNG scanlines changed: ${file}`)
  assert.equal(image.pixelsSha256, record.pixelsSha256, `PNG pixels changed: ${file}`)
  assert.equal(image.metadataSha256, record.metadataSha256, `PNG metadata changed: ${file}`)
  assert.equal(image.decoded.width, record.width)
  assert.equal(image.decoded.height, record.height)
}

async function main() {
  const args = process.argv.slice(2)
  assert(args.length <= 1 && args.every(arg => arg === '--apply'), 'Usage: node scripts/optimize-bedrock-png.mjs [--apply]')
  const plans = []
  async function walk(folder) {
    for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
      const file = `${folder}/${entry.name}`
      if (entry.isDirectory()) { await walk(file); continue }
      if (!entry.name.endsWith('.png')) continue
      const before = await readFile(path.join(root, file))
      const image = inspectPng(before)
      const compressed = deflateSync(image.raw, { level: 9 })
      let emitted = false
      const after = Buffer.concat([before.subarray(0, 8), ...image.chunks.flatMap(chunk => {
        if (chunk.type !== 'IDAT') return [chunk.bytes]
        if (emitted) return []
        emitted = true
        return [idatChunk(compressed)]
      })])
      if (before.length - after.length < 1000) continue
      const next = inspectPng(after)
      assert(next.raw.equals(image.raw), `Filtered scanlines changed: ${file}`)
      assert(next.decoded.data.equals(image.decoded.data), `Decoded pixels changed: ${file}`)
      assert.equal(next.metadataSha256, image.metadataSha256)
      assert.equal(next.decoded.width, image.decoded.width)
      assert.equal(next.decoded.height, image.decoded.height)
      plans.push({ file, before, after, record: {
        file, beforeBytes: before.length, afterBytes: after.length,
        beforeSha256: sha256(before), afterSha256: sha256(after),
        rawSha256: image.rawSha256, pixelsSha256: image.pixelsSha256, metadataSha256: image.metadataSha256,
        width: image.decoded.width, height: image.decoded.height,
      } })
    }
  }
  await walk('Create (BE)')
  await walk('Create (RE)')
  const saved = plans.reduce((sum, plan) => sum + plan.before.length - plan.after.length, 0)
  assert(saved > 320051, 'Expected lossless savings sufficient to clear baseline PACKSIZE overage')
  if (args.includes('--apply')) {
    // Refuse to overwrite a prior optimization audit or intervening asset edits.
    const auditPath = path.join(root, 'scripts/bedrock-png-optimization.json')
    await readFile(auditPath).then(() => { throw new Error('Optimization audit already exists') }, error => { if (error.code !== 'ENOENT') throw error })
    for (const plan of plans) assert.equal(sha256(await readFile(path.join(root, plan.file))), plan.record.beforeSha256)
    for (const plan of plans) {
      await writeFile(path.join(root, plan.file), plan.after)
      await verifyOptimizedPng(plan.file, plan.record)
    }
    await writeFile(auditPath, JSON.stringify({ method: 'IDAT-only zlib level 9; exact scanlines, pixels and non-IDAT chunks preserved', savedBytes: saved, files: plans.map(plan => plan.record) }, null, 2) + '\n')
  }
  console.log(`${args.includes('--apply') ? 'Optimized' : 'Would optimize'} ${plans.length} PNGs, saving ${saved} bytes; dimensions, filtered scanlines, decoded RGBA and all non-IDAT chunks unchanged.`)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
