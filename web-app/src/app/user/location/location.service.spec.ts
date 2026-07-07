
import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Location Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [LocationService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: LocationService = TestBed.inject(LocationService);
     expect(service).toBeTruthy();
   });
});