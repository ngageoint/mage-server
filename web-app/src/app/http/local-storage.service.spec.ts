import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Local Storage Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [LocalStorageService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: LocalStorageService = TestBed.inject(LocalStorageService);
     expect(service).toBeTruthy();
   });
});