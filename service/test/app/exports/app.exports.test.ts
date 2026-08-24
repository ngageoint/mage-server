import { expect } from 'chai'
import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { pick } from 'lodash'
import * as api from '../../../lib/app.api/exports/app.api.exports'
import * as impl from '../../../lib/app.impl/exports/app.impl.exports'
import { EntityNotFoundError, ErrPermissionDenied, MageError, permissionDenied } from '../../../lib/app.api/app.api.errors'
import { AppRequest } from '../../../lib/app.api/app.api.global'
import { Export, ExportFormat, ExportsRepository, ExportStatus, ExportStore } from '../../../lib/entities/exports/entities.exports'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'
import { ExportPermission } from '../../../lib/entities/authorization/entities.permissions'
import { UserIconType } from '../../../lib/entities/users/entities.users'
import mongoose from 'mongoose'
import { ExportExpanded } from '../../../src/entities/exports/entities.exports'
import { RoleModelInstance } from '../../../src/models/role'
import { UserJson } from '../../../src/models/user'
import { Readable } from 'stream'
import sinon from 'sinon'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { BufferWriteable } from '../../utils'
import { Stats } from 'fs'
import { MongooseExportsRepository } from '../../../lib/adapters/exports/adapters.exports.db.mongoose'
import { FileSystemExportContentStore } from '../../../lib/adapters/exports/adapters.export_store.file_system'

const mockUserId = new mongoose.Types.ObjectId()
const mockUser = Object.freeze({
  _id: mockUserId,
  id: mockUserId.toHexString(),
  username: 'testUser',
  displayName: 'Test User',
  roleId: {
    _id: new mongoose.Types.ObjectId(),
    get id() { return this._id.toHexString() },
    permissions: [ExportPermission.READ_EXPORT]
  } as RoleModelInstance,
}) as unknown as Required<UserWithRole>
const expandedUser: ExportExpanded['user'] = pick(mockUser, 'id', 'username', 'displayName')

function requestBy<T extends object>(principal: UserWithRole, params?: T): AppRequest<UserWithRole> & T {
  if (!params) {
    params = {} as T
  }
  return {
    ...params,
    context: {
      requestToken: Symbol(),
      requestingPrincipal: () => principal,
      locale() { return null }
    }
  }
}

describe('export use case interactions', function() {

  let permissions: SubstituteOf<api.ExportAppLayerPermissionService>
  let repository: SubstituteOf<ExportsRepository>
  let store: SubstituteOf<ExportStore>

  beforeEach(function() {
    permissions = Sub.for<api.ExportAppLayerPermissionService>()
    repository = Sub.for<ExportsRepository>()
    store = Sub.for<ExportStore>()
  })

  describe('getting exports', function() {

    let getExports: api.GetExports
    let getExportContent: api.GetExportContent

    beforeEach(function() {
      getExports = impl.FetchExports(repository, permissions)
      getExportContent = impl.GetExportContent(repository, store, permissions)
    })

    it('checks permission for getting exports', async function() {
      const req: api.GetExportsRequest = requestBy(mockUser)
      permissions.ensureGetMyExportPermission(Arg.requestTokenMatches(req.context))
        .resolves(permissionDenied('get exports', req.context.requestingPrincipal().username))
      const res = await getExports(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      permissions.received(1).ensureGetMyExportPermission(Arg.requestTokenMatches(req.context))
      repository.didNotReceive().getExportsForUser(Arg.any())
    })

    it('gets exports', async function() {
      const exp: ExportExpanded = {
        id: '1',
        userId: mockUser.id,
        user: expandedUser,
        relativePath: 'some/path',
        filename: 'export',
        exportType: 'csv',
        status: ExportStatus.Completed,
        options: {
          eventId: 1,
          event: { id: 1, name: 'Test 1'},
          filter: undefined,
          projection: undefined
        },
        processingErrors: [],
        expirationDate: new Date(),
        summary: {
          observations: {
            count: 0,
            startTimestamp: new Date(),
            endTimestamp: new Date(),
          },
          locations: {
            count: 0,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          }
        },
        lastUpdated: new Date()
      }

      const req: api.GetExportsRequest = requestBy(mockUser)
      permissions.ensureGetMyExportPermission(req.context).resolves(null)
      repository.getExportsForUser(mockUser.id).resolves([exp])

      const res = await getExports(req)

      expect(res.error).to.be.null
      expect(res.success).to.be.an('array').with.length(1)
      expect(res.success![0]).to.equal(exp)
    })

    it('gets export content', async function() {

      const exp: ExportExpanded = {
        id: '1',
        userId: mockUser.id,
        user: expandedUser,
        relativePath: 'some/path',
        filename: 'export',
        exportType: 'csv',
        status: ExportStatus.Completed,
        options: {
          eventId: 1,
          event: { id: 1, name: 'Event 1' },
          filter: undefined,
          projection: undefined
        },
        processingErrors: [],
        expirationDate: new Date(),
        summary: {},
        lastUpdated: new Date()
      }

      const bytesBuffer = Buffer.from('mage export')
      const bytes: NodeJS.ReadableStream = Readable.from(bytesBuffer)

      const req: api.GetExportContentRequest = requestBy(mockUser, { exportId: exp.id })
      permissions.ensureGetMyExportContentPermission(req.context).resolves(null)
      store.readContent(exp).resolves(bytes)

      repository.getExportForUser(exp.id, mockUser.id).resolves(exp)
      const res = await getExportContent(req)

      expect(res.error).to.be.null
      expect(res.success).to.be.an('object')
      expect(res.success).to.include({
        export: exp,
        bytes: bytes
      })
    })
  })

  describe('creating export', function() {
    let createExport: api.CreateExport
    let store: sinon.SinonStubbedInstance<ExportStore>
    let repository: sinon.SinonStubbedInstance<MongooseExportsRepository>
    let exportFactory: sinon.SinonStub<[ExportFormat], api.ExportTransform>

    beforeEach(function() {
      // Sinon stubs
      store = sinon.createStubInstance(FileSystemExportContentStore)
      repository = sinon.createStubInstance(MongooseExportsRepository)

      const csvExport: api.ExportTransform = { export: sinon.stub() }
      exportFactory = sinon.stub()
      exportFactory.withArgs('csv').returns(csvExport)

      createExport = impl.CreateExport(exportFactory, repository, store, permissions)
    })

    it('creates export', async function() {
      const event: MageEvent = { id: 0, name: 'Test Event' } as MageEvent
      const content = new BufferWriteable()
      const contentSize = 1000

      const exp: ExportExpanded = {
        id: '1',
        userId: mockUser.id,
        user: expandedUser,
        relativePath: 'some/path',
        filename: 'export',
        exportType: 'csv',
        status: ExportStatus.Completed,
        options: {
          eventId: 1,
          event: { id: 1, name: 'Test Event 1' },
          filter: undefined, projection: undefined },
        processingErrors: [],
        expirationDate: new Date(),
        summary: {},
        lastUpdated: new Date()
      }

      const req: api.CreateExportRequest = {
        context: {
          requestToken: Symbol(),
          requestingPrincipal: () => mockUser,
          locale: () => null,
          mageEvent: event
        },
        format: 'csv',
        filter: {
          exportObservations: true,
          exportLocations: true,
          startDate: new Date(),
          endDate: new Date(),
          favorites: false,
          important: false,
          includeAttachments: false
        },
        projection: undefined
      }

      const stats = new Stats()
      stats.size = contentSize
      permissions.ensureCreateExportPermission(req.context).resolves(null)
      repository.createExport.resolves(exp)
      store.writeContent.returns({ relativePath: 'test/path', content })
      store.contentStats.resolves(stats)

      let updateCount = 0
      let resolveUpdates!: () => void
      const updatesDone = new Promise<void>(resolve => { resolveUpdates = resolve })

      repository.updateExportForUser.callsFake(async (id, userId, patch) => {
        updateCount++
        if (updateCount === 2) resolveUpdates()
        return { ...exp, ...patch } as ExportExpanded
      })

      let resolveExport!: (value?: any) => void
      const exportPromise = new Promise(resolve => { resolveExport = resolve })
      const exportStub = sinon.stub().returns(exportPromise)
      exportFactory.withArgs("csv").returns({ export: exportStub })
      const response = await createExport(req)

      resolveExport({ observations: {}, locations: {} })
      await exportPromise
      await updatesDone

      expect(response.error).to.be.null
      expect(exportStub.calledOnce).to.be.true

      expect(repository.updateExportForUser.callCount).to.equal(2)

      const [id1, userId1, patch1] = repository.updateExportForUser.getCall(0).args
      expect(id1).to.equal(exp.id)
      expect(userId1).to.equal(mockUser.id)
      expect(patch1.status).to.equal(ExportStatus.Running)

      const [id2, userId2, patch2] = repository.updateExportForUser.getCall(1).args
      expect(id2).to.equal(exp.id)
      expect(userId2).to.equal(mockUser.id)
      expect(patch2.status).to.equal(ExportStatus.Completed)
      expect(patch2.size).to.equal(contentSize)
    })

    it('removes content from store and updates export on exception', async function() {
      const event: MageEvent = { id: 0, name: 'Test Event' } as MageEvent
      const content = new BufferWriteable()
      const contentSize = 1000

      const exp: ExportExpanded = {
        id: '1',
        userId: mockUser.id,
        user: expandedUser,
        relativePath: 'some/path',
        filename: 'export',
        exportType: 'csv',
        status: ExportStatus.Completed,
        options: {
          eventId: 1,
          event: { id: 1, name: 'Test Event 1' },
          filter: undefined,
          projection: undefined
        },
        processingErrors: [],
        expirationDate: new Date(),
        summary: {},
        lastUpdated: new Date()
      }

      const req: api.CreateExportRequest = {
        context: {
          requestToken: Symbol(),
          requestingPrincipal: () => mockUser,
          locale: () => null,
          mageEvent: event
        },
        format: 'csv',
        filter: {
          exportObservations: true,
          exportLocations: true,
          startDate: new Date(),
          endDate: new Date(),
          favorites: false,
          important: false,
          includeAttachments: false
        },
        projection: undefined
      }

      const stats = new Stats()
      stats.size = contentSize
      permissions.ensureCreateExportPermission(req.context).resolves(null)
      store.writeContent.returns({ relativePath: 'test/path', content })
      store.deleteContent.resolves()
      repository.createExport.resolves(exp)

      let updateCount = 0
      let resolveUpdates!: () => void
      const updatesDone = new Promise<void>(resolve => { resolveUpdates = resolve })
      repository.updateExportForUser.callsFake(async (_id, _userId, patch) => {
        updateCount++
        if (updateCount === 2) resolveUpdates()
        return { ...exp, ...patch } as ExportExpanded
      })

      const exportPromise = new Promise((_resolve, reject) => { reject("test error") })
      const exportStub = sinon.stub().returns(exportPromise)
      exportFactory.withArgs("csv").returns({ export: exportStub })

      await createExport(req)
      await expect(exportPromise).rejectedWith("test error")
      await updatesDone

      expect(store.deleteContent).to.have.been.called

      const [id1, userId1, patch1] = repository.updateExportForUser.getCall(0).args
      expect(id1).to.equal(exp.id)
      expect(userId1).to.equal(mockUser.id)
      expect(patch1.status).to.equal(ExportStatus.Running)

      const [id2, userId2, patch2] = repository.updateExportForUser.getCall(1).args
      expect(id2).to.equal(exp.id)
      expect(userId2).to.equal(mockUser.id)
      expect(patch2.status).to.equal(ExportStatus.Failed)
    })
  })

  describe('deleting export', function() {
    let deleteExport: api.DeleteExport

    beforeEach(function() {
      deleteExport = impl.DeleteExport(repository, store, permissions)
    })

    it('deletes export', async function() {
      const user: UserJson = {
        id: new mongoose.Types.ObjectId(),
        roleId: '',
        authenticationId: '',
        username: '',
        displayName: '',
        email: '',
        phones: [],
        icon: {
          type: UserIconType.Create,
          text: 'icon',
          color: 'red'
        },
        active: true,
        enabled: true,
        status: 'active',
        recentEventIds: [],
        createdAt: new Date(),
        lastUpdated: new Date()
      }

      const exp: Export = {
        id: '1',
        userId: mockUser.id,
        relativePath: 'some/path',
        filename: 'export',
        exportType: 'csv',
        status: ExportStatus.Completed,
        options: {
          eventId: 1,
          filter: undefined,
          projection: undefined
        },
        processingErrors: [],
        expirationDate: new Date(),
        summary: {
          observations: {
            count: 0,
            startTimestamp: new Date(),
            endTimestamp: new Date(),
          },
          locations: {
            count: 0,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          }
        },
        lastUpdated: new Date()
      }

      const req: api.DeleteExportRequest = requestBy(mockUser, { exportId: exp.id })
      permissions.ensureDeleteMyExportPermission(req.context).resolves(null)
      repository.deleteExportForUser(exp.id, mockUser.id).resolves(exp)
      store.deleteContent(exp).resolves()

      const res = await deleteExport(req)

      expect(res.error).to.be.null
      expect(res.success).to.be.an('object')
      expect(res.success).to.equal(exp)
      repository.received(1).deleteExportForUser(exp.id, mockUser.id)
    })

    it('fails to delete unkown export', async function() {
      const user: UserJson = {
        id: new mongoose.Types.ObjectId(),
        roleId: '',
        authenticationId: '',
        username: '',
        displayName: '',
        email: '',
        phones: [],
        icon: {
          type: UserIconType.Create,
          text: 'icon',
          color: 'red'
        },
        active: true,
        enabled: true,
        status: 'active',
        recentEventIds: [],
        createdAt: new Date(),
        lastUpdated: new Date()
      }

      const exp: Export = {
        id: '1',
        userId: mockUser.id,
        relativePath: 'some/path',
        filename: 'export',
        exportType: 'csv',
        status: ExportStatus.Completed,
        options: {
          eventId: 1,
          filter: undefined,
          projection: undefined
        },
        processingErrors: [],
        expirationDate: new Date(),
        summary: {
          observations: {
            count: 0,
            startTimestamp: new Date(),
            endTimestamp: new Date(),
          },
          locations: {
            count: 0,
            startTimestamp: new Date(),
            endTimestamp: new Date()
          }
        },
        lastUpdated: new Date()
      }

      const req: api.DeleteExportRequest = requestBy(mockUser, { exportId: exp.id })
      permissions.ensureDeleteMyExportPermission(req.context).resolves(null)
      repository.deleteExportForUser(exp.id, mockUser.id).resolves(null)
      store.deleteContent(exp).resolves()

      const res = await deleteExport(req)
      const err = res.error as EntityNotFoundError

      expect(res.success).to.be.null
      expect(err).to.be.instanceOf(MageError)
      expect(err.data.entityId).to.equal(req.exportId)
      expect(err.data.entityType).to.equal('Export')
    })
  })
})

