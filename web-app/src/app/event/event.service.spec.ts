import { TestBed } from '@angular/core/testing';
import { EventService } from './event.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Event Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [EventService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: EventService = TestBed.inject(EventService);
     expect(service).toBeTruthy();
   });
});