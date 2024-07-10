
import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';

describe('Local Storage Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocationService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: LocationService = TestBed.inject(LocationService);
     expect(service).toBeTruthy();
   });
});