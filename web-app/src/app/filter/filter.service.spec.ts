import { TestBed } from '@angular/core/testing';
import { FilterService } from './filter.service';

describe('Filter Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FilterService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: FilterService = TestBed.inject(FilterService);
     expect(service).toBeTruthy();
   });
});