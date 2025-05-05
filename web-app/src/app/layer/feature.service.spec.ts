import { TestBed } from '@angular/core/testing';
import { FeatureService } from './feature.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Feature Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FeatureService],
      imports: [HttpClientTestingModule]
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: FeatureService = TestBed.inject(FeatureService);
     expect(service).toBeTruthy();
   });
});