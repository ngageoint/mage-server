import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;
  let httpMock: HttpTestingController;

  const event: any = { id: 1, name: 'Test Event' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocationService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
    });
    service = TestBed.inject(LocationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('create', () => {
    it('posts the location to the event', () => {
      const location = { type: 'Feature' };
      service.create(1, location).subscribe();

      const req = httpMock.expectOne('/api/events/1/locations/');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(location);
      req.flush({});
    });
  });

  describe('getUserLocationsCount', () => {
    it('always sends page and page_size', () => {
      service.getUserLocationsCount(event).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/events/1/locations');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('page_size')).toBe('1');
      req.flush({ totalCount: 0 });
    });

    it('omits date and member params that are not provided', () => {
      service.getUserLocationsCount(event).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/events/1/locations');
      expect(req.request.params.has('startDate')).toBeFalse();
      expect(req.request.params.has('endDate')).toBeFalse();
      expect(req.request.params.has('users')).toBeFalse();
      expect(req.request.params.has('teams')).toBeFalse();
      req.flush({ totalCount: 0 });
    });

    it('omits users/teams params when the arrays are empty', () => {
      service.getUserLocationsCount(event, { users: [], teams: [] }).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/events/1/locations');
      expect(req.request.params.has('users')).toBeFalse();
      expect(req.request.params.has('teams')).toBeFalse();
      req.flush({ totalCount: 0 });
    });

    it('includes date and member params when provided', () => {
      service.getUserLocationsCount(event, {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z',
        users: ['u1', 'u2'],
        teams: ['t1']
      }).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/events/1/locations');
      expect(req.request.params.get('startDate')).toBe('2024-01-01T00:00:00Z');
      expect(req.request.params.get('endDate')).toBe('2024-01-02T00:00:00Z');
      expect(req.request.params.get('users')).toBe('u1,u2');
      expect(req.request.params.get('teams')).toBe('t1');
      req.flush({ totalCount: 0 });
    });
  });

  describe('getUserLocationsForEvent', () => {
    it('defaults limit to 1 and populate to false', () => {
      service.getUserLocationsForEvent(event).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/events/1/locations/users');
      expect(req.request.params.get('limit')).toBe('1');
      expect(req.request.params.get('populate')).toBe('false');
      req.flush([]);
    });

    it('uses the provided limit and populate values', () => {
      service.getUserLocationsForEvent(event, { limit: 50, populate: true }).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/events/1/locations/users');
      expect(req.request.params.get('limit')).toBe('50');
      expect(req.request.params.get('populate')).toBe('true');
      req.flush([]);
    });

    it('includes date and member params when provided', () => {
      service.getUserLocationsForEvent(event, {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z',
        users: ['u1', 'u2'],
        teams: ['t1']
      }).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/events/1/locations/users');
      expect(req.request.params.get('startDate')).toBe('2024-01-01T00:00:00Z');
      expect(req.request.params.get('endDate')).toBe('2024-01-02T00:00:00Z');
      expect(req.request.params.get('users')).toBe('u1,u2');
      expect(req.request.params.get('teams')).toBe('t1');
      req.flush([]);
    });

    it('omits date params entirely when not provided', () => {
      service.getUserLocationsForEvent(event).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/events/1/locations/users');
      expect(req.request.params.has('startDate')).toBeFalse();
      expect(req.request.params.has('endDate')).toBeFalse();
      req.flush([]);
    });
  });
});
