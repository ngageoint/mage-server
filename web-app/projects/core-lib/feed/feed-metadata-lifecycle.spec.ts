import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Feature } from 'geojson';
import { FeedService } from './feed.service';

describe('FeedService metadata request lifecycle', () => {
  let service: FeedService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(FeedService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts on subscription, shares results, normalizes IDs and completes', () => {
    const result = service.fetchFeeds(1);
    http.expectNone('/api/events/1/feeds');
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');
    const complete = jasmine.createSpy('complete');
    const feeds = jasmine.createSpy('feeds');
    const state = service.feeds$.subscribe(feeds);

    result.subscribe({ next: first, complete });
    result.subscribe(second);
    http.expectOne('/api/events/1/feeds').flush([{ id: 3 }]);

    expect(first.calls.mostRecent().args[0][0].id).toBe('3');
    expect(second).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(feeds.calls.mostRecent().args[0]).toEqual([{ id: '3' }]);
    let items: Feature[] | undefined;
    const itemState = service.feedItems('3').subscribe(value => items = value);
    expect(items).toEqual([]);
    itemState.unsubscribe();
    state.unsubscribe();
  });

  it('keeps a shared request until its last subscriber leaves', () => {
    const result = service.fetchFeeds(1);
    const first = result.subscribe();
    const second = result.subscribe();
    const request = http.expectOne('/api/events/1/feeds');

    first.unsubscribe();
    expect(request.cancelled).toBeFalse();
    second.unsubscribe();
    expect(request.cancelled).toBeTrue();
  });

  it('forwards HTTP errors to callers', () => {
    const error = jasmine.createSpy('error');
    service.fetchFeeds(1).subscribe({ error });
    http.expectOne('/api/events/1/feeds').flush('offline', {
      status: 503, statusText: 'Unavailable'
    });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.calls.mostRecent().args[0].status).toBe(503);
  });

  it('does not clear existing metadata when a subsequent request fails', () => {
    const feeds = jasmine.createSpy('feeds');
    const state = service.feeds$.subscribe(feeds);
    service.fetchFeeds(1).subscribe();
    http.expectOne('/api/events/1/feeds').flush([{ id: 3 }]);
    service.fetchFeeds(2).subscribe({ error: () => undefined });
    http.expectOne('/api/events/2/feeds').flush('offline', {
      status: 503, statusText: 'Unavailable'
    });
    expect(feeds.calls.mostRecent().args[0]).toEqual([{ id: '3' }]);
    state.unsubscribe();
  });
});
