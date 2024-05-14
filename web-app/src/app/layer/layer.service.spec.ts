import { TestBed } from '@angular/core/testing';
import { LayerService } from './layer.service';

describe('Layer Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LayerService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: LayerService = TestBed.inject(LayerService);
     expect(service).toBeTruthy();
   });
});