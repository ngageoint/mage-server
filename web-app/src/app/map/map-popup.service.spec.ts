import { TestBed } from '@angular/core/testing';

import { MapPopupService } from './map-popup.service';

describe('MapPopupService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MapPopupService = TestBed.inject(MapPopupService);
    expect(service).toBeTruthy();
  });
});
