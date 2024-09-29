import { TestBed } from '@angular/core/testing';
import { PollingService } from './polling.service';

describe('Polling Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PollingService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: PollingService = TestBed.inject(PollingService);
     expect(service).toBeTruthy();
   });
});