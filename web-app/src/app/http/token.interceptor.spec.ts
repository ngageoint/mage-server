import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TokenInterceptorService } from './token.interceptor';
import { MatDialogModule } from '@angular/material/dialog';

describe('Token Interceptor Service', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TokenInterceptorService],
      imports: [
        HttpClientTestingModule,
        MatDialogModule
      ]
    });
  });

  afterEach(() => {
  });

  it('should be created', () => {
    const service: TokenInterceptorService = TestBed.inject(TokenInterceptorService);
    expect(service).toBeTruthy();
  });
});