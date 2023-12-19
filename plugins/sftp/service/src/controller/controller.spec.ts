import _ from 'lodash'
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api'
import { MageEvent, MageEventAttrs, MageEventId, MageEventRepository, copyMageEventAttrs } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { FormFieldType } from '@ngageoint/mage.service/lib/entities/events/entities.events.forms'
import { AttachmentStore, EventScopedObservationRepository, Observation, ObservationAttrs } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import { UserRepository } from '@ngageoint/mage.service/lib/entities/users/entities.users'
import { SftpObservationRepository, SftpStatus } from '../adapters/adapters.sftp.mongoose'
import { SFTPPluginConfig, defaultSFTPPluginConfig } from '../configuration/SFTPPluginConfig'
import { SftpController } from './controller'
import SFTPClient from 'ssh2-sftp-client';
import { PageOf } from '@ngageoint/mage.service/lib/entities/entities.global'
import { ArchiveResult, ArchiverFactory, ObservationArchiver } from '../format/entities.format'
import archiver from 'archiver'

function makeEvent(id: MageEventId): MageEventAttrs {
  return {
    id,
    acl: {},
    feedIds: [],
    forms: [
      {
        id: 1,
        archived: false,
        color: 'lavender',
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
      }
    ],
    layerIds: [],
    name: `Event ${id}`,
    style: {},
  }
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
  let observationRepos: Map<MageEventId, jasmine.SpyObj<EventScopedObservationRepository>>
  let userRepository: jasmine.SpyObj<UserRepository>
  let attachmentStore: jasmine.SpyObj<AttachmentStore>
  let sftpClient: jasmine.SpyObj<SFTPClient>
  const observationRepoForEvent: (event: MageEventId) => Promise<jasmine.SpyObj<EventScopedObservationRepository>> = async event => {
    const repo = observationRepos.get(event)
    if (repo) {
      return repo
    }
    throw new Error(`no observation repository for event ${event}`)
  }

  let clock: jasmine.Clock

  beforeEach(() => {
    event1 = new MageEvent(makeEvent(1))
    event2 = new MageEvent(makeEvent(2))
    allEvents = new Map().set(event1.id, event1).set(event2.id, event2)
    stateRepository = new TestPluginStateRepository()
    observationRepos = Array.from(allEvents.values()).reduce((repos, event) => {
      return repos.set(event.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepo-${event.id}`, ['findLastModifiedAfter']))
    }, new Map())
    attachmentStore = jasmine.createSpyObj<AttachmentStore>('attachmentStore', ['readContent', 'saveContent', 'readThumbnailContent', 'saveThumbnailContent', 'stagePendingContent'])
    clock = jasmine.clock().install()
    userRepository = jasmine.createSpyObj<UserRepository>('userRepo', ['findById'])
    sftpClient = jasmine.createSpyObj<SFTPClient>('sftpClient', ['connect', 'put', 'end'])
    sftpClient.connect.and.resolveTo()
    sftpClient.end.and.resolveTo()
  })

  afterEach(() => {
    clock.uninstall()
  })

  it('waits for the current processing interval to finish then stops', async () => {
    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([])

    const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpRespository', ['findAll'])

    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const mockArchiver = {
      createArchive: async () => {
        return ArchiveResult.complete(archiver('zip'))
      }
    } as ObservationArchiver;

    const archiveFactory = jasmine.createSpyObj<ArchiverFactory>('archiverFactory', ['createArchiver'])
    archiveFactory.createArchiver.and.returnValue(mockArchiver)

    const controller = new SftpController(
      stateRepository,
      eventRepository,
      observationRepoForEvent,
      userRepository,
      attachmentStore,
      sftpRepository,
      sftpClient,
      archiveFactory,
      console
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

    const eventObservationRepositories = new Map<MageEventId, jasmine.SpyObj<EventScopedObservationRepository>>([
      [event1.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepository-${event1.id}`, ['findLastModifiedAfter'])],
      [event2.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepository-${event2.id}`, ['findLastModifiedAfter'])]
     ])

    const observationRepository: (event: MageEventId) => Promise<jasmine.SpyObj<EventScopedObservationRepository>> = async event => {
      const repository = eventObservationRepositories.get(event)
      if (repository) {
        return repository
      }
      throw new Error(`no observation repository for event ${event}`)
    }

    const page: PageOf<ObservationAttrs> = {
      totalCount: 0,
      pageSize: 0,
      pageIndex: 0,
      items: []
    }

    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo(page)
    eventObservationRepositories.get(event2.id)?.findLastModifiedAfter.and.resolveTo(page)

    const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest'])
    sftpRepository.findAllByStatus.and.resolveTo([])
    sftpRepository.findLatest.and.resolveTo(null)

    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const mockArchiver = {
      createArchive: async () => {
        return ArchiveResult.complete(archiver('zip'))
      }
    } as ObservationArchiver;

    const archiveFactory = jasmine.createSpyObj<ArchiverFactory>('archiverFactory', ['createArchiver'])
    archiveFactory.createArchiver.and.returnValue(mockArchiver)

    const controller = new SftpController(
      stateRepository,
      eventRepository,
      observationRepoForEvent,
      userRepository,
      attachmentStore,
      sftpRepository,
      sftpClient,
      archiveFactory,
      console
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(2)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event2.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
  })

  it('processes pending observations with success', async () => {
    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    const eventObservationRepositories = new Map<MageEventId, jasmine.SpyObj<EventScopedObservationRepository>>([
      [event1.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepository-${event1.id}`, ['findById', 'findLastModifiedAfter'])]
    ])

    const observationRepository: (event: MageEventId) => Promise<jasmine.SpyObj<EventScopedObservationRepository>> = async event => {
      const repository = eventObservationRepositories.get(event)
      if (repository) {
        return repository
      }
      throw new Error(`no observation repository for event ${event}`)
    }

    const observation: ObservationAttrs = {
      id: "1",
      eventId: event1.id,
      userId: "1",
      createdAt: new Date(1),
      lastModified: new Date(1),
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

    eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
      totalCount: 0,
      pageSize: 0,
      pageIndex: 0,
      items: []
    })

    const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest', 'postStatus'])
    sftpRepository.findAllByStatus.and.resolveTo([{
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.PENDING,
      createdAt: 1,
      updatedAt: 1
    }])
    sftpRepository.postStatus.and.resolveTo({
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.SUCCESS,
      createdAt: 1,
      updatedAt: 1
    })
    sftpRepository.findLatest.and.resolveTo(null)

    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const mockArchiver = {
      createArchive: async () => {
        return ArchiveResult.complete(archiver('zip'))
      }
    } as ObservationArchiver;

    const archiveFactory = jasmine.createSpyObj<ArchiverFactory>('archiverFactory', ['createArchiver'])
    archiveFactory.createArchiver.and.returnValue(mockArchiver)

    const controller = new SftpController(
      stateRepository,
      eventRepository,
      observationRepoForEvent,
      userRepository,
      attachmentStore,
      sftpRepository,
      sftpClient,
      archiveFactory,
      console
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(sftpRepository.postStatus).toHaveBeenCalledTimes(1)
    expect(sftpRepository.postStatus).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
  })

  it('processes pending observations with success before attachment timeout', async () => {
    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    const eventObservationRepositories = new Map<MageEventId, jasmine.SpyObj<EventScopedObservationRepository>>([
      [event1.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepository-${event1.id}`, ['findById', 'findLastModifiedAfter'])]
    ])

    const observationRepository: (event: MageEventId) => Promise<jasmine.SpyObj<EventScopedObservationRepository>> = async event => {
      const repository = eventObservationRepositories.get(event)
      if (repository) {
        return repository
      }
      throw new Error(`no observation repository for event ${event}`)
    }

    const observation: ObservationAttrs = {
      id: "1",
      eventId: event1.id,
      userId: "1",
      createdAt: new Date(1),
      lastModified: new Date(1),
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

    eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
      totalCount: 0,
      pageSize: 0,
      pageIndex: 0,
      items: []
    })

    const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest', 'postStatus'])
    sftpRepository.findAllByStatus.and.resolveTo([{
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.PENDING,
      createdAt: 1,
      updatedAt: 1
    }])
    sftpRepository.postStatus.and.resolveTo({
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.SUCCESS,
      createdAt: 1,
      updatedAt: 1
    })
    sftpRepository.findLatest.and.resolveTo(null)

    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const mockArchiver = {
      createArchive: async () => {
        return ArchiveResult.incomplete(archiver('zip'))
      }
    } as ObservationArchiver;

    const archiveFactory = jasmine.createSpyObj<ArchiverFactory>('archiverFactory', ['createArchiver'])
    archiveFactory.createArchiver.and.returnValue(mockArchiver)

    const controller = new SftpController(
      stateRepository,
      eventRepository,
      observationRepository,
      userRepository,
      attachmentStore,
      sftpRepository,
      sftpClient,
      archiveFactory,
      console
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(sftpRepository.postStatus).toHaveBeenCalledTimes(1)
    expect(sftpRepository.postStatus).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
  })

  fit('processes pending observations after attachment timeout', async () => {
    stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    const clockTickMillis = stateRepository.state.interval * 1000 + 1

    const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    const eventObservationRepositories = new Map<MageEventId, jasmine.SpyObj<EventScopedObservationRepository>>([
      [event1.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepository-${event1.id}`, ['findById', 'findLastModifiedAfter'])]
    ])

    const observationRepository: (event: MageEventId) => Promise<jasmine.SpyObj<EventScopedObservationRepository>> = async event => {
      const repository = eventObservationRepositories.get(event)
      if (repository) {
        return repository
      }
      throw new Error(`no observation repository for event ${event}`)
    }

    const observation: ObservationAttrs = {
      id: "1",
      eventId: event1.id,
      userId: "1",
      createdAt: new Date(1),
      lastModified: new Date(1),
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

    eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
      totalCount: 0,
      pageSize: 0,
      pageIndex: 0,
      items: []
    })

    const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest', 'postStatus'])
    sftpRepository.findAllByStatus.and.resolveTo([{
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.PENDING,
      createdAt: 1,
      updatedAt: 1
    }])
    sftpRepository.postStatus.and.resolveTo({
      eventId: event1.id,
      observationId: observation.id,
      status: SftpStatus.SUCCESS,
      createdAt: 1,
      updatedAt: 1
    })
    sftpRepository.findLatest.and.resolveTo(null)



    const mockArchiver = {
      createArchive: async () => {
        return ArchiveResult.incomplete(archiver('zip'))
      }
    } as ObservationArchiver;

    const archiveFactory = jasmine.createSpyObj<ArchiverFactory>('archiverFactory', ['createArchiver'])
    archiveFactory.createArchiver.and.returnValue(mockArchiver)

    const controller = new SftpController(
      stateRepository,
      eventRepository,
      observationRepository,
      userRepository,
      attachmentStore,
      sftpRepository,
      sftpClient,
      archiveFactory,
      console
    )

    await controller.start()
    clock.tick(clockTickMillis)
    await controller.stop()

    expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(1)
    expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    expect(sftpRepository.postStatus).toHaveBeenCalledTimes(1)
    expect(sftpRepository.postStatus).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.PENDING)
  })

  // it('processes new observations w/ create trigger', async () => {
  // })

  // it('processes new and updated observats w/ create/update trigger', async () => {
  // })

  // it('skips processed observations w/ create trigger', async () => {
  // })

  // it('waits for observations to contain all attachments', async () => {
  // })

  // it('processes incomplete observation after timeout', async () => {
  // })
})