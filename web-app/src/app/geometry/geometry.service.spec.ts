import { TestBed } from '@angular/core/testing';
import { GeometryService } from './geometry.service';

describe('Geometry Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GeometryService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: GeometryService = TestBed.inject(GeometryService);
     expect(service).toBeTruthy();
   });
});