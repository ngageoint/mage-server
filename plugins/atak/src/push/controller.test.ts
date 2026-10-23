import { AtakPushController, PAGE_SIZE } from './controller'
import { createTakConnectionResolver, createTakSendTargetResolver } from './resolve-connection'
import { TakServerServiceType } from '../atak'

const TAK_CONFIG = { baseUrl: 'http://tak.example.com', cotPort: 8088 }

const fakeAttrs = (id: string, lastModified: Date): any => ({ id, lastModified, geometry: { type: 'Point', coordinates: [ 0, 0 ] }, properties: { forms: [] } })

const makeController = (overrides: {
  hasConnection?: boolean
  observations?: any[]
  tracked?: Record<string, { lastSyncedAt: Date, callsign?: string }>
  send?: jest.Mock
  buildCot?: jest.Mock
  enabledEvents?: number[]
} = {}) => {
  const hasConnection = overrides.hasConnection ?? true
  const observations = overrides.observations ?? []
  const tracked = overrides.tracked ?? {}

  const fakeEvent = { id: 1, name: 'Test Event', feedIds: hasConnection ? [ 'feed-1' ] : [], formFor: jest.fn(() => ({ primaryFeedField: undefined })) }

  const mageEventRepository = { findById: jest.fn(async () => fakeEvent) }
  const feedRepository = {
    findAllByIds: jest.fn(async () => hasConnection ? { 'feed-1': { id: 'feed-1', service: 'service-1' } } : {})
  }
  const feedServiceRepository = {
    findById: jest.fn(async () => ({ id: 'service-1', serviceType: 'registered-tak-type', config: TAK_CONFIG }))
  }
  const feedServiceTypeRepository = {
    findById: jest.fn(async () => ({ pluginServiceTypeId: TakServerServiceType.SERVICE_TYPE_ID }))
  }
  const observationRepository = {
    findLastModifiedAfter: jest.fn(async (_timestamp: number, paging: { pageSize: number, pageIndex: number }) => {
      const start = paging.pageIndex * paging.pageSize
      return { items: observations.slice(start, start + paging.pageSize), totalCount: observations.length }
    })
  }
  const observationRepositoryForEvent = jest.fn(async () => observationRepository)
  const settingsRepository = {
    isEnabled: jest.fn(async () => true),
    setEnabled: jest.fn(async () => ({ eventId: 1, enabled: true })),
    findAllEnabled: jest.fn(async () => (overrides.enabledEvents ?? []).map(eventId => ({ eventId, enabled: true }))),
    isLocationSharingEnabled: jest.fn(async () => false),
    setLocationSharingEnabled: jest.fn(async () => ({ eventId: 1, enabled: true, locationSharingEnabled: true }))
  }
  const trackingRepository = {
    findByObservation: jest.fn(async (eventId: number, observationId: string) =>
      tracked[observationId] ? { eventId, observationId, takUid: `MAGE-${observationId}`, callsign: tracked[observationId].callsign ?? `Callsign-${observationId}`, firstPushedAt: tracked[observationId].lastSyncedAt, lastSyncedAt: tracked[observationId].lastSyncedAt } : null
    ),
    findAllForEvent: jest.fn(async () => Object.entries(tracked).map(([ observationId, t ]) => ({
      eventId: 1, observationId, takUid: `MAGE-${observationId}`, callsign: t.callsign ?? `Callsign-${observationId}`, firstPushedAt: t.lastSyncedAt, lastSyncedAt: t.lastSyncedAt
    }))),
    findRecentForEvent: jest.fn(async (eventId: number, limit: number) => Object.entries(tracked)
      .map(([ observationId, t ]) => ({ eventId, observationId, takUid: `MAGE-${observationId}`, callsign: t.callsign ?? `Callsign-${observationId}`, firstPushedAt: t.lastSyncedAt, lastSyncedAt: t.lastSyncedAt }))
      .sort((a, b) => b.lastSyncedAt.getTime() - a.lastSyncedAt.getTime())
      .slice(0, limit)),
    recordPush: jest.fn(async () => ({}))
  }
  const log = { warn: jest.fn(), error: jest.fn() }
  const send = overrides.send ?? jest.fn(async () => undefined)
  const buildCot = overrides.buildCot ?? jest.fn((observation: any) => ({ uid: `MAGE-${observation.id}`, xml: `<event uid="MAGE-${observation.id}"/>`, callsign: `Callsign-${observation.id}` }))

  const resolveConnection = createTakConnectionResolver(
    mageEventRepository as any,
    feedRepository as any,
    feedServiceRepository as any,
    feedServiceTypeRepository as any
  )
  const resolveSendTarget = createTakSendTargetResolver(resolveConnection)

  const controller = new AtakPushController(
    resolveSendTarget,
    observationRepositoryForEvent as any,
    settingsRepository as any,
    trackingRepository as any,
    log as any,
    send,
    buildCot
  )

  return { controller, mageEventRepository, observationRepositoryForEvent, settingsRepository, trackingRepository, log, send, buildCot }
}

describe('AtakPushController', () => {

  it('isEnabled/setEnabled delegate to the settings repository', async () => {
    const { controller, settingsRepository } = makeController()

    await controller.isEnabled(1)
    await controller.setEnabled(1, true)

    expect(settingsRepository.isEnabled).toHaveBeenCalledWith(1)
    expect(settingsRepository.setEnabled).toHaveBeenCalledWith(1, true)
  })

  it('isLocationSharingEnabled/setLocationSharingEnabled delegate to the settings repository', async () => {
    const { controller, settingsRepository } = makeController()

    await controller.isLocationSharingEnabled(1)
    await controller.setLocationSharingEnabled(1, true)

    expect(settingsRepository.isLocationSharingEnabled).toHaveBeenCalledWith(1)
    expect(settingsRepository.setLocationSharingEnabled).toHaveBeenCalledWith(1, true)
  })

  it('warns and does nothing when the event has no TAK Server connection configured', async () => {
    const { controller, observationRepositoryForEvent, log } = makeController({ hasConnection: false })

    await controller.pushEventObservations(1)

    expect(log.warn).toHaveBeenCalled()
    expect(observationRepositoryForEvent).not.toHaveBeenCalled()
  })

  it('pages through more than one page of observations', async () => {
    const observations = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => fakeAttrs(`obs-${i}`, new Date()))
    const { controller, send } = makeController({ observations })

    await controller.pushEventObservations(1)

    expect(send).toHaveBeenCalledTimes(PAGE_SIZE + 1)
  })

  it('pushes a new, untracked observation', async () => {
    const observation = fakeAttrs('obs-1', new Date('2026-01-01'))
    const { controller, send, buildCot, trackingRepository } = makeController({ observations: [ observation ] })

    await controller.pushEventObservations(1)

    expect(buildCot).toHaveBeenCalledWith(expect.objectContaining({ id: 'obs-1' }), 'Test Event')
    expect(send).toHaveBeenCalledWith('tak.example.com', 8088, '<event uid="MAGE-obs-1"/>')
    expect(trackingRepository.recordPush).toHaveBeenCalledWith(1, 'obs-1', 'MAGE-obs-1', expect.any(Date), 'Callsign-obs-1')
  })

  it('skips an observation that has not changed since it was last synced', async () => {
    const observation = fakeAttrs('obs-1', new Date('2026-01-01'))
    const { controller, send } = makeController({
      observations: [ observation ],
      tracked: { 'obs-1': { lastSyncedAt: new Date('2026-01-02') } }
    })

    await controller.pushEventObservations(1)

    expect(send).not.toHaveBeenCalled()
  })

  it('re-pushes an observation that changed after its last sync', async () => {
    const observation = fakeAttrs('obs-1', new Date('2026-01-05'))
    const { controller, send } = makeController({
      observations: [ observation ],
      tracked: { 'obs-1': { lastSyncedAt: new Date('2026-01-01') } }
    })

    await controller.pushEventObservations(1)

    expect(send).toHaveBeenCalled()
  })

  it('skips an observation the CoT builder rejects (e.g. non-Point geometry)', async () => {
    const observation = fakeAttrs('obs-1', new Date())
    const buildCot = jest.fn(() => null)
    const { controller, send, trackingRepository } = makeController({ observations: [ observation ], buildCot })

    await controller.pushEventObservations(1)

    expect(send).not.toHaveBeenCalled()
    expect(trackingRepository.recordPush).not.toHaveBeenCalled()
  })

  it('logs and continues past one observation\'s send failure rather than aborting the batch', async () => {
    const failing = fakeAttrs('obs-fail', new Date())
    const ok = fakeAttrs('obs-ok', new Date())
    const send = jest.fn(async (_host: string, _port: number, xml: string) => {
      if (xml.includes('obs-fail')) {
        throw new Error('connection refused')
      }
    })
    const { controller, log, trackingRepository } = makeController({ observations: [ failing, ok ], send })

    await controller.pushEventObservations(1)

    expect(log.error).toHaveBeenCalled()
    expect(trackingRepository.recordPush).toHaveBeenCalledWith(1, 'obs-ok', 'MAGE-obs-ok', expect.any(Date), 'Callsign-obs-ok')
    expect(trackingRepository.recordPush).not.toHaveBeenCalledWith(1, 'obs-fail', expect.anything(), expect.anything(), expect.anything())
  })

  it('summarizes push status for an event, including the most recently synced observations', async () => {
    const { controller } = makeController({
      tracked: {
        'obs-1': { lastSyncedAt: new Date('2026-01-01') },
        'obs-2': { lastSyncedAt: new Date('2026-01-03') }
      }
    })

    const status = await controller.findPushStatusForEvent(1)

    expect(status).toEqual({
      enabled: true,
      locationSharingEnabled: false,
      connectionConfigured: true,
      pushedCount: 2,
      lastSyncedAt: new Date('2026-01-03'),
      recentlySynced: [
        { observationId: 'obs-2', callsign: 'Callsign-obs-2', syncedAt: new Date('2026-01-03') },
        { observationId: 'obs-1', callsign: 'Callsign-obs-1', syncedAt: new Date('2026-01-01') }
      ]
    })
  })

  it('limits recentlySynced to the 5 most recently synced observations', async () => {
    const tracked: Record<string, { lastSyncedAt: Date }> = {}
    for (let i = 0; i < 8; i++) {
      tracked[`obs-${i}`] = { lastSyncedAt: new Date(2026, 0, i + 1) }
    }
    const { controller } = makeController({ tracked })

    const status = await controller.findPushStatusForEvent(1)

    expect(status.recentlySynced).toHaveLength(5)
    expect(status.recentlySynced.map(x => x.observationId)).toEqual([ 'obs-7', 'obs-6', 'obs-5', 'obs-4', 'obs-3' ])
  })

  it('reports connectionConfigured: false when no TAK Server feed resolves', async () => {
    const { controller } = makeController({ hasConnection: false })

    const status = await controller.findPushStatusForEvent(1)

    expect(status.connectionConfigured).toBe(false)
  })

  describe('polling', () => {

    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('start() pushes every enabled event once before returning', async () => {
      const { controller } = makeController({ enabledEvents: [ 1, 2, 3 ] })
      const pushSpy = jest.spyOn(controller, 'pushEventObservations').mockResolvedValue()

      await controller.start()

      expect(pushSpy).toHaveBeenCalledTimes(3)
      expect(pushSpy).toHaveBeenCalledWith(1)
      expect(pushSpy).toHaveBeenCalledWith(2)
      expect(pushSpy).toHaveBeenCalledWith(3)
    })

    it('reschedules another poll after the interval elapses', async () => {
      const { controller } = makeController({ enabledEvents: [ 1 ] })
      const pushSpy = jest.spyOn(controller, 'pushEventObservations').mockResolvedValue()

      await controller.start(1000)
      expect(pushSpy).toHaveBeenCalledTimes(1)

      await jest.advanceTimersByTimeAsync(1000)
      expect(pushSpy).toHaveBeenCalledTimes(2)

      controller.stop()
    })

    it('stop() prevents further scheduled polls', async () => {
      const { controller } = makeController({ enabledEvents: [ 1 ] })
      const pushSpy = jest.spyOn(controller, 'pushEventObservations').mockResolvedValue()

      await controller.start(1000)
      controller.stop()

      await jest.advanceTimersByTimeAsync(5000)
      expect(pushSpy).toHaveBeenCalledTimes(1)
    })

    it('one event failing does not stop the others in the same poll tick', async () => {
      const { controller, log } = makeController({ enabledEvents: [ 1, 2 ] })
      jest.spyOn(controller, 'pushEventObservations').mockImplementation(async (eventId: number) => {
        if (eventId === 1) {
          throw new Error('resolve failed')
        }
      })

      await controller.start()

      expect(log.error).toHaveBeenCalled()
      expect(controller.pushEventObservations).toHaveBeenCalledWith(2)
    })
  })
})
