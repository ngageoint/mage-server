import { TestBed } from '@angular/core/testing';
import { FilterService } from './filter.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Filter Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FilterService],
      imports: [ HttpClientTestingModule ]
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: FilterService = TestBed.inject(FilterService);
     expect(service).toBeTruthy();
   });
});