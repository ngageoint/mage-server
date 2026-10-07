import fs from 'fs'
import os from 'os'
import path from 'path'
import { Attachment } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import { clamavHook } from './clamHook'
import { FakeClamd, startFakeClamd } from './fakeClamd.spec-helper'

describe('clamavHook', () => {

  const attachment = { name: 'test.txt' } as Attachment
  let clamd: FakeClamd | undefined
  let tempDir: string
  let stagedFilePath: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mage-clamav-'))
    stagedFilePath = path.join(tempDir, 'staged')
    fs.writeFileSync(stagedFilePath, 'staged content')
  })

  afterEach(async () => {
    await clamd?.close()
    clamd = undefined
    delete process.env.MAGE_CLAMAV_HOST
    delete process.env.MAGE_CLAMAV_PORT
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  async function useClamd(response: string) {
    clamd = await startFakeClamd(response)
    process.env.MAGE_CLAMAV_HOST = '127.0.0.1'
    process.env.MAGE_CLAMAV_PORT = String(clamd.port)
  }

  it('scans the staged file and passes clean content', async () => {
    await useClamd('stream: OK')

    const outcome = await clamavHook(attachment, stagedFilePath)

    expect(outcome).toEqual({ outcome: 'pass' })
    expect(clamd?.received().toString()).toEqual('staged content')
  })

  it('rejects infected content with the attachment name and signature', async () => {
    await useClamd('stream: Eicar-Test-Signature FOUND')

    const outcome = await clamavHook(attachment, stagedFilePath)

    expect(outcome.outcome).toEqual('reject')
    if (outcome.outcome === 'reject') {
      expect(outcome.reason).toContain('test.txt')
      expect(outcome.reason).toContain('Eicar-Test-Signature')
    }
  })

  it('wraps scan errors', async () => {
    await useClamd('unexpected')

    const outcome = await clamavHook(attachment, stagedFilePath)

    expect(outcome.outcome).toEqual('error')
    if (outcome.outcome === 'error') {
      expect(outcome.error.message).toContain('Virus scan could not be completed')
      expect(outcome.error.cause).toBeInstanceOf(Error)
    }
  })
})
