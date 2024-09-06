import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Local Storage Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalStorageService],
      imports: [HttpClientTestingModule]
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: LocalStorageService = TestBed.inject(LocalStorageService);
     expect(service).toBeTruthy();
   });
});