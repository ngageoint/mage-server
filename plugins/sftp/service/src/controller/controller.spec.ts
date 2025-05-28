import _ from 'lodash'
import fs from 'fs'
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api'
import { MageEvent, MageEventAttrs, MageEventId, MageEventRepository, copyMageEventAttrs } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { FormFieldType } from '@ngageoint/mage.service/lib/entities/events/entities.events.forms'
import { EventScopedObservationRepository, Observation, ObservationAttrs } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import { SftpObservationRepository, MongooseSftpObservationRepository, SftpStatus } from '../adapters/adapters.sftp.mongoose'
import { MongooseTeamsRepository } from '../adapters/adapters.sftp.teams'
import { SFTPPluginConfig, defaultSFTPPluginConfig } from '../configuration/SFTPPluginConfig'
import { SftpController } from './controller'
import SFTPClient from 'ssh2-sftp-client';
import { PageOf } from '@ngageoint/mage.service/lib/entities/entities.global'
import { ArchiveResult, ArchiveStatus, ArchiverFactory, ObservationArchiver, TriggerRule } from '../format/entities.format'
import archiver from 'archiver'
import { UserRepository } from '@ngageoint/mage.service/lib/entities/users/entities.users'
import { AttachmentStore } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import mongoose from 'mongoose'

function newEvent(id: MageEventId): MageEventAttrs {
  return {
    id,
    acl: {},
    feedIds: [],
    forms: [{
      id: 1,
      archived: false,
      color: 'blue',
      fields: [
        {
          id: 1,
          name: 'field1',
          required: false,
          title: 'Attachments',
          type: FormFieldType.Attachment,
        }
      ],
      name: 'Image Plugin Test',
      userFields: []
    }],
    layerIds: [],
    name: `Event ${id}`,
    style: {},
  }
}

function newObservation(event: MageEvent, lastModified: Date): ObservationAttrs {
  return {
    id: "1",
    eventId: event.id,
    userId: "test",
    createdAt: new Date(1),
    lastModified: lastModified,
    attachments: [],
    favoriteUserIds: [],
    states: [],
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [0, 0]
    },
    properties: {
      timestamp: new Date(1),
      forms: []
    }
  }
}

function newArchiver(status: ArchiveStatus): ObservationArchiver {
  return {
    createArchive: async () => {
      return new ArchiveResult(archiver('zip'), status)
    }
  } as ObservationArchiver;
}

describe('automated processing', () => {
  class TestPluginStateRepository implements PluginStateRepository<SFTPPluginConfig> {
    state: SFTPPluginConfig | null = null
    async get(): Promise<SFTPPluginConfig | null> {
      return this.state
    }
    async put(x: SFTPPluginConfig): Promise<SFTPPluginConfig> {
      this.state = { ...x }
      return this.state
    }
    async patch(state: Partial<SFTPPluginConfig>): Promise<SFTPPluginConfig> {
      throw new Error('unimplemented')
    }
  }

  let event1: MageEvent
  let event2: MageEvent
  let allEvents: Map<MageEventId, MageEvent>
  let stateRepository: TestPluginStateRepository
  let eventObservationRepositories: Map<MageEventId, jasmine.SpyObj<EventScopedObservationRepository>>
  let observationRepository: (event: MageEventId) => Promise<jasmine.SpyObj<EventScopedObservationRepository>>
  let clock: jasmine.Clock
  let dbConnection: mongoose.Connection
  let attachmentStore: jasmine.SpyObj<AttachmentStore>

  beforeEach(() => {
    event1 = new MageEvent(newEvent(1))
    event2 = new MageEvent(newEvent(2))
    allEvents = new Map().set(event1.id, event1).set(event2.id, event2)
    eventObservationRepositories = new Map<MageEventId, jasmine.SpyObj<EventScopedObservationRepository>>([
      [event1.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepository-${event1.id}`, ['findById', 'findLastModifiedAfter'])],
      [event2.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepository-${event2.id}`, ['findById', 'findLastModifiedAfter'])]
    ])

    observationRepository = async event => {
      const repository = eventObservationRepositories.get(event)
      if (repository) {
        return repository
      }
      throw new Error(`no observation repository for event ${event}`)
    }

    stateRepository = new TestPluginStateRepository()
    clock = jasmine.clock().install()
    spyOn(fs, 'readFileSync').and.returnValue(Buffer.from('mock ssh key content'))

    // Create a spy on the SFTPClient constructor
    spyOn(SFTPClient.prototype, 'connect').and.resolveTo();

    spyOn(SFTPClient.prototype, 'put').and.resolveTo();

    spyOn(SFTPClient.prototype, 'end').and.resolveTo();

    dbConnection = {
      model: jasmine.createSpy('model').and.returnValue(null),
    } as unknown as mongoose.Connection;

    attachmentStore = jasmine.createSpyObj<AttachmentStore>('attachmentStore', ['readContent', 'readThumbnailContent'])
  })

  afterEach(() => {
    clock.uninstall()
  })

  it('waits for the current processing interval to finish then stops', async () => {
    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([])

    const userRepository = jasmine.createSpyObj<UserRepository>('userRepository', ['findById'])
    userRepository.findById.and.resolveTo(null)

    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    spyOn(ArchiverFactory.prototype, 'createArchiver').and.returnValue(newArchiver(ArchiveStatus.Complete))

    const controller = new SftpController(
      console,
      {
        stateRepository,
        eventRepository,
        observationRepository,
        userRepository,
        attachmentStore
      },
      dbConnection
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()
    clock.tick(clockTickMillis)
    clock.tick(clockTickMillis)
    await new Promise(resolve => {
      setTimeout(resolve)
      clock.tick(clockTickMillis)
    })

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
  })

  it('finds no observations to process', async () => {
    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo(Array.from(allEvents.values()).map(copyMageEventAttrs))

    const page: PageOf<ObservationAttrs> = {
      totalCount: 0,
      pageSize: 0,
      pageIndex: 0,
      items: []
    }

    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo(page)
    eventObservationRepositories.get(event2.id)?.findLastModifiedAfter.and.resolveTo(page)

    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const userRepository = jasmine.createSpyObj<UserRepository>('userRepository', ['findById'])
    userRepository.findById.and.resolveTo(null)

    const findAllSpy = spyOn(MongooseSftpObservationRepository.prototype, 'findAllByStatus').and.resolveTo([])
    const findLatestSpy = spyOn(MongooseSftpObservationRepository.prototype, 'findLatest').and.resolveTo(null)

    spyOn(MongooseTeamsRepository.prototype, 'findTeamsByUserId').and.resolveTo([])

    spyOn(ArchiverFactory.prototype, 'createArchiver').and.returnValue(newArchiver(ArchiveStatus.Complete))

    const controller = new SftpController(
      console,
      {
        stateRepository,
        eventRepository,
        observationRepository,
        userRepository,
        attachmentStore
      },
      dbConnection
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(findAllSpy).toHaveBeenCalledTimes(2)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event2.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
  })

  it('processes pending observations with success', async () => {
    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    const observation = newObservation(event1, new Date(1))

    eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
      totalCount: 0,
      pageSize: 0,
      pageIndex: 0,
      items: []
    })

    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const userRepository = jasmine.createSpyObj<UserRepository>('userRepo', ['findById'])
    userRepository.findById.and.resolveTo(null)

    const findAllSpy = spyOn(MongooseSftpObservationRepository.prototype, 'findAllByStatus').and.resolveTo([{
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.PENDING,
      createdAt: 1,
      updatedAt: 1
    }])
    const postStatusSpy = spyOn(MongooseSftpObservationRepository.prototype, 'postStatus').and.resolveTo({
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.SUCCESS,
      createdAt: 1,
      updatedAt: 1
    })
    spyOn(MongooseSftpObservationRepository.prototype, 'findLatest').and.resolveTo(null)

    spyOn(MongooseTeamsRepository.prototype, 'findTeamsByUserId').and.resolveTo([])

    spyOn(ArchiverFactory.prototype, 'createArchiver').and.returnValue(newArchiver(ArchiveStatus.Complete))

    const controller = new SftpController(
      console,
      {
        stateRepository,
        eventRepository,
        observationRepository,
        userRepository,
        attachmentStore
      },
      dbConnection
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(findAllSpy).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
  })

  it('processes pending observations with success before attachment timeout', async () => {
    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    const observation = newObservation(event1, new Date())

    eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
      totalCount: 0,
      pageSize: 0,
      pageIndex: 0,
      items: []
    })

    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const teamRepo = jasmine.createSpyObj<MongooseTeamsRepository>('teamRepo', ['findTeamsByUserId'])
    teamRepo.findTeamsByUserId.and.resolveTo([])

    const userRepository = jasmine.createSpyObj<UserRepository>('userRepo', ['findById'])
    userRepository.findById.and.resolveTo(null)

    const findAllSpy = spyOn(MongooseSftpObservationRepository.prototype, 'findAllByStatus').and.resolveTo([{
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.PENDING,
      createdAt: 1,
      updatedAt: 1
    }])
    const postStatusSpy = spyOn(MongooseSftpObservationRepository.prototype, 'postStatus').and.resolveTo({
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.SUCCESS,
      createdAt: 1,
      updatedAt: 1
    })
    spyOn(MongooseSftpObservationRepository.prototype, 'findLatest').and.resolveTo(null)

    spyOn(MongooseTeamsRepository.prototype, 'findTeamsByUserId').and.resolveTo([])

    spyOn(ArchiverFactory.prototype, 'createArchiver').and.returnValue(newArchiver(ArchiveStatus.Complete))

    const controller = new SftpController(
      console,
      {
        stateRepository,
        eventRepository,
        observationRepository,
        userRepository,
        attachmentStore
      },
      dbConnection
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(findAllSpy).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
  })

  it('processes pending observations after attachment timeout', async () => {
    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    const observation = newObservation(event1, new Date(Date.now() + stateRepository.state.initiation.timeout + 1))

    eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
      totalCount: 0,
      pageSize: 0,
      pageIndex: 0,
      items: []
    })

    const userRepository = jasmine.createSpyObj<UserRepository>('userRepo', ['findById'])
    userRepository.findById.and.resolveTo(null)

    const findAllSpy = spyOn(MongooseSftpObservationRepository.prototype, 'findAllByStatus').and.resolveTo([{
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.PENDING,
      createdAt: 1,
      updatedAt: 1
    }])
    const postStatusSpy = spyOn(MongooseSftpObservationRepository.prototype, 'postStatus').and.resolveTo({
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.SUCCESS,
      createdAt: 1,
      updatedAt: 1
    })
    spyOn(MongooseSftpObservationRepository.prototype, 'findLatest').and.resolveTo(null)

    spyOn(ArchiverFactory.prototype, 'createArchiver').and.returnValue(newArchiver(ArchiveStatus.Incomplete))

    spyOn(MongooseTeamsRepository.prototype, 'findTeamsByUserId').and.resolveTo([])

    const controller = new SftpController(
      console,
      {
        stateRepository,
        eventRepository,
        observationRepository,
        userRepository,
        attachmentStore
      },
      dbConnection
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(findAllSpy).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
  })

  it('processes new observations w/ create trigger', async () => {
    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    const observation = newObservation(event1, new Date())

    eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
      totalCount: 1,
      pageSize: 10,
      pageIndex: 0,
      items: [observation]
    })

    const userRepository = jasmine.createSpyObj<UserRepository>('userRepo', ['findById'])
    userRepository.findById.and.resolveTo(null)

    const findAllSpy = spyOn(MongooseSftpObservationRepository.prototype, 'findAllByStatus').and.resolveTo([])
    const postStatusSpy = spyOn(MongooseSftpObservationRepository.prototype, 'postStatus').and.resolveTo({
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.SUCCESS,
      createdAt: 1,
      updatedAt: 1
    })
    spyOn(MongooseSftpObservationRepository.prototype, 'findLatest').and.resolveTo(null)
    spyOn(MongooseSftpObservationRepository.prototype, 'isProcessed').and.resolveTo(false)

    spyOn(MongooseTeamsRepository.prototype, 'findTeamsByUserId').and.resolveTo([])

    const archiverSpy = jasmine.createSpyObj<ObservationArchiver>('archiver', ['createArchive'])
    archiverSpy.createArchive.and.resolveTo(ArchiveResult.complete(archiver('zip')))
    spyOn(ArchiverFactory.prototype, 'createArchiver').and.returnValue(archiverSpy)

    const controller = new SftpController(
      console,
      {
        stateRepository,
        eventRepository,
        observationRepository,
        userRepository,
        attachmentStore
      },
      dbConnection
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(findAllSpy).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
    expect(archiverSpy.createArchive).toHaveBeenCalled()
  })

  it('processes updated observations w/ create/update trigger', async () => {
    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    const observation = newObservation(event1, new Date())

    eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
      totalCount: 1,
      pageSize: 10,
      pageIndex: 0,
      items: [observation]
    })

    const userRepository = jasmine.createSpyObj<UserRepository>('userRepo', ['findById'])
    userRepository.findById.and.resolveTo(null)

    const findAllSpy = spyOn(MongooseSftpObservationRepository.prototype, 'findAllByStatus').and.resolveTo([])
    const postStatusSpy = spyOn(MongooseSftpObservationRepository.prototype, 'postStatus').and.resolveTo({
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.SUCCESS,
      createdAt: 1,
      updatedAt: 1
    })
    spyOn(MongooseSftpObservationRepository.prototype, 'findLatest').and.resolveTo(null)
    spyOn(MongooseSftpObservationRepository.prototype, 'isProcessed').and.resolveTo(false)

    spyOn(MongooseTeamsRepository.prototype, 'findTeamsByUserId').and.resolveTo([])

    const archiverSpy = jasmine.createSpyObj<ObservationArchiver>('archiver', ['createArchive'])
    archiverSpy.createArchive.and.resolveTo(ArchiveResult.complete(archiver('zip')))
    spyOn(ArchiverFactory.prototype, 'createArchiver').and.returnValue(archiverSpy)

    const controller = new SftpController(
      console,
      {
        stateRepository,
        eventRepository,
        observationRepository,
        userRepository,
        attachmentStore
      },
      dbConnection
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(findAllSpy).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
    expect(archiverSpy.createArchive).toHaveBeenCalled()
  })

  it('skips processing of updated observations w/ create trigger', async () => {
    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true, initiation: { rule: TriggerRule.Create, timeout: 60 } }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    const observation = newObservation(event1, new Date())

    eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
      totalCount: 1,
      pageSize: 10,
      pageIndex: 0,
      items: [observation]
    })

    const userRepository = jasmine.createSpyObj<UserRepository>('userRepo', ['findById'])
    userRepository.findById.and.resolveTo(null)

    const findAllSpy = spyOn(MongooseSftpObservationRepository.prototype, 'findAllByStatus').and.resolveTo([])
    const postStatusSpy = spyOn(MongooseSftpObservationRepository.prototype, 'postStatus').and.resolveTo({
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.SUCCESS,
      createdAt: 1,
      updatedAt: 1
    })
    spyOn(MongooseSftpObservationRepository.prototype, 'findLatest').and.resolveTo(null)
    spyOn(MongooseSftpObservationRepository.prototype, 'isProcessed').and.resolveTo(true)

    spyOn(MongooseTeamsRepository.prototype, 'findTeamsByUserId').and.resolveTo([])

    const archiverSpy = jasmine.createSpyObj<ObservationArchiver>('archiver', ['createArchive'])
    archiverSpy.createArchive.and.resolveTo(ArchiveResult.complete(archiver('zip')))
    spyOn(ArchiverFactory.prototype, 'createArchiver').and.returnValue(archiverSpy)

    const controller = new SftpController(
      console,
      {
        stateRepository,
        eventRepository,
        observationRepository,
        userRepository,
        attachmentStore
      },
      dbConnection
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(findAllSpy).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(postStatusSpy).toHaveBeenCalledTimes(0)
    expect(archiverSpy.createArchive).toHaveBeenCalledTimes(0)
  })

  // it('skips processed observations w/ create trigger', async () => {
  // })

  // it('waits for observations to contain all attachments', async () => {
  // })

  // it('processes incomplete observation after timeout', async () => {
  // })
})
