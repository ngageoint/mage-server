import { ImageContent, ImageDescriptor, ImageService } from './processor'
import sharp, { OutputInfo } from 'sharp'


function ImageDescriptor(info: OutputInfo): Required<ImageDescriptor> {
  return {
    sizeInBytes: info.size,
    mediaType: `image/${info.format}`,
    dimensions: {
      width: info.width,
      height: info.height
    }
  }
}

class ImageOperation {

  static apply(transform: sharp.Sharp): Promise<Required<ImageDescriptor> | Error> & { to: (input: NodeJS.ReadableStream, output: NodeJS.WritableStream) => any } {

    const state = {
      resolve: ((x: Required<ImageDescriptor> | Error) => void(0) as any),
      finished: false,
      desc: undefined as Required<ImageDescriptor> | undefined
    }
    transform = transform
      .on('info', x => {
        const desc = ImageDescriptor(x)
        if (state.finished) {
          return void(state.resolve(desc))
        }
        state.desc = desc
      })
      .on('finish', () => {
        if (state.desc) {
          return void(state.resolve(state.desc))
        }
        state.finished = true
      })
      .on('error', x => {
        state.resolve(x instanceof Error ? x : new Error(String(x)))
      })
    const RunOp = class extends Promise<Required<ImageDescriptor> | Error> {
      to(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): this {
        input.pipe(transform).pipe(output)
        return this
      }
    }
    return new RunOp(resolve => {
      state.resolve = resolve
    })
  }
}

const defaultOptions: sharp.SharpOptions = {
  failOn: 'error'
}

export function SharpImageService(): ImageService {
  return {
    autoOrient(source: ImageContent, dest: NodeJS.WritableStream): Promise<Required<ImageDescriptor> | Error> {
      const orient = sharp(defaultOptions).rotate()
      return ImageOperation.apply(orient).to(source.bytes, dest)
    },
    scaleToDimension(minDimension: number, source: ImageContent, dest: NodeJS.WritableStream): Promise<Required<ImageDescriptor> | Error> {
      const { width, height } = source.dimensions || { width: 0, height: 0 }
      const targetDimensions = width < height ? { width: minDimension } : { height: minDimension }
      const scale = sharp(defaultOptions).resize(targetDimensions)
      return ImageOperation.apply(scale).to(source.bytes, dest)
    }
  }
}
