import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MapComponent } from './map.component';
import { MapService } from './map.service';
import { EventService } from '../event/event.service';
import { FilterService } from '../filter/filter.service';
import { LocalStorageService } from '../http/local-storage.service';
import { SessionService } from '../http/session.service';
import { geoJSON, gridLayer, latLng, latLngBounds, tileLayer } from 'leaflet';
import { RenderedMapLayer, RenderedRasterLayer } from './entities.map-layer';
import { ReorderEvent } from './layers/layers.component';

describe('MapComponent', () => {
  let mapService: jasmine.SpyObj<MapService>;

  beforeEach(() => {
    mapService = jasmine.createSpyObj('MapService', ['addListener', 'removeListener', 'setDelegate', 'selectBaseLayer']);

    TestBed.configureTestingModule({
      declarations: [MapComponent],
      providers: [
        { provide: MatDialog, useValue: {} },
        { provide: MapService, useValue: mapService },
        { provide: SessionService, useValue: { getToken: () => 'token' } },
        { provide: EventService, useValue: {} },
        { provide: FilterService, useValue: { getEvent: () => null } },
        {
          provide: LocalStorageService,
          useValue: jasmine.createSpyObj('LocalStorageService', {
            getMapPosition: { center: { lat: 0, lng: 0 }, zoom: 3 },
            setMapPosition: undefined
          })
        },
        provideHttpClient(),
        provideHttpClientTesting()
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it('registers as the map delegate and listener once the view is ready', fakeAsync(() => {
    const fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();
    tick();

    expect(mapService.setDelegate).toHaveBeenCalledWith(fixture.componentInstance);
    expect(mapService.addListener).toHaveBeenCalledWith(fixture.componentInstance);

    fixture.destroy();
  }));

  it('removes itself as a listener and removes the Leaflet map when destroyed', fakeAsync(() => {
    const fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();
    tick();
    const removeMap = spyOn(fixture.componentInstance.map, 'remove').and.callThrough();

    fixture.destroy();

    expect(mapService.removeListener).toHaveBeenCalledWith(fixture.componentInstance);
    expect(removeMap).toHaveBeenCalled();
  }));

  it('does not register as a listener when destroyed before the deferred registration runs', fakeAsync(() => {
    const fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();

    fixture.destroy();
    tick();

    expect(mapService.setDelegate).not.toHaveBeenCalled();
    expect(mapService.addListener).not.toHaveBeenCalled();
  }));

  describe('layer panel events', () => {
    let fixture: ComponentFixture<MapComponent>;
    let component: MapComponent;

    function imageryLayer(pane: string, base = false): RenderedRasterLayer {
      component.map.createPane(pane);
      return {
        id: 1,
        name: 'Layer One',
        type: 'Imagery',
        format: 'XYZ',
        url: '',
        base: base,
        layer: tileLayer('', { pane: pane })
      } as RenderedRasterLayer;
    }

    function vectorLayer(pane: string): RenderedMapLayer {
      component.map.createPane(pane);
      return {
        id: 'layer1',
        name: 'Layer One',
        type: 'vector',
        group: 'mage',
        renderHooks: {},
        featureIdToLayer: {},
        layer: geoJSON(undefined, { pane: pane })
      } as unknown as RenderedMapLayer;
    }

    beforeEach(fakeAsync(() => {
      fixture = TestBed.createComponent(MapComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick();
    }));

    afterEach(() => {
      fixture.destroy();
    });

    it('sets layer opacity for a tile layer without changing its pane', () => {
      const layer = imageryLayer('pane-one');
      spyOn(layer.layer, 'setOpacity').and.callThrough();

      component.opacityChanged({ layer: layer, opacity: 0.5 });

      expect(layer.layer.setOpacity).toHaveBeenCalledWith(0.5);
      expect(component.map.getPanes()['pane-one'].style.opacity).toEqual('');
    });

    it('sets layer opacity for a grid layer without changing its pane', () => {
      component.map.createPane('pane-one');
      const grid = gridLayer({ pane: 'pane-one' });
      const layer = { id: 'gars', name: 'Layer One', type: 'grid', layer: grid } as unknown as RenderedMapLayer;
      spyOn(grid, 'setOpacity').and.callThrough();

      component.opacityChanged({ layer: layer, opacity: 0.5 });

      expect(grid.setOpacity).toHaveBeenCalledWith(0.5);
      expect(component.map.getPanes()['pane-one'].style.opacity).toEqual('');
    });

    it('sets pane opacity for a vector layer without setOpacity', () => {
      const layer = vectorLayer('pane-one');

      component.opacityChanged({ layer: layer, opacity: 0.25 });

      expect(component.map.getPanes()['pane-one'].style.opacity).toEqual('0.25');
    });

    const reorderGroups: [ReorderEvent['group'], number][] = [
      ['mage', MapComponent.MAGE_PANE_Z_INDEX_OFFSET],
      ['feed', MapComponent.MAGE_PANE_Z_INDEX_OFFSET],
      ['feature', MapComponent.FEATURE_PANE_Z_INDEX_OFFSET],
      ['tile', MapComponent.TILE_PANE_Z_INDEX_OFFSET]
    ];

    reorderGroups.forEach(([group, offset]) => {
      it(`restacks ${group} panes within the ${group} group z-index range`, () => {
        const layerOne = vectorLayer('pane-one');
        const layerTwo = vectorLayer('pane-two');

        component.reorder({ group: group, layers: [layerOne, layerTwo], previousIndex: 0, currentIndex: 1 });

        const top = offset + MapComponent.PANE_Z_INDEX_BUCKET_SIZE - 1;
        expect(component.map.getPanes()['pane-two'].style.zIndex).toEqual(`${top}`);
        expect(component.map.getPanes()['pane-one'].style.zIndex).toEqual(`${top - 1}`);
      });
    });

    it('applies style only to GeoPackage layers', () => {
      const setStyle = jasmine.createSpy('setStyle');
      const geoPackageLayer = { type: 'GeoPackage', layer: { setStyle: setStyle } } as unknown as RenderedMapLayer;
      const style = { stroke: '#000000' };

      component.styleChanged({ layer: imageryLayer('pane-one'), style: style });
      expect(setStyle).not.toHaveBeenCalled();

      component.styleChanged({ layer: geoPackageLayer, style: style });
      expect(setStyle).toHaveBeenCalledWith(style);
    });

    it('zooms to layer bounds', () => {
      const layer = vectorLayer('pane-one');
      const bounds = latLngBounds(latLng(0, 0), latLng(1, 1));
      spyOn(layer.layer as any, 'getBounds').and.returnValue(bounds);
      spyOn(component.map, 'fitBounds');

      component.zoom({ layer: layer });

      expect(component.map.fitBounds).toHaveBeenCalledWith(bounds);
    });

    it('does not zoom to an empty layer', () => {
      const layer = vectorLayer('pane-one');
      spyOn(component.map, 'fitBounds');

      component.zoom({ layer: layer });

      expect(component.map.fitBounds).not.toHaveBeenCalled();
    });

    it('zooms to GeoPackage bbox', () => {
      const layer = { type: 'GeoPackage', bbox: [1, 2, 3, 4], layer: {} } as unknown as RenderedMapLayer;
      spyOn(component.map, 'fitBounds');

      component.zoom({ layer: layer });

      expect(component.map.fitBounds).toHaveBeenCalledWith([[2, 1], [4, 3]]);
    });

    it('selects a base layer when toggled', () => {
      const layer = imageryLayer('pane-one', true);

      component.layerTogged({ layer: layer, value: true });

      expect(layer.selected).toBeTrue();
      expect(component.map.hasLayer(layer.layer)).toBeTrue();
      expect(mapService.selectBaseLayer).toHaveBeenCalledWith(layer);
    });

    it('adds and removes an overlay when toggled', () => {
      const layer = imageryLayer('pane-one');

      component.layerTogged({ layer: layer, value: true });
      expect(layer.selected).toBeTrue();
      expect(component.map.hasLayer(layer.layer)).toBeTrue();

      component.layerTogged({ layer: layer, value: false });
      expect(layer.selected).toBeFalse();
      expect(component.map.hasLayer(layer.layer)).toBeFalse();
      expect(mapService.selectBaseLayer).not.toHaveBeenCalled();
    });
  });
});
