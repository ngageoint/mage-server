import _ from 'lodash'
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api'
import { MageEvent, MageEventAttrs, MageEventId, MageEventRepository, copyMageEventAttrs } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { FormFieldType } from '@ngageoint/mage.service/lib/entities/events/entities.events.forms'
import { EventScopedObservationRepository, Observation, ObservationAttrs } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import { SftpObservationRepository, SftpStatus } from '../adapters/adapters.sftp.mongoose'
import { SFTPPluginConfig, defaultSFTPPluginConfig } from '../configuration/SFTPPluginConfig'
import { SftpController } from './controller'
import SFTPClient from 'ssh2-sftp-client';
import { PageOf } from '@ngageoint/mage.service/lib/entities/entities.global'
import { ArchiveResult, ArchiveStatus, ArchiverFactory, ObservationArchiver, TriggerRule } from '../format/entities.format'
import archiver from 'archiver'

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
    let archiveFactory: jasmine.SpyObj<ArchiverFactory>
    let sftpClient: jasmine.SpyObj<SFTPClient>
    let clock: jasmine.Clock

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
        archiveFactory = jasmine.createSpyObj<ArchiverFactory>('archiverFactory', ['createArchiver'])
        sftpClient = jasmine.createSpyObj<SFTPClient>('sftpClient', ['connect', 'put', 'end'])
        sftpClient.connect.and.resolveTo()
        sftpClient.end.and.resolveTo()
    })

    afterEach(() => {
        clock.uninstall()
    })

    // it('waits for the current processing interval to finish then stops', async () => {
    //     const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    //     eventRepository.findActiveEvents.and.resolveTo([])

    //     const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpRespository', ['findAll'])

    //     stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    //     const clockTickMillis = stateRepository.state.interval * 1000 + 1

    //     archiveFactory.createArchiver.and.returnValue(newArchiver(ArchiveStatus.Complete))

    //     const controller = new SftpController(
    //         stateRepository,
    //         eventRepository,
    //         observationRepository,
    //         sftpRepository,
    //         sftpClient,
    //         archiveFactory,
    //         console,
    //     )

    //     await controller.start()
    //     clock.tick(clockTickMillis)
    //     await controller.stop()
    //     clock.tick(clockTickMillis)
    //     clock.tick(clockTickMillis)
    //     await new Promise(resolve => {
    //         setTimeout(resolve)
    //         clock.tick(clockTickMillis)
    //     })

    //     expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    // })

    // it('finds no observations to process', async () => {
    //     const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    //     eventRepository.findActiveEvents.and.resolveTo(Array.from(allEvents.values()).map(copyMageEventAttrs))

    //     const page: PageOf<ObservationAttrs> = {
    //         totalCount: 0,
    //         pageSize: 0,
    //         pageIndex: 0,
    //         items: []
    //     }

    //     eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo(page)
    //     eventObservationRepositories.get(event2.id)?.findLastModifiedAfter.and.resolveTo(page)

    //     const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest'])
    //     sftpRepository.findAllByStatus.and.resolveTo([])
    //     sftpRepository.findLatest.and.resolveTo(null)

    //     stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    //     const clockTickMillis = stateRepository.state.interval * 1000 + 1

    //     archiveFactory.createArchiver.and.returnValue(newArchiver(ArchiveStatus.Complete))

    //     const controller = new SftpController(
    //         stateRepository,
    //         eventRepository,
    //         observationRepository,
    //         sftpRepository,
    //         sftpClient,
    //         archiveFactory,
    //         console
    //     )

    //     await controller.start()
    //     clock.tick(clockTickMillis)
    //     await controller.stop()

    //     expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(2)
    //     expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    //     expect(eventObservationRepositories.get(event2.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    // })

    // it('processes pending observations with success', async () => {
    //     const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    //     eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    //     const observation = newObservation(event1, new Date(1))

    //     eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    //     eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
    //         totalCount: 0,
    //         pageSize: 0,
    //         pageIndex: 0,
    //         items: []
    //     })

    //     const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest', 'postStatus'])
    //     sftpRepository.findAllByStatus.and.resolveTo([{
    //         eventId: event1.id,
    //         observationId: observation.id,
    //         status: SftpStatus.PENDING,
    //         createdAt: 1,
    //         updatedAt: 1
    //     }])
    //     sftpRepository.postStatus.and.resolveTo({
    //         eventId: event1.id,
    //         observationId: observation.id,
    //         status: SftpStatus.SUCCESS,
    //         createdAt: 1,
    //         updatedAt: 1
    //     })
    //     sftpRepository.findLatest.and.resolveTo(null)

    //     stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    //     const clockTickMillis = stateRepository.state.interval * 1000 + 1

    //     archiveFactory.createArchiver.and.returnValue(newArchiver(ArchiveStatus.Complete))

    //     const controller = new SftpController(
    //         stateRepository,
    //         eventRepository,
    //         observationRepository,
    //         sftpRepository,
    //         sftpClient,
    //         archiveFactory,
    //         console
    //     )

    //     await controller.start()
    //     clock.tick(clockTickMillis)
    //     await controller.stop()

    //     expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(1)
    //     expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
    // })

    // it('processes pending observations with success before attachment timeout', async () => {
    //     const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    //     eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    //     const observation = newObservation(event1, new Date())

    //     eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    //     eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
    //         totalCount: 0,
    //         pageSize: 0,
    //         pageIndex: 0,
    //         items: []
    //     })

    //     const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest', 'postStatus'])
    //     sftpRepository.findAllByStatus.and.resolveTo([{
    //         eventId: event1.id,
    //         observationId: observation.id,
    //         status: SftpStatus.PENDING,
    //         createdAt: 1,
    //         updatedAt: 1
    //     }])
    //     sftpRepository.postStatus.and.resolveTo({
    //         eventId: event1.id,
    //         observationId: observation.id,
    //         status: SftpStatus.SUCCESS,
    //         createdAt: 1,
    //         updatedAt: 1
    //     })
    //     sftpRepository.findLatest.and.resolveTo(null)

    //     stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    //     const clockTickMillis = stateRepository.state.interval * 1000 + 1

    //     archiveFactory.createArchiver.and.returnValue(newArchiver(ArchiveStatus.Complete))

    //     const controller = new SftpController(
    //         stateRepository,
    //         eventRepository,
    //         observationRepository,
    //         sftpRepository,
    //         sftpClient,
    //         archiveFactory,
    //         console
    //     )

    //     await controller.start()
    //     clock.tick(clockTickMillis)
    //     await controller.stop()

    //     expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(1)
    //     expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
    // })

    // it('processes pending observations after attachment timeout', async () => {
    //     stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    //     const clockTickMillis = stateRepository.state.interval * 1000 + 1

    //     const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    //     eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    //     const observation = newObservation(event1, new Date(Date.now() + stateRepository.state.initiation.timeout + 1))

    //     eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    //     eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
    //         totalCount: 0,
    //         pageSize: 0,
    //         pageIndex: 0,
    //         items: []
    //     })

    //     const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest', 'postStatus'])
    //     sftpRepository.findAllByStatus.and.resolveTo([{
    //         eventId: event1.id,
    //         observationId: observation.id,
    //         status: SftpStatus.PENDING,
    //         createdAt: 1,
    //         updatedAt: 1
    //     }])
    //     sftpRepository.postStatus.and.resolveTo({
    //         eventId: event1.id,
    //         observationId: observation.id,
    //         status: SftpStatus.SUCCESS,
    //         createdAt: 1,
    //         updatedAt: 1
    //     })
    //     sftpRepository.findLatest.and.resolveTo(null)

    //     archiveFactory.createArchiver.and.returnValue(newArchiver(ArchiveStatus.Incomplete))

    //     const controller = new SftpController(
    //         stateRepository,
    //         eventRepository,
    //         observationRepository,
    //         sftpRepository,
    //         sftpClient,
    //         archiveFactory,
    //         console
    //     )

    //     await controller.start()
    //     clock.tick(clockTickMillis)
    //     await controller.stop()

    //     expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(1)
    //     expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
    // })

    // it('processes new observations w/ create trigger', async () => {
    //     stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    //     const clockTickMillis = stateRepository.state.interval * 1000 + 1

    //     const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    //     eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    //     const observation = newObservation(event1, new Date())

    //     eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    //     eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
    //         totalCount: 1,
    //         pageSize: 10,
    //         pageIndex: 0,
    //         items: [observation]
    //     })

    //     const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest', 'postStatus', 'isProcessed'])
    //     sftpRepository.findAllByStatus.and.resolveTo([])
    //     sftpRepository.postStatus.and.resolveTo({
    //         eventId: event1.id,
    //         observationId: observation.id,
    //         status: SftpStatus.SUCCESS,
    //         createdAt: 1,
    //         updatedAt: 1
    //     })
    //     sftpRepository.findLatest.and.resolveTo(null)
    //     sftpRepository.isProcessed.and.resolveTo(false)

    //     const archiverSpy = jasmine.createSpyObj<ObservationArchiver>('archiver', ['createArchive'])
    //     archiverSpy.createArchive.and.resolveTo(ArchiveResult.complete(archiver('zip')))
    //     archiveFactory.createArchiver.and.returnValue(archiverSpy)

    //     const controller = new SftpController(
    //         stateRepository,
    //         eventRepository,
    //         observationRepository,
    //         sftpRepository,
    //         sftpClient,
    //         archiveFactory,
    //         console
    //     )

    //     await controller.start()
    //     clock.tick(clockTickMillis)
    //     await controller.stop()

    //     expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(1)
    //     expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
    //     expect(archiverSpy.createArchive).toHaveBeenCalled()
    // })

    // it('processes updated observations w/ create/update trigger', async () => {
    //     stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true }
    //     const clockTickMillis = stateRepository.state.interval * 1000 + 1

    //     const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    //     eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    //     const observation = newObservation(event1, new Date())

    //     eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    //     eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
    //         totalCount: 1,
    //         pageSize: 10,
    //         pageIndex: 0,
    //         items: [observation]
    //     })

    //     const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest', 'postStatus', 'isProcessed'])
    //     sftpRepository.findAllByStatus.and.resolveTo([])
    //     sftpRepository.postStatus.and.resolveTo({
    //         eventId: event1.id,
    //         observationId: observation.id,
    //         status: SftpStatus.SUCCESS,
    //         createdAt: 1,
    //         updatedAt: 1
    //     })
    //     sftpRepository.findLatest.and.resolveTo(null)
    //     sftpRepository.isProcessed.and.resolveTo(false)

    //     const archiverSpy = jasmine.createSpyObj<ObservationArchiver>('archiver', ['createArchive'])
    //     archiverSpy.createArchive.and.resolveTo(ArchiveResult.complete(archiver('zip')))
    //     archiveFactory.createArchiver.and.returnValue(archiverSpy)

    //     const controller = new SftpController(
    //         stateRepository,
    //         eventRepository,
    //         observationRepository,
    //         sftpRepository,
    //         sftpClient,
    //         archiveFactory,
    //         console
    //     )

    //     await controller.start()
    //     clock.tick(clockTickMillis)
    //     await controller.stop()

    //     expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(1)
    //     expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledWith(event1.id, observation.id, SftpStatus.SUCCESS)
    //     expect(archiverSpy.createArchive).toHaveBeenCalled()
    // })

    // it('skips processing of updated observations w/ create trigger', async () => {
    //     stateRepository.state = { ...defaultSFTPPluginConfig, interval: 10, enabled: true, initiation: { rule: TriggerRule.Create, timeout: 60 } }
    //     const clockTickMillis = stateRepository.state.interval * 1000 + 1

    //     const eventRepository = jasmine.createSpyObj<MageEventRepository>('eventRepository', ['findActiveEvents'])
    //     eventRepository.findActiveEvents.and.resolveTo([copyMageEventAttrs(event1)])

    //     const observation = newObservation(event1, new Date())

    //     eventObservationRepositories.get(event1.id)?.findById.and.resolveTo(Observation.evaluate(observation, event1))
    //     eventObservationRepositories.get(event1.id)?.findLastModifiedAfter.and.resolveTo({
    //         totalCount: 1,
    //         pageSize: 10,
    //         pageIndex: 0,
    //         items: [observation]
    //     })

    //     const sftpRepository = jasmine.createSpyObj<SftpObservationRepository>('sftpObservationRepository', ['findAllByStatus', 'findLatest', 'postStatus', 'isProcessed'])
    //     sftpRepository.findAllByStatus.and.resolveTo([])
    //     sftpRepository.postStatus.and.resolveTo({
    //         eventId: event1.id,
    //         observationId: observation.id,
    //         status: SftpStatus.SUCCESS,
    //         createdAt: 1,
    //         updatedAt: 1
    //     })
    //     sftpRepository.findLatest.and.resolveTo(null)
    //     sftpRepository.isProcessed.and.resolveTo(true)

    //     const archiverSpy = jasmine.createSpyObj<ObservationArchiver>('archiver', ['createArchive'])
    //     archiverSpy.createArchive.and.resolveTo(ArchiveResult.complete(archiver('zip')))
    //     archiveFactory.createArchiver.and.returnValue(archiverSpy)

    //     const controller = new SftpController(
    //         stateRepository,
    //         eventRepository,
    //         observationRepository,
    //         sftpRepository,
    //         sftpClient,
    //         archiveFactory,
    //         console
    //     )

    //     await controller.start()
    //     clock.tick(clockTickMillis)
    //     await controller.stop()

    //     expect(eventRepository.findActiveEvents).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.findAllByStatus).toHaveBeenCalledTimes(1)
    //     expect(eventObservationRepositories.get(event1.id)?.findLastModifiedAfter).toHaveBeenCalledTimes(1)
    //     expect(sftpRepository.postStatus).toHaveBeenCalledTimes(0)
    //     expect(archiverSpy.createArchive).toHaveBeenCalledTimes(0)
    // })

    // it('skips processed observations w/ create trigger', async () => {
    // })

    // it('waits for observations to contain all attachments', async () => {
    // })

    // it('processes incomplete observation after timeout', async () => {
    // })
})