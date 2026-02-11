import { Readable, PassThrough } from 'stream'
import net from 'net'

const CLAMAV_HOST = process.env.CLAMAV_HOST || 'localhost'
const CLAMAV_PORT = Number(process.env.CLAMAV_PORT) || 3310
const CLAMAV_TIMEOUT_MS = 60_000

export async function scanAttachmentWithClamAV(
  inputStream: Readable
): Promise<Readable> {

  return new Promise((resolve, reject) => {
    let settled = false
    const writeQueue: Buffer[] = []

    const tee = new PassThrough()
    const gatedStream = new PassThrough()
    gatedStream.pause()

    const clam = net.createConnection({ host: CLAMAV_HOST, port: CLAMAV_PORT })

    const fail = (err: Error): void => {
      if (settled) return
      settled = true
      inputStream.destroy(err)
      tee.destroy(err)
      gatedStream.destroy(err)
      clam.destroy()
      reject(err)
    }

    // pipe input into tee
    inputStream.pipe(tee)
    inputStream.on('error', (err) => fail(new Error(`Input stream error: ${err.message}`)))
    tee.on('error', (err) => fail(new Error(`Tee stream error: ${err.message}`)))

    let clamReady = false

    clam.on('connect', () => {
      clamReady = true
      clam.write('zINSTREAM\0')

      // flush queued chunks
      for (const chunk of writeQueue) {
        const size = Buffer.alloc(4)
        size.writeUInt32BE(chunk.length, 0)
        clam.write(size)
        clam.write(chunk)
      }
      writeQueue.length = 0
    })

    clam.on('error', (err) => fail(new Error(`Failed to connect to ClamAV: ${err.message}`)))

    // send chunks to ClamAV
    tee.on('data', (chunk: Buffer) => {
      if (settled) return
      if (clamReady) {
        const size = Buffer.alloc(4)
        size.writeUInt32BE(chunk.length, 0)
        clam.write(size)
        clam.write(chunk)
      } else {
        writeQueue.push(chunk)
      }
    })

    // Only end ClamAV after all data sent
    tee.on('end', () => {
      if (settled) return
      if (clamReady) {
        const zero = Buffer.alloc(4)
        zero.writeUInt32BE(0, 0)
        clam.write(zero)
        clam.end()
      } else {
        const checkReady = setInterval(() => {
          if (clamReady) {
            clearInterval(checkReady)
            const zero = Buffer.alloc(4)
            zero.writeUInt32BE(0, 0)
            clam.write(zero)
            clam.end()
          }
        }, 10)
      }
    })

    // collect ClamAV response
    let response = ''
    clam.on('data', (chunk) => {
      const chunkStr = chunk.toString()
      response += chunkStr
    })

    clam.on('end', () => {
      if (settled) return


      if (response.includes('OK')) {
        settled = true
        tee.pipe(gatedStream)
        gatedStream.resume()
        resolve(gatedStream)
        return
      }

      if (response.includes('FOUND')) {
        fail(new Error('ClamAV detected a virus in uploaded file'))
        return
      }

      fail(new Error(`ClamAV scan failed: ${response.trim()}`))
    })

    // timeout
    const timeout = setTimeout(() => fail(new Error('ClamAV scan timed out')), CLAMAV_TIMEOUT_MS)
    const clearTimers = (): void => clearTimeout(timeout)
    clam.on('end', clearTimers)
    clam.on('error', clearTimers)

  })
}
