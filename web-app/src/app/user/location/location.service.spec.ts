
import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Location Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocationService],
      imports: [HttpClientTestingModule]
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: LocationService = TestBed.inject(LocationService);
     expect(service).toBeTruthy();
   });
});