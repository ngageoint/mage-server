import { TestBed } from '@angular/core/testing';

import { FeedPanelService } from './feed-panel.service';

describe('FeedPanelService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FeedPanelService = TestBed.inject(FeedPanelService);
    expect(service).toBeTruthy();
  });
});
