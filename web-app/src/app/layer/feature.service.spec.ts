import { TestBed } from '@angular/core/testing';
import { FeatureService } from './feature.service';

describe('Feature Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FeatureService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: FeatureService = TestBed.inject(FeatureService);
     expect(service).toBeTruthy();
   });
});