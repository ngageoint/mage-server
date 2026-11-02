import { EventEmitter } from 'events'
import { sendCotEvent } from './transport.tcp'

class FakeSocket extends EventEmitter {
  destroyed = false
  written: string | Buffer | undefined
  ended = false

  write(data: string | Buffer, cb?: (err?: Error) => void): boolean {
    this.written = data
    if (cb) {
      cb()
    }
    return true
  }

  end(cb?: () => void): this {
    this.ended = true
    if (cb) {
      cb()
    }
    return this
  }

  destroy(): void {
    this.destroyed = true
  }
}

const connectImmediately = (socket: FakeSocket) => jest.fn(() => {
  setImmediate(() => socket.emit('connect'))
  return socket as any
})

describe('sendCotEvent', () => {

  it('connects to the given host/port and writes the xml', async () => {
    const socket = new FakeSocket()
    const createConnection = connectImmediately(socket)

    await sendCotEvent('tak.example.com', 8088, '<event/>', { createConnection, postWriteDelayMs: 0 })

    expect(createConnection).toHaveBeenCalledWith({ host: 'tak.example.com', port: 8088 })
    expect(socket.written).toBe('<event/>')
    expect(socket.ended).toBe(true)
  })

  it('does not end the connection until after postWriteDelayMs', async () => {
    // Some TAK server implementations (confirmed live against OpenTAKServer's
    // eud_handler) do real per-connection setup before their read loop
    // starts - ending right after the write can race ahead of that and the
    // server never sees the data at all.
    jest.useFakeTimers()
    try {
      const socket = new FakeSocket()
      const createConnection = connectImmediately(socket)

      const pending = sendCotEvent('tak.example.com', 8088, '<event/>', { createConnection, postWriteDelayMs: 2000 })
      await jest.advanceTimersByTimeAsync(0)

      expect(socket.written).toBe('<event/>')
      expect(socket.ended).toBe(false)

      await jest.advanceTimersByTimeAsync(2000)
      await pending

      expect(socket.ended).toBe(true)
    }
    finally {
      jest.useRealTimers()
    }
  })

  it('does not force-destroy the socket after a successful send', async () => {
    // A forced destroy() right after a successful end() can send a TCP
    // reset that races ahead of the server actually reading the bytes - a
    // real failure caught by a live OpenTAKServer smoke test, not a unit
    // test. Success should let the connection close out naturally instead.
    const socket = new FakeSocket()
    const createConnection = connectImmediately(socket)

    await sendCotEvent('tak.example.com', 8088, '<event/>', { createConnection, postWriteDelayMs: 0 })

    expect(socket.destroyed).toBe(false)
  })

  it('rejects when the socket emits an error', async () => {
    const socket = new FakeSocket()
    const createConnection = jest.fn(() => {
      setImmediate(() => socket.emit('error', new Error('connection refused')))
      return socket as any
    })

    await expect(sendCotEvent('tak.example.com', 8088, '<event/>', { createConnection, postWriteDelayMs: 0 }))
      .rejects.toThrow('connection refused')
    expect(socket.destroyed).toBe(true)
  })

  it('rejects if nothing happens before the timeout', async () => {
    const socket = new FakeSocket()
    const createConnection = jest.fn(() => socket as any)

    await expect(sendCotEvent('tak.example.com', 8088, '<event/>', { createConnection, timeoutMs: 5, postWriteDelayMs: 0 }))
      .rejects.toThrow(/timed out/)
  })

  it('only settles once - a stray error after a successful send is ignored', async () => {
    const socket = new FakeSocket()
    const createConnection = connectImmediately(socket)

    await sendCotEvent('tak.example.com', 8088, '<event/>', { createConnection, postWriteDelayMs: 0 })

    expect(() => socket.emit('error', new Error('late error, should be ignored'))).not.toThrow()
  })
})
