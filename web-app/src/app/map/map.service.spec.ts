import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { LocationEvent } from 'leaflet';
import { Feed } from '@ngageoint/mage.web-core-lib/feed';
import { MapService } from './map.service';
import { MapFeature, MapLayer, RasterLayer, VectorLayer } from './entities.map-layer';
import { EventService } from '../event/event.service';
import { FeatureService } from '../layer/feature.service';
import { SessionService } from '../http/session.service';
import { Layer } from '../entities/layer/entities.layer';
import { MageEvent } from '../entities/event/entities.event';
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

      expect(layer.selectedByDefault).toEqual(true);
    });

    it('does not select the layer by default when the feed has showOnMapByDefault false', () => {
      const service: MapService = TestBed.inject(MapService);
      const feed = { id: 'feed2', title: 'Feed 2', itemsHaveSpatialDimension: true, showOnMapByDefault: false };

      const layer = addFeedItems(service, feed);

      expect(layer.selectedByDefault).toEqual(false);
    });

    it('does not select the layer by default when the feed does not specify showOnMapByDefault', () => {
      const service: MapService = TestBed.inject(MapService);
      const feed = { id: 'feed3', title: 'Feed 3', itemsHaveSpatialDimension: true };

      const layer = addFeedItems(service, feed);

      expect(layer.selectedByDefault).toEqual(false);
    });

    it('ignores feeds without a spatial dimension', () => {
      const service: MapService = TestBed.inject(MapService);
      const feed = { id: 'feed4', title: 'Feed 4', itemsHaveSpatialDimension: false, showOnMapByDefault: true };

      const layer = addFeedItems(service, feed);

      expect(layer).toBeUndefined();
    });
   });

   describe('init - mapObservations$ diffing', () => {
    let service: MapService;
    let mapObservationsSubject: Subject<any[] | null>;
    let locationsSubject: Subject<any>;
    let listener: jasmine.SpyObj<any>;

    function mapObservation(id: string, lastModified: string) {
      return { id, type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, lastModified, properties: {} };
    }

    beforeEach(() => {
      mapObservationsSubject = new Subject<any[] | null>();
      locationsSubject = new Subject<any>();
      const eventService = jasmine.createSpyObj('EventService', ['addLayersChangedListener', 'addFeedItemsChangedListener'], {
        mapObservations$: mapObservationsSubject.asObservable(),
        locations$: locationsSubject.asObservable()
      });

      TestBed.overrideProvider(EventService, { useValue: eventService });
      service = TestBed.inject(MapService);
      listener = jasmine.createSpyObj('listener', ['onFeaturesChanged', 'onLayersChanged']);
      service.listeners.push(listener);
      service.init();

      mapObservationsSubject.next([]);
      listener.onFeaturesChanged.calls.reset();
    });

    it('adds a new observation to the observations layer and tracks it', () => {
      const obs = mapObservation('o1', '2024-01-01');

      mapObservationsSubject.next([obs]);

      expect(service.observationsById['o1']).toEqual(obs);
      expect(listener.onFeaturesChanged).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'observations', added: [obs] }));
    });

    it('updates an observation whose lastModified changed', () => {
      const obs = mapObservation('o1', '2024-01-01');
      mapObservationsSubject.next([obs]);
      listener.onFeaturesChanged.calls.reset();

      const updated = mapObservation('o1', '2024-01-02');
      mapObservationsSubject.next([updated]);

      expect(service.observationsById['o1']).toEqual(updated);
      expect(listener.onFeaturesChanged).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'observations', updated: [updated] }));
    });

    it('does not notify for an observation with an unchanged lastModified', () => {
      const obs = mapObservation('o1', '2024-01-01');
      mapObservationsSubject.next([obs]);
      listener.onFeaturesChanged.calls.reset();

      mapObservationsSubject.next([obs]);

      expect(listener.onFeaturesChanged).not.toHaveBeenCalled();
    });

    it('removes an observation no longer present and stops tracking it', () => {
      const obs = mapObservation('o1', '2024-01-01');
      mapObservationsSubject.next([obs]);
      listener.onFeaturesChanged.calls.reset();

      mapObservationsSubject.next([]);

      expect(service.observationsById['o1']).toBeUndefined();
      expect(listener.onFeaturesChanged).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'observations', removed: [obs] }));
    });
   });

   describe('init - locations$ diffing', () => {
    let service: MapService;
    let mapObservationsSubject: Subject<any[] | null>;
    let locationsSubject: Subject<any>;
    let listener: jasmine.SpyObj<any>;

    function userLocation(id: string, timestamp: string) {
      return { id, location: { id, properties: { timestamp } } };
    }

    beforeEach(() => {
      mapObservationsSubject = new Subject<any[] | null>();
      locationsSubject = new Subject<any>();
      const eventService = jasmine.createSpyObj('EventService', ['addLayersChangedListener', 'addFeedItemsChangedListener'], {
        mapObservations$: mapObservationsSubject.asObservable(),
        locations$: locationsSubject.asObservable()
      });

      TestBed.overrideProvider(EventService, { useValue: eventService });
      service = TestBed.inject(MapService);
      listener = jasmine.createSpyObj('listener', ['onFeaturesChanged', 'onLayersChanged', 'onFeatureZoom']);
      service.listeners.push(listener);
      service.init();

      locationsSubject.next({ data: [] });
      listener.onFeaturesChanged.calls.reset();
    });

    it('adds a new user location to the people layer and tracks it', () => {
      const user = userLocation('u1', '2024-01-01T00:00:00Z');

      locationsSubject.next({ data: [user] });

      expect(service.usersById['u1']).toEqual(user);
      expect(listener.onFeaturesChanged).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'people', added: [user.location] }));
    });

    it('updates a user whose location timestamp changed', () => {
      const user = userLocation('u1', '2024-01-01T00:00:00Z');
      locationsSubject.next({ data: [user] });
      listener.onFeaturesChanged.calls.reset();

      const updated = userLocation('u1', '2024-01-02T00:00:00Z');
      locationsSubject.next({ data: [updated] });

      expect(service.usersById['u1']).toEqual(updated);
      expect(listener.onFeaturesChanged).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'people', updated: [updated.location] }));
    });

    it('zooms to the followed user when their location updates', () => {
      const user = userLocation('u1', '2024-01-01T00:00:00Z');
      locationsSubject.next({ data: [user] });
      service.followedFeature = { id: 'u1', layer: 'people' };

      const updated = userLocation('u1', '2024-01-02T00:00:00Z');
      locationsSubject.next({ data: [updated] });

      expect(listener.onFeatureZoom).toHaveBeenCalledWith({ id: 'people', feature: updated });
    });

    it('does not notify for a user location with an unchanged timestamp', () => {
      const user = userLocation('u1', '2024-01-01T00:00:00Z');
      locationsSubject.next({ data: [user] });
      listener.onFeaturesChanged.calls.reset();

      locationsSubject.next({ data: [user] });

      expect(listener.onFeaturesChanged).not.toHaveBeenCalled();
    });

    it('removes a user location no longer present and stops tracking it', () => {
      const user = userLocation('u1', '2024-01-01T00:00:00Z');
      locationsSubject.next({ data: [user] });
      listener.onFeaturesChanged.calls.reset();

      locationsSubject.next({ data: [] });

      expect(service.usersById['u1']).toBeUndefined();
      expect(listener.onFeaturesChanged).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'people', removed: [user.location] }));
    });
   });

   describe('init/destroy lifecycle', () => {
    let service: MapService;
    let mapObservationsSubject: Subject<any[] | null>;
    let locationsSubject: Subject<any>;
    let listener: jasmine.SpyObj<any>;

    function mapObservation(id: string, lastModified: string) {
      return { id, type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, lastModified, properties: {} };
    }

    beforeEach(() => {
      mapObservationsSubject = new Subject<any[] | null>();
      locationsSubject = new Subject<any>();
      const eventService = jasmine.createSpyObj('EventService', ['addLayersChangedListener', 'addFeedItemsChangedListener', 'removeLayersChangedListener', 'removeFeedItemsChangedListener'], {
        mapObservations$: mapObservationsSubject.asObservable(),
        locations$: locationsSubject.asObservable()
      });

      TestBed.overrideProvider(EventService, { useValue: eventService });
      service = TestBed.inject(MapService);
      listener = jasmine.createSpyObj('listener', ['onFeaturesChanged', 'onLayersChanged']);
      service.listeners.push(listener);
    });

    it('tears down subscriptions from a second init/destroy cycle', () => {
      service.init();
      service.destroy();
      service.listeners.push(listener);
      service.init();
      service.destroy();

      mapObservationsSubject.next([]);
      listener.onFeaturesChanged.calls.reset();

      mapObservationsSubject.next([mapObservation('o1', '2024-01-01')]);

      expect(listener.onFeaturesChanged).not.toHaveBeenCalled();
    });
   });

   describe('layers, features and listeners', () => {
    let service: MapService;
    let featureService: jasmine.SpyObj<FeatureService>;
    let listener: jasmine.SpyObj<any>;

    const LISTENER_METHODS = [
      'onLayersChanged', 'onFeaturesChanged', 'onLayerRemoved', 'onFeedRemoved', 'onFeatureZoom',
      'onFeatureDeselect', 'onBaseLayerSelected', 'onLocation', 'onLocationStop'
    ];

    function vectorLayer(id: string): VectorLayer {
      return { type: 'vector', id, name: id, group: 'feature', renderHooks: {} };
    }

    function rasterLayer(id: number): RasterLayer {
      return { type: 'Imagery', id, name: String(id), url: 'http://example.com', format: 'XYZ' };
    }

    function feedFeature(id: string): MapFeature {
      return { id, type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} };
    }

    beforeEach(() => {
      featureService = jasmine.createSpyObj('FeatureService', ['getFeatureCollection']);
      featureService.getFeatureCollection.and.returnValue(of({ type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection));
      const sessionService = jasmine.createSpyObj('SessionService', ['getToken']);
      sessionService.getToken.and.returnValue('test-token');

      TestBed.overrideProvider(FeatureService, { useValue: featureService });
      TestBed.overrideProvider(SessionService, { useValue: sessionService });
      service = TestBed.inject(MapService);

      listener = jasmine.createSpyObj('listener', LISTENER_METHODS);
      service.addListener(listener);
      LISTENER_METHODS.forEach(method => listener[method].calls.reset());
    });

    describe('addListener', () => {
      it('replays existing layers, their features and the base layer to a late listener', () => {
        service.createVectorLayer(vectorLayer('v1'));
        service.addFeaturesToLayer([feedFeature('f1')], 'v1');
        service.createRasterLayer(rasterLayer(1));

        const late = jasmine.createSpyObj('late', LISTENER_METHODS);
        service.addListener(late);

        const added = late.onLayersChanged.calls.mostRecent().args[0].added.map((l: MapLayer) => l.id);
        expect(added).toEqual(jasmine.arrayContaining([1, 'v1']));
        expect(late.onFeaturesChanged).toHaveBeenCalledWith({ id: 'v1', added: [feedFeature('f1')] });
        expect(late.onBaseLayerSelected).toHaveBeenCalledWith(null);
      });

      it('tolerates listeners that implement none of the callbacks', () => {
        expect(() => service.addListener({})).not.toThrow();
        expect(() => service.featuresChanged({ id: 'v1' })).not.toThrow();
      });
    });

    describe('removeListener', () => {
      it('stops notifying the removed listener', () => {
        service.removeListener(listener);
        service.onLocationStop();

        expect(listener.onLocationStop).not.toHaveBeenCalled();
      });
    });

    describe('createRasterLayer', () => {
      it('stores the layer in rasterLayers', () => {
        service.createRasterLayer(rasterLayer(1));
        expect(service.rasterLayers['1']).toBeDefined();
      });

      it('notifies listeners of the added layer', () => {
        service.createRasterLayer(rasterLayer(1));

        expect(listener.onLayersChanged).toHaveBeenCalledWith({ added: [jasmine.objectContaining({ id: 1 })] });
      });
    });

    describe('createVectorLayer', () => {
      it('stores the layer in vectorLayers', () => {
        service.createVectorLayer(vectorLayer('v1'));
        expect(service.vectorLayers['v1']).toBeDefined();
      });

      it('notifies listeners of the added layer', () => {
        service.createVectorLayer(vectorLayer('v1'));

        expect(listener.onLayersChanged).toHaveBeenCalledWith({ added: [jasmine.objectContaining({ id: 'v1' })] });
      });
    });

    describe('createGridLayer', () => {
      it('stores the layer in gridLayers', () => {
        service.createGridLayer({ type: 'grid', id: 'gars', name: 'GARS' });
        expect(service.gridLayers['gars']).toBeDefined();
      });
    });

    describe('createFeedLayer', () => {
      it('stores the layer in feedLayers', () => {
        service.createFeedLayer(vectorLayer('feed-1'));
        expect(service.feedLayers['feed-1']).toBeDefined();
      });
    });

    describe('addFeaturesToLayer', () => {
      it('replays the added features to a late listener', () => {
        service.createVectorLayer(vectorLayer('v1'));
        service.addFeaturesToLayer([feedFeature('f1'), feedFeature('f2')], 'v1');

        const late = jasmine.createSpyObj('late', LISTENER_METHODS);
        service.addListener(late);

        const change = late.onFeaturesChanged.calls.mostRecent().args[0];
        expect(change.added.map((f: MapFeature) => f.id)).toEqual(['f1', 'f2']);
      });

      it('notifies listeners with a flat list of the added features', () => {
        service.createVectorLayer(vectorLayer('v1'));
        listener.onFeaturesChanged.calls.reset();

        service.addFeaturesToLayer([feedFeature('f1')], 'v1');

        expect(listener.onFeaturesChanged).toHaveBeenCalledWith({ id: 'v1', added: [feedFeature('f1')] });
      });
    });

    describe('updateFeatureForLayer', () => {
      it('notifies listeners of the updated feature', () => {
        service.updateFeatureForLayer(feedFeature('f1'), 'v1');

        expect(listener.onFeaturesChanged).toHaveBeenCalledWith({ id: 'v1', updated: [feedFeature('f1')] });
      });
    });

    describe('removeFeatureFromLayer', () => {
      it('stops replaying the feature to late listeners', () => {
        service.createVectorLayer(vectorLayer('v1'));
        service.addFeaturesToLayer([feedFeature('f1')], 'v1');

        service.removeFeatureFromLayer({ id: 'f1' }, 'v1');

        const late = jasmine.createSpyObj('late', LISTENER_METHODS);
        service.addListener(late);
        expect(late.onFeaturesChanged).toHaveBeenCalledWith({ id: 'v1', added: [] });
      });

      it('notifies listeners of the removed feature', () => {
        service.removeFeatureFromLayer({ id: 'f1' }, 'v1');

        expect(listener.onFeaturesChanged).toHaveBeenCalledWith({ id: 'v1', removed: [{ id: 'f1' }] });
      });
    });

    describe('deselectFeatureInLayer', () => {
      it('calls onFeatureDeselect on listeners', () => {
        service.deselectFeatureInLayer({ id: 'f1' }, 'v1');

        expect(listener.onFeatureDeselect).toHaveBeenCalledWith({ id: 'v1', feature: { id: 'f1' } });
      });

      it('ignores a feature with no id', () => {
        service.deselectFeatureInLayer({}, 'v1');

        expect(listener.onFeatureDeselect).not.toHaveBeenCalled();
      });
    });

    describe('zoomToFeatureInLayer', () => {
      it('calls onFeatureZoom on listeners', () => {
        service.zoomToFeatureInLayer({ id: 'f1' }, 'v1');

        expect(listener.onFeatureZoom).toHaveBeenCalledWith({ id: 'v1', feature: { id: 'f1' } });
      });

      it('ignores a feature with no id', () => {
        service.zoomToFeatureInLayer({}, 'v1');

        expect(listener.onFeatureZoom).not.toHaveBeenCalled();
      });
    });

    describe('followFeatureInLayer', () => {
      it('sets followedFeature and zooms when following a new feature', () => {
        service.followFeatureInLayer({ id: 'f1' }, 'v1');

        expect(service.followedFeature).toEqual({ id: 'f1', layer: 'v1' });
        expect(listener.onFeatureZoom).toHaveBeenCalled();
      });

      it('clears followedFeature when called again with the same feature', () => {
        service.followFeatureInLayer({ id: 'f1' }, 'v1');
        service.followFeatureInLayer({ id: 'f1' }, 'v1');

        expect(service.followedFeature).toEqual({ id: undefined, layer: undefined });
      });

      it('does nothing when called with no feature', () => {
        service.followFeatureInLayer(null as unknown as { id: string }, 'v1');

        expect(service.followedFeature).toEqual({ id: undefined, layer: undefined });
      });
    });

    describe('onLocation', () => {
      it('calls onLocation on listeners', () => {
        const location = { latlng: { lat: 1, lng: 2 } } as LocationEvent;

        service.onLocation(location);

        expect(listener.onLocation).toHaveBeenCalledWith(location);
      });
    });

    describe('onLocationStop', () => {
      it('calls onLocationStop on listeners', () => {
        service.onLocationStop();

        expect(listener.onLocationStop).toHaveBeenCalled();
      });
    });

    describe('createFeature', () => {
      it('returns undefined when no delegate is set', () => {
        expect(service.createFeature(feedFeature('f1'), {})).toBeUndefined();
      });

      it('delegates to the map delegate', () => {
        const edit = jasmine.createSpyObj('FeatureEdit', ['update', 'cancel', 'save']);
        const delegate = jasmine.createSpyObj('MapDelegate', ['createFeature']);
        delegate.createFeature.and.returnValue(edit);
        service.setDelegate(delegate);

        const editDelegate = {};
        const feature = feedFeature('f1');

        expect(service.createFeature(feature, editDelegate)).toBe(edit);
        expect(delegate.createFeature).toHaveBeenCalledWith(feature, editDelegate);
      });
    });

    describe('selectBaseLayer', () => {
      it('stores the base layer and notifies listeners', () => {
        const layer = { ...rasterLayer(2), layer: {} } as unknown as Parameters<MapService['selectBaseLayer']>[0];

        service.selectBaseLayer(layer);

        expect(service.baseLayer).toBe(layer);
        expect(listener.onBaseLayerSelected).toHaveBeenCalledWith(layer);
      });
    });

    describe('removeLayer', () => {
      it('removes a vector layer and notifies listeners', () => {
        service.createVectorLayer(vectorLayer('v1'));
        listener.onLayerRemoved.calls.reset();

        service.removeLayer('v1');

        expect(service.vectorLayers['v1']).toBeUndefined();
        expect(listener.onLayerRemoved).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'v1' }));
      });

      it('removes a raster layer and notifies listeners', () => {
        service.createRasterLayer(rasterLayer(1));
        listener.onLayerRemoved.calls.reset();

        service.removeLayer(1);

        expect(service.rasterLayers['1']).toBeUndefined();
        expect(listener.onLayerRemoved).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1 }));
      });

      it('does nothing for an unknown layer id', () => {
        service.removeLayer('unknown');

        expect(listener.onLayerRemoved).not.toHaveBeenCalled();
      });
    });

    describe('removeFeed', () => {
      it('removes the feed layer and notifies listeners', () => {
        const feed = vectorLayer('feed-1');
        service.createFeedLayer(feed);

        service.removeFeed(feed);

        expect(service.feedLayers['feed-1']).toBeUndefined();
        expect(listener.onFeedRemoved).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'feed-1' }));
      });

      it('does nothing for an unknown feed id', () => {
        service.removeFeed(vectorLayer('unknown'));

        expect(listener.onFeedRemoved).not.toHaveBeenCalled();
      });
    });

    describe('onLayersChanged', () => {
      const event = { id: 42 } as MageEvent;

      function imagery(id: number, overrides: Partial<Layer> = {}): Layer {
        return { id, type: 'Imagery', name: `img${id}`, url: 'http://example.com', format: 'XYZ', base: false, ...overrides } as Layer;
      }

      it('creates a raster layer for Imagery type', () => {
        service.onLayersChanged({ added: [imagery(1)] }, event);

        expect(service.rasterLayers['1']).toEqual(jasmine.objectContaining({ type: 'Imagery', format: 'XYZ', url: 'http://example.com' }));
      });

      it('skips Imagery layers with no format', () => {
        spyOn(console, 'error');

        service.onLayersChanged({ added: [imagery(1, { format: undefined } as Partial<Layer>)] }, event);

        expect(service.rasterLayers['1']).toBeUndefined();
      });

      it('appends the access token to private Imagery layer urls', () => {
        service.onLayersChanged({ added: [imagery(1, { url: 'private/tiles' } as Partial<Layer>)] }, event);

        expect((service.rasterLayers['1'] as RasterLayer).url).toBe('private/tiles?access_token=test-token');
      });

      it('carries the WMS options on WMS Imagery layers', () => {
        const wms = { layers: 'a,b', version: '1.3.0', format: 'image/jpeg', transparent: false, styles: 's' };

        service.onLayersChanged({ added: [imagery(1, { format: 'WMS', wms } as Partial<Layer>)] }, event);

        expect(service.rasterLayers['1']).toEqual(jasmine.objectContaining({ format: 'WMS', wms }));
      });

      it('selects only the first base Imagery layer by default', () => {
        service.onLayersChanged({ added: [imagery(1, { base: true }), imagery(2, { base: true })] }, event);

        expect((service.rasterLayers['1'] as RasterLayer).selectedByDefault).toBe(true);
        expect((service.rasterLayers['2'] as RasterLayer).selectedByDefault).toBe(false);
      });

      it('explodes a GeoPackage layer into one raster layer per table', () => {
        const layer = {
          id: 7, type: 'GeoPackage', name: 'gp',
          tables: [
            { name: 'tiles', type: 'tile', minZoom: 1, maxZoom: 5, bbox: [0, 0, 1, 1] },
            { name: 'feats', type: 'feature' }
          ]
        } as unknown as Layer;

        service.onLayersChanged({ added: [layer] }, event);

        expect(service.rasterLayers['7-tiles']).toEqual(jasmine.objectContaining({
          type: 'GeoPackage', layerId: 7, name: 'tiles', renderAs: 'tile',
          url: 'api/events/42/layers/7/tiles/{z}/{x}/{y}.png', minZoom: 1, maxZoom: 5
        }));
        expect(service.rasterLayers['7-feats']).toEqual(jasmine.objectContaining({ renderAs: 'feature' }));
      });

      it('removes every exploded GeoPackage table when the original layer is removed', () => {
        const layer = {
          id: 7, type: 'GeoPackage', name: 'gp',
          tables: [{ name: 'a', type: 'tile' }, { name: 'b', type: 'tile' }]
        } as unknown as Layer;
        service.onLayersChanged({ added: [layer] }, event);

        service.onLayersChanged({ removed: [7] }, event);

        expect(service.rasterLayers['7-a']).toBeUndefined();
        expect(service.rasterLayers['7-b']).toBeUndefined();
      });

      it('creates a vector layer for Feature type via featureService', () => {
        const layer = { id: 3, type: 'Feature', name: 'Features' } as unknown as Layer;
        featureService.getFeatureCollection.and.returnValue(of({ type: 'FeatureCollection', features: [feedFeature('f1')] } as GeoJSON.FeatureCollection));

        service.onLayersChanged({ added: [layer] }, event);

        expect(featureService.getFeatureCollection).toHaveBeenCalledWith(event, layer);
        expect(service.vectorLayers['3']).toEqual(jasmine.objectContaining({ type: 'vector', group: 'feature', name: 'Features' }));
        expect(listener.onFeaturesChanged).toHaveBeenCalledWith({ id: '3', added: [feedFeature('f1')] });
      });

      it('builds popup html from the feature name and description', () => {
        const layer = { id: 3, type: 'Feature', name: 'Features' } as unknown as Layer;
        service.onLayersChanged({ added: [layer] }, event);

        const popup = service.vectorLayers['3'].renderHooks.popup as { html: (feature: MapFeature) => string };
        const html = popup.html({ ...feedFeature('f1'), properties: { name: 'N', description: 'D' } });

        expect(html).toContain('N');
        expect(html).toContain('D');
      });

      it('removes layers listed in removed', () => {
        service.createVectorLayer(vectorLayer('v1'));

        service.onLayersChanged({ removed: ['v1'] }, event);

        expect(service.vectorLayers['v1']).toBeUndefined();
      });
    });

    describe('onFeedItemsChanged', () => {
      function feed(overrides: Record<string, unknown> = {}): Feed {
        return { id: 'f1', title: 'Feed 1', itemsHaveSpatialDimension: true, ...overrides } as unknown as Feed;
      }

      it('creates a feed layer for geospatial feeds and adds the items', () => {
        service.onFeedItemsChanged({ added: [{ feed: feed(), items: [feedFeature('i1')] }] });

        expect(service.feedLayers['feed-f1']).toEqual(jasmine.objectContaining({ group: 'feed', name: 'Feed 1' }));
        expect(listener.onFeaturesChanged).toHaveBeenCalledWith({ id: 'feed-f1', added: [feedFeature('i1')] });
      });

      it('does not create a feed layer for non-geospatial feeds', () => {
        service.onFeedItemsChanged({ added: [{ feed: feed({ itemsHaveSpatialDimension: false }), items: [] }] });

        expect(service.feedLayers['feed-f1']).toBeUndefined();
      });

      it('uses the default marker icon when the feed has no icon', () => {
        service.onFeedItemsChanged({ added: [{ feed: feed(), items: [] }] });

        expect(service.feedLayers['feed-f1'].iconUrl).toBe('/assets/images/default_marker.png');
      });

      it('uses the feed map style icon url when available', () => {
        service.onFeedItemsChanged({ added: [{ feed: feed({ mapStyle: { icon: { id: 'icon1' } } }), items: [] }] });

        expect(service.feedLayers['feed-f1'].iconUrl).toBe('/api/icons/icon1/content?access_token=test-token');
      });

      it('removes geospatial feed layers in the removed list', () => {
        service.createFeedLayer(vectorLayer('feed-f1'));

        service.onFeedItemsChanged({ removed: [{ feed: feed() }] });

        expect(service.feedLayers['feed-f1']).toBeUndefined();
        expect(listener.onFeedRemoved).toHaveBeenCalled();
      });

      it('notifies listeners of updated feed items', () => {
        service.createFeedLayer(vectorLayer('feed-f1'));
        listener.onFeaturesChanged.calls.reset();

        service.onFeedItemsChanged({ updated: [{ feed: feed(), items: [feedFeature('i1')] }] });

        expect(listener.onFeaturesChanged).toHaveBeenCalledWith({ id: 'feed-f1', updated: [feedFeature('i1')] });
      });
    });

    describe('destroy', () => {
      it('notifies listeners of the removed layers and clears the layer maps', () => {
        service.init();
        service.createRasterLayer(rasterLayer(1));
        listener.onLayerRemoved.calls.reset();

        service.destroy();

        expect(listener.onLayerRemoved).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1 }));
        expect(listener.onLayerRemoved).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'observations' }));
        expect(service.rasterLayers).toEqual({});
        expect(service.vectorLayers).toEqual({});
        expect(service.listeners).toEqual([]);
      });

      it('drops the map delegate so a destroyed map is not asked to create features', () => {
        const delegate = jasmine.createSpyObj('MapDelegate', ['createFeature']);
        service.setDelegate(delegate);
        service.init();

        service.destroy();

        expect(service.createFeature(feedFeature('f1'), {})).toBeUndefined();
        expect(delegate.createFeature).not.toHaveBeenCalled();
      });
    });
   });
});