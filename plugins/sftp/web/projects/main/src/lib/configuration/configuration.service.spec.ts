import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ConfigurationService } from './configuration.service';

describe('Configuration Service', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    })
  );

  it('should be created', () => {
    const service: ConfigurationService = TestBed.inject(ConfigurationService);
    expect(service).toBeTruthy();
  });
});
