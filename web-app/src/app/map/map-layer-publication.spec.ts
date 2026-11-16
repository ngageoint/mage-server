import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { MapComponent } from './map.component';
import { MapService } from './map.service';
import { LayersComponent } from './layers/layers.component';
import { MapLayerService } from './layers/layer.service';
import { EventService } from '../event/event.service';
import { FilterService } from '../filter/filter.service';
import { LocalStorageService } from '../http/local-storage.service';
import { SessionService } from '../http/session.service';
import { GeoPackageLayer } from './entities.map-layer';
import { GeoPackageRasterLayer } from './geopackage/GeoPackageLayer';

describe('Map layer publication to the real panel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MapComponent],
      imports: [LayersComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialog, useValue: {} },
        { provide: MapService, useValue: jasmine.createSpyObj('MapService',
          ['addListener', 'removeListener', 'setDelegate', 'selectBaseLayer']) },
        { provide: SessionService, useValue: { getToken: () => '' } },
        { provide: EventService, useValue: {} },
        { provide: FilterService, useValue: { getEvent: () => null } },
        { provide: LocalStorageService, useValue: {
          getMapPosition: () => ({ center: { lat: 0, lng: 0 }, zoom: 3 }),
          setMapPosition: () => {}
        } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it('publishes asynchronously added layers, toggles their Leaflet layer, and removes them', fakeAsync(() => {
    const fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges(); tick();
    const map = fixture.componentInstance;
    const panel = fixture.debugElement.query(By.directive(LayersComponent));
    const original = panel.componentInstance.featureOverlays();
    const layer: GeoPackageLayer = {
      id: '7-osm_features', layerId: 7, type: 'GeoPackage',
      name: 'STL Medical', tableName: 'osm_features', renderAs: 'feature',
      url: 'data:image/png;base64,', bbox: [-91, 37, -87, 40]
    };
    // This arrives after the panel has rendered with empty signal inputs.
    setTimeout(() => map.createGeoPackageLayer(layer));
    tick(); fixture.detectChanges();
    expect(map.groups.feature).not.toBe(original);
    expect(panel.nativeElement.textContent).toContain('STL Medical');
    const rendered = map.layers[layer.id];
    expect((rendered.layer as GeoPackageRasterLayer).table.name).toBe('osm_features');
    expect(map.map.hasLayer(rendered.layer)).toBeFalse();
    // A user explicitly saving OSM results should not have to find and
    // manually enable an unrelated-looking table in the panel.
    map.showSavedOsmLayer(7);
    expect(map.map.hasLayer(rendered.layer)).toBeTrue();
    TestBed.inject(MapLayerService).toggle(rendered, true);
    expect(map.map.hasLayer(rendered.layer)).toBeTrue();
    TestBed.inject(MapLayerService).toggle(rendered, false);
    expect(map.map.hasLayer(rendered.layer)).toBeFalse();
    map.showSavedOsmLayer(8);
    map.createGeoPackageLayer({ ...layer, id: '8-osm_features', layerId: 8, name: 'New OSM export' });
    expect(map.map.hasLayer(map.layers['8-osm_features'].layer)).toBeTrue();
    map.removeLayer(layer.id);
    fixture.detectChanges();
    expect(panel.nativeElement.textContent).not.toContain('STL Medical');
    fixture.destroy();
  }));
});
