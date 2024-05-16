import { TestBed } from '@angular/core/testing';
import { AdminSettingsService } from './admin-settings.service';

describe('Admin Settings Service Tests', () => {
  let service: AdminSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
