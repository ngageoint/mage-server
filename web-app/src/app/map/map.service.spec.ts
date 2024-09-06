import { TestBed } from '@angular/core/testing';
import { MapService } from './map.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Map Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MapService],
      imports: [HttpClientTestingModule]
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: MapService = TestBed.inject(MapService);
     expect(service).toBeTruthy();
   });
});