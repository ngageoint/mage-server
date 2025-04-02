import { TestBed } from '@angular/core/testing';
import { ConfigurationService } from './configuration.service';

describe('Configuration Service', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ConfigurationService = TestBed.inject(ConfigurationService);
    expect(service).toBeTruthy();
  });
});
