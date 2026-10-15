import net from 'net'

export type FakeClamd = {
  port: number
  command: () => string
  received: () => Buffer
  close: () => Promise<void>
}

const COMMAND = 'zINSTREAM\0'

// Minimal stand-in for clamd: reads the zINSTREAM command and its
// length-prefixed chunks, then replies with the given response once the
// zero-length terminating chunk arrives. A null response never replies.
export function startFakeClamd(response: string | null): Promise<FakeClamd> {
  let command = ''
  const chunks: Buffer[] = []
  const sockets = new Set<net.Socket>()

  const server = net.createServer((socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    socket.on('error', () => {})

    let buffered = Buffer.alloc(0)
    socket.on('data', (data: Buffer) => {
      buffered = Buffer.concat([buffered, data])
      if (!command) {
        if (buffered.length < COMMAND.length) return
        command = buffered.subarray(0, COMMAND.length).toString()
        buffered = buffered.subarray(COMMAND.length)
      }
      while (buffered.length >= 4) {
        const length = buffered.readUInt32BE(0)
        if (length === 0) {
          if (response !== null) socket.end(`${response}\0`)
          return
        }
        if (buffered.length < 4 + length) return
        chunks.push(buffered.subarray(4, 4 + length))
        buffered = buffered.subarray(4 + length)
      }
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        port: (server.address() as net.AddressInfo).port,
        command: () => command,
        received: () => Buffer.concat(chunks),
        close: () => new Promise<void>((done) => {
          sockets.forEach((socket) => socket.destroy())
          server.close(() => done())
        })
      })
    })
  })
}
