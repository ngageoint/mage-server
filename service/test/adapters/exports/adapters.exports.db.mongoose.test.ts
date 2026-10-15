import { expect } from 'chai'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { ExportDocument, ExportModel, MongooseExportsRepository } from '../../../lib/adapters/exports/adapters.exports.db.mongoose'
import { Export, ExportCreateAttrs, ExportStatus } from '../../../lib/entities/exports/entities.exports'
import { UserDocument } from '../../../lib/adapters/users/adapters.users.db.mongoose'
import { MageEventDocument } from '../../../lib/adapters/events/adapters.events.db.mongoose'

describe('exports mongoose repository', function() {

  let mongo: MongoMemoryServer
  let uri: string
  let conn: mongoose.Connection
  let userModel: mongoose.Model<UserDocument>
  let eventModel: mongoose.Model<MageEventDocument>
  let exportModel: ExportModel
  let exportRepository: MongooseExportsRepository

  before(async function() {
    mongo = await MongoMemoryServer.create()
    uri = mongo.getUri()
  })

  beforeEach(async function() {
    conn = await mongoose.createConnection(uri).asPromise()

    userModel = conn.model('User', new mongoose.Schema({
      username: { type: String },
      displayName: { type: String },
      extra: { type: String, default: 'omit me'}
    })) as any

    eventModel = conn.model('Event', new mongoose.Schema({
      _id: { type: Number },
      name: { type: String }
    })) as any

    exportModel = ExportModel(conn, 'test_exports')
    exportRepository = new MongooseExportsRepository(exportModel, 5 * 60 * 1000)
  })

  afterEach(async function() {
    await exportModel.deleteMany({})
    await userModel.deleteMany({})
    await eventModel.deleteMany({})
    await conn.close()
  })

  after(async function() {
    await mongo.stop()
  })

  describe('creating exports', function() {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      username: 'user1'
    }

    const event = {
      _id: 1,
      name: 'event1'
    }

    const exp: ExportCreateAttrs = {
      userId: user._id.toHexString(),
      eventId: 1,
      format: "kml",
      filter: {
        exportObservations: true,
        favorites: false,
        important: false,
        includeAttachments: false,
        exportLocations: true
      },
      projection: [ ],
      relativePath: '/some/path',
      filename: 'export.zip'
     }

    beforeEach('create exports', async function () {
      await userModel.insertMany(user)
      await eventModel.insertMany(event)
    })

    it('create export for user', async function() {
      const created = await exportRepository.createExport(exp)
      expect(created).to.be.an('object')
      expect(created).to.nested.include({
        exportType: 'kml',
        status: ExportStatus.Running,
        relativePath: exp.relativePath,
        filename: exp.filename,
        'user.username': 'user1',
        'options.event.name': 'event1',
        'options.event.id': 1
      })
      expect(created.options.filter).to.deep.equal(exp.filter)
      expect(created.options.projection).to.deep.equal(exp.projection)
    })
  })

  describe('finding exports', function() {
      const user1 = {
        _id: new mongoose.Types.ObjectId(),
        username: 'user1',
        displayName: 'User 1',
      }

      const user2 = {
        _id: new mongoose.Types.ObjectId(),
        username: 'user1'
      }

      const eventId = 1
      const event = {
        _id: eventId,
        name: 'event1'
      }

      const exports: ExportDocument[] = [{
        _id: new mongoose.Types.ObjectId(),
        userId: user1._id,
        relativePath: 'test/path',
        processingErrors: [],
        filename: 'export',
        exportType: 'kml',
        status: ExportStatus.Completed,
        options: {
          eventId: 1,
          filter: {
			      exportObservations: true,
			      favorites: false,
			      important: false,
			      includeAttachments: false,
			      exportLocations: true
		      },
		      projection: [ ]
        },
        expirationDate: new Date(),
        summary: {
          observations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          },
          locations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          }
        },
        lastUpdated: new Date()
      },{
        _id: new mongoose.Types.ObjectId(),
        userId: user2._id,
        relativePath: 'test/path',
        filename: 'export',
        exportType: 'kml',
        status: ExportStatus.Completed,
        options: {
          eventId: 2
        },
        expirationDate: new Date(),
        summary: {
          observations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          },
          locations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          }
        },
        lastUpdated: new Date()
      }]

    beforeEach('create exports', async function () {
      await userModel.insertMany(user1)
      await eventModel.insertMany(event)
      await exportModel.insertMany(exports)
    })

    it('finds exports by user and populates user and event', async function() {
      const fetched = await exportRepository.getExportsForUser(exports[0].userId.toHexString())
      expect(fetched).to.be.an('array')
      expect(fetched).to.be.an('array').with.length(1)
      expect(fetched[0]).to.deep.include({
        id: exports[0]._id.toHexString(),
        userId: user1._id.toHexString(),
        user: {
          id: user1._id.toHexString(),
          username: 'user1',
          displayName: 'User 1',
        },
        options: {
          eventId: 1,
          event: {
            id: 1,
            name: 'event1'
          },
          filter: exports[0].options.filter,
          projection: exports[0].options.projection,
        }
      })
    })

    it('finds export by user and populates user and event', async function() {
      const fetched = await exportRepository.getExportForUser(exports[0]._id.toHexString(), exports[0].userId.toHexString())
      expect(fetched).to.be.an('object')
      expect(fetched).to.nested.include({
        id: exports[0]._id.toHexString(),
        'user.username': 'user1',
        'options.event.name': 'event1'
      })
    })

    it('finds exports by user without populating missing user and missing event', async function() {
      const fetched = await exportRepository.getExportsForUser(user2._id.toHexString())
      expect(fetched).to.be.an('array')
      expect(fetched).to.be.an('array').with.length(1)
      expect(fetched[0]).to.nested.include({
        id: exports[1]._id.toHexString(),
        userId: user2._id.toHexString(),
        user: null,
        'options.eventId': 2,
        'options.event': null,
      })
    })
  })

  describe('updating exports', function() {
      const user1 = {
        _id: new mongoose.Types.ObjectId(),
        username: 'user1'
      }

      const user2 = {
        _id: new mongoose.Types.ObjectId(),
        username: 'user1'
      }

      const eventId = 1
      const event = {
        _id: eventId,
        name: 'event1'
      }

      const exports = [{
        _id: new mongoose.Types.ObjectId(),
        userId: user1._id,
        relativePath: 'test/path',
        processingErrors: [],
        filename: 'export',
        exportType: 'kml',
        status: ExportStatus.Completed,
        options: {
          eventId: 1,
          filter: {
			      eventId: 3,
			      exportObservations: true,
			      favorites: false,
			      important: false,
			      attachments: false,
			      exportLocations: true
		      },
		      projection: [ ]
        },
        expirationDate: new Date(),
        summary: {
          observations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          },
          locations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          }
        }
      },{
        _id: new mongoose.Types.ObjectId(),
        userId: user2._id,
        relativePath: 'test/path',
        filename: 'export',
        exportType: 'kml',
        status: ExportStatus.Completed,
        options: {
          eventId: 2
        },
        expirationDate: new Date(),
        summary: {
          observations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          },
          locations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          }
        }
      }]

    beforeEach('create exports', async function () {
      await userModel.insertMany(user1)
      await eventModel.insertMany(event)
      await exportModel.insertMany(exports)
    })

    it('updates export', async function() {
      const update: Partial<Export> = {
        status: ExportStatus.Failed
      }
      const updated = await exportRepository.updateExport(exports[0]._id.toHexString(), update)
      expect(updated).to.be.an('object')
      expect(updated).to.nested.include({
        status: update.status
      })
    })

    it('updates export for user', async function() {
      const update: Partial<Export> = {
        status: ExportStatus.Failed
      }
      const updated = await exportRepository.updateExportForUser(exports[0]._id.toHexString(), exports[0].userId.toHexString(), update)
      expect(updated).to.be.an('object')
      expect(updated).to.nested.include({
        status: update.status
      })
    })

    it('fail to update export when not created by user', async function() {
      const update: Partial<Export> = {
        status: ExportStatus.Failed
      }
      const updated = await exportRepository.updateExportForUser(exports[0]._id.toHexString(), exports[1].userId.toHexString(), update)
      expect(updated).to.be.null
    })

    it('fail to update export when it does not exist', async function() {
      const updated = await exportRepository.updateExport(new mongoose.Types.ObjectId().toHexString(), {})
      expect(updated).to.be.null
    })
  })

  describe('deleting exports', function() {
      const user1 = {
        _id: new mongoose.Types.ObjectId(),
        username: 'user1'
      }

      const user2 = {
        _id: new mongoose.Types.ObjectId(),
        username: 'user1'
      }

      const eventId = 1
      const event = {
        _id: eventId,
        name: 'event1'
      }

      const exports = [{
        _id: new mongoose.Types.ObjectId(),
        userId: user1._id,
        relativePath: 'test/path',
        processingErrors: [],
        filename: 'export',
        exportType: 'kml',
        status: ExportStatus.Completed,
        options: {
          eventId: 1,
          filter: {
			      eventId: 3,
			      exportObservations: true,
			      favorites: false,
			      important: false,
			      attachments: false,
			      exportLocations: true
		      },
		      projection: [ ]
        },
        expirationDate: new Date(),
        summary: {
          observations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          },
          locations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          }
        }
      },{
        _id: new mongoose.Types.ObjectId(),
        userId: user2._id,
        relativePath: 'test/path',
        filename: 'export',
        exportType: 'kml',
        status: ExportStatus.Completed,
        options: {
          eventId: 2
        },
        expirationDate: new Date(),
        summary: {
          observations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          },
          locations: {
            count: 2,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          }
        }
      }]

    beforeEach('create exports', async function () {
      await userModel.insertMany(user1)
      await eventModel.insertMany(event)
      await exportModel.insertMany(exports)
    })

    it('deletes export', async function() {
      const fetched = await exportRepository.deleteExport(exports[0]._id.toHexString())
      expect(fetched).to.be.an('object')
      expect(fetched).to.nested.include({
        id: exports[0]._id.toHexString()
      })
    })

    it('deletes export for user', async function() {
      const fetched = await exportRepository.deleteExportForUser(exports[0]._id.toHexString(), exports[0].userId.toHexString())
      expect(fetched).to.be.an('object')
      expect(fetched).to.nested.include({
        id: exports[0]._id.toHexString()
      })
    })

    it('fail to delete export when not created by user', async function() {
      const fetched = await exportRepository.deleteExportForUser(exports[0]._id.toHexString(), exports[1].userId.toHexString())
      expect(fetched).to.be.null
    })

    it('fail to delete export when it does not exist', async function() {
      const fetched = await exportRepository.deleteExport(new mongoose.Types.ObjectId().toHexString())
      expect(fetched).to.be.null
    })
  })
})
