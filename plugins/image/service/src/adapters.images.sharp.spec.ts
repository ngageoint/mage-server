import { SharpImageService } from './adapters.images.sharp'
import { ImageContent } from './processor'
import fs from 'fs'
import fs_async from 'fs/promises'
import path from 'path'
import stream from 'stream'
import sharp from 'sharp'
import Jimp from 'jimp'
import { BufferWriteable } from './util.spec'

const imageBasePath = path.resolve(__dirname, '..', 'spec')
const unorientedPath = path.resolve(imageBasePath, 'majestic_ram.orient.raw-6.tag-6.jpg')

describe('sharp image service', () => {

  describe('auto-orient', () => {

    it('rotates the image to the correct orientation', async () => {

      const service = SharpImageService()
      const source: ImageContent = {
        mediaType: 'image/jpeg',
        bytes: fs.createReadStream(unorientedPath)
      }
      const dest = new BufferWriteable()
      const oriented = await service.autoOrient(source, dest)
      if (oriented instanceof Error) {
        return fail(oriented)
      }
      const expectedPixels = await sharp(path.resolve(imageBasePath, 'majestic_ram.oriented.jpg')).toBuffer()
      const orientedByServiceJimp = await Jimp.read(dest.content)
      const expectedJimp = await Jimp.read(expectedPixels)
      const percentDifferent = Jimp.diff(orientedByServiceJimp, expectedJimp).percent

      expect(percentDifferent).toBeLessThan(1)
      expect(oriented.sizeInBytes).toEqual(dest.content.length)
      expect(Math.abs(oriented.sizeInBytes - expectedPixels.length)).toBeLessThanOrEqual(1000)
      expect(oriented).toEqual(jasmine.objectContaining({
        mediaType: 'image/jpeg',
        dimensions: {
          width: 720,
          height: 720
        }
      }))
    })
  })

  describe('scaling', () => {

    const service = SharpImageService()

    it('scales the height to the target when height is less than width', async () => {

      const source: ImageContent = {
        bytes: fs.createReadStream(path.resolve(imageBasePath, 'tumbeasts-1800x1140.png')),
        dimensions: {
          width: 1800,
          height: 1140
        }
      }
      const dest = new BufferWriteable()
      const scaled = await service.scaleToDimension(76, source, dest)
      if (scaled instanceof Error) {
        return fail(scaled)
      }
      const expectedPixels = await sharp(path.resolve(imageBasePath, 'tumbeasts-120x76.png')).toBuffer()
      const scaledJimp = await Jimp.read(dest.content)
      const expectedJimp = await Jimp.read(expectedPixels)
      const percentDifferent = Jimp.diff(scaledJimp, expectedJimp).percent

      expect(scaled).toEqual(jasmine.objectContaining({
        mediaType: 'image/png',
        dimensions: {
          width: 120,
          height: 76
        }
      }))
      expect(scaled.sizeInBytes).toEqual(dest.content.length)
      expect(Math.abs(scaled.sizeInBytes - expectedPixels.length)).toBeLessThanOrEqual(1200)
      expect(percentDifferent).toBeLessThan(1)
    })

    it('scales the width to the target when width is less than height', async () => {

      const source: ImageContent = {
        bytes: fs.createReadStream(path.resolve(imageBasePath, 'tumbeasts-1140x1800.png')),
        dimensions: {
          width: 1140,
          height: 1800
        }
      }
      const dest = new BufferWriteable()
      const scaled = await service.scaleToDimension(76, source, dest)
      if (scaled instanceof Error) {
        return fail(scaled)
      }
      const expectedPixels = await sharp(path.resolve(imageBasePath, 'tumbeasts-76x120.png')).toBuffer()
      const scaledJimp = await Jimp.read(dest.content)
      const expectedJimp = await Jimp.read(expectedPixels)
      const percentDifferent = Jimp.diff(scaledJimp, expectedJimp).percent

      expect(scaled).toEqual(jasmine.objectContaining({
        mediaType: 'image/png',
        dimensions: {
          width: 76,
          height: 120
        }
      }))
      expect(scaled.sizeInBytes).toEqual(dest.content.length)
      expect(Math.abs(scaled.sizeInBytes - expectedPixels.length)).toBeLessThanOrEqual(1000)
      expect(percentDifferent).toBeLessThan(2)
    })

    it('uses the given dimension even when they are not accurate', async () => {

      const source: ImageContent = {
        bytes: fs.createReadStream(path.resolve(imageBasePath, 'tumbeasts-1140x1800.png')),
        dimensions: {
          width: 1800,
          height: 1140
        }
      }
      const dest = new BufferWriteable()
      const scaled = await service.scaleToDimension(76, source, dest)
      if (scaled instanceof Error) {
        return fail(scaled)
      }
      const expectedPixels = await sharp(path.resolve(imageBasePath, 'tumbeasts-48x76.png')).toBuffer()
      const scaledJimp = await Jimp.read(dest.content)
      const expectedJimp = await Jimp.read(expectedPixels)
      const percentDifferent = Jimp.diff(scaledJimp, expectedJimp).percent

      expect(scaled).toEqual(jasmine.objectContaining({
        mediaType: 'image/png',
        dimensions: {
          width: 48,
          height: 76
        }
      }))
      expect(scaled.sizeInBytes).toEqual(dest.content.length)
      expect(Math.abs(scaled.sizeInBytes - expectedPixels.length)).toBeLessThanOrEqual(1000)
      expect(percentDifferent).toBeLessThan(2)
    })

    it('scales the height to the target size when the source has no dimensions', async () => {

      const source: ImageContent = {
        bytes: fs.createReadStream(path.resolve(imageBasePath, 'tumbeasts-1140x1800.png')),
      }
      const dest = new BufferWriteable()
      const scaled = await service.scaleToDimension(76, source, dest)
      if (scaled instanceof Error) {
        return fail(scaled)
      }
      const expectedPixels = await sharp(path.resolve(imageBasePath, 'tumbeasts-48x76.png')).toBuffer()
      const scaledJimp = await Jimp.read(dest.content)
      const expectedJimp = await Jimp.read(expectedPixels)
      const percentDifferent = Jimp.diff(scaledJimp, expectedJimp).percent

      expect(scaled).toEqual(jasmine.objectContaining({
        mediaType: 'image/png',
        dimensions: {
          width: 48,
          height: 76
        }
      }))
      expect(scaled.sizeInBytes).toEqual(dest.content.length)
      expect(Math.abs(scaled.sizeInBytes - expectedPixels.length)).toBeLessThanOrEqual(1000)
      expect(percentDifferent).toBeLessThan(2)
    })
  })

  describe('corrupted image tolerance', () => {

    it('returns an error loading this test image found on a demo server', async () => {

      const service = SharpImageService()
      const corruptedBytes = fs.readFileSync(path.join(imageBasePath, 'corrupted.jpeg'))
      const corruptedSource: ImageContent = {
        mediaType: 'image/jpeg',
        bytes: stream.Readable.from(corruptedBytes)
      }
      const corruptedDest = new BufferWriteable()
      const err = await service.autoOrient(corruptedSource, corruptedDest)

      expect(err).toBeInstanceOf(Error)
    })
  })
})
