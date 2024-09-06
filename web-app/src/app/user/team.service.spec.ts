import { TestBed } from '@angular/core/testing';

import { TeamService } from './team.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Team Service Tests', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TeamService],
      imports: [HttpClientTestingModule]
    });
  });

  afterEach(() => {
  });

  it('should be created', () => {
    const service: TeamService = TestBed.inject(TeamService);
    expect(service).toBeTruthy();
  });
});
