import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from '../upgrade/ajs-upgraded-providers';
import { TokenInterceptorService } from './token-interceptor.service';

describe('TokenInterceptorService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [{
      provide: LocalStorageService
    }]
  }));

  it('should be created', () => {
    const service: TokenInterceptorService = TestBed.get(TokenInterceptorService);
    expect(service).toBeTruthy();
  });
});
