import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AttachmentService } from './attachment.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('AttachmentService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  it('should be created', () => {
    const service: AttachmentService = TestBed.inject(AttachmentService);
    expect(service).toBeTruthy();
  });
});
