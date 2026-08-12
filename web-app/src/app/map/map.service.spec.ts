import { TestBed } from '@angular/core/testing';
import { MapService } from './map.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Map Service Tests', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [MapService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
  });

  afterEach(() => {
  });

   it('should be created', () => {
     const service: MapService = TestBed.inject(MapService);
     expect(service).toBeTruthy();
   });

   describe('onFeedItemsChanged', () => {

    function addFeedItems(service: MapService, feed: any) {
      service.onFeedItemsChanged({
        added: [{ feed, items: [] }],
        updated: [],
        removed: []
      });
      return service.feedLayers[`feed-${feed.id}`];
    }

    it('selects the layer by default when the feed has showOnMapByDefault true', () => {
      const service: MapService = TestBed.inject(MapService);
      const feed = { id: 'feed1', title: 'Feed 1', itemsHaveSpatialDimension: true, showOnMapByDefault: true };

      const layer = addFeedItems(service, feed);

      expect(layer.options.selected).toEqual(true);
    });

    it('does not select the layer by default when the feed has showOnMapByDefault false', () => {
      const service: MapService = TestBed.inject(MapService);
      const feed = { id: 'feed2', title: 'Feed 2', itemsHaveSpatialDimension: true, showOnMapByDefault: false };

      const layer = addFeedItems(service, feed);

      expect(layer.options.selected).toEqual(false);
    });

    it('does not select the layer by default when the feed does not specify showOnMapByDefault', () => {
      const service: MapService = TestBed.inject(MapService);
      const feed = { id: 'feed3', title: 'Feed 3', itemsHaveSpatialDimension: true };

      const layer = addFeedItems(service, feed);

      expect(layer.options.selected).toEqual(false);
    });

    it('ignores feeds without a spatial dimension', () => {
      const service: MapService = TestBed.inject(MapService);
      const feed = { id: 'feed4', title: 'Feed 4', itemsHaveSpatialDimension: false, showOnMapByDefault: true };

      const layer = addFeedItems(service, feed);

      expect(layer).toBeUndefined();
    });
   });
});