import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage.service';

describe('Local Storage Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalStorageService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: LocalStorageService = TestBed.inject(LocalStorageService);
     expect(service).toBeTruthy();
   });
});