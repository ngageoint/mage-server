import { TestBed } from '@angular/core/testing';
import { ObservationService } from './observation.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Observation Service', () => {
  let service: ObservationService;
  let httpMock: HttpTestingController;
  const event: any = { id: 1, forms: [] };

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [ObservationService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    service = TestBed.inject(ObservationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

   it('should be created', () => {
     expect(service).toBeTruthy();
   });

  it('should not include date params when no interval is provided', () => {
    service.getObservationsForEvent(event, {}).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/events/1/observations');
    expect(req.request.params.has('observationStartDate')).toBeFalse();
    expect(req.request.params.has('observationEndDate')).toBeFalse();
    req.flush([]);
  });

  it('should not send literal "undefined" or "null" date params when the interval has no start or end', () => {
    service.getObservationsForEvent(event, { interval: { start: null, end: undefined } }).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/events/1/observations');
    expect(req.request.params.has('observationStartDate')).toBeFalse();
    expect(req.request.params.has('observationEndDate')).toBeFalse();
    req.flush([]);
  });

  it('should include only the date params that are present on the interval', () => {
    service.getObservationsForEvent(event, { interval: { start: '2026-01-01T00:00:00.000Z' } }).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/events/1/observations');
    expect(req.request.params.get('observationStartDate')).toBe('2026-01-01T00:00:00.000Z');
    expect(req.request.params.has('observationEndDate')).toBeFalse();
    req.flush([]);
  });

  it('should include both date params when the interval has a start and end', () => {
    service.getObservationsForEvent(event, {
      interval: { start: '2026-01-01T00:00:00.000Z', end: '2026-01-02T00:00:00.000Z' }
    }).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/events/1/observations');
    expect(req.request.params.get('observationStartDate')).toBe('2026-01-01T00:00:00.000Z');
    expect(req.request.params.get('observationEndDate')).toBe('2026-01-02T00:00:00.000Z');
    req.flush([]);
  });
});
