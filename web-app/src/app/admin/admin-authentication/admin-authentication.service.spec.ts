import { TestBed } from '@angular/core/testing';
import { AdminAuthenticationService } from './admin-authentication.service';

describe('Admin Authentication Service Tests', () => {
  let service: AdminAuthenticationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminAuthenticationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
