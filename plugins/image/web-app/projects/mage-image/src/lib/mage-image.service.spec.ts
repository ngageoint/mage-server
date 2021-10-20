import { TestBed } from '@angular/core/testing';

import { ImageService } from './mage-image.service';

describe('ImageService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ImageService = TestBed.get(ImageService);
    expect(service).toBeTruthy();
  });
});
