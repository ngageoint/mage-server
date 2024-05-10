import { TestBed } from '@angular/core/testing';
import { MapService } from './map.service';

describe('Map Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MapService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: MapService = TestBed.inject(MapService);
     expect(service).toBeTruthy();
   });
});