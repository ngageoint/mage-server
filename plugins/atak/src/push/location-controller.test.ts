import { AtakLocationPushController } from './location-controller'
import { UserLocation, UserLocationSavedDomainEvent } from '../entities/user-location'

const TAK_SEND_TARGET = { mageEvent: { id: 1, name: 'Test Event' } as any, host: 'tak.example.com', port: 8088 }

const fakeLocation = (overrides: { userId?: string, eventId?: number } = {}): UserLocation => ({
  userId: overrides.userId ?? 'user-1',
  eventId: overrides.eventId ?? 1,
  geometry: { type: 'Point', coordinates: [ 0, 0 ] },
  properties: { timestamp: new Date() }
})

const makeController = (overrides: {
  locationSharingEnabled?: boolean
  hasConnection?: boolean
  users?: Record<string, { displayName: string } | null>
  send?: jest.Mock
  buildLocationCot?: jest.Mock
} = {}) => {
  const locationSharingEnabled = overrides.locationSharingEnabled ?? true
  const hasConnection = overrides.hasConnection ?? true

  const resolveSendTarget = jest.fn(async () =>
    hasConnection ? TAK_SEND_TARGET : null
  )
  const settingsRepository = {
    isEnabled: jest.fn(),
    setEnabled: jest.fn(),
    findAllEnabled: jest.fn(),
    isLocationSharingEnabled: jest.fn(async () => locationSharingEnabled),
    setLocationSharingEnabled: jest.fn()
  }
  const userRepository = {
    findById: jest.fn(),
    findAllByIds: jest.fn(async (ids: string[]) => {
      const result: Record<string, any> = {}
      for (const id of ids) {
        result[id] = overrides.users?.[id] ?? null
      }
      return result
    }),
    find: jest.fn()
  }
  const log = { warn: jest.fn(), error: jest.fn() }
  const send = overrides.send ?? jest.fn(async () => undefined)
  const buildLocationCot = overrides.buildLocationCot ?? jest.fn((location: UserLocation, callsign: string) => ({
    uid: `MAGE-user-${location.userId}`,
    xml: `<event uid="MAGE-user-${location.userId}"><contact callsign="${callsign}"/></event>`
  }))

  const controller = new AtakLocationPushController(
    resolveSendTarget as any,
    settingsRepository as any,
    userRepository as any,
    log as any,
    send,
    buildLocationCot
  )

  return { controller, resolveSendTarget, settingsRepository, userRepository, log, send, buildLocationCot }
}

describe('AtakLocationPushController', () => {

  it('does nothing for an event with location sharing disabled', async () => {
    const { controller, send } = makeController({ locationSharingEnabled: false })
    const event: UserLocationSavedDomainEvent = { locations: [ fakeLocation() ] }

    await controller.handleLocationsSaved(event)

    expect(send).not.toHaveBeenCalled()
  })

  it('warns and skips when the event has no TAK Server connection configured', async () => {
    const { controller, send, log } = makeController({ hasConnection: false })
    const event: UserLocationSavedDomainEvent = { locations: [ fakeLocation() ] }

    await controller.handleLocationsSaved(event)

    expect(log.warn).toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('resolves the user\'s display name as the callsign', async () => {
    const { controller, send, buildLocationCot } = makeController({
      users: { 'user-1': { displayName: 'Alice' } }
    })
    const event: UserLocationSavedDomainEvent = { locations: [ fakeLocation({ userId: 'user-1' }) ] }

    await controller.handleLocationsSaved(event)

    expect(buildLocationCot).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }), 'Alice', 'Test Event')
    expect(send).toHaveBeenCalledWith('tak.example.com', 8088, expect.stringContaining('MAGE-user-user-1'))
  })

  it('falls back to the user id when the user can\'t be found', async () => {
    const { controller, buildLocationCot } = makeController({ users: {} })
    const event: UserLocationSavedDomainEvent = { locations: [ fakeLocation({ userId: 'user-9' }) ] }

    await controller.handleLocationsSaved(event)

    expect(buildLocationCot).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-9' }), 'user-9', 'Test Event')
  })

  it('continues past one location\'s send failure rather than aborting the batch', async () => {
    const failing = fakeLocation({ userId: 'user-fail' })
    const ok = fakeLocation({ userId: 'user-ok' })
    const send = jest.fn(async (_host: string, _port: number, xml: string) => {
      if (xml.includes('user-fail')) {
        throw new Error('connection refused')
      }
    })
    const { controller, log } = makeController({ send })
    const event: UserLocationSavedDomainEvent = { locations: [ failing, ok ] }

    await controller.handleLocationsSaved(event)

    expect(log.error).toHaveBeenCalled()
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('never rejects even if the user lookup itself fails', async () => {
    const { controller, userRepository, log } = makeController()
    userRepository.findAllByIds.mockRejectedValueOnce(new Error('db down'))
    const event: UserLocationSavedDomainEvent = { locations: [ fakeLocation() ] }

    await expect(controller.handleLocationsSaved(event)).resolves.toBeUndefined()
    expect(log.error).toHaveBeenCalled()
  })
})
