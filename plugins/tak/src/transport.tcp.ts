import net from 'net'

export type CreateCotConnection = (options: { host: string, port: number }) => net.Socket

export interface SendCotEventOptions {
  timeoutMs?: number
  postWriteDelayMs?: number
  createConnection?: CreateCotConnection
}

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Some TAK server implementations (confirmed live against OpenTAKServer's
 * eud_handler) do real per-connection setup (e.g. opening their own
 * RabbitMQ connection) before their read loop starts. Ending the
 * connection immediately after writing can race ahead of that and the
 * server never sees the data at all. Holding the connection open briefly
 * after the write gives it time to actually read before we close.
 */
const DEFAULT_POST_WRITE_DELAY_MS = 2_000

/**
 * Writes a single CoT XML event to a TAK server's CoT TCP ingest port (e.g.
 * OpenTAKServer's eud_handler). Opens a short-lived connection per call -
 * pushes are occasional and user/event-triggered, not a continuous stream,
 * so there's no persistent socket worth managing.
 */
export function sendCotEvent(host: string, port: number, xml: string, options: SendCotEventOptions = {}): Promise<void> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    postWriteDelayMs = DEFAULT_POST_WRITE_DELAY_MS,
    createConnection = net.createConnection
  } = options

  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port })
    let settled = false

    const timeout = setTimeout(() => {
      finish(new Error(`timed out sending CoT event to ${host}:${port}`))
    }, timeoutMs)

    function finish(err?: Error): void {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      if (err) {
        // Only force-close on failure. On success, end()'s callback only
        // confirms the bytes were handed to the OS, not that the server
        // has read them yet - destroying here can send a TCP reset that
        // races ahead of the server's read and discards the write.
        socket.destroy()
        reject(err)
      }
      else {
        resolve()
      }
    }

    socket.on('error', (err) => finish(err))
    socket.on('connect', () => {
      socket.write(xml, (err) => {
        if (err) {
          finish(err)
          return
        }
        setTimeout(() => {
          socket.end(() => finish())
        }, postWriteDelayMs)
      })
    })
  })
}
