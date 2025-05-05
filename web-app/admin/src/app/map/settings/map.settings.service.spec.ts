import { TestBed } from '@angular/core/testing';

import { MapSettingsService } from './map.settings.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MapSettingsService', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
  });

  it('should be created', () => {
    const service: MapSettingsService = TestBed.inject(MapSettingsService);
    expect(service).toBeTruthy();
  });
});
