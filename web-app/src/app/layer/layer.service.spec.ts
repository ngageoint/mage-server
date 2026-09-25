import { TestBed } from '@angular/core/testing';
import { LayerService } from './layer.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MageEvent } from '../entities/event/entities.event';

describe('Layer Service Tests', () => {
  const event = { id: 7 } as MageEvent;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [LayerService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: LayerService = TestBed.inject(LayerService);
     expect(service).toBeTruthy();
   });

   describe('getLayersForEvent', () => {
     it('asks for available layers only by sending no includeUnavailable param', () => {
       const service: LayerService = TestBed.inject(LayerService);
       const http = TestBed.inject(HttpTestingController);

       service.getLayersForEvent(event).subscribe();

       const req = http.expectOne(r => r.method === 'GET');
       expect(req.request.urlWithParams).toBe('/api/events/7/layers');
       req.flush([]);
     });

     it('sends includeUnavailable=true when unavailable layers are requested', () => {
       const service: LayerService = TestBed.inject(LayerService);
       const http = TestBed.inject(HttpTestingController);

       service.getLayersForEvent(event, true).subscribe();

       const req = http.expectOne(r => r.method === 'GET');
       expect(req.request.urlWithParams).toBe('/api/events/7/layers?includeUnavailable=true');
       req.flush([]);
     });
   });
});