import stream from 'stream'

export class BufferWriteable extends stream.Writable {

  _content: Buffer = Buffer.alloc(0)

  constructor(opts?: stream.WritableOptions) {
    super({
      ...opts,
      write: (chunk: any, encoding: BufferEncoding, callback: (err?: any) => void) => {
        this._content = Buffer.concat([ this._content, chunk ])
        callback()
      }
    })
  }

  get content() {
    return this._content
  }
}