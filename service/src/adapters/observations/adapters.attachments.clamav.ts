import { Readable, PassThrough } from 'stream'
import { spawn } from 'child_process'

/**
 * Takes a readable stream (Busboy file stream), scans it with ClamAV,
 * and returns a new readable stream of the same content if clean.
 * Throws an error if ClamAV finds a virus.
 *
 * Usage:
 * const cleanStream = await scanAttachmentWithClamAV(uploadStream)
 * cleanStream.pipe(storageStream)
 */
export async function scanAttachmentWithClamAV(inputStream: Readable): Promise<Readable> {
  return new Promise((resolve, reject) => {
    // Spawn ClamAV scan process: read from stdin, output to stdout, no summary
    const clam = spawn('clamscan', ['--stdout', '--no-summary', '-'])

    // Buffer to capture bytes from ClamAV stdout
    const chunks: Buffer[] = []
    
    // Pipe the uploaded file into ClamAV stdin
    inputStream.pipe(clam.stdin)

    // Collect ClamAV stdout into chunks (this is the same file content)
    clam.stdout.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk))
    })

    // Handle ClamAV process exit
    clam.on('close', (code) => {
      // Exit codes:
      // 0 = no virus, 1 = virus found, >1 = error
      if (code === 0) {
        // File is clean: create a new PassThrough stream with the buffered bytes
        const cleanStream = new PassThrough()
        cleanStream.end(Buffer.concat(chunks))
        resolve(cleanStream)
      } else if (code === 1) {
        reject(new Error('ClamAV detected a virus in the uploaded file'))
      } else {
        reject(new Error(`ClamAV error (exit code ${code})`))
      }
    })

    // Handle spawn errors
    clam.on('error', (err) => {
      reject(err)
    })

    // Safety: handle input stream errors
    inputStream.on('error', (err) => {
      reject(err)
      clam.kill()
    })
  })
}
