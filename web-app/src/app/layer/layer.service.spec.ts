import { TestBed } from '@angular/core/testing';
import { LayerService } from './layer.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Layer Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LayerService],
      imports: [HttpClientTestingModule]
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: LayerService = TestBed.inject(LayerService);
     expect(service).toBeTruthy();
   });
});