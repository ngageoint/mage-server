
import { Argument, Arg } from '@fluffy-spoon/substitute/dist/src/Arguments'
import deepEqual from 'deep-equal';
import { AppRequest, AppRequestContext } from '../lib/app.api/app.api.global'
import stream from 'stream'

Arg.deepEquals = <T>(expected: T): Argument<T> & T => {
  return new Argument<T>(`deeply equal to ${JSON.stringify(expected)}`, (x: T): boolean => deepEqual(x, expected)) as Argument<T> & T
}

Arg.requestTokenMatches = (expected: AppRequest | AppRequestContext) => {
  let expectedContext = expected
  if ('context' in expectedContext) {
    expectedContext = expectedContext.context
  }
  return new Argument(`request token ${JSON.stringify(expectedContext.requestToken) || String(expectedContext.requestToken)}`,
    (actual: AppRequest | AppRequestContext): boolean => {
      let actualContext = actual
      if ('context' in actualContext) {
        actualContext = actualContext.context
      }
      return actualContext.requestToken === (expectedContext as AppRequestContext).requestToken
    }
  )
}

Arg.sameStringValueAs = <T>(expected: T) => {
  return Arg.is(x => String(x) === String(expected))
}

export class BufferWriteable extends stream.Writable {

  #bytes: Buffer = Buffer.alloc(0)

  constructor(opts?: stream.WritableOptions) {
    super({
      ...opts,
      write: (chunk: any, encoding: BufferEncoding, callback: (err?: any) => void) => {
        this.#bytes = Buffer.concat([ this.#bytes, chunk ])
        callback()
      }
    })
  }

  get bytes() {
    return this.#bytes
  }
}
