import { Readable, PassThrough } from 'stream'
import { spawn } from 'child_process'

/**
 * Scan an uploaded attachment using ClamAV **before writing to disk**.
 * Streams bytes directly; no full-file buffering.
 * 
 * @param inputStream - Readable stream from Busboy
 * @returns Promise<Readable> - clean stream to pass to storage
 * @throws Error if virus detected or ClamAV fails
 */
export async function scanAttachmentWithClamAV(inputStream: Readable): Promise<Readable> {
  console.log('>>> CLAMAV SCAN STARTED <<<')

  return new Promise((resolve, reject) => {
    const clam = spawn('clamscan', ['--stdout', '--no-summary', '-'])

    // Clean PassThrough stream for downstream storage
    const cleanStream = new PassThrough()

    // Pipe input directly to ClamAV stdin
    inputStream.pipe(clam.stdin)

    // Pipe ClamAV stdout to clean stream
    clam.stdout.pipe(cleanStream)

    clam.on('close', (code) => {
      if (code === 0) {
        console.log('>>> CLAMAV SCAN CLEAN <<<')
        resolve(cleanStream)
      } else if (code === 1) {
        reject(new Error('ClamAV detected a virus in the uploaded file'))
      } else {
        reject(new Error(`ClamAV error (exit code ${code})`))
      }
    })

    clam.on('error', (err) => {
      reject(new Error(`Failed to start ClamAV: ${err.message}`))
    })

    // Ensure upstream errors kill ClamAV
    inputStream.on('error', (err) => {
      clam.kill()
      reject(err)
    })
  })
}
