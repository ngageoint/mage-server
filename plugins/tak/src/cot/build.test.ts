import { buildCotEventXml } from './build'
import { parseCotEvent } from './parse'

// parseCotEvent on this branch doesn't parse <contact callsign> (that work
// lives on feature/tak-pull-improvements, not yet merged here) - read it
// straight out of the built XML instead.
const callsignOf = (xml: string): string | undefined => xml.match(/<contact callsign="([^"]*)"/)?.[1]

const EVENT_NAME = 'Hurricane Response'

const fakeObservation = (overrides: {
  id?: string
  geometry?: { type: string, coordinates?: [ number, number ] }
  formEntries?: Record<string, any>[]
  primaryFeedField?: string | undefined
} = {}): any => {
  const id = overrides.id ?? 'obs-1'
  const geometry = overrides.geometry ?? { type: 'Point', coordinates: [ 31.1656, 48.3794 ] }
  const formEntries = overrides.formEntries ?? [ { id: 'entry-1', formId: 1, title: 'Fuel Depot', notes: 'Looks active' } ]
  return {
    id,
    geometry,
    formEntries,
    mageEvent: {
      formFor: (formId: number) => formEntries.find(x => x.formId === formId)
        ? { id: formId, primaryFeedField: overrides.primaryFeedField }
        : null
    }
  }
}

describe('buildCotEventXml', () => {

  it('returns null for a non-Point geometry', () => {
    const observation = fakeObservation({ geometry: { type: 'Polygon' } })
    expect(buildCotEventXml(observation, EVENT_NAME)).toBeNull()
  })

  it('builds a CoT event with a stable, prefixed uid and the observation point', () => {
    const observation = fakeObservation({ id: 'obs-42', primaryFeedField: 'title' })
    const built = buildCotEventXml(observation, EVENT_NAME)
    expect(built?.uid).toBe('MAGE-obs-42')
    const event = parseCotEvent(built!.xml)
    expect(event?.uid).toBe('MAGE-obs-42')
    expect(event?.point).toEqual({ lat: 48.3794, lon: 31.1656, hae: 0, ce: 9999999, le: 9999999 })
  })

  it('uses the first form entry\'s primaryFeedField value as the callsign', () => {
    const observation = fakeObservation({ primaryFeedField: 'title' })
    const built = buildCotEventXml(observation, EVENT_NAME)
    expect(callsignOf(built!.xml)).toBe('Fuel Depot')
    expect(built!.callsign).toBe('Fuel Depot')
  })

  it('falls back to the observation id when the form has no primaryFeedField', () => {
    const observation = fakeObservation({ id: 'obs-7', primaryFeedField: undefined })
    const built = buildCotEventXml(observation, EVENT_NAME)
    expect(callsignOf(built!.xml)).toBe('obs-7')
  })

  it('falls back to the observation id when the primaryFeedField value is empty', () => {
    const observation = fakeObservation({
      id: 'obs-8',
      primaryFeedField: 'title',
      formEntries: [ { id: 'entry-1', formId: 1, title: '' } ]
    })
    const built = buildCotEventXml(observation, EVENT_NAME)
    expect(callsignOf(built!.xml)).toBe('obs-8')
  })

  it('falls back to the observation id when there are no form entries', () => {
    const observation = fakeObservation({ id: 'obs-9', formEntries: [] })
    const built = buildCotEventXml(observation, EVENT_NAME)
    expect(callsignOf(built!.xml)).toBe('obs-9')
  })

  it('flattens a form entry\'s fields into remarks, excluding id/formId', () => {
    const observation = fakeObservation({ primaryFeedField: 'title' })
    const built = buildCotEventXml(observation, EVENT_NAME)
    expect(built!.xml).toContain('title: Fuel Depot')
    expect(built!.xml).toContain('notes: Looks active')
    expect(built!.xml).not.toContain('formId: 1')
  })

  it('flattens every form entry into remarks, not just the first, while the callsign still uses only the first', () => {
    const observation = fakeObservation({
      primaryFeedField: 'title',
      formEntries: [
        { id: 'entry-1', formId: 1, title: 'Fuel Depot', notes: 'Looks active' },
        { id: 'entry-2', formId: 1, title: 'Second Entry', notes: 'Also relevant' }
      ]
    })
    const built = buildCotEventXml(observation, EVENT_NAME)
    expect(built!.xml).toContain('title: Fuel Depot')
    expect(built!.xml).toContain('title: Second Entry')
    expect(built!.xml).toContain('notes: Also relevant')
    expect(callsignOf(built!.xml)).toBe('Fuel Depot')
  })

  it('includes the MAGE event name in remarks', () => {
    const observation = fakeObservation()
    const built = buildCotEventXml(observation, EVENT_NAME)
    expect(built!.xml).toContain('MAGE event: Hurricane Response')
  })

  it('sets stale to 1 hour after start', () => {
    const observation = fakeObservation()
    const built = buildCotEventXml(observation, EVENT_NAME)
    const event = parseCotEvent(built!.xml)
    const start = new Date(event!.start).getTime()
    const stale = new Date(event!.stale).getTime()
    expect(stale - start).toBe(60 * 60 * 1000)
  })
})
