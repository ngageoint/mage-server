import { TestBed } from '@angular/core/testing';
import { FeedItemService } from './feed-item.service';

describe('FeedItemService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FeedItemService = TestBed.inject(FeedItemService);
    expect(service).toBeTruthy();
  });
});
