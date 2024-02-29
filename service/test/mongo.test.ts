
import mongoose from 'mongoose'
import Mocha from 'mocha'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoMemoryServerOpts } from 'mongodb-memory-server-core/lib/MongoMemoryServer'


declare module 'mocha' {
  interface Context {
    mongo: MongoTestContext | undefined
  }
}

export interface MongoTestContext {
  readonly server: MongoMemoryServer
  readonly uri: string
  readonly conn: mongoose.Connection
}

/**
 * Return a function that the caller can pass to Mocha's `before()` function
 * to setup an in-memory MongoDB database for a test suite.
 * Example:
 * ```
 * describe('tests that interact with the database', function() {
 *
 *   before(mongoTestBeforeAllHook())
 *
 *   it('does something with the database', function() {
 *     const dbContext = this.mongo as MongoTestContext
 *     stuffCount = await dbContext.conn.collection('stuff').count()
 *     expect(stuffCount).to.equal(12)
 *   })
 * })
 * ```
 */
export function mongoTestBeforeAllHook(opts?: MongoMemoryServerOpts): () => Promise<void> {
  async function setupMongoServer(this: Mocha.Context) {
    this.timeout(300000)
    const server = await MongoMemoryServer.create(opts)
    const uri = server.getUri()
    const conn = await mongoose.createConnection(uri, {
      useMongoClient: true,
      promiseLibrary: Promise
    })
    this.mongo = { server, uri, conn }
  }
  return setupMongoServer
}

/**
 * Return a function that the caller can pass to Mocha's `after()` function to
 * tear down the in-memory MongoDB database for the current Mocha context.
 * Example:
 * ```
 * describe('tests that interact with the database', function() {
 *   before(mongoTestBeforeAllHook())
 *   // ... tests ...
 *   after(mongoTestAfterAllHook()) // stop the database
 * })
 * ```
 */
export function mongoTestAfterAllHook(): () => Promise<void> {
  return async function destroyMongoServer(this: Mocha.Context) {
    if (!this.mongo) {
      return
    }
    await this.mongo.conn.close()
    const stopped = await this.mongo.server.stop()
    if (!stopped) {
      throw new Error('failed to stop server')
    }
  }
}
