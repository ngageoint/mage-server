import { Readable, PassThrough } from 'stream';
import net from 'net';

const CLAMAV_HOST = process.env.CLAMAV_HOST || 'localhost';
const CLAMAV_PORT = Number(process.env.CLAMAV_PORT) || 3310;
const CLAMAV_TIMEOUT_MS = 60_000;

export type AttachmentScanResult = {
  status: 'clean' | 'infected' | 'scan_error';
  error?: string;
};

// <-- FIXED: Only resolve, never reject, to avoid frontend hang
export async function scanAttachmentWithClamAV(
  inputStream: Readable
): Promise<AttachmentScanResult> {
  return new Promise((resolve) => {
    let settled = false;
    const writeQueue: Buffer[] = [];
    const tee = new PassThrough();
    const clam = net.createConnection({ host: CLAMAV_HOST, port: CLAMAV_PORT });

    const fail = (err: Error): void => {
      if (settled) return;
      settled = true;
      console.error('[CLAMAV] Scan failed:', err.message);
      inputStream.destroy(err);
      tee.destroy(err);
      clam.destroy();
      resolve({ status: 'scan_error', error: err.message });
    };

    inputStream.pipe(tee);
    inputStream.on('error', (err) => fail(new Error(`Input stream error: ${err.message}`)));
    tee.on('error', (err) => fail(new Error(`Tee stream error: ${err.message}`)));

    let clamReady = false;

    clam.on('connect', () => {
      clamReady = true;
      console.log('[CLAMAV] Connected, sending zINSTREAM command');
      clam.write('zINSTREAM\0');

      for (const chunk of writeQueue) {
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        clam.write(size);
        clam.write(chunk);
        console.log(`[CLAMAV] Sent queued chunk of ${chunk.length} bytes`);
      }
      writeQueue.length = 0;
    });

    clam.on('error', (err) => fail(new Error(`Failed to connect to ClamAV: ${err.message}`)));

    tee.on('data', (chunk: Buffer) => {
      if (settled) return;
      if (clamReady) {
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        clam.write(size);
        clam.write(chunk);
        console.log(`[CLAMAV] Sent chunk of ${chunk.length} bytes`);
      } else {
        writeQueue.push(chunk);
        console.log(`[CLAMAV] Queued chunk of ${chunk.length} bytes until connection ready`);
      }
    });

    const sendEndMarker = (): void => {
      if (settled) return;
      const zero = Buffer.alloc(4);
      zero.writeUInt32BE(0, 0);
      clam.write(zero);
      clam.end();
      console.log('[CLAMAV] Sent zero-length end marker');
    };

    tee.on('end', () => {
      if (settled) return;
      if (clamReady) sendEndMarker();
      else {
        const interval = setInterval(() => {
          if (clamReady) {
            clearInterval(interval);
            sendEndMarker();
          }
        }, 10);
      }
    });

    let response = '';
    clam.on('data', (chunk) => {
      response += chunk.toString();
    });

    clam.on('end', () => {
      if (settled) return;
      settled = true;
      console.log('[CLAMAV] Connection ended, response:', response.trim());

      if (response.includes('OK')) {
        return resolve({ status: 'clean' });
      }

      if (response.includes('FOUND')) {
        console.warn('[CLAMAV] Virus detected!');
        return resolve({
          status: 'infected',
          error: 'ClamAV detected a virus in uploaded file',
        });
      }

      console.error('[CLAMAV] Unexpected scan response');
      return resolve({
        status: 'scan_error',
        error: `ClamAV scan failed: ${response.trim()}`,
      });
    });

    const timeout = setTimeout(() => fail(new Error('ClamAV scan timed out')), CLAMAV_TIMEOUT_MS);
    const clearTimers = (): void => clearTimeout(timeout);
    clam.on('end', clearTimers);
    clam.on('error', clearTimers);
  });
}