import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { EventService } from './event.service'
import { FilterService } from '../filter/filter.service'
import { PollingService } from './polling.service'
import { ObservationService } from '../observation/observation.service'
import { LayerService } from '../layer/layer.service'
import { LocationService } from '../user/location/location.service'
import { SessionService } from '../http/session.service'
import { FeedService } from '@ngageoint/mage.web-core-lib/feed'
import { BehaviorSubject, Subject, of, throwError } from 'rxjs'
import { DEFAULT_LOCATION_FILTER, DEFAULT_OBSERVATION_FILTER, EventObservationFilter } from '../filter/filter.types'

const mockEvent: any = {
  id: 1,
  name: 'Test Event',
  teams: [{ id: 't1', userIds: ['user1', 'u2'] }],
  forms: []
}

function observation(overrides: any = {}) {
  return {
    id: 'obs1',
    userId: 'user1',
    eventId: 1,
    lastModified: '2024-01-01T00:00:00Z',
    attachments: [],
    favoriteUserIds: [],
    properties: { timestamp: '2024-01-01T00:00:00Z' },
    ...overrides
  }
}

function mapObservation(overrides: any = {}) {
  return {
    id: 'obs1',
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0, 0] },
    lastModified: '2024-01-01T00:00:00Z',
    state: { id: 'state1', name: 'active' },
    properties: { forms: [] },
    ...overrides
  }
}

function userLocation(overrides: any = {}) {
  return {
    id: 'user1',
    user: { id: 'user1' },
    locations: [{ properties: { timestamp: '2024-01-01T00:00:00Z' } }],
    ...overrides
  }
}

class MockPollingService {
  pollingInterval$ = new BehaviorSubject<number>(30000).asObservable()
  getPollingInterval = jasmine.createSpy('getPollingInterval').and.returnValue(30000)
}

class MockObservationService {
  pagingSubject = new BehaviorSubject<any>(null)
  paging$ = this.pagingSubject.asObservable()
  getObservationsForMap = jasmine.createSpy('getObservationsForMap').and.returnValue(of([]))
  getObservationsPage = jasmine.createSpy('getObservationsPage').and.returnValue(of({ items: [], totalCount: 0, pageIndex: 0, pageSize: 50 }))
  getPagingOptions = jasmine.createSpy('getPagingOptions').and.returnValue(null)
  setPagingOptions = jasmine.createSpy('setPagingOptions')
  saveObservationForEvent = jasmine.createSpy('saveObservationForEvent').and.returnValue(of({}))
  addObservationFavorite = jasmine.createSpy('addObservationFavorite').and.returnValue(of({}))
  removeObservationFavorite = jasmine.createSpy('removeObservationFavorite').and.returnValue(of({}))
  markObservationAsImportantForEvent = jasmine.createSpy('markObservationAsImportantForEvent').and.returnValue(of({}))
  clearObservationAsImportantForEvent = jasmine.createSpy('clearObservationAsImportantForEvent').and.returnValue(of({}))
  archiveObservationForEvent = jasmine.createSpy('archiveObservationForEvent').and.callFake((_event: any, obs: any) => of(obs))
  deleteAttachmentInObservationForEvent = jasmine.createSpy('deleteAttachmentInObservationForEvent').and.returnValue(of(null))
}

class MockLayerService {
  getLayersForEvent = jasmine.createSpy('getLayersForEvent').and.returnValue(of([]))
}

class MockLocationService {
  getUserLocationsForEvent = jasmine.createSpy('getUserLocationsForEvent').and.returnValue(of([]))
}

class MockFeedService {
  fetchFeeds = jasmine.createSpy('fetchFeeds').and.returnValue(of([]))
  fetchFeedItems = jasmine.createSpy('fetchFeedItems').and.returnValue(of({ items: { features: [] } }))
}

class MockSessionService {
  user = { id: 'current-user' }
  getToken = jasmine.createSpy('getToken').and.returnValue('test-token')
}

describe('EventService', () => {
  let service: EventService
  let filterService: jasmine.SpyObj<FilterService>
  let observationService: MockObservationService
  let locationService: MockLocationService
  let eventSubject: BehaviorSubject<any>
  let observationFilterSubject: BehaviorSubject<EventObservationFilter | null>
  let locationFilterSubject: BehaviorSubject<any>

  beforeEach(() => {
    eventSubject = new BehaviorSubject<any>(null)
    observationFilterSubject = new BehaviorSubject<EventObservationFilter | null>(null)
    locationFilterSubject = new BehaviorSubject<any>(null)

    filterService = jasmine.createSpyObj('FilterService', ['getEvent', 'getObservationFilter', 'getLocationFilter', 'getEffectiveTimeInterval'], {
      event$: eventSubject.asObservable(),
      observationFilter$: observationFilterSubject.asObservable(),
      locationFilter$: locationFilterSubject.asObservable()
    })
    filterService.getEvent.and.returnValue(null)
    filterService.getObservationFilter.and.returnValue(null)
    filterService.getLocationFilter.and.returnValue(null)
    filterService.getEffectiveTimeInterval.and.returnValue({})

    observationService = new MockObservationService()
    locationService = new MockLocationService()

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        EventService,
        { provide: FilterService, useValue: filterService },
        { provide: PollingService, useClass: MockPollingService },
        { provide: ObservationService, useValue: observationService },
        { provide: LayerService, useClass: MockLayerService },
        { provide: LocationService, useValue: locationService },
        { provide: FeedService, useClass: MockFeedService },
        { provide: SessionService, useClass: MockSessionService }
      ]
    })

    service = TestBed.inject(EventService)
  })

  afterEach(() => {
    service.destroy()
  })

  // Calls init() with an active event so this.observations and this.locations are initialized
  function initWithEvent() {
    filterService.getEvent.and.returnValue(mockEvent)
    service.init()
  }

  describe('destroy', () => {
    const feed = { id: 'f1', title: 'Feed', updateFrequencySeconds: 1, itemsHaveSpatialDimension: true }

    it('stops polling feeds when a feed request is still in flight', fakeAsync(() => {
      const items$ = new Subject<any>()
      const feedService: any = TestBed.inject(FeedService)
      feedService.fetchFeeds.and.returnValue(of([feed]))
      feedService.fetchFeedItems.and.callFake(() => items$.asObservable())
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      service.onEventChanged(null, mockEvent as any)
      const callsBefore = feedService.fetchFeedItems.calls.count()

      service.destroy()
      items$.next({ items: { features: [] } })
      items$.complete()
      tick(5000)

      expect(feedService.fetchFeedItems.calls.count()).toBe(callsBefore)
      discardPeriodicTasks()
    }))

    it('ignores a layers response that arrives after destroy', () => {
      const layers$ = new Subject<any[]>()
      TestBed.inject(LayerService).getLayersForEvent = jasmine.createSpy('getLayersForEvent').and.returnValue(layers$.asObservable())
      const listener = { onLayersChanged: jasmine.createSpy('onLayersChanged') }
      service.addLayersChangedListener(listener)
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      service.onEventChanged(null, mockEvent as any)
      listener.onLayersChanged.calls.reset()

      service.destroy()
      layers$.next([{ id: 1 }])

      expect(listener.onLayersChanged).not.toHaveBeenCalled()
    })

    it('ignores a feeds response that arrives after destroy', () => {
      const feeds$ = new Subject<any[]>()
      TestBed.inject(FeedService).fetchFeeds = jasmine.createSpy('fetchFeeds').and.returnValue(feeds$.asObservable())
      const listener = { onFeedItemsChanged: jasmine.createSpy('onFeedItemsChanged') }
      service.addFeedItemsChangedListener(listener)
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      service.onEventChanged(null, mockEvent as any)

      service.destroy()
      feeds$.next([feed])

      expect(listener.onFeedItemsChanged).not.toHaveBeenCalled()
    })

    it('resets the observation, page and location streams', () => {
      initWithEvent()
      service.parseMapObservations([mapObservation()])
      service.parseLocations([userLocation()])

      service.destroy()

      let mapObservations: any = 'unset'
      let observationPage: any = 'unset'
      let locations: any = 'unset'
      service.mapObservations$.subscribe(value => mapObservations = value)
      service.observationPage$.subscribe(value => observationPage = value)
      service.locations$.subscribe(value => locations = value)
      expect(mapObservations).toBeNull()
      expect(observationPage).toBeNull()
      expect(locations).toBeNull()
    })
  })

  describe('init', () => {
    it('fetches the observation page when paging is set but not when it is cleared', () => {
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      observationService.getPagingOptions.and.returnValue({ page: 1, page_size: 50 })
      observationService.getObservationsPage.calls.reset()

      observationService.pagingSubject.next({ page: 1, page_size: 50 })
      expect(observationService.getObservationsPage).toHaveBeenCalledTimes(1)

      observationService.getPagingOptions.and.returnValue(null)
      observationService.pagingSubject.next(null)
      expect(observationService.getObservationsPage).toHaveBeenCalledTimes(1)
    })

    it('fetches observations immediately when observation filter emits with an active event', () => {
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      expect(observationService.getObservationsForMap).toHaveBeenCalled()
    })

    it('does not fetch observations when no event is set', () => {
      filterService.getEvent.and.returnValue(null)
      service.init()
      expect(observationService.getObservationsForMap).not.toHaveBeenCalled()
    })

    it('tears down subscriptions from a second init/destroy cycle', () => {
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      service.destroy()
      service.init()
      service.destroy()

      observationService.getObservationsForMap.calls.reset()
      observationFilterSubject.next({ ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true })

      expect(observationService.getObservationsForMap).not.toHaveBeenCalled()
    })

    it('re-fetches observations when observation filter changes', () => {
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      observationService.getObservationsForMap.calls.reset()

      observationFilterSubject.next({ hasAttachments: true } as any)

      expect(observationService.getObservationsForMap).toHaveBeenCalled()
    })

    it('emits empty array on observations$ when observation filter changes', () => {
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      service.parseMapObservations([mapObservation()]) // populate some data

      const emissions: any[][] = []
      service.mapObservations$.subscribe(v => { if (v !== null) emissions.push(v) })

      observationFilterSubject.next({ hasAttachments: true } as any)

      expect(emissions[emissions.length - 1]).toEqual([])
    })

    it('re-fetches observations when event switches even if filter value is unchanged', () => {
      const event2: any = { id: 2, name: 'Event 2', teams: [], forms: [] }
      const sharedFilter = { hasAttachments: true } as any

      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      observationFilterSubject.next(sharedFilter)
      observationService.getObservationsForMap.calls.reset()

      filterService.getEvent.and.returnValue(event2)
      observationFilterSubject.next(sharedFilter)

      expect(observationService.getObservationsForMap).toHaveBeenCalled()
    })

    it('fetches locations immediately when location filter emits with an active event', () => {
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      expect(locationService.getUserLocationsForEvent).toHaveBeenCalled()
    })

    it('does not fetch locations when no event is set', () => {
      filterService.getEvent.and.returnValue(null)
      service.init()
      expect(locationService.getUserLocationsForEvent).not.toHaveBeenCalled()
    })

    it('re-fetches locations when location filter changes', () => {
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      locationService.getUserLocationsForEvent.calls.reset()

      locationFilterSubject.next({ memberFilter: { teamIds: ['t1'], userIds: [] } })

      expect(locationService.getUserLocationsForEvent).toHaveBeenCalled()
    })

    it('re-fetches locations when event switches even if filter value is unchanged', () => {
      const event2: any = { id: 2, name: 'Event 2', teams: [], forms: [] }
      const sharedFilter = { memberFilter: { teamIds: ['t1'], userIds: [] } }

      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      locationFilterSubject.next(sharedFilter)
      locationService.getUserLocationsForEvent.calls.reset()

      filterService.getEvent.and.returnValue(event2)
      locationFilterSubject.next(sharedFilter)

      expect(locationService.getUserLocationsForEvent).toHaveBeenCalled()
    })

    it('emits empty array on locations$ when location filter changes', () => {
      filterService.getEvent.and.returnValue(mockEvent)
      service.init()
      service.parseLocations([userLocation()]) // populate some data

      const emissions: any[][] = []
      service.locations$.subscribe(result => { if (result !== null) emissions.push(result.data) })

      locationFilterSubject.next({ memberFilter: { teamIds: ['t1'], userIds: [] } })

      expect(emissions[emissions.length - 1]).toEqual([])
    })

    it('registers a new event when event$ emits', () => {
      const anotherEvent = { id: 2, name: 'Another', teams: [], forms: [] }
      service.init()
      eventSubject.next(anotherEvent)
      expect(service.getEventById(anotherEvent.id)).toBeDefined()
    })
  })

  describe('onEventChanged', () => {
    it('registers a new event in eventsById', () => {
      service.onEventChanged(null, mockEvent)
      expect(service.getEventById(mockEvent.id)).toBeDefined()
    })

    it('removes event from eventsById on event removal', () => {
      service.onEventChanged(null, mockEvent)
      service.onEventChanged(mockEvent, null)
      expect(service.getEventById(mockEvent.id)).toBeUndefined()
    })

    it('tells layer listeners to remove the previous event\'s layers by id', () => {
      TestBed.inject(LayerService).getLayersForEvent = jasmine.createSpy('getLayersForEvent').and.returnValue(of([{ id: 1 }, { id: 2 }]))
      const listener = { onLayersChanged: jasmine.createSpy('onLayersChanged') }
      service.addLayersChangedListener(listener)
      service.onEventChanged(null, mockEvent)
      listener.onLayersChanged.calls.reset()

      service.onEventChanged(mockEvent, null)

      expect(listener.onLayersChanged.calls.mostRecent().args[0].removed).toEqual([1, 2])
    })
  })

  describe('observations$', () => {
    it('emits null before init is called', () => {
      let latest: any = 'not-set'
      service.mapObservations$.subscribe(v => latest = v)
      expect(latest).toBeNull()
    })

    it('emits array after parseObservations adds an observation', () => {
      initWithEvent()
      const obs = mapObservation()
      const emissions: any[][] = []
      service.mapObservations$.subscribe(v => { if (v !== null) emissions.push(v) })

      service.parseMapObservations([obs])

      const latest = emissions[emissions.length - 1]
      expect(latest.length).toBe(1)
      expect(latest[0].id).toBe(obs.id)
    })

    it('does not emit when observations are unchanged', () => {
      initWithEvent()
      const obs = mapObservation()
      service.parseMapObservations([obs])

      const emissions: any[][] = []
      service.mapObservations$.subscribe(v => { if (v !== null) emissions.push(v) })
      const countBefore = emissions.length

      service.parseMapObservations([obs]) // same lastModified — no change

      expect(emissions.length).toBe(countBefore)
    })
  })

  describe('locations$', () => {
    it('emits null before init is called', () => {
      let latest: any = 'not-set'
      service.locations$.subscribe(result => latest = result)
      expect(latest).toBeNull()
    })

    it('emits array after parseLocations adds a user location', () => {
      initWithEvent()
      const emissions: any[][] = []
      service.locations$.subscribe(result => { if (result !== null) emissions.push(result.data) })

      service.parseLocations([userLocation()])

      const latest = emissions[emissions.length - 1]
      expect(latest.length).toBe(1)
    })

    it('does not emit when locations are unchanged', () => {
      initWithEvent()
      service.parseLocations([userLocation()])

      const emissions: any[][] = []
      service.locations$.subscribe(result => { if (result !== null) emissions.push(result.data) })
      const countBefore = emissions.length

      service.parseLocations([userLocation()]) // same timestamp — no change

      expect(emissions.length).toBe(countBefore)
    })
  })

  describe('parseObservations', () => {
    beforeEach(() => {
      initWithEvent()
    })

    it('adds new observations', () => {
      const obs = mapObservation()
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.parseMapObservations([obs])

      expect(latest.find(o => o.id === obs.id)).toBeDefined()
    })

    it('updates observations with a changed lastModified', () => {
      const obs = mapObservation()
      service.parseMapObservations([obs])

      const updated = { ...obs, lastModified: '2024-01-02T00:00:00Z' }
      const emissions: any[][] = []
      service.mapObservations$.subscribe(v => { if (v) emissions.push(v) })
      const countBefore = emissions.length

      service.parseMapObservations([updated])

      expect(emissions.length).toBeGreaterThan(countBefore)
      const latest = emissions[emissions.length - 1]
      expect(latest.find((o: any) => o.lastModified === updated.lastModified)).toBeDefined()
    })

    it('emits empty array when fetch returns no results', () => {
      const emissions: any[][] = []
      service.mapObservations$.subscribe(v => { if (v !== null) emissions.push(v) })
      const countBefore = emissions.length

      service.parseMapObservations([])

      expect(emissions.length).toBeGreaterThan(countBefore)
      expect(emissions[emissions.length - 1]).toEqual([])
    })

    it('does not emit for an observation with an unchanged lastModified', () => {
      const obs = mapObservation()
      service.parseMapObservations([obs])

      const emissions: any[][] = []
      service.mapObservations$.subscribe(v => { if (v) emissions.push(v) })
      const countBefore = emissions.length

      service.parseMapObservations([obs])

      expect(emissions.length).toBe(countBefore)
    })

    it('removes archived observations', () => {
      const obs = mapObservation()
      service.parseMapObservations([obs])

      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.parseMapObservations([{ ...obs, state: { ...obs.state, name: 'archive' } }])

      expect(latest.find(o => o.id === obs.id)).toBeUndefined()
    })

    it('does not emit for an archived observation that was never in the cache', () => {
      const emissions: any[][] = []
      service.mapObservations$.subscribe(v => { if (v) emissions.push(v) })
      const countBefore = emissions.length

      service.parseMapObservations([mapObservation({ state: { id: 'state1', name: 'archive' } })])

      expect(emissions.length).toBe(countBefore)
    })

    it('tracks the highest lastModified across all observations', () => {
      const obs1 = mapObservation({ id: 'obs1', lastModified: '2024-01-01T00:00:00Z' })
      const obs2 = mapObservation({ id: 'obs2', lastModified: '2024-01-03T00:00:00Z' })
      service.parseMapObservations([obs1, obs2])

      observationService.getObservationsForMap.calls.reset()
      service.fetchMapObservations().subscribe()

      const params = observationService.getObservationsForMap.calls.mostRecent().args[1]
      expect(params.startDate).toBe('2024-01-03T00:00:00Z')
    })
  })

  describe('parseLocations', () => {
    beforeEach(() => {
      initWithEvent()
    })

    it('gives a user with an icon a marker icon url with only the access token', () => {
      const latest: any[] = []
      service.locations$.subscribe(result => { if (result) latest.splice(0, latest.length, ...result.data) })

      service.parseLocations([userLocation({ user: { id: 'user1', iconUrl: '/api/users/user1/icon' } })])

      expect(latest[0].location.style.iconUrl).toBe('/api/users/user1/icon?access_token=test-token')
    })

    it('does not style a user without an icon', () => {
      const latest: any[] = []
      service.locations$.subscribe(result => { if (result) latest.splice(0, latest.length, ...result.data) })

      service.parseLocations([userLocation()])

      expect(latest[0].location.style).toBeUndefined()
    })

    it('adds new user locations', () => {
      const latest: any[] = []
      service.locations$.subscribe(result => { if (result) latest.splice(0, latest.length, ...result.data) })

      service.parseLocations([userLocation()])

      expect(latest.length).toBe(1)
    })

    it('updates user locations with a changed timestamp', () => {
      service.parseLocations([userLocation()])

      const updated = userLocation({ locations: [{ properties: { timestamp: '2024-01-02T00:00:00Z' } }] })
      const emissions: any[][] = []
      service.locations$.subscribe(result => { if (result) emissions.push(result.data) })
      const countBefore = emissions.length

      service.parseLocations([updated])

      expect(emissions.length).toBeGreaterThan(countBefore)
    })

    it('emits empty array when fetch returns no results', () => {
      const emissions: any[][] = []
      service.locations$.subscribe(result => { if (result !== null) emissions.push(result.data) })
      const countBefore = emissions.length

      service.parseLocations([])

      expect(emissions.length).toBeGreaterThan(countBefore)
      expect(emissions[emissions.length - 1]).toEqual([])
    })

    it('does not emit for a user location with an unchanged timestamp', () => {
      service.parseLocations([userLocation()])

      const emissions: any[][] = []
      service.locations$.subscribe(result => { if (result) emissions.push(result.data) })
      const countBefore = emissions.length

      service.parseLocations([userLocation()])

      expect(emissions.length).toBe(countBefore)
    })

    it('removes user locations not returned by the server', () => {
      service.parseLocations([userLocation()])

      const latest: any[] = []
      service.locations$.subscribe(result => { if (result) latest.splice(0, latest.length, ...result.data) })

      service.parseLocations([])

      expect(latest.length).toBe(0)
    })

    it('attaches iconUrl with access token when user has an iconUrl', () => {
      const loc = userLocation({ user: { id: 'user1', lastUpdated: '2024-01-01', iconUrl: '/api/user1/icon' } })
      const latest: any[] = []
      service.locations$.subscribe(result => { if (result) latest.splice(0, latest.length, ...result.data) })

      service.parseLocations([loc])

      expect(latest[0].location.style.iconUrl).toContain('test-token')
    })
  })

  describe('isUserInEvent', () => {
    it('returns true when user is in a team in the event', () => {
      expect(service.isUserInEvent({ id: 'user1' } as any, mockEvent as any)).toBeTrue()
    })

    it('returns false when user is not in any team', () => {
      expect(service.isUserInEvent({ id: 'unknown' } as any, mockEvent as any)).toBeFalse()
    })

    it('returns false when event is null', () => {
      expect(service.isUserInEvent({ id: 'user1' } as any, null as any)).toBeFalse()
    })
  })

  describe('fetchObservations', () => {
    beforeEach(() => {
      initWithEvent()
      observationService.getObservationsForMap.calls.reset()
    })

    it('uses states=active on initial fetch before any observations are loaded', () => {
      service.fetchMapObservations().subscribe()

      const params = observationService.getObservationsForMap.calls.mostRecent().args[1]
      expect(params.states).toBe('active')
      expect(params.startDate).toBeUndefined()
    })

    it('uses startDate instead of states after observations have been loaded', () => {
      service.parseMapObservations([mapObservation({ lastModified: '2024-06-01T00:00:00Z' })])

      service.fetchMapObservations().subscribe()

      const params = observationService.getObservationsForMap.calls.mostRecent().args[1]
      expect(params.startDate).toBe('2024-06-01T00:00:00Z')
      expect(params.states).toBeUndefined()
    })

    it('passes time interval dates to observation service', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-31')
      filterService.getEffectiveTimeInterval.and.returnValue({ start, end })

      service.fetchMapObservations().subscribe()

      const params = observationService.getObservationsForMap.calls.mostRecent().args[1]
      expect(params.observationStartDate).toBe(start.toISOString())
      expect(params.observationEndDate).toBe(end.toISOString())
    })

    it('passes hasAttachments when filter is set', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true })

      service.fetchMapObservations().subscribe()

      const params = observationService.getObservationsForMap.calls.mostRecent().args[1]
      expect(params.hasAttachments).toBeTrue()
    })

    it('passes important when isFlaggedImportant is set', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, isFlaggedImportant: true })

      service.fetchMapObservations().subscribe()

      const params = observationService.getObservationsForMap.calls.mostRecent().args[1]
      expect(params.important).toBeTrue()
    })

    it('passes favoritedBy with current user id when isUserFavorite is set', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, isUserFavorite: true })

      service.fetchMapObservations().subscribe()

      const params = observationService.getObservationsForMap.calls.mostRecent().args[1]
      expect(params.favoritedBy).toBe('current-user')
    })

    it('passes team and user ids from memberFilter', () => {
      filterService.getObservationFilter.and.returnValue({
        ...DEFAULT_OBSERVATION_FILTER, memberFilter: { teamIds: ['t1', 't2'], userIds: ['u3'] }
      })

      service.fetchMapObservations().subscribe()

      const params = observationService.getObservationsForMap.calls.mostRecent().args[1]
      expect(params.teams).toEqual(['t1', 't2'])
      expect(params.users).toEqual(['u3'])
    })

    it('does not pass team/user ids when memberFilter arrays are empty', () => {
      filterService.getObservationFilter.and.returnValue({
        ...DEFAULT_OBSERVATION_FILTER, memberFilter: { teamIds: [], userIds: [] }
      })

      service.fetchMapObservations().subscribe()

      const params = observationService.getObservationsForMap.calls.mostRecent().args[1]
      expect(params.teams).toBeUndefined()
      expect(params.users).toBeUndefined()
    })
  })

  describe('fetchObservationPage', () => {
    beforeEach(() => {
      initWithEvent()
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      observationService.getObservationsPage.calls.reset()
    })

    it('returns early without calling service when paging options are null', () => {
      observationService.getPagingOptions.and.returnValue(null)

      service.fetchObservationPage().subscribe()

      expect(observationService.getObservationsPage).not.toHaveBeenCalled()
    })

    it('passes sort=timestamp+desc', () => {
      service.fetchObservationPage().subscribe()

      const params = observationService.getObservationsPage.calls.mostRecent().args[1]
      expect(params.sort).toBe('timestamp+desc')
    })

    it('passes page and page_size from paging options', () => {
      observationService.getPagingOptions.and.returnValue({ page: 2, page_size: 25 })

      service.fetchObservationPage().subscribe()

      const params = observationService.getObservationsPage.calls.mostRecent().args[1]
      expect(params.page).toBe(2)
      expect(params.page_size).toBe(25)
    })

    it('passes time interval dates to observation service', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-31')
      filterService.getEffectiveTimeInterval.and.returnValue({ start, end })

      service.fetchObservationPage().subscribe()

      const params = observationService.getObservationsPage.calls.mostRecent().args[1]
      expect(params.observationStartDate).toBe(start.toISOString())
      expect(params.observationEndDate).toBe(end.toISOString())
    })

    it('passes hasAttachments when filter is set', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true })

      service.fetchObservationPage().subscribe()

      const params = observationService.getObservationsPage.calls.mostRecent().args[1]
      expect(params.hasAttachments).toBeTrue()
    })

    it('passes important when isFlaggedImportant is set', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, isFlaggedImportant: true })

      service.fetchObservationPage().subscribe()

      const params = observationService.getObservationsPage.calls.mostRecent().args[1]
      expect(params.important).toBeTrue()
    })

    it('passes favoritedBy with current user id when isUserFavorite is set', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, isUserFavorite: true })

      service.fetchObservationPage().subscribe()

      const params = observationService.getObservationsPage.calls.mostRecent().args[1]
      expect(params.favoritedBy).toBe('current-user')
    })

    it('passes team and user ids from memberFilter', () => {
      filterService.getObservationFilter.and.returnValue({
        ...DEFAULT_OBSERVATION_FILTER, memberFilter: { teamIds: ['t1', 't2'], userIds: ['u3'] }
      })

      service.fetchObservationPage().subscribe()

      const params = observationService.getObservationsPage.calls.mostRecent().args[1]
      expect(params.teams).toEqual(['t1', 't2'])
      expect(params.users).toEqual(['u3'])
    })

    it('does not pass team/user ids when memberFilter arrays are empty', () => {
      filterService.getObservationFilter.and.returnValue({
        ...DEFAULT_OBSERVATION_FILTER, memberFilter: { teamIds: [], userIds: [] }
      })

      service.fetchObservationPage().subscribe()

      const params = observationService.getObservationsPage.calls.mostRecent().args[1]
      expect(params.teams).toBeUndefined()
      expect(params.users).toBeUndefined()
    })

    it('emits the page result on observationPage$', () => {
      const page = { items: [observation()], totalCount: 1, pageIndex: 0, pageSize: 50 }
      observationService.getObservationsPage.and.returnValue(of(page))

      const emissions: any[] = []
      service.observationPage$.subscribe(v => { if (v) emissions.push(v) })

      service.fetchObservationPage().subscribe()

      expect(emissions[emissions.length - 1]).toEqual({
        data: page.items,
        totalCount: page.totalCount,
        pageIndex: 0,
        error: null,
        userInitiated: false
      })
    })

    it('emits an error result on observationPage$ when the request fails, preserving prior data', () => {
      const page = { items: [observation()], totalCount: 1, pageIndex: 0, pageSize: 50 }
      observationService.getObservationsPage.and.returnValue(of(page))
      service.fetchObservationPage().subscribe()

      const err = new Error('boom')
      observationService.getObservationsPage.and.returnValue(throwError(() => err))

      const emissions: any[] = []
      service.observationPage$.subscribe(v => { if (v) emissions.push(v) })

      service.fetchObservationPage().subscribe()

      const last = emissions[emissions.length - 1]
      expect(last.error).toBe(err)
      expect(last.data).toEqual(page.items)
    })
  })

  describe('paging$ subscription', () => {
    beforeEach(() => {
      filterService.getEvent.and.returnValue(mockEvent)
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      service.init()
      observationService.getObservationsPage.calls.reset()
    })

    it('calls getObservationsPage when paging$ emits a non-null value', () => {
      observationService.pagingSubject.next({ page: 0, page_size: 50 })

      expect(observationService.getObservationsPage).toHaveBeenCalled()
    })

    it('does not call getObservationsPage when paging$ emits null', () => {
      observationService.pagingSubject.next(null)

      expect(observationService.getObservationsPage).not.toHaveBeenCalled()
    })

    it('does not call getObservationsPage when no event is set', () => {
      filterService.getEvent.and.returnValue(null)

      observationService.pagingSubject.next({ page: 0, page_size: 50 })

      expect(observationService.getObservationsPage).not.toHaveBeenCalled()
    })

    it('calls getObservationsPage on each emission even with the same value', () => {
      const paging = { page: 0, page_size: 50 }
      observationService.pagingSubject.next(paging)
      observationService.pagingSubject.next(paging)

      expect(observationService.getObservationsPage).toHaveBeenCalledTimes(2)
    })

    it('reschedules the poll tick once the page fetch settles', () => {
      const scheduleSpy = spyOn(service as any, 'schedulePollTick').and.callThrough()

      observationService.pagingSubject.next({ page: 0, page_size: 50 })

      expect(scheduleSpy).toHaveBeenCalled()
    })
  })

  describe('retrySearch', () => {
    it('does nothing when there is no active event', () => {
      filterService.getEvent.and.returnValue(null)
      service.init()
      observationService.getObservationsForMap.calls.reset()
      observationService.getObservationsPage.calls.reset()

      service.retrySearch()

      expect(observationService.getObservationsForMap).not.toHaveBeenCalled()
      expect(observationService.getObservationsPage).not.toHaveBeenCalled()
    })

    it('re-fetches both the map observations and the current page as user-initiated', () => {
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      initWithEvent()
      observationService.getObservationsForMap.calls.reset()
      observationService.getObservationsPage.calls.reset()

      service.retrySearch()

      expect(observationService.getObservationsForMap).toHaveBeenCalled()
      expect(observationService.getObservationsPage).toHaveBeenCalled()
    })

    it('surfaces the error on observationPage$ as user-initiated when the retry fails', () => {
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      initWithEvent()

      const failure = new Error('still down')
      observationService.getObservationsPage.and.returnValue(throwError(() => failure))

      const emissions: any[] = []
      service.observationPage$.subscribe(result => { if (result !== null) emissions.push(result) })

      service.retrySearch()

      const latest = emissions[emissions.length - 1]
      expect(latest.error).toBe(failure)
      expect(latest.userInitiated).toBeTrue()
    })
  })

  describe('retryLocations', () => {
    it('does nothing when there is no active event', () => {
      filterService.getEvent.and.returnValue(null)
      service.init()
      locationService.getUserLocationsForEvent.calls.reset()

      service.retryLocations()

      expect(locationService.getUserLocationsForEvent).not.toHaveBeenCalled()
    })

    it('re-fetches locations as user-initiated', () => {
      initWithEvent()
      locationService.getUserLocationsForEvent.calls.reset()

      service.retryLocations()

      expect(locationService.getUserLocationsForEvent).toHaveBeenCalled()
    })

    it('surfaces the error on locations$ as user-initiated when the retry fails', () => {
      initWithEvent()

      const failure = new Error('still down')
      locationService.getUserLocationsForEvent.and.returnValue(throwError(() => failure))

      const emissions: any[] = []
      service.locations$.subscribe(result => { if (result !== null) emissions.push(result) })

      service.retryLocations()

      const latest = emissions[emissions.length - 1]
      expect(latest.error).toBe(failure)
      expect(latest.userInitiated).toBeTrue()
    })
  })

  describe('fetchLocations', () => {
    beforeEach(() => {
      initWithEvent()
      locationService.getUserLocationsForEvent.calls.reset()
    })

    it('passes time interval dates to location service', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-31')
      filterService.getEffectiveTimeInterval.and.returnValue({ start, end })

      service.fetchLocations().subscribe()

      const params = locationService.getUserLocationsForEvent.calls.mostRecent().args[1]
      expect(params.startDate).toBe(start.toISOString())
      expect(params.endDate).toBe(end.toISOString())
    })

    it('passes team and user ids from memberFilter', () => {
      filterService.getLocationFilter.and.returnValue({
        ...DEFAULT_LOCATION_FILTER, memberFilter: { teamIds: ['t1'], userIds: ['u1'] }
      })

      service.fetchLocations().subscribe()

      const params = locationService.getUserLocationsForEvent.calls.mostRecent().args[1]
      expect(params.teams).toEqual(['t1'])
      expect(params.users).toEqual(['u1'])
    })

    it('does not pass team/user ids when memberFilter arrays are empty', () => {
      filterService.getLocationFilter.and.returnValue({
        ...DEFAULT_LOCATION_FILTER, memberFilter: { teamIds: [], userIds: [] }
      })

      service.fetchLocations().subscribe()

      const params = locationService.getUserLocationsForEvent.calls.mostRecent().args[1]
      expect(params.teams).toBeUndefined()
      expect(params.users).toBeUndefined()
    })
  })

  describe('archiveObservation', () => {
    let obs: any

    beforeEach(() => {
      obs = observation()
      initWithEvent()
      service.onEventChanged(null, mockEvent as any)
      service.parseMapObservations([obs])
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      observationService.getObservationsPage.calls.reset()
    })

    it('removes the observation from the map observations', () => {
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.archiveObservation(obs).subscribe()

      expect(latest.find(o => o.id === obs.id)).toBeUndefined()
    })

    it('refreshes the observation page so the list drops the archived row', () => {
      service.archiveObservation(obs).subscribe()

      expect(observationService.getObservationsPage).toHaveBeenCalled()
    })
  })

  describe('removeObservationFavorite', () => {
    let obs: any

    beforeEach(() => {
      obs = observation({ favoriteUserIds: ['current-user'] })
      initWithEvent()
      service.onEventChanged(null, mockEvent as any)
      service.parseMapObservations([obs])
      observationService.removeObservationFavorite.and.returnValue(of({ ...obs, favoriteUserIds: [] }))
      observationService.getObservationsForMap.calls.reset()
    })

    it('removes observation from list when isUserFavorite filter is active', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, isUserFavorite: true })
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.removeObservationFavorite(obs).subscribe()

      expect(latest.find(o => o.id === obs.id)).toBeUndefined()
    })

    it('keeps observation in list when isUserFavorite filter is not active', () => {
      filterService.getObservationFilter.and.returnValue(null)
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.removeObservationFavorite(obs).subscribe()

      expect(latest.find(o => o.id === obs.id)).toBeDefined()
    })

    it('refreshes the paginated observation list when removed from the filtered map results', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, isUserFavorite: true })
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      observationService.getObservationsPage.calls.reset()

      service.removeObservationFavorite(obs).subscribe()

      expect(observationService.getObservationsPage).toHaveBeenCalled()
    })

    it('does not refresh the paginated observation list when the filter is not active', () => {
      filterService.getObservationFilter.and.returnValue(null)
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      observationService.getObservationsPage.calls.reset()

      service.removeObservationFavorite(obs).subscribe()

      expect(observationService.getObservationsPage).not.toHaveBeenCalled()
    })
  })

  describe('clearObservationAsImportant', () => {
    let obs: any

    beforeEach(() => {
      obs = observation()
      initWithEvent()
      service.onEventChanged(null, mockEvent as any)
      service.parseMapObservations([obs])
      observationService.clearObservationAsImportantForEvent.and.returnValue(of(obs))
      observationService.getObservationsForMap.calls.reset()
    })

    it('removes observation from list when isFlaggedImportant filter is active', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, isFlaggedImportant: true })
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.clearObservationAsImportant(obs).subscribe()

      expect(latest.find(o => o.id === obs.id)).toBeUndefined()
    })

    it('keeps observation in list when isFlaggedImportant filter is not active', () => {
      filterService.getObservationFilter.and.returnValue(null)
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.clearObservationAsImportant(obs).subscribe()

      expect(latest.find(o => o.id === obs.id)).toBeDefined()
    })

    it('refreshes the paginated observation list when removed from the filtered map results', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, isFlaggedImportant: true })
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      observationService.getObservationsPage.calls.reset()

      service.clearObservationAsImportant(obs).subscribe()

      expect(observationService.getObservationsPage).toHaveBeenCalled()
    })

    it('does not refresh the paginated observation list when the filter is not active', () => {
      filterService.getObservationFilter.and.returnValue(null)
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      observationService.getObservationsPage.calls.reset()

      service.clearObservationAsImportant(obs).subscribe()

      expect(observationService.getObservationsPage).not.toHaveBeenCalled()
    })
  })

  describe('observation page updates', () => {
    let obs: any
    let other: any
    let page: any

    beforeEach(() => {
      obs = observation({ id: 'o1', favoriteUserIds: [] })
      other = observation({ id: 'o2' })
      initWithEvent()
      service.onEventChanged(null, mockEvent as any)
      filterService.getObservationFilter.and.returnValue(null)
      ;(service as any).observationPageSubject.next({ data: [obs, other], totalCount: 2, pageIndex: 0, error: null, userInitiated: false })
      service.observationPage$.subscribe(value => page = value)
    })

    function expectReplaced(updated: any): void {
      expect(page.data[0]).toBe(updated)
      expect(page.data[1]).toBe(other)
      expect(page.totalCount).toBe(2)
    }

    it('replaces the observation in the page after it is flagged important', () => {
      const updated = { ...obs, important: { description: 'look here' } }
      observationService.markObservationAsImportantForEvent.and.returnValue(of(updated))

      service.markObservationAsImportant(obs, { description: 'look here' }).subscribe()

      expectReplaced(updated)
    })

    it('replaces the observation in the page after the important flag is cleared', () => {
      const updated = { ...obs, important: undefined }
      observationService.clearObservationAsImportantForEvent.and.returnValue(of(updated))

      service.clearObservationAsImportant(obs).subscribe()

      expectReplaced(updated)
    })

    it('replaces the observation in the page after it is favorited', () => {
      const updated = { ...obs, favoriteUserIds: ['current-user'] }
      observationService.addObservationFavorite.and.returnValue(of(updated))

      service.addObservationFavorite(obs).subscribe()

      expectReplaced(updated)
    })

    it('replaces the observation in the page after it is unfavorited', () => {
      const updated = { ...obs, favoriteUserIds: [] }
      observationService.removeObservationFavorite.and.returnValue(of(updated))

      service.removeObservationFavorite(obs).subscribe()

      expectReplaced(updated)
    })

    it('leaves the page alone when the updated observation is not on it', () => {
      const before = page
      observationService.markObservationAsImportantForEvent.and.returnValue(of({ ...obs, id: 'elsewhere' }))

      service.markObservationAsImportant(obs, { description: 'look here' }).subscribe()

      expect(page).toBe(before)
    })
  })

  describe('deleteAttachmentForObservation', () => {
    let obs: any
    let attachment: any

    beforeEach(() => {
      attachment = { id: 'att1', name: 'test.jpg' }
      obs = observation({ attachments: [attachment] })
      initWithEvent()
      service.onEventChanged(null, mockEvent as any)
      service.parseMapObservations([obs])
    })

    it('removes observation when hasAttachments filter is active and last attachment is deleted', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true })
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.deleteAttachmentForObservation(obs, attachment)

      expect(latest.find(o => o.id === obs.id)).toBeUndefined()
    })

    it('keeps observation when hasAttachments filter is active but more attachments remain', () => {
      const second = { id: 'att2', name: 'other.jpg' }
      obs.attachments = [attachment, second]
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true })
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.deleteAttachmentForObservation(obs, attachment)

      expect(latest.find(o => o.id === obs.id)).toBeDefined()
    })

    it('keeps observation when hasAttachments filter is not active', () => {
      filterService.getObservationFilter.and.returnValue(null)
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.deleteAttachmentForObservation(obs, attachment)

      expect(latest.find(o => o.id === obs.id)).toBeDefined()
    })

    it('refreshes the paginated observation list when the last attachment is removed under an active filter', () => {
      filterService.getObservationFilter.and.returnValue({ ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true })
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      observationService.getObservationsPage.calls.reset()

      service.deleteAttachmentForObservation(obs, attachment)

      expect(observationService.getObservationsPage).toHaveBeenCalled()
    })

    it('does not refresh the paginated observation list when the filter is not active', () => {
      filterService.getObservationFilter.and.returnValue(null)
      observationService.getPagingOptions.and.returnValue({ page: 0, page_size: 50 })
      observationService.getObservationsPage.calls.reset()

      service.deleteAttachmentForObservation(obs, attachment)

      expect(observationService.getObservationsPage).not.toHaveBeenCalled()
    })
  })

  describe('saveObservation', () => {
    let obs: any

    beforeEach(() => {
      obs = observation()
      initWithEvent()
      service.onEventChanged(null, mockEvent as any)
      service.parseMapObservations([obs])
      observationService.saveObservationForEvent.and.returnValue(of(obs))
      observationService.getObservationsForMap.calls.reset()
    })

    it('removes observation from local list immediately after save', () => {
      const latest: any[] = []
      service.mapObservations$.subscribe(v => { if (v) latest.splice(0, latest.length, ...v) })

      service.saveObservation(obs).subscribe()

      expect(latest.find(o => o.id === obs.id)).toBeUndefined()
    })

    it('triggers a re-fetch after save', () => {
      service.saveObservation(obs).subscribe()

      expect(observationService.getObservationsForMap).toHaveBeenCalled()
    })
  })
})
