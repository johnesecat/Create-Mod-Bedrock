#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'

const iconPaths = ['Create (BE)/pack_icon.png', 'Create (RE)/pack_icon.png']
const maxSize = 256

function downsample(source, width, height) {
  const output = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    const sourceY = y * 2
    for (let x = 0; x < width; x += 1) {
      const sourceX = x * 2
      const targetOffset = (y * width + x) * 4
      for (let channel = 0; channel < 4; channel += 1) {
        const topLeft = (sourceY * source.width + sourceX) * 4 + channel
        const topRight = topLeft + 4
        const bottomLeft = topLeft + source.width * 4
        const bottomRight = bottomLeft + 4
        output[targetOffset + channel] = Math.round(
          (source.data[topLeft] + source.data[topRight] + source.data[bottomLeft] + source.data[bottomRight]) / 4,
        )
      }
    }
  }
  return output
}

const images = []
for (const iconPath of iconPaths) {
  const image = PNG.sync.read(await readFile(iconPath))
  if (image.width !== image.height || ![maxSize, maxSize * 2].includes(image.width)) {
    throw new Error(`${iconPath}: expected a square ${maxSize}x${maxSize} or ${maxSize * 2}x${maxSize * 2} icon; found ${image.width}x${image.height}`)
  }
  images.push({ iconPath, image })
}

if (!images[0].image.data.equals(images[1].image.data)) {
  throw new Error('Behavior and resource pack icons do not have identical pixel artwork; refusing to overwrite either one')
}

for (const { iconPath, image } of images) {
  if (image.width === maxSize) {
    console.log(`${iconPath} already meets the ${maxSize}x${maxSize} Creator Tools limit`)
    continue
  }
  const resized = {
    width: maxSize,
    height: maxSize,
    data: downsample(image, maxSize, maxSize),
  }
  await writeFile(iconPath, PNG.sync.write(resized))
  console.log(`Resized ${iconPath} from ${image.width}x${image.height} to ${maxSize}x${maxSize}`)
}
