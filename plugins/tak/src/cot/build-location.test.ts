import { buildLocationCotEventXml } from './build-location'
import { parseCotEvent } from './parse'
import { UserLocation } from '../entities/user-location'

const callsignOf = (xml: string): string | undefined => xml.match(/<contact callsign="([^"]*)"/)?.[1]

const EVENT_NAME = 'Hurricane Response'

const fakeLocation = (overrides: {
  userId?: string
  eventId?: number
  coordinates?: [ number, number ]
  properties?: Partial<UserLocation['properties']>
} = {}): UserLocation => ({
  userId: overrides.userId ?? 'user-1',
  eventId: overrides.eventId ?? 1,
  geometry: { type: 'Point', coordinates: overrides.coordinates ?? [ 31.1656, 48.3794 ] },
  properties: { timestamp: new Date(), ...overrides.properties }
})

describe('buildLocationCotEventXml', () => {

  it('builds a CoT event with a stable, user-prefixed uid and the location point', () => {
    const location = fakeLocation({ userId: 'user-42' })
    const built = buildLocationCotEventXml(location, 'Alice', EVENT_NAME)
    expect(built.uid).toBe('MAGE-user-user-42')
    const event = parseCotEvent(built.xml)
    expect(event?.uid).toBe('MAGE-user-user-42')
    expect(event?.point).toEqual({ lat: 48.3794, lon: 31.1656, hae: 0, ce: 9999999, le: 9999999 })
  })

  it('uses the given callsign, not the user id', () => {
    const location = fakeLocation({ userId: 'user-1' })
    const built = buildLocationCotEventXml(location, 'Alice', EVENT_NAME)
    expect(callsignOf(built.xml)).toBe('Alice')
  })

  it('uses altitude/accuracy for hae/ce when present', () => {
    const location = fakeLocation({ properties: { altitude: 125, accuracy: 10 } })
    const built = buildLocationCotEventXml(location, 'Alice', EVENT_NAME)
    const event = parseCotEvent(built.xml)
    expect(event?.point.hae).toBe(125)
    expect(event?.point.ce).toBe(10)
  })

  it('includes a track element when speed or bearing is present', () => {
    const location = fakeLocation({ properties: { speed: 3.5, bearing: 90 } })
    const built = buildLocationCotEventXml(location, 'Alice', EVENT_NAME)
    expect(built.xml).toContain('<track')
    expect(built.xml).toContain('speed="3.5"')
    expect(built.xml).toContain('course="90"')
  })

  it('omits the track element when neither speed nor bearing is present', () => {
    const location = fakeLocation()
    const built = buildLocationCotEventXml(location, 'Alice', EVENT_NAME)
    expect(built.xml).not.toContain('<track')
  })

  it('includes a status element with battery when present', () => {
    const location = fakeLocation({ properties: { battery_level: 76 } })
    const built = buildLocationCotEventXml(location, 'Alice', EVENT_NAME)
    expect(built.xml).toContain('<status')
    expect(built.xml).toContain('battery="76"')
  })

  it('omits the status element when battery is not present', () => {
    const location = fakeLocation()
    const built = buildLocationCotEventXml(location, 'Alice', EVENT_NAME)
    expect(built.xml).not.toContain('<status')
  })

  it('includes the MAGE event name in remarks', () => {
    const location = fakeLocation()
    const built = buildLocationCotEventXml(location, 'Alice', EVENT_NAME)
    expect(built.xml).toContain('MAGE event: Hurricane Response')
  })

  it('sets a shorter stale TTL than the observation builder', () => {
    const location = fakeLocation()
    const built = buildLocationCotEventXml(location, 'Alice', EVENT_NAME)
    const event = parseCotEvent(built.xml)
    const start = new Date(event!.start).getTime()
    const stale = new Date(event!.stale).getTime()
    expect(stale - start).toBe(5 * 60 * 1000)
  })
})
