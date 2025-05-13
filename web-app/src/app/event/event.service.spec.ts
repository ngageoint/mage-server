import { TestBed } from '@angular/core/testing';
import { EventService } from './event.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Event Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventService],
      imports: [HttpClientTestingModule]
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: EventService = TestBed.inject(EventService);
     expect(service).toBeTruthy();
   });
});