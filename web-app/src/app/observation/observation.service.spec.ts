import { TestBed } from '@angular/core/testing';
import { ObservationService } from './observation.service';

describe('Local Storage Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ObservationService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: ObservationService = TestBed.inject(ObservationService);
     expect(service).toBeTruthy();
   });
});