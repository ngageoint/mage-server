import { createTakConnectionResolver, createTakSendTargetResolver, resolveTakConnection } from './resolve-connection'
import { TakServerServiceType } from '../tak'

const OTHER_SERVICE_TYPE_ID = 'other-plugin-service-type'

const makeRepos = (overrides: {
  feedIds?: string[]
  feeds?: Record<string, { id: string, service: string } | null>
  services?: Record<string, { id: string, serviceType: string, config: any }>
  serviceTypes?: Record<string, { pluginServiceTypeId: string }>
} = {}) => {
  const feedIds = overrides.feedIds ?? [ 'feed-1' ]
  const feeds = overrides.feeds ?? { 'feed-1': { id: 'feed-1', service: 'service-1' } }
  const services = overrides.services ?? {
    'service-1': { id: 'service-1', serviceType: 'registered-tak-type', config: { baseUrl: 'http://tak.example.com', cotPort: 8088 } }
  }
  const serviceTypes = overrides.serviceTypes ?? {
    'registered-tak-type': { pluginServiceTypeId: TakServerServiceType.SERVICE_TYPE_ID }
  }

  const fakeEvent = { id: 1, feedIds }
  const mageEventRepository = {
    findById: jest.fn(async (eventId: number) => ({ ...fakeEvent, id: eventId }))
  }
  const feedRepository = {
    findAllByIds: jest.fn(async (ids: string[]) => {
      const result: Record<string, any> = {}
      for (const id of ids) {
        result[id] = feeds[id] ?? null
      }
      return result
    })
  }
  const feedServiceRepository = {
    findById: jest.fn(async (serviceId: string) => services[serviceId] ?? null)
  }
  const feedServiceTypeRepository = {
    findById: jest.fn(async (serviceTypeId: string) => serviceTypes[serviceTypeId] ?? null)
  }

  return { mageEventRepository, feedRepository, feedServiceRepository, feedServiceTypeRepository }
}

describe('resolveTakConnection', () => {

  it('resolves the config and the loaded event for the event\'s TAK Server feed', async () => {
    const repos = makeRepos()

    const result = await resolveTakConnection(1, repos.mageEventRepository as any, repos.feedRepository as any, repos.feedServiceRepository as any, repos.feedServiceTypeRepository as any)

    expect(result?.config).toEqual({ baseUrl: 'http://tak.example.com', cotPort: 8088 })
    expect(result?.mageEvent).toEqual({ id: 1, feedIds: [ 'feed-1' ] })
  })

  it('returns null when the event has no feeds', async () => {
    const repos = makeRepos({ feedIds: [] })

    const result = await resolveTakConnection(1, repos.mageEventRepository as any, repos.feedRepository as any, repos.feedServiceRepository as any, repos.feedServiceTypeRepository as any)

    expect(result).toBeNull()
  })

  it('returns null when the event doesn\'t exist', async () => {
    const mageEventRepository = { findById: jest.fn(async () => null) }
    const repos = makeRepos()

    const result = await resolveTakConnection(1, mageEventRepository as any, repos.feedRepository as any, repos.feedServiceRepository as any, repos.feedServiceTypeRepository as any)

    expect(result).toBeNull()
  })

  it('skips feeds backed by a different service type and finds the TAK one', async () => {
    const repos = makeRepos({
      feedIds: [ 'feed-msi', 'feed-tak' ],
      feeds: {
        'feed-msi': { id: 'feed-msi', service: 'service-msi' },
        'feed-tak': { id: 'feed-tak', service: 'service-tak' }
      },
      services: {
        'service-msi': { id: 'service-msi', serviceType: 'registered-msi-type', config: { apiKey: 'xyz' } },
        'service-tak': { id: 'service-tak', serviceType: 'registered-tak-type', config: { baseUrl: 'http://tak.example.com', cotPort: 8088 } }
      },
      serviceTypes: {
        'registered-msi-type': { pluginServiceTypeId: OTHER_SERVICE_TYPE_ID },
        'registered-tak-type': { pluginServiceTypeId: TakServerServiceType.SERVICE_TYPE_ID }
      }
    })

    const result = await resolveTakConnection(1, repos.mageEventRepository as any, repos.feedRepository as any, repos.feedServiceRepository as any, repos.feedServiceTypeRepository as any)

    expect(result?.config).toEqual({ baseUrl: 'http://tak.example.com', cotPort: 8088 })
  })

  it('uses the first TAK Server feed and warns when an event has more than one configured', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const repos = makeRepos({
      feedIds: [ 'feed-tak-1', 'feed-tak-2' ],
      feeds: {
        'feed-tak-1': { id: 'feed-tak-1', service: 'service-tak-1' },
        'feed-tak-2': { id: 'feed-tak-2', service: 'service-tak-2' }
      },
      services: {
        'service-tak-1': { id: 'service-tak-1', serviceType: 'registered-tak-type', config: { baseUrl: 'http://tak-1.example.com', cotPort: 8088 } },
        'service-tak-2': { id: 'service-tak-2', serviceType: 'registered-tak-type', config: { baseUrl: 'http://tak-2.example.com', cotPort: 8088 } }
      }
    })

    const result = await resolveTakConnection(1, repos.mageEventRepository as any, repos.feedRepository as any, repos.feedServiceRepository as any, repos.feedServiceTypeRepository as any)

    expect(result?.config).toEqual({ baseUrl: 'http://tak-1.example.com', cotPort: 8088 })
    expect(warnSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })

  it('returns null when none of the event\'s feeds are backed by a TAK Server service', async () => {
    const repos = makeRepos({
      services: {
        'service-1': { id: 'service-1', serviceType: 'registered-msi-type', config: { apiKey: 'xyz' } }
      },
      serviceTypes: {
        'registered-msi-type': { pluginServiceTypeId: OTHER_SERVICE_TYPE_ID }
      }
    })

    const result = await resolveTakConnection(1, repos.mageEventRepository as any, repos.feedRepository as any, repos.feedServiceRepository as any, repos.feedServiceTypeRepository as any)

    expect(result).toBeNull()
  })
})

describe('createTakConnectionResolver', () => {

  it('binds the repositories into a single resolve function', async () => {
    const repos = makeRepos()
    const resolveConnection = createTakConnectionResolver(
      repos.mageEventRepository as any,
      repos.feedRepository as any,
      repos.feedServiceRepository as any,
      repos.feedServiceTypeRepository as any
    )

    const result = await resolveConnection(1)

    expect(result?.config).toEqual({ baseUrl: 'http://tak.example.com', cotPort: 8088 })
  })
})

describe('createTakSendTargetResolver', () => {

  it('resolves a host/port target when a connection has a cotPort configured', async () => {
    const resolveConnection = jest.fn(async () => ({
      mageEvent: { id: 1 } as any,
      config: { baseUrl: 'http://tak.example.com', cotPort: 8088 }
    }))
    const resolveSendTarget = createTakSendTargetResolver(resolveConnection)

    const target = await resolveSendTarget(1)

    expect(target).toEqual({ mageEvent: { id: 1 }, host: 'tak.example.com', port: 8088 })
  })

  it('returns null when there is no connection', async () => {
    const resolveConnection = jest.fn(async () => null)
    const resolveSendTarget = createTakSendTargetResolver(resolveConnection)

    expect(await resolveSendTarget(1)).toBeNull()
  })

  it('returns null when the connection has no cotPort configured', async () => {
    const resolveConnection = jest.fn(async () => ({
      mageEvent: { id: 1 } as any,
      config: { baseUrl: 'http://tak.example.com' }
    }))
    const resolveSendTarget = createTakSendTargetResolver(resolveConnection)

    expect(await resolveSendTarget(1)).toBeNull()
  })
})
