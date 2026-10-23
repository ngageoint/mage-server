import plugin from './index'
import { TakServerServiceType } from './atak'
import { FeedsPluginHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.feeds'

const fakeServices = {
  mageEventRepository: { findById: jest.fn(async () => null) },
  feedRepository: { findAllByIds: jest.fn(async () => ({})) },
  feedServiceRepository: { findById: jest.fn(async () => null) },
  feedServiceTypeRepository: { findById: jest.fn(async () => null) },
  observationRepositoryForEvent: jest.fn(async () => ({ findLastModifiedAfter: jest.fn(async () => ({ items: [] })) })),
  userRepository: { findAllByIds: jest.fn(async () => ({})) },
  getDbConnection: jest.fn(async () => ({ model: jest.fn(() => ({ find: jest.fn(async () => []) })) }))
} as any

describe('atak mage plugin hooks', function() {

  let hooks: FeedsPluginHooks & { mageEvent?: { onUserLocations?: (event: any) => Promise<void> } }

  beforeEach(async () => {
    // init() starts the push controller's polling loop fire-and-forget. Fake
    // timers keep its self-rescheduling setTimeout from ever becoming a real
    // timer, which would otherwise leave the test process hanging forever.
    jest.useFakeTimers()
    hooks = await plugin.init(fakeServices)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('feeds hook', function() {

    it('provides the service type', async function() {

      const serviceTypes = await hooks.feeds.loadServiceTypes()

      expect(serviceTypes).toHaveLength(1)
      expect(serviceTypes[0]).toBeInstanceOf(TakServerServiceType)
    })
  })

  describe('mageEvent hook', function() {

    it('registers onUserLocations and it never rejects, even on an internal failure', async function() {
      fakeServices.userRepository.findAllByIds.mockRejectedValueOnce(new Error('db down'))

      await expect(
        hooks.mageEvent?.onUserLocations?.({ locations: [ { userId: 'u1', eventId: 1, geometry: { type: 'Point', coordinates: [ 0, 0 ] }, properties: { timestamp: new Date() } } ] })
      ).resolves.toBeUndefined()
    })
  })
})
