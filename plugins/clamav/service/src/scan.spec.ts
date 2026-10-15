import net from 'net'
import { Readable } from 'stream'
import { scan } from './scan'
import { FakeClamd, startFakeClamd } from './fakeClamd.spec-helper'

describe('scan', () => {

  let clamd: FakeClamd | undefined

  afterEach(async () => {
    await clamd?.close()
    clamd = undefined
  })

  function input(...chunks: string[]) {
    return Readable.from(chunks.map((chunk) => Buffer.from(chunk)))
  }

  it('passes clean content and streams it using the INSTREAM protocol', async () => {
    clamd = await startFakeClamd('stream: OK')

    const outcome = await scan(input('hello ', 'world'), { host: '127.0.0.1', port: clamd.port })

    expect(outcome).toEqual({ outcome: 'pass' })
    expect(clamd.command()).toEqual('zINSTREAM\0')
    expect(clamd.received().toString()).toEqual('hello world')
  })

  it('rejects infected content with the signature as the reason', async () => {
    clamd = await startFakeClamd('stream: Eicar-Test-Signature FOUND')

    const outcome = await scan(input('X5O!P%@AP'), { host: '127.0.0.1', port: clamd.port })

    expect(outcome).toEqual({ outcome: 'reject', reason: 'Eicar-Test-Signature' })
  })

  it('errors on an unrecognized clamd response', async () => {
    clamd = await startFakeClamd('INSTREAM size limit exceeded. ERROR')

    const outcome = await scan(input('content'), { host: '127.0.0.1', port: clamd.port })

    expect(outcome.outcome).toEqual('error')
    if (outcome.outcome === 'error') {
      expect(outcome.error.message).toContain('unrecognized clamd response')
    }
  })

  it('errors when the connection to clamd fails', async () => {
    const createConnection = () => {
      const socket = new net.Socket()
      process.nextTick(() => socket.emit('error', new Error('connect ECONNREFUSED')))
      return socket
    }

    const outcome = await scan(input('content'), { createConnection })

    expect(outcome.outcome).toEqual('error')
    if (outcome.outcome === 'error') {
      expect(outcome.error.message).toEqual('socket error: connect ECONNREFUSED')
    }
  })

  it('errors when clamd does not respond before the timeout', async () => {
    clamd = await startFakeClamd(null)

    const outcome = await scan(input('content'), { host: '127.0.0.1', port: clamd.port, timeoutMs: 50 })

    expect(outcome.outcome).toEqual('error')
    if (outcome.outcome === 'error') {
      expect(outcome.error.message).toEqual('scan timed out')
    }
  })
})
