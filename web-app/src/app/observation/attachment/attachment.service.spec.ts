import { TestBed } from '@angular/core/testing';

import { AttachmentService } from './attachment.service';

describe('UploadService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AttachmentService = TestBed.inject(AttachmentService);
    expect(service).toBeTruthy();
  });
});
