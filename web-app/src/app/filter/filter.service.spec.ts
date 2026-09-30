import { TestBed } from '@angular/core/testing'
import { FilterService } from './filter.service'
import { LocalStorageService } from '../http/local-storage.service'
import { DEFAULT_LOCATION_FILTER, DEFAULT_OBSERVATION_FILTER, EventLocationFilter, EventObservationFilter } from './filter.types'
import { BinaryCondition } from '../entities/observation/filter/entities.observation.filter'

const mockEvent = { id: 1, name: 'Test Event', teams: [{ id: 't1', userIds: ['u1'] }] }
const mockObsFilter: EventObservationFilter = { hasAttachments: true, timeInterval: { choice: { filter: 86400, label: 'Last 24 Hours' } } }
const mockLocFilter: EventLocationFilter = { ...DEFAULT_LOCATION_FILTER, memberFilter: { teamIds: ['t1'], userIds: [] } }

class MockLocalStorageService {

  getEventId = jasmine.createSpy('getEventId').and.returnValue(null)
  setEventId = jasmine.createSpy('setEventId')
  getObservationFilter = jasmine.createSpy('getObservationFilter').and.returnValue(null)
  setObservationFilter = jasmine.createSpy('setObservationFilter')
  getLocationFilter = jasmine.createSpy('getLocationFilter').and.returnValue(null)
  setLocationFilter = jasmine.createSpy('setLocationFilter')
}

describe('FilterService', () => {
  let service: FilterService
  let localStorage: MockLocalStorageService

  beforeEach(() => {
    localStorage = new MockLocalStorageService()

    TestBed.configureTestingModule({
      providers: [
        FilterService,
        { provide: LocalStorageService, useValue: localStorage }
      ]
    })

    service = TestBed.inject(FilterService)
  })

  describe('constructor', () => {
    it('initializes with null event and filters', () => {
      expect(service.getEvent()).toBeNull()
      expect(service.getObservationFilter()).toBeNull()
      expect(service.getLocationFilter()).toBeNull()
    })
  })

  describe('getSavedEventId', () => {
    it('returns null when no event id is saved', () => {
      expect(service.getSavedEventId()).toBeNull()
    })

    it('returns the saved event id from localStorage', () => {
      localStorage.getEventId.and.returnValue(mockEvent.id)
      expect(service.getSavedEventId()).toBe(mockEvent.id)
    })
  })

  describe('destroy', () => {
    beforeEach(() => {
      service.setEvent(mockEvent as any)
      localStorage.setEventId.calls.reset()
      localStorage.setObservationFilter.calls.reset()
      localStorage.setLocationFilter.calls.reset()
    })

    it('clears the event and both filters', () => {
      service.destroy()

      expect(service.getEvent()).toBeNull()
      expect(service.getObservationFilter()).toBeNull()
      expect(service.getLocationFilter()).toBeNull()
    })

    it('tells subscribers the event and filters are gone', () => {
      const events: any[] = []
      const observationFilters: any[] = []
      const locationFilters: any[] = []
      service.event$.subscribe(e => events.push(e))
      service.observationFilter$.subscribe(f => observationFilters.push(f))
      service.locationFilter$.subscribe(f => locationFilters.push(f))

      service.destroy()

      expect(events[events.length - 1]).toBeNull()
      expect(observationFilters[observationFilters.length - 1]).toBeNull()
      expect(locationFilters[locationFilters.length - 1]).toBeNull()
    })

    it('leaves the saved event and filters in storage', () => {
      service.destroy()

      expect(localStorage.setEventId).not.toHaveBeenCalled()
      expect(localStorage.setObservationFilter).not.toHaveBeenCalled()
      expect(localStorage.setLocationFilter).not.toHaveBeenCalled()
    })

    it('lets the same event id be selected again with a fresh event object', () => {
      const edited = { ...mockEvent, forms: [{ id: 9 }] }

      service.destroy()
      service.setEvent(edited as any)

      expect(service.getEvent()).toBe(edited as any)
    })
  })

  describe('setEvent', () => {
    it('updates event$ observable', (done) => {
      service.event$.subscribe(event => {
        if (event) {
          expect(event).toEqual(mockEvent as any)
          done()
        }
      })
      service.setEvent(mockEvent as any)
    })

    it('persists event id to localStorage', () => {
      service.setEvent(mockEvent as any)
      expect(localStorage.setEventId).toHaveBeenCalledWith(mockEvent.id)
    })

    it('loads per-event obs and loc filters from localStorage', () => {
      localStorage.getObservationFilter.and.returnValue(mockObsFilter)
      localStorage.getLocationFilter.and.returnValue(mockLocFilter)

      service.setEvent(mockEvent as any)

      expect(localStorage.getObservationFilter).toHaveBeenCalledWith(mockEvent.id)
      expect(localStorage.getLocationFilter).toHaveBeenCalledWith(mockEvent.id)
      expect(service.getObservationFilter()).toEqual(mockObsFilter)
      expect(service.getLocationFilter()).toEqual(mockLocFilter)
    })

    it('falls back to defaults when no per-event filters are stored', () => {
      service.setEvent(mockEvent as any)

      expect(service.getObservationFilter()).toEqual(DEFAULT_OBSERVATION_FILTER)
      expect(service.getLocationFilter()).toEqual(DEFAULT_LOCATION_FILTER)
    })

    it('drops a saved team filter that is no longer on the event', () => {
      const staleFilter = { ...DEFAULT_LOCATION_FILTER, memberFilter: { teamIds: ['stale-team'], userIds: [] } }
      localStorage.getLocationFilter.and.returnValue(staleFilter)

      service.setEvent(mockEvent as any)

      expect(service.getLocationFilter()?.memberFilter).toBeNull()
    })

    it('keeps a saved team filter that is still on the event', () => {
      localStorage.getLocationFilter.and.returnValue(mockLocFilter)

      service.setEvent(mockEvent as any)

      expect(service.getLocationFilter()?.memberFilter).toEqual(mockLocFilter.memberFilter!)
    })

    it('drops only the stale team id, keeping valid ones and any userIds', () => {
      const mixedFilter = {
        ...DEFAULT_LOCATION_FILTER,
        memberFilter: { teamIds: ['t1', 'stale-team'], userIds: ['u2'] }
      }
      localStorage.getLocationFilter.and.returnValue(mixedFilter)

      service.setEvent(mockEvent as any)

      expect(service.getLocationFilter()?.memberFilter).toEqual({ teamIds: ['t1'], userIds: ['u2'] })
    })

    it('clears obs and loc filters when event is null', () => {
      service.setEvent(mockEvent as any)
      service.setEvent(null)

      expect(service.getObservationFilter()).toBeNull()
      expect(service.getLocationFilter()).toBeNull()
    })

    it('persists null id to localStorage when clearing event', () => {
      service.setEvent(mockEvent as any)
      service.setEvent(null)
      expect(localStorage.setEventId).toHaveBeenCalledWith(null)
    })

    it('emits updated obs and loc filters via observables', (done) => {
      localStorage.getObservationFilter.and.returnValue(mockObsFilter)
      localStorage.getLocationFilter.and.returnValue(mockLocFilter)

      let obsEmitted = false
      let locEmitted = false

      service.observationFilter$.subscribe(f => {
        if (f?.hasAttachments === mockObsFilter.hasAttachments) obsEmitted = true
        if (obsEmitted && locEmitted) done()
      })
      service.locationFilter$.subscribe(f => {
        if (f?.memberFilter === mockLocFilter.memberFilter) locEmitted = true
        if (obsEmitted && locEmitted) done()
      })

      service.setEvent(mockEvent as any)
    })

    it('loads filters for the new event when switching events', () => {
      const event2 = { id: 2, name: 'Event 2' }
      const obsFilter2: EventObservationFilter = { ...DEFAULT_OBSERVATION_FILTER, isFlaggedImportant: true }

      localStorage.getObservationFilter.and.callFake((id: number) =>
        id === event2.id ? obsFilter2 : mockObsFilter
      )

      service.setEvent(mockEvent as any)
      expect(service.getObservationFilter()).toEqual(mockObsFilter)

      service.setEvent(event2 as any)
      expect(service.getObservationFilter()).toEqual(obsFilter2)
    })

    it('does not re-emit or re-persist when reselecting the already-active event', () => {
      service.setEvent(mockEvent as any)
      localStorage.setEventId.calls.reset()

      const emitted: any[] = []
      service.event$.subscribe(event => emitted.push(event))

      service.setEvent({ ...mockEvent } as any)

      expect(emitted).toEqual([mockEvent])
      expect(localStorage.setEventId).not.toHaveBeenCalled()
    })

    it('does not re-emit when both the current and new event are null', () => {
      const emitted: any[] = []
      service.event$.subscribe(event => emitted.push(event))

      service.setEvent(null)

      expect(emitted).toEqual([null])
    })
  })

  describe('setObservationFilter', () => {
    it('updates observationFilter$ observable', (done) => {
      service.setEvent(mockEvent as any)

      service.observationFilter$.subscribe(f => {
        if (f?.hasAttachments === mockObsFilter.hasAttachments && f.timeInterval === mockObsFilter.timeInterval) {
          done()
        }
      })
      service.setObservationFilter(mockObsFilter)
    })

    it('persists to localStorage with current event id', () => {
      service.setEvent(mockEvent as any)
      service.setObservationFilter(mockObsFilter)

      expect(localStorage.setObservationFilter).toHaveBeenCalledWith(
        mockEvent.id,
        jasmine.objectContaining({ hasAttachments: mockObsFilter.hasAttachments, timeInterval: mockObsFilter.timeInterval })
      )
    })

    it('does not call localStorage when no event is set', () => {
      service.setObservationFilter(mockObsFilter)

      expect(localStorage.setObservationFilter).not.toHaveBeenCalled()
    })

    it('preserves existing keyword when updating other filter state', () => {
      service.setEvent(mockEvent as any)
      service.setObservationKeyword('storm')

      service.setObservationFilter({ ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true })

      expect(service.getObservationFilter()?.fieldFilter?.keyword).toBe('storm')
    })

    it('merges passed condition into fieldFilter alongside existing keyword', () => {
      const condition: BinaryCondition = { formId: 1, field: 'f', operator: '=', value: 'x' }
      service.setEvent(mockEvent as any)
      service.setObservationKeyword('storm')

      service.setObservationFilter({ ...DEFAULT_OBSERVATION_FILTER }, condition)

      expect(service.getObservationFilter()?.fieldFilter).toEqual({ keyword: 'storm', condition })
    })

    it('sets fieldFilter to null when no keyword or condition', () => {
      service.setEvent(mockEvent as any)
      service.setObservationFilter({ ...DEFAULT_OBSERVATION_FILTER })

      expect(service.getObservationFilter()?.fieldFilter).toBeNull()
    })
  })

  describe('setObservationKeyword', () => {
    it('sets keyword in fieldFilter', () => {
      service.setEvent(mockEvent as any)
      service.setObservationKeyword('flood')

      expect(service.getObservationFilter()?.fieldFilter?.keyword).toBe('flood')
    })

    it('preserves existing condition when setting keyword', () => {
      const condition: BinaryCondition = { formId: 1, field: 'f', operator: '=', value: 'x' }
      service.setEvent(mockEvent as any)
      service.setObservationFilter({ ...DEFAULT_OBSERVATION_FILTER }, condition)

      service.setObservationKeyword('flood')

      expect(service.getObservationFilter()?.fieldFilter).toEqual({ keyword: 'flood', condition })
    })

    it('preserves other filter state when setting keyword', () => {
      service.setEvent(mockEvent as any)
      service.setObservationFilter({ ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true })

      service.setObservationKeyword('flood')

      expect(service.getObservationFilter()?.hasAttachments).toBe(true)
    })

    it('clears fieldFilter to null when keyword is undefined and no condition exists', () => {
      service.setEvent(mockEvent as any)
      service.setObservationKeyword('flood')

      service.setObservationKeyword(undefined)

      expect(service.getObservationFilter()?.fieldFilter).toBeNull()
    })

    it('preserves condition when clearing keyword', () => {
      const condition: BinaryCondition = { formId: 1, field: 'f', operator: '=', value: 'x' }
      service.setEvent(mockEvent as any)
      service.setObservationFilter({ ...DEFAULT_OBSERVATION_FILTER }, condition)
      service.setObservationKeyword('flood')

      service.setObservationKeyword(undefined)

      expect(service.getObservationFilter()?.fieldFilter?.condition).toEqual(condition)
      expect(service.getObservationFilter()?.fieldFilter?.keyword).toBeUndefined()
    })
  })

  describe('setLocationFilter', () => {
    it('updates locationFilter$ observable', (done) => {
      service.setEvent(mockEvent as any)

      service.locationFilter$.subscribe(f => {
        if (f === mockLocFilter) {
          done()
        }
      })
      service.setLocationFilter(mockLocFilter)
    })

    it('persists to localStorage with current event id', () => {
      service.setEvent(mockEvent as any)
      service.setLocationFilter(mockLocFilter)

      expect(localStorage.setLocationFilter).toHaveBeenCalledWith(mockEvent.id, mockLocFilter)
    })

    it('does not call localStorage when no event is set', () => {
      service.setLocationFilter(mockLocFilter)

      expect(localStorage.setLocationFilter).not.toHaveBeenCalled()
    })
  })

  describe('getEffectiveTimeInterval', () => {
    it('returns empty object for "all"', () => {
      const result = service.getEffectiveTimeInterval({ choice: { filter: 'all', label: 'All' } })
      expect(result).toEqual({})
    })

    it('returns start/end of today for "today"', () => {
      const result = service.getEffectiveTimeInterval({ choice: { filter: 'today', label: 'Today' } })

      expect(result.start).toBeDefined()
      expect(result.end).toBeDefined()
      expect(result.start.getHours()).toBe(0)
      expect(result.start.getMinutes()).toBe(0)
      expect(result.end.getHours()).toBe(23)
      expect(result.end.getMinutes()).toBe(59)
    })

    it('returns start/end for numeric seconds', () => {
      const before = new Date()
      const result = service.getEffectiveTimeInterval({ choice: { filter: 3600, label: 'Last Hour' } })
      const after = new Date()

      expect(result.start).toBeDefined()
      expect(result.end).toBeDefined()
      expect(result.end.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(result.end.getTime()).toBeLessThanOrEqual(after.getTime())
      const diffSeconds = (result.end.getTime() - result.start.getTime()) / 1000
      expect(diffSeconds).toBeCloseTo(3600, -1)
    })

    it('returns provided dates for "custom"', () => {
      const startDate = new Date('2024-01-01T00:00:00Z')
      const endDate = new Date('2024-01-31T23:59:59Z')

      const result = service.getEffectiveTimeInterval({
        choice: { filter: 'custom', label: 'Custom' },
        options: { startDate, endDate }
      })

      expect(result.start).toEqual(startDate)
      expect(result.end).toEqual(endDate)
    })

    it('returns undefined start/end for "custom" with no options', () => {
      const result = service.getEffectiveTimeInterval({ choice: { filter: 'custom', label: 'Custom' } })
      expect(result.start).toBeUndefined()
      expect(result.end).toBeUndefined()
    })

    it('defaults to "today" when timeInterval is undefined', () => {
      const result = service.getEffectiveTimeInterval(undefined)

      expect(result.start).toBeDefined()
      expect(result.end).toBeDefined()
      expect(result.start.getHours()).toBe(0)
    })
  })
})
