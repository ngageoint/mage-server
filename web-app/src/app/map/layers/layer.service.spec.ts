import { TestBed } from '@angular/core/testing';

import { LayerService } from './layer.service';

describe('LayerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: LayerService = TestBed.get(LayerService);
    expect(service).toBeTruthy();
  });
});
