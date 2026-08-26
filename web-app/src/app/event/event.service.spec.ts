import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EventService } from './event.service';
import { FilterService } from '../filter/filter.service';
import { UserService } from '../user/user.service';
import { LocalStorageService } from '../http/local-storage.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { PollingService } from './polling.service';
import { LocationService } from '../user/location/location.service';
import { ObservationService } from '../observation/observation.service';
import { LayerService } from '../layer/layer.service';
import { FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const event: any = { id: 1, name: 'Event 1', teams: [], forms: [] };

describe('Event Service Tests', () => {

  let service: EventService;
  let filterService: FilterService;
  let pollingService: jasmine.SpyObj<PollingService>;
  let locationService: jasmine.SpyObj<LocationService>;
  let observationService: jasmine.SpyObj<ObservationService>;
  let layerService: jasmine.SpyObj<LayerService>;
  let feedService: jasmine.SpyObj<FeedService>;

  beforeEach(() => {
    const userService = jasmine.createSpyObj('UserService', ['addRecentEvent']);
    userService.addRecentEvent.and.returnValue(of({}));

    const localStorageService = jasmine.createSpyObj('LocalStorageService', [
      'getTimeInterval', 'setTimeInterval',
      'getTeams', 'setTeams',
      'setUsers', 'setForms'
    ]);
    localStorageService.getTimeInterval.and.returnValue(null);
    localStorageService.getTeams.and.returnValue([]);

    pollingService = jasmine.createSpyObj('PollingService', ['addListener', 'removeListener', 'getPollingInterval']);
    locationService = jasmine.createSpyObj('LocationService', ['getUserLocationsForEvent']);
    locationService.getUserLocationsForEvent.and.returnValue(of([]));
    observationService = jasmine.createSpyObj('ObservationService', ['getObservationsForEvent']);
    observationService.getObservationsForEvent.and.returnValue(of([]));
    layerService = jasmine.createSpyObj('LayerService', ['getLayersForEvent']);
    layerService.getLayersForEvent.and.returnValue(of([]));
    feedService = jasmine.createSpyObj('FeedService', ['fetchFeeds']);
    feedService.fetchFeeds.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        EventService,
        FilterService,
        { provide: UserService, useValue: userService },
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: SessionService, useValue: {} },
        { provide: PollingService, useValue: pollingService },
        { provide: LocationService, useValue: locationService },
        { provide: ObservationService, useValue: observationService },
        { provide: LayerService, useValue: layerService },
        { provide: FeedService, useValue: feedService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(EventService);
    filterService = TestBed.inject(FilterService);
  });

  afterEach(() => {
    service.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('event changes', () => {

    it('creates an eventsById bucket and fetches layers/feeds/data when an event is selected', () => {
      service.init();

      filterService.setEvent(event);

      expect(service.getEventById(event.id)).toBeTruthy();
      expect(layerService.getLayersForEvent).toHaveBeenCalledWith(event);
      expect(feedService.fetchFeeds).toHaveBeenCalledWith(event.id);
      expect(locationService.getUserLocationsForEvent).toHaveBeenCalled();
      expect(observationService.getObservationsForEvent).toHaveBeenCalled();
    });

    it('tears down the old eventsById bucket when the event changes', () => {
      service.init();
      filterService.setEvent(event);
      expect(service.getEventById(event.id)).toBeTruthy();

      const otherEvent: any = { id: 2, name: 'Event 2', teams: [], forms: [] };
      filterService.setEvent(otherEvent);

      expect(service.getEventById(event.id)).toBeUndefined();
      expect(service.getEventById(otherEvent.id)).toBeTruthy();
    });

    it('does not react to a listener once destroy has been called', () => {
      service.init();
      service.destroy();

      filterService.setEvent(event);

      expect(service.getEventById(event.id)).toBeUndefined();
    });
  });

  describe('interval changes', () => {

    it('re-fetches when the time interval changes for an active event', () => {
      service.init();
      filterService.setEvent(event);

      locationService.getUserLocationsForEvent.calls.reset();
      observationService.getObservationsForEvent.calls.reset();

      filterService.setTimeInterval({ choice: { filter: 86400, label: 'Last 24 Hours' } });

      expect(locationService.getUserLocationsForEvent).toHaveBeenCalled();
      expect(observationService.getObservationsForEvent).toHaveBeenCalled();
    });
  });

  describe('team/user/form filter changes', () => {

    it('re-evaluates the current event observations/users when teams change', () => {
      service.init();
      filterService.setEvent(event);

      const listener = jasmine.createSpyObj('listener', ['onObservationsChanged']);
      service.addObservationsChangedListener(listener);
      listener.onObservationsChanged.calls.reset();

      filterService.setTeams([{ id: 5, name: 'Team 5', userIds: [] }]);

      expect(listener.onObservationsChanged).toHaveBeenCalled();
    });

    it('re-evaluates on users and forms changes too', () => {
      service.init();
      filterService.setEvent(event);

      const listener = jasmine.createSpyObj('listener', ['onObservationsChanged']);
      service.addObservationsChangedListener(listener);

      listener.onObservationsChanged.calls.reset();
      filterService.setUsers([{ id: 'u1' } as any]);
      expect(listener.onObservationsChanged).toHaveBeenCalledTimes(1);

      listener.onObservationsChanged.calls.reset();
      filterService.setForms([{ id: 1 } as any]);
      expect(listener.onObservationsChanged).toHaveBeenCalledTimes(1);
    });
  });

  describe('action filter changes', () => {

    it('re-evaluates observations against the action filter', () => {
      service.init();
      filterService.setEvent(event);

      const listener = jasmine.createSpyObj('listener', ['onObservationsChanged']);
      service.addObservationsChangedListener(listener);
      listener.onObservationsChanged.calls.reset();

      filterService.setFilter({ actionFilter: 'important' });

      expect(listener.onObservationsChanged).toHaveBeenCalled();
    });
  });
});
