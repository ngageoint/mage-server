import { TestBed } from '@angular/core/testing';

import { MapSettingsService } from './map.settings.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('MapSettingsService', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  it('should be created', () => {
    const service: MapSettingsService = TestBed.inject(MapSettingsService);
    expect(service).toBeTruthy();
  });
});
