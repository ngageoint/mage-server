import { describe, it, before, after } from 'mocha'
import * as mongoTest from '../mongo.test'
import * as migration from '../../lib/migrations/031-saml-settings'
import { Db } from 'mongodb'
import { expect } from 'chai'

const collectionName = 'authenticationconfigurations'

describe('saml settings migration', function() {

  before(mongoTest.mongoTestBeforeAllHook())

  let db: Db
  before(function() {
    db = this.mongo?.conn.db!
  })

  after(mongoTest.mongoTestAfterAllHook())

  let migrateUp: () => Promise<void>
  let migrateDown: () => Promise<void>

  beforeEach(async function() {
    migrateUp = () => {
      return new Promise((resolve, reject) => {
        const done = (err?: any) => {
          if (err) {
            reject(err)
          }
          resolve()
        }
        migration.up.call({ db, log: () => {} }, done)
      })
    }
    migrateDown = () => {
      return new Promise((resolve, reject) => {
        const done = (err?: any) => {
          if (err) {
            reject(err)
          }
          resolve()
        }
        migration.down.call({ db, log: () => {} }, done)
      })
    }
  })

  afterEach(async function() {
    const col = db.collection(collectionName)
    await col.remove({})
  })

  it('has a migration id', function() {
    expect(migration.id).to.equal('saml-settings')
  })

  describe('migrate up', async function() {

    it('moves entries from options to settings', async function() {

      const col = db.collection(collectionName)
      const count = await col.count()

      expect(count).to.equal(0)

      const preDocs = [
        {
          type: 'saml',
          name: 'saml1',
          settings: {
            options: {
              entryPoint: 'https://saml1.idp.test/auth',
              idpIssuer: 'urn:saml1.idp.test',
              issuer: 'urn:mage:1',
              logoutUrl: 'https://saml1.idp.test/bye',
              requestIdExpirationPeriodMs: 120000,
            }
          }
        },
        {
          type: 'saml',
          name: 'saml2',
          settings: {
            options: {
              entryPoint: 'https://saml2.idp.test/auth',
              idpIssuer: 'urn:saml2.idp.test',
              issuer: 'urn:mage:2',
              logoutUrl: 'https://saml2.idp.test/bye',
              requestIdExpirationPeriodMs: 60000,
            }
          }
        },
        {
          type: 'saml',
          name: 'saml3',
          settings: {
            options: {
              entryPoint: 'https://saml3.idp.test/auth',
              idpIssuer: 'urn:saml3.idp.test',
              issuer: 'urn:mage:3',
              logoutUrl: 'https://saml3.idp.test/bye',
              requestIdExpirationPeriodMs: 75000,
            }
          }
        },
      ]
      const insertResult = await col.insertMany(preDocs)

      expect(insertResult.insertedCount).to.equal(3)

      await migrateUp()

      const postDocsByName = (await col.find().toArray()).reduce((byName, doc) => {
        return { ...byName, [doc.name]: doc }
      }, {} as { [name: string]: object })

      for (const preDoc of preDocs) {
        const postDoc = postDocsByName[preDoc.name]
        expect(postDoc).to.exist
        expect(postDoc.settings).to.exist
        expect(postDoc.settings.options).not.to.exist
        expect(postDoc.settings, `expected ${preDoc.name} settings to include migrated options`)
          .to.deep.include(preDoc.settings.options)
      }
    })

    it('does not overwrite settings values with option values', async function() {

      const preDoc = {
        type: 'saml',
        name: 'preserve settings',
        settings: {
          entryPoint: 'https://preserve.me/please',
          issuer: 'urn:mage:test',
          options: {
            entryPoint: 'https://do.not.use/poison',
            idpIssuer: 'urn:saml:idp:test'
          }
        }
      }
      const col = db.collection(collectionName)
      const insertResult = await col.insertOne(preDoc)

      expect(insertResult.insertedCount).to.equal(1)

      await migrateUp()

      const postDoc = await col.findOne({})

      expect(postDoc.settings).to.exist
      expect(postDoc.settings.options).not.to.exist
      expect(postDoc).to.deep.equal({
        _id: insertResult.insertedId,
        type: 'saml',
        name: 'preserve settings',
        settings: {
          entryPoint: 'https://preserve.me/please',
          issuer: 'urn:mage:test',
          idpIssuer: 'urn:saml:idp:test'
        }
      })
    })

    it('does not change non-saml configurations', async function() {

      const preDocs = [
        {
          type: 'not-saml',
          name: 'not saml 1',
          settings: {
            options: {
              entryPoint: 'https://saml1.idp.test/auth',
              idpIssuer: 'urn:saml1.idp.test',
              issuer: 'urn:mage:1',
              logoutUrl: 'https://saml1.idp.test/bye',
              requestIdExpirationPeriodMs: 120000,
            }
          }
        },
        {
          type: 'saml',
          name: 'saml2',
          settings: {
            options: {
              entryPoint: 'https://saml2.idp.test/auth',
              idpIssuer: 'urn:saml2.idp.test',
              issuer: 'urn:mage:2',
              logoutUrl: 'https://saml2.idp.test/bye',
              requestIdExpirationPeriodMs: 60000,
            }
          }
        },
      ]
      const col = db.collection(collectionName)
      const insertResult = await col.insertMany(preDocs)

      expect(insertResult.insertedCount).to.equal(2)

      await migrateUp()
      const postDocsByName = await col.find({}).toArray().then(postDocs => {
        return postDocs.reduce<{ [name: string]: any }>((byName, doc) => ({ ...byName, [doc.name]: doc }), {})
      })

      expect(Object.entries(postDocsByName).length).to.equal(2)
      expect(postDocsByName['not saml 1']).to.deep.equal({
        _id: insertResult.insertedIds[0],
        ...preDocs[0]
      })
      expect(postDocsByName['saml2']).to.deep.equal({
        _id: insertResult.insertedIds[1],
        type: 'saml',
        name: 'saml2',
        settings: {
          entryPoint: 'https://saml2.idp.test/auth',
          idpIssuer: 'urn:saml2.idp.test',
          issuer: 'urn:mage:2',
          logoutUrl: 'https://saml2.idp.test/bye',
          requestIdExpirationPeriodMs: 60000,
        }
      })
    })

    it('succeeds when there are no saml configurations', async function() {

      await migrateUp()

      const preDocs = [ 1, 2, 3 ].map(x => {
        return {
          type: `saml${x}`,
          name: `saml${x}`,
          settings: {
            options: {
              entryPoint: `https://${x}.not.saml`
            }
          }
        }
      })
      const col = db.collection(collectionName)
      const insertResult = await col.insertMany(preDocs)

      expect(insertResult.insertedCount).to.equal(3)

      await migrateUp()

      const postDocsByName = await col.find({}).toArray().then(postDocs => {
        return postDocs.reduce((byName, doc) => ({ ...byName, [doc.name]: doc }), {})
      })

      expect(Object.entries(postDocsByName).length).to.equal(3)
      for (const preDoc of preDocs) {
        expect(postDocsByName[preDoc.name], preDoc.name).to.deep.equal(preDoc)
      }
    })
  })

  describe('migrate down', function() {

    it('moves entry point and issuer settings back to options', async function() {

      const preDocs = [
        {
          type: 'saml',
          name: 'saml1',
          settings: {
            entryPoint: 'https://saml1.idp.test/auth',
            idpIssuer: 'urn:saml1.idp.test',
            issuer: 'urn:mage:1',
            logoutUrl: 'https://saml1.idp.test/bye',
            requestIdExpirationPeriodMs: 60000,
            cert: 'abc123def456'
          }
        },
        {
          type: 'not-saml',
          name: 'hands-off',
          settings: {
            setting1: 100,
            setting2: 'test',
            entryPoint: 'https://leave.it'
          }
        }
      ]
      const col = db.collection(collectionName)
      const insertResult = await col.insertMany(preDocs)

      expect(insertResult.insertedCount).to.equal(2)

      await migrateDown()

      const postDocsByName = await col.find({}).toArray().then(postDocs => {
        return Object.fromEntries(postDocs.map(x => [ x.name, x ]))
      })

      expect(Object.entries(postDocsByName).length).to.equal(2)
      expect(postDocsByName['saml1']).to.deep.equal({
        _id: insertResult.insertedIds[0],
        type: 'saml',
        name: 'saml1',
        settings: {
          options: {
            entryPoint: 'https://saml1.idp.test/auth',
            issuer: 'urn:mage:1',
          },
          idpIssuer: 'urn:saml1.idp.test',
          logoutUrl: 'https://saml1.idp.test/bye',
          requestIdExpirationPeriodMs: 60000,
          cert: 'abc123def456'
        }
      })
      expect(postDocsByName['hands-off']).to.deep.equal({
        _id: insertResult.insertedIds[1],
        ...preDocs[1]
      })
    })

    it('succeeds when there are no saml configurations', async function() {

      await migrateDown()

      const preDocs = [ 1, 2, 3 ].map(x => {
        return {
          type: `saml${x}`,
          name: `saml${x}`,
          settings: {
            entryPoint: `https://${x}.not.saml`
          }
        }
      })
      const col = db.collection(collectionName)
      const insertResult = await col.insertMany(preDocs)

      expect(insertResult.insertedCount).to.equal(3)

      await migrateDown()

      const postDocsByName = await col.find({}).toArray().then(postDocs => {
        return postDocs.reduce((byName, doc) => ({ ...byName, [doc.name]: doc }), {})
      })

      expect(Object.entries(postDocsByName).length).to.equal(3)
      for (const preDoc of preDocs) {
        expect(postDocsByName[preDoc.name], preDoc.name).to.deep.equal(preDoc)
      }
    })
  })
})