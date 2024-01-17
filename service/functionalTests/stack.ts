import fs from 'fs'
import path from 'path'
import util from 'util'
import { MongoMemoryServer } from 'mongodb-memory-server'
import * as MageApp from '@ngageoint/mage.service/lib/app'
import { AddressInfo } from 'net'
import uniqid from 'uniqid'

const scratchDirPath = path.join(__dirname, 'scratch')

async function startMongoDB(baseDirPath: string): Promise<MongoMemoryServer> {
  const dbPath = path.join(baseDirPath, 'mongodb')
  return await MongoMemoryServer.create({
    instance: { dbPath }
  })
}

async function startMageServer(baseDirPath: string, mongo: MongoMemoryServer): Promise<MageApp.MageService> {
  const appDataPath = path.join(baseDirPath, 'mage')
  const dbUri = mongo.getUri('mage_test')
  const envConfig = {
    MAGE_ADDRESS: '127.0.0.1',
    MAGE_PORT: '0', // random available port
    MAGE_ATTACHMENT_DIR: path.join(appDataPath, 'attachments'),
    MAGE_EXPORT_DIR: path.join(appDataPath, 'export'),
    MAGE_ICON_DIR: path.join(appDataPath, 'icons'),
    MAGE_LAYER_DIR: path.join(appDataPath, 'layers'),
    MAGE_MONGO_URL: dbUri,
    MAGE_SECURITY_DIR: path.join(appDataPath, 'security'),
    MAGE_TEMP_DIR: path.join(appDataPath, 'temp'),
    MAGE_USER_DIR: path.join(appDataPath, 'users'),
  }
  Object.assign(process.env, envConfig)
  return await MageApp.boot({
    plugins: {}
  })
}

export interface TestStack {
  readonly name: string
  readonly baseDirPath: string
  readonly mongo: MongoMemoryServer
  readonly mage: MageApp.MageService
  readonly mageUrl: string
  destroy(): Promise<void>
}

/**
 * Initialize a test stack with the given name.  If the given name is empty,
 * or not present, the test stack will have a generated unique name.  The
 * resulting test stack is a running `MongoMemoryServer` and MAGE HTTP service.
 * The service does not include the web app package.
 */
export async function createTestStack(name?: string): Promise<TestStack> {
  name = String(name || '').trim()
  if (name.length === 0) {
    name = uniqid()
  }
  const baseDirPath = path.join(scratchDirPath, name)
  const mongo = await startMongoDB(baseDirPath)
  const mage = await startMageServer(baseDirPath, mongo)
  const addr = mage.server.address() as AddressInfo
  return Object.freeze({
    name,
    baseDirPath,
    mongo,
    mage,
    get mageUrl(): string { return `http://127.0.0.1:${addr.port}` },
    async destroy(): Promise<void> {
      console.info('stopping mage service')
      await util.promisify(mage.server.close).bind(mage.server)()
      console.info('stopping mongodb')
      await mongo.stop()
      console.info('removing mongodb data')
      await mongo.cleanup()
      console.info(`destroyed test stack ${name}`)
    }
  })
}