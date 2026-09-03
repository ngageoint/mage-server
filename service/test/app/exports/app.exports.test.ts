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
import { TeamRepository } from '../../../lib/entities/teams/entities.teams'
import { EventScopedObservationRepository, ObservationAttrs, ObservationSearchRepository } from '../../../lib/entities/observations/entities.observations'
import { MageEventId } from '../../../lib/entities/events/entities.events'
import uniqid from 'uniqid'

function minimalObservationAttrs(): ObservationAttrs {
  return {
    id: uniqid(),
    eventId: 987,
    createdAt: new Date(),
    lastModified: new Date(),
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ 0, 0 ] },
    properties: { timestamp: new Date(), forms: [] },
    states: [],
    favoriteUserIds: [],
    attachments: []
  }
}

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

  describe('iterating observations', function() {

    let mageEvent: MageEvent
    let obsRepo: SubstituteOf<EventScopedObservationRepository>
    let obsRepoFactory: sinon.SinonStub<[MageEventId], Promise<EventScopedObservationRepository>>
    let searchRepo: SubstituteOf<ObservationSearchRepository>
    let iterateObservations: impl.IterateObservations

    beforeEach(function() {
      mageEvent = new MageEvent({
        id: Date.now(),
        acl: {},
        feedIds: [],
        forms: [],
        layerIds: [],
        name: 'Export App Layer Tests',
        style: {}
      })
      obsRepo = Sub.for<EventScopedObservationRepository>()
      obsRepoFactory = sinon.stub()
      obsRepoFactory.resolves(obsRepo)
      searchRepo = Sub.for<ObservationSearchRepository>()
      iterateObservations = impl.IterateObservations(obsRepoFactory, searchRepo)
    })

    it('gets the repository for the given event from the factory', async function() {

      obsRepo.iterate(Arg.any()).returns({ async *[Symbol.asyncIterator]() {} })
      await iterateObservations(mageEvent, {})

      expect(obsRepoFactory.calledOnceWith(mageEvent.id)).to.be.true
    })

    it('does not query the search repository when no field filter is given', async function() {

      obsRepo.iterate(Arg.any()).returns({ async *[Symbol.asyncIterator]() {} })
      await iterateObservations(mageEvent, { where: { stateIsAnyOf: [ 'active' ] } })

      searchRepo.didNotReceive().findIdsByFilter(Arg.any(), Arg.any())
      obsRepo.received(1).iterate(Arg.is((spec: any) => {
        return spec.where.stateIsAnyOf?.length === 1 && spec.where.ids === undefined
      }))
    })

    it('resolves a field filter to observation ids from the search repository and passes them through', async function() {

      const filter = { keyword: 'test' }
      const ids = [ uniqid(), uniqid() ]
      searchRepo.findIdsByFilter(filter, mageEvent).resolves(ids)
      obsRepo.iterate(Arg.any()).returns({ async *[Symbol.asyncIterator]() {} })
      await iterateObservations(mageEvent, { where: { fieldFilter: filter } })

      obsRepo.received(1).iterate(Arg.is((spec: any) => spec.where.ids === ids))
    })

    it('preserves the other stream spec fields', async function() {

      obsRepo.iterate(Arg.any()).returns({ async *[Symbol.asyncIterator]() {} })
      await iterateObservations(mageEvent, { orderBy: { field: 'lastModified', order: -1 }, includeAttachments: true })

      obsRepo.received(1).iterate(Arg.is((spec: any) => {
        return spec.orderBy.field === 'lastModified' && spec.orderBy.order === -1 && spec.includeAttachments === true
      }))
    })

    it('returns the iterable from the repository', async function() {

      const iterable = { async *[Symbol.asyncIterator]() { yield minimalObservationAttrs() } }
      obsRepo.iterate(Arg.any()).returns(iterable)
      const result = await iterateObservations(mageEvent, {})

      expect(result).to.equal(iterable)
    })
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
    let exportFactory: sinon.SinonStub<[ExportFormat], impl.ExportTransform>
    let teamRepository: SubstituteOf<TeamRepository>

    beforeEach(function() {
      // Sinon stubs
      store = sinon.createStubInstance(FileSystemExportContentStore)
      repository = sinon.createStubInstance(MongooseExportsRepository)
      teamRepository = Sub.for<TeamRepository>()

      const csvExport: impl.ExportTransform = { export: sinon.stub() }
      exportFactory = sinon.stub()
      exportFactory.withArgs('csv').returns(csvExport)

      createExport = impl.CreateExport(exportFactory, repository, store, permissions, teamRepository)
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
          filter: undefined },
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
          observations: {
            startDate: new Date(),
            endDate: new Date(),
            favorites: false,
            important: false,
            includeAttachments: false
          },
          locations: {
            startDate: new Date(),
            endDate: new Date()
          }
        },
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

    it('builds observation and location find specs from the filter', async function() {
      const event: MageEvent = { id: 0, name: 'Test Event' } as MageEvent
      const content = new BufferWriteable()

      const exp: ExportExpanded = {
        id: '1',
        userId: mockUser.id,
        user: expandedUser,
        relativePath: 'some/path',
        filename: 'export',
        exportType: 'csv',
        status: ExportStatus.Completed,
        options: { eventId: 1, event: { id: 1, name: 'Test Event 1' }, filter: undefined },
        processingErrors: [],
        expirationDate: new Date(),
        summary: {},
        lastUpdated: new Date()
      }

      const observationStartDate = new Date('2020-01-01')
      const observationEndDate = new Date('2020-01-02')
      const locationStartDate = new Date('2020-02-01')
      const locationEndDate = new Date('2020-02-02')
      const req: api.CreateExportRequest = {
        context: {
          requestToken: Symbol(),
          requestingPrincipal: () => mockUser,
          locale: () => null,
          mageEvent: event
        },
        format: 'csv',
        filter: {
          observations: {
            startDate: observationStartDate,
            endDate: observationEndDate,
            favorites: true,
            important: true,
            includeAttachments: true,
            hasAttachments: true,
            userIsAnyOf: [ 'user1' ],
            fieldFilter: { keyword: 'wildfire' }
          },
          locations: {
            startDate: locationStartDate,
            endDate: locationEndDate,
            userIsAnyOf: [ 'user1' ]
          }
        },
      }

      permissions.ensureCreateExportPermission(req.context).resolves(null)
      repository.createExport.resolves(exp)
      store.writeContent.returns({ relativePath: 'test/path', content })
      store.contentStats.resolves(new Stats())
      repository.updateExportForUser.resolves(exp)

      const exportStub = sinon.stub().resolves({ observations: {}, locations: {} })
      exportFactory.withArgs('csv').returns({ export: exportStub })

      await createExport(req)
      await exportStub.returnValues[0]

      expect(exportStub.calledOnce).to.be.true
      const [ exportedEvent, , params ] = exportStub.getCall(0).args as [ MageEvent, unknown, impl.ExportParams ]
      expect(exportedEvent).to.equal(event)
      expect(params.observationParams?.findSpec.where).to.deep.include({
        stateIsAnyOf: [ 'active' ],
        timestampAfter: observationStartDate,
        timestampBefore: observationEndDate,
        isFavoriteOfUser: mockUser.id,
        isFlaggedImportant: true,
        userIsAnyOf: [ 'user1' ],
        hasAttachments: true,
        fieldFilter: { keyword: 'wildfire' }
      })
      expect(params.observationParams?.findSpec.includeAttachments).to.equal(true)
      expect(params.locationParams?.findSpec.where).to.deep.include({
        eventId: event.id,
        timestampAfter: locationStartDate,
        timestampBefore: locationEndDate,
        userIsAnyOf: [ 'user1' ]
      })
    })

    it('resolves team members and merges them with userIsAnyOf', async function() {
      const event: MageEvent = { id: 0, name: 'Test Event' } as MageEvent
      const content = new BufferWriteable()

      const exp: ExportExpanded = {
        id: '1',
        userId: mockUser.id,
        user: expandedUser,
        relativePath: 'some/path',
        filename: 'export',
        exportType: 'csv',
        status: ExportStatus.Completed,
        options: { eventId: 1, event: { id: 1, name: 'Test Event 1' }, filter: undefined },
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
          observations: {
            userIsAnyOf: [ 'user1' ],
            teamIsAnyOf: [ 'team1' ]
          },
          locations: {
            userIsAnyOf: [ 'user4' ],
            teamIsAnyOf: [ 'team2' ]
          }
        },
      }

      permissions.ensureCreateExportPermission(req.context).resolves(null)
      repository.createExport.resolves(exp)
      store.writeContent.returns({ relativePath: 'test/path', content })
      store.contentStats.resolves(new Stats())
      repository.updateExportForUser.resolves(exp)
      teamRepository.findAllByIds([ 'team1' ]).resolves({
        team1: { id: 'team1', name: 'Team 1', userIds: [ 'user2', 'user3' ], acl: {} } as any
      })
      teamRepository.findAllByIds([ 'team2' ]).resolves({
        team2: { id: 'team2', name: 'Team 2', userIds: [ 'user5' ], acl: {} } as any
      })

      const exportStub = sinon.stub().resolves({ observations: {}, locations: {} })
      exportFactory.withArgs('csv').returns({ export: exportStub })

      await createExport(req)
      await exportStub.returnValues[0]

      const [ , , params ] = exportStub.getCall(0).args as [ MageEvent, unknown, impl.ExportParams ]
      expect(params.observationParams?.findSpec.where?.userIsAnyOf).to.have.members([ 'user1', 'user2', 'user3' ])
      expect(params.locationParams?.findSpec.where.userIsAnyOf).to.have.members([ 'user4', 'user5' ])
    })

    it('does not filter out all users when a filtered team has no members', async function() {
      const event: MageEvent = { id: 0, name: 'Test Event' } as MageEvent
      const content = new BufferWriteable()

      const exp: ExportExpanded = {
        id: '1',
        userId: mockUser.id,
        user: expandedUser,
        relativePath: 'some/path',
        filename: 'export',
        exportType: 'csv',
        status: ExportStatus.Completed,
        options: { eventId: 1, event: { id: 1, name: 'Test Event 1' }, filter: undefined },
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
          observations: {
            teamIsAnyOf: [ 'emptyTeam' ]
          }
        },
      }

      permissions.ensureCreateExportPermission(req.context).resolves(null)
      repository.createExport.resolves(exp)
      store.writeContent.returns({ relativePath: 'test/path', content })
      store.contentStats.resolves(new Stats())
      repository.updateExportForUser.resolves(exp)
      teamRepository.findAllByIds([ 'emptyTeam' ]).resolves({
        emptyTeam: { id: 'emptyTeam', name: 'Empty Team', userIds: [], acl: {} } as any
      })

      const exportStub = sinon.stub().resolves({ observations: {}, locations: {} })
      exportFactory.withArgs('csv').returns({ export: exportStub })

      await createExport(req)
      await exportStub.returnValues[0]

      const [ , , params ] = exportStub.getCall(0).args as [ MageEvent, unknown, impl.ExportParams ]
      expect(params.observationParams?.findSpec.where?.userIsAnyOf).to.be.undefined
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
          observations: {
            startDate: new Date(),
            endDate: new Date(),
            favorites: false,
            important: false,
            includeAttachments: false
          },
          locations: {
            startDate: new Date(),
            endDate: new Date()
          }
        },
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

