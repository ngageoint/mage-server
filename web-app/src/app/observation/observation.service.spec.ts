import { TestBed } from '@angular/core/testing';
import { ObservationService } from './observation.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Observation Service', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [ObservationService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: ObservationService = TestBed.inject(ObservationService);
     expect(service).toBeTruthy();
   });
});