import { SharpImageService } from './adapters.images.sharp'
import { ImageContent, ImageDescriptor } from './processor'
import fs from 'fs'
import path from 'path'
import stream from 'stream'

const imageBasePath = path.resolve(__dirname, '..', 'spec')
const destBasePath = path.resolve(__dirname, '..', 'scratch', path.basename(__filename))

void(async function() {

  fs.mkdirSync(destBasePath, { recursive: true })

  const service = SharpImageService()
  const unorientedPath = path.resolve(imageBasePath, 'majestic_ram.orient.raw-6.tag-6.jpg')
  const source: ImageContent = {
    mediaType: 'image/jpeg',
    bytes: fs.createReadStream(unorientedPath)
  }
  const orientedPath = path.resolve(destBasePath, 'majestic_ram.oriented.jpg')
  const orientedDest = fs.createWriteStream(orientedPath)
  const oriented = await service.autoOrient(source, orientedDest)
  if (oriented instanceof Error) {
    throw oriented
  }
  console.info('oriented:', oriented)

  const orientedBytes = fs.readFileSync(orientedPath)
  for (const thumbSize of [ 72, 120, 256 ]) {
    const source: ImageContent = {
      ...oriented,
      bytes: stream.Readable.from(orientedBytes),
    }
    const destPath = path.resolve(destBasePath, `majestic_ram@${thumbSize}.jpg`)
    const dest = fs.createWriteStream(destPath)
    await service.scaleToDimension(thumbSize, source, dest)
  }

  const corruptedBytes = fs.readFileSync(path.join(imageBasePath, 'corrupted.jpeg'))
  const corruptedSource: ImageContent = {
    mediaType: 'image/jpeg',
    bytes: stream.Readable.from(corruptedBytes)
  }
  const corruptedDestPath = path.join(destBasePath, 'corrupted.oriented.jpeg')
  const corruptedDest = fs.createWriteStream(corruptedDestPath)
  await service.autoOrient(corruptedSource, corruptedDest)
})()