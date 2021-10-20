import mongoose from 'mongoose'
import { runDatabaseMigrations } from '../lib/migrate'
import { waitForDefaultMongooseConnection } from '../lib/adapters/adapters.db.mongoose'
import { mongoTestBeforeAllHook, mongoTestAfterAllHook } from './mongo.test'

/**
 * TODO: this should probably be an integration test
 * TODO: this test is probably obsolete now with running the migrations in init.test.ts
 */
describe('migration runner', function() {

  // before(mongoTestBeforeAllHook())

  // beforeEach('wait for mongoose', async function() {
  //   waitForDefaultMongooseConnection(this.mongo?.uri!, 1000, 1000, {
  //     useMongoClient: true
  //   })
  // })

  // after(function() {
  //   mongoose.connection.close()
  // })
  // after(mongoTestAfterAllHook())

  // it('runs the migrations successfully', async function() {

  //   await runDatabaseMigrations(this.mongo?.uri!, {})
  //   console.log('finished')
  // }).timeout(10000)
})