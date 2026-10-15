import net from 'net'
import { AttachmentHookOutcome } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.attachments'

const DEFAULT_TIMEOUT_MS = 15_000

export type ScanOptions = {
    host?: string
    port?: number
    timeoutMs?: number
    createConnection?: (options: { host: string, port: number }) => net.Socket
}

// Scan function
export function scan(inputStream: NodeJS.ReadableStream & { destroy: (error?: Error) => void }, options: ScanOptions = {}): Promise<AttachmentHookOutcome> {
  const {
    host = 'localhost',
    port = 3310,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    createConnection = net.createConnection,
  } = options

  return new Promise<AttachmentHookOutcome>((resolve) => {
    const socket = createConnection({ host, port })

    // Pause immediately, before wiring up any listeners, so the command is
    // always sent before any input bytes reach clamd, regardless of which
    // async operation (socket connect vs. stream read) happens to finish first.
    inputStream.pause()

    const responseChunks: Buffer[] = []
    let settled = false

    const timeout = setTimeout(() => finish(errorOutcome(new Error('scan timed out'))), timeoutMs)

    function finish(outcome: AttachmentHookOutcome) {
      if (settled) return
      settled = true
      clearTimeout(timeout) 
      inputStream.destroy()
      socket.destroy()
      resolve(outcome)
    }

    socket.on('error', (err: Error) => finish(errorOutcome(new Error(`socket error: ${err.message}`))))

    socket.on('connect', () => {
      socket.write('zINSTREAM\0')
      inputStream.resume()
    })

    inputStream.on('error', (err: Error) => finish(errorOutcome(new Error(`input stream error: ${err.message}`))))

    inputStream.on('data', (chunk: Buffer) => {
      // Each chunk is preceded by its own length as a 4-byte big-endian
      // unsigned integer, per the INSTREAM protocol.
      const lenPrefix = Buffer.alloc(4)
      lenPrefix.writeUInt32BE(chunk.length, 0)
      const stillHasRoom = socket.write(Buffer.concat([lenPrefix, chunk]))

      // Honor backpressure: pause reading more input until the socket
      // signals it has caught up.
      if (!stillHasRoom) {
        inputStream.pause()
        socket.once('drain', () => inputStream.resume())
      }
    })

    inputStream.on('end', () => {
      // A zero-length chunk tells clamd no more data is coming.
      socket.write(Buffer.alloc(4))
    })

    socket.on('data', (chunk: Buffer) => responseChunks.push(chunk))

    socket.on('end', () => {
      // clamd's reply to a z-prefixed command (like zINSTREAM) is
      // NUL-terminated, not newline-terminated - strip NUL bytes before
      // trimming whitespace.
      const response = Buffer.concat(responseChunks).toString().replace(/\0/g, '').trim()
      finish(parseResponse(response))
    })
  })
}

// clamd's INSTREAM reply is always "stream: <result>":
//   - "stream: OK" - clean
//   - "stream: <SignatureName> FOUND" - infected
//   - anything else is treated as an error rather than guessed at
function parseResponse(response: string): AttachmentHookOutcome {
  const match = /^stream:\s*(.*)$/.exec(response)
  if (!match) {
    return errorOutcome(new Error(`unrecognized clamd response: "${response}"`))
  }

  const result = match[1].trim()
  if (result === 'OK') {
    return { outcome: 'pass' }
  }

  const foundMatch = /^(.+) FOUND$/.exec(result)
  if (foundMatch) {
    return { outcome: 'reject', reason: foundMatch[1] }
  }

  return errorOutcome(new Error(`unrecognized clamd result: "${result}"`))
}

function errorOutcome(error: Error): AttachmentHookOutcome {
  return { outcome: 'error', error }
}