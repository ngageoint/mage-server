import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TileLayer } from 'leaflet';

import { MapClipComponent } from './clip.component';
import { MapService } from '../map.service';
import { LocalStorageService } from '../../http/local-storage.service';
import { RasterLayer, RenderedRasterLayer } from '../entities.map-layer';

describe('MapClipComponent', () => {
  let component: MapClipComponent;
  let fixture: ComponentFixture<MapClipComponent>;
  let mapService: jasmine.SpyObj<MapService>;

  function imagery(id: number): RasterLayer {
    return { type: 'Imagery', id, name: `base${id}`, url: `http://example.com/${id}/{z}/{x}/{y}.png`, format: 'XYZ' };
  }

  function rendered(id: number): RenderedRasterLayer {
    return { ...imagery(id), layer: new TileLayer('') } as RenderedRasterLayer;
  }

  function tileLayerCount(): number {
    let count = 0;
    component.map.eachLayer(layer => {
      if (layer instanceof TileLayer) count++;
    });
    return count;
  }

  beforeEach(() => {
    mapService = jasmine.createSpyObj('MapService', ['addListener', 'removeListener']);

    TestBed.configureTestingModule({
      declarations: [MapClipComponent],
      providers: [
        { provide: MapService, useValue: mapService },
        { provide: LocalStorageService, useValue: jasmine.createSpyObj('LocalStorageService', { getMapPosition: { center: { lat: 0, lng: 0 } } }) }
      ]
    });

    fixture = TestBed.createComponent(MapClipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('listens for base layer changes and stops when destroyed', () => {
    expect(mapService.addListener).toHaveBeenCalledWith(component.mapListener);

    fixture.destroy();

    expect(mapService.removeListener).toHaveBeenCalledWith(component.mapListener);
  });

  it('shows the selected base layer', () => {
    component.onBaseLayerSelected(rendered(1));

    expect(tileLayerCount()).toBe(1);
  });

  it('replaces the previous base layer when a different one is selected', () => {
    component.onBaseLayerSelected(rendered(1));
    component.onBaseLayerSelected(rendered(2));

    expect(tileLayerCount()).toBe(1);
  });

  it('ignores a missing base layer', () => {
    component.onBaseLayerSelected(null);

    expect(tileLayerCount()).toBe(0);
  });

  describe('createRasterLayer', () => {
    it('builds a tile layer for XYZ imagery', () => {
      const layer = component.createRasterLayer(imagery(1)) as TileLayer;

      expect(layer.options.tms).toBeFalse();
    });

    it('builds a TMS tile layer for TMS imagery', () => {
      const layer = component.createRasterLayer({ ...imagery(1), format: 'TMS' }) as TileLayer;

      expect(layer.options.tms).toBeTrue();
    });

    it('builds a WMS layer with the WMS options', () => {
      const layer = component.createRasterLayer({
        ...imagery(1),
        format: 'WMS',
        wms: { layers: 'a,b', version: '1.3.0', format: 'image/png', transparent: true, styles: 's' }
      }) as TileLayer.WMS;

      expect(layer instanceof TileLayer.WMS).toBeTrue();
      expect(layer.wmsParams.layers).toBe('a,b');
      expect(layer.wmsParams.styles).toBe('s');
    });
  });
});
