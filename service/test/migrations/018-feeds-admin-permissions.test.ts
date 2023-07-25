import { describe, it, before, after } from 'mocha'
import * as mongoTest from '../mongo.test'
import * as migration from '../../lib/migrations/018-feeds-admin-permissions'
import { Db } from 'mongodb'
import { expect } from 'chai'

describe('feeds admin permissions migration', function() {

  const feedsPermissions = [
    'FEEDS_LIST_SERVICE_TYPES',
    'FEEDS_CREATE_SERVICE',
    'FEEDS_LIST_SERVICES',
    'FEEDS_LIST_TOPICS',
    'FEEDS_CREATE_FEED',
    'FEEDS_LIST_ALL',
    'FEEDS_FETCH_CONTENT'
  ]

  before(mongoTest.mongoTestBeforeAllHook())

  let db: Db
  before(function() {
    db = this.mongo?.conn.db!
  })

  after(mongoTest.mongoTestAfterAllHook())

  afterEach(async function() {
    const roles = db.collection('roles')
    await roles.remove({})
  })

  it('has a migration id', function() {
    expect(migration.id).to.equal('feeds-admin-permissions')
  })

  describe('migrate up', async function() {

    it('adds feeds permissions to the existing admin role', async function() {

      const roles = db.collection('roles')
      const count = await roles.count()

      expect(count).to.equal(0)

      const insert = await roles.insertOne({
        name: 'ADMIN_ROLE',
        permissions: [
          'CREATE_STUFF',
          'READ_STUFF',
          'UPDATE_STUFF',
          'DELETE_STUFF'
        ]
      })

      expect(insert.insertedCount).to.equal(1)

      await new Promise<void>((resolve, reject) => {
        const done = function(err?: any) {
          if (err) {
            reject(err)
          }
          resolve()
        }
        migration.up.call({ db, log: () => {} }, done)
      })

      const adminRole = await roles.findOne({ _id: insert.insertedId })

      expect(adminRole).to.deep.equal({
        _id: insert.insertedId,
        name: 'ADMIN_ROLE',
        permissions: [
          'CREATE_STUFF',
          'READ_STUFF',
          'UPDATE_STUFF',
          'DELETE_STUFF',
          ...feedsPermissions
        ]
      })
    })
  })

  describe('migrate down', function() {

    it('removes feeds permissions from admin role', async function() {

      const roles = db.collection('roles')
      const insert = await roles.insertOne({
        name: 'ADMIN_ROLE',
        permissions: [
          'CREATE_THINGS',
          'READ_THINGS',
          ...feedsPermissions,
          'UPDATE_THINGS',
          'DELETE_THINGS',
        ]
      })

      expect(insert.insertedCount).to.equal(1)

      await new Promise<void>((resolve, reject) => {
        const done = function(err?: any) {
          if (err) {
            reject(err)
          }
          resolve()
        }
        migration.down.call({ db, log: () => {} }, done)
      })

      const role = await roles.findOne({ _id: insert.insertedId })

      expect(role).to.deep.equal({
        _id: insert.insertedId,
        name: 'ADMIN_ROLE',
        permissions: [
          'CREATE_THINGS',
          'READ_THINGS',
          'UPDATE_THINGS',
          'DELETE_THINGS',
        ]
      })
    })
  })
})