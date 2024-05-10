import { TestBed } from '@angular/core/testing';
import { EventService } from './event.service';

describe('Event Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventService],
      imports: []
    });
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: EventService = TestBed.inject(EventService);
     expect(service).toBeTruthy();
   });
});