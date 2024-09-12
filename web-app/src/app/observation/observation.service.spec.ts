import { TestBed } from '@angular/core/testing';
import { ObservationService } from './observation.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Observation Service', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ObservationService],
      imports: [HttpClientTestingModule]
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: ObservationService = TestBed.inject(ObservationService);
     expect(service).toBeTruthy();
   });
});