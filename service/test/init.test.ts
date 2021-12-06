
declare module 'mocha' {
  namespace Mocha {
    interface MochaOptions {}
  }
}


import chai, { Assertion } from 'chai'
import asPromised from 'chai-as-promised'

declare global {
  namespace Chai {
    interface Eventually {
      rejectWith: PromisedThrow
    }
  }
}

before(function() {
  chai.use(asPromised)
  const assertionProto = Assertion.prototype as any
  const rejectedWith = assertionProto.rejectedWith as Function
  Assertion.addMethod('rejectWith', function(...args: any[]): any {
    return rejectedWith.apply(this, args)
  })
})

import * as mongoSupport from './mongo.test'
import { waitForDefaultMongooseConnection } from '../lib/adapters/adapters.db.mongoose'
import { runDatabaseMigrations } from '../lib/migrate'
import mongoose from 'mongoose'

before('initialize default mongo database', mongoSupport.mongoTestBeforeAllHook({ instance: { dbName: 'mage_test_default' }}))
before('initialize default mongoose connection', async function() {
  await waitForDefaultMongooseConnection(mongoose, this.mongo!.uri, 1000, 1000, {
    useMongoClient: true,
    promiseLibrary: Promise
  })
  console.log('default mongoose connection open')
})
before('migrate default test db', async function() {
  this.timeout(10000)
  await runDatabaseMigrations(this.mongo!.uri)
})
after('close mongoose connection', async function() {
  await mongoose.disconnect()
})
after('destroy default mongo database', mongoSupport.mongoTestAfterAllHook())