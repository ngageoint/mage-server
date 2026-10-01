import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage.service';
import { EventObservationFilter, EventLocationFilter, DEFAULT_OBSERVATION_FILTER, DEFAULT_LOCATION_FILTER } from '../filter/filter.types';

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalStorageService]
    });
    service = TestBed.inject(LocalStorageService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('event id', () => {
    it('returns null when nothing is saved', () => {
      expect(service.getEventId()).toBeNull();
    });

    it('round-trips a numeric event id', () => {
      service.setEventId(1);
      expect(service.getEventId()).toBe(1);
    });

    it('round-trips a string event id', () => {
      service.setEventId('event-1');
      expect(service.getEventId()).toBe('event-1');
    });

    it('removes the saved id when set to null', () => {
      service.setEventId(1);
      service.setEventId(null);
      expect(service.getEventId()).toBeNull();
    });
  });

  describe('observation filter', () => {
    const filter: EventObservationFilter = { ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true };

    it('returns null when nothing is saved for the event', () => {
      expect(service.getObservationFilter(1)).toBeNull();
    });

    it('round-trips a filter for a given event', () => {
      service.setObservationFilter(1, filter);
      expect(service.getObservationFilter(1)).toEqual(filter);
    });

    it('keeps filters for different events independent', () => {
      service.setObservationFilter(1, filter);
      service.setObservationFilter(2, { ...DEFAULT_OBSERVATION_FILTER, isUserFavorite: true });

      expect(service.getObservationFilter(1)).toEqual(filter);
      expect(service.getObservationFilter(2)?.isUserFavorite).toBeTrue();
    });

    it('removes only the given event when set to null', () => {
      service.setObservationFilter(1, filter);
      service.setObservationFilter(2, filter);

      service.setObservationFilter(1, null);

      expect(service.getObservationFilter(1)).toBeNull();
      expect(service.getObservationFilter(2)).toEqual(filter);
    });

    it('revives Date objects in a custom time interval', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-02T00:00:00Z');
      service.setObservationFilter(1, {
        ...DEFAULT_OBSERVATION_FILTER,
        timeInterval: { choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate } }
      });

      const result = service.getObservationFilter(1);

      expect(result?.timeInterval.options?.startDate instanceof Date).toBeTrue();
      expect(result?.timeInterval.options?.startDate?.getTime()).toBe(startDate.getTime());
      expect(result?.timeInterval.options?.endDate?.getTime()).toBe(endDate.getTime());
    });
  });

  describe('location filter', () => {
    const filter: EventLocationFilter = { ...DEFAULT_LOCATION_FILTER, memberFilter: { teamIds: ['t1'], userIds: [] } };

    it('returns null when nothing is saved for the event', () => {
      expect(service.getLocationFilter(1)).toBeNull();
    });

    it('round-trips a filter for a given event', () => {
      service.setLocationFilter(1, filter);
      expect(service.getLocationFilter(1)).toEqual(filter);
    });

    it('removes only the given event when set to null', () => {
      service.setLocationFilter(1, filter);
      service.setLocationFilter(2, filter);

      service.setLocationFilter(2, null);

      expect(service.getLocationFilter(1)).toEqual(filter);
      expect(service.getLocationFilter(2)).toBeNull();
    });

    it('revives Date objects in a custom time interval', () => {
      const startDate = new Date('2024-03-01T00:00:00Z');
      const endDate = new Date('2024-03-02T00:00:00Z');
      service.setLocationFilter(1, {
        ...DEFAULT_LOCATION_FILTER,
        timeInterval: { choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate } }
      });

      const result = service.getLocationFilter(1);

      expect(result?.timeInterval.options?.startDate instanceof Date).toBeTrue();
    });
  });

  describe('polling interval', () => {
    it('returns null when nothing is saved', () => {
      expect(service.getPollingInterval()).toBeNull();
    });

    it('round-trips the interval as a number', () => {
      service.setPollingInterval(30000);
      expect(service.getPollingInterval()).toBe(30000);
    });

    it('returns null when the saved value is not a number', () => {
      localStorage.setItem('pollingInterval', 'not-a-number');
      expect(service.getPollingInterval()).toBeNull();
    });
  });

  describe('map position', () => {
    it('returns undefined when nothing is saved', () => {
      expect(service.getMapPosition()).toBeUndefined();
    });

    it('round-trips the map position', () => {
      const position = { center: [0, 0], zoom: 5 };
      service.setMapPosition(position);
      expect(service.getMapPosition()).toEqual(position);
    });
  });

  describe('display preferences', () => {
    it('defaults coordinate system view to wgs84', () => {
      expect(service.getCoordinateSystemView()).toBe('wgs84');
    });

    it('falls back the edit coordinate system to the view setting', () => {
      service.setCoordinateSystemView('mgrs');
      expect(service.getCoordinateSystemEdit()).toBe('mgrs');
    });

    it('uses its own edit coordinate system when set', () => {
      service.setCoordinateSystemView('mgrs');
      service.setCoordinateSystemEdit('gars');
      expect(service.getCoordinateSystemEdit()).toBe('gars');
    });

    it('defaults time zone view to local', () => {
      expect(service.getTimeZoneView()).toBe('local');
    });

    it('falls back the edit time zone to the view setting', () => {
      service.setTimeZoneView('gmt');
      expect(service.getTimeZoneEdit()).toBe('gmt');
    });

    it('defaults time format to absolute', () => {
      expect(service.getTimeFormat()).toBe('absolute');
    });
  });

  describe('values that are not valid JSON', () => {
    beforeEach(() => {
      spyOn(console, 'warn');
    });

    it('treats a corrupt event id as none and warns about the key', () => {
      localStorage.setItem('event', 'abc');

      expect(service.getEventId()).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(jasmine.stringContaining('"event"'));
    });

    it('treats corrupt saved observation filters as none', () => {
      localStorage.setItem('observationFilters', '{bad');

      expect(service.getObservationFilter(1)).toBeNull();
    });

    it('treats corrupt saved location filters as none', () => {
      localStorage.setItem('locationFilters', '{bad');

      expect(service.getLocationFilter(1)).toBeNull();
    });

    it('treats a corrupt map position as none', () => {
      localStorage.setItem('mapPosition', '{bad');

      expect(service.getMapPosition()).toBeUndefined();
    });

    it('can save a filter over corrupt saved filters', () => {
      localStorage.setItem('observationFilters', '{bad');
      const filter: EventObservationFilter = { ...DEFAULT_OBSERVATION_FILTER, hasAttachments: true };

      service.setObservationFilter(1, filter);

      expect(service.getObservationFilter(1)).toEqual(filter);
    });

    it('treats saved filters that are valid JSON but not an object as none', () => {
      localStorage.setItem('locationFilters', '5');
      expect(service.getLocationFilter(1)).toBeNull();

      localStorage.setItem('locationFilters', '[]');
      expect(service.getLocationFilter(1)).toBeNull();

      service.setLocationFilter(1, DEFAULT_LOCATION_FILTER);
      expect(service.getLocationFilter(1)).toEqual(DEFAULT_LOCATION_FILTER);
    });
  });
});
