import { TestBed } from '@angular/core/testing';
import { LayerService } from './layer.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Layer Service Tests', () => {

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
});