import { TestBed } from '@angular/core/testing';

import { TeamService } from './team.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Team Service Tests', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [TeamService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  afterEach(() => {
  });

  it('should be created', () => {
    const service: TeamService = TestBed.inject(TeamService);
    expect(service).toBeTruthy();
  });
});
