import child_process from 'child_process'
import fs from 'fs'
import path from 'path'
import util from 'util'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { AddressInfo } from 'net'
import uniqid from 'uniqid'
import { MageService } from '../lib/app'

const scratchDirPath = path.resolve(__dirname, '..', 'scratch', 'functionalTests')

async function startMongoDB(baseDirPath: string): Promise<MongoMemoryServer> {
  const dbPath = path.join(baseDirPath, 'mongodb')
  fs.mkdirSync(dbPath, { recursive: true })
  return await MongoMemoryServer.create({
    instance: { dbPath }
  })
}

async function startMageServer(baseDirPath: string, mongo: MongoMemoryServer): Promise<{ service: MageService, appDataPath: string }> {
  const appDataPath = path.join(baseDirPath, 'mage')
  fs.mkdirSync(appDataPath, { recursive: true })
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
  const MageApp = await import('../lib/app')
  const service = await MageApp.boot({
    plugins: {}
  })
  return new Promise((resolve, reject) => {
    service.open().webController.on(MageApp.MageReadyEvent, () => {
      resolve({
        service,
        appDataPath
      })
    })
  })
}

enum ProcMessage {
  ChildStackStart = 'ChildStackStart',
  StopChild = 'StopChild',
}

interface ProcMessageBody {
  mageMessage?:
    | { [ProcMessage.ChildStackStart]?: TestStack }
    | ProcMessage.StopChild
}

async function startLocalProcessStack(name: string): Promise<LocalProcessTestStack> {
  const baseDirPath = path.join(scratchDirPath, name)
  fs.mkdirSync(baseDirPath, { recursive: true })
  const mongo = await startMongoDB(baseDirPath)
  const mage = await startMageServer(baseDirPath, mongo)
  const mageService = mage.service
  const addr = mageService.server.address() as AddressInfo
  const mageUrl = `http://127.0.0.1:${addr.port}`
  const stack: TestStack = Object.freeze({
    name,
    baseDirPath,
    mongoDBPath: mongo.instanceInfo!.dbPath,
    appDataPath: mage.appDataPath,
    mageUrl
  })
  const localStack: LocalProcessTestStack = Object.freeze({
    ...stack,
    mongo,
    mage: mage.service,
    async stop(): Promise<void> {
      console.info('stopping mage service')
      await util.promisify(mageService.server.close).bind(mageService.server)()
      console.info('stopping mongodb')
      await mongo.stop({ doCleanup: true })
      console.info(`destroyed test stack ${name}`)
    }
  }) as LocalProcessTestStack
  process.on('message', (message: ProcMessageBody) => {
    const { mageMessage } = message
    if (!mageMessage) {
      return
    }
    if (mageMessage === ProcMessage.StopChild) {
      console.info('stopping test stack child process')
      localStack.stop().then(() => {
        process.disconnect()
        process.exit(0)
      })
    }
  })
  if (typeof process.send === 'function') {
    process.send({ mageMessage: { [ProcMessage.ChildStackStart]: stack } })
  }
  return localStack
}

export interface TestStack {
  readonly name: string
  readonly baseDirPath: string
  readonly mongoDBPath: string
  readonly appDataPath: string
  readonly mageUrl: string
}

export interface ChildProcessTestStackRef extends TestStack {
  stop(): Promise<void>
}

interface LocalProcessTestStack extends TestStack {
  stop(): Promise<void>
}

/**
 * Launch a test stack with the given name.  If the given name is empty,
 * or not present, the test stack will have a generated unique name.  The
 * resulting test stack is a child process running a `MongoMemoryServer` and a
 * MAGE HTTP service.  The MAGE service does not include the web app package.
 */
export function launchTestStack(name?: string): Promise<ChildProcessTestStackRef> {
  name = String(name || '').trim()
  if (name.length === 0) {
    name = uniqid()
  }
  return new Promise<ChildProcessTestStackRef>((resolve, reject) => {
    console.info('forking child stack', name, __filename)
    const child = child_process.fork(__filename, [ `mage:stack_name=${name}` ], { cwd: process.cwd() } )
    child.on('message', (message: ProcMessageBody, sendHandle: any) => {
      const { mageMessage } = message
      console.info('child message:', message)
      if (typeof mageMessage === 'object' && mageMessage[ProcMessage.ChildStackStart]) {
        const stackInfo = mageMessage[ProcMessage.ChildStackStart] as TestStack
        const stackRef: ChildProcessTestStackRef = {
          ...stackInfo,
          async stop(): Promise<void> {
            child.send({ mageMessage: ProcMessage.StopChild })
          }
        }
        resolve(stackRef)
      }
    })
    console.info('forked child stack process with pid', child.pid)
  })
}

const arg = String(process.argv[2])
const argItems = arg.split('=')
console.log('args:', process.argv)
if (argItems[0] === 'mage:stack_name') {
  const stackName = argItems[1]
  console.info('starting stack', stackName)
  startLocalProcessStack(stackName)
}
