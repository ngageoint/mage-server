import { TestBed } from '@angular/core/testing';

import { MapLayerService } from './layer.service';
import { RenderedMapLayer } from '../entities.map-layer';

describe('LayerService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [MapLayerService ]
  }));

  it('should be created', () => {
    const service: MapLayerService = TestBed.inject(MapLayerService);
    expect(service).toBeTruthy();
  });

  it('should toggle on', (done) => {
    const service: MapLayerService = TestBed.inject(MapLayerService);

    const layer = { id: 'layer1', name: 'Layer One', type: 'grid', layer: {} } as unknown as RenderedMapLayer;
    const checked = true;
    service.toggle$.subscribe(event => {
      expect(event.layer).toEqual(layer);
      expect(event.value).toEqual(checked);

      done();
    });

    service.toggle(layer, checked);
  });

  it('should toggle off', (done) => {
    const service: MapLayerService = TestBed.inject(MapLayerService);

    const layer = { id: 'layer1', name: 'Layer One', type: 'grid', layer: {} } as unknown as RenderedMapLayer;
    const checked = false;
    service.toggle$.subscribe(event => {
      expect(event.layer).toEqual(layer);
      expect(event.value).toEqual(checked);
      done();
    });

    service.toggle(layer, checked);
  });

  it('should toggle zoom', (done) => {
    const service: MapLayerService = TestBed.inject(MapLayerService);

    const layer = { id: 'layer1', name: 'Layer One', type: 'grid', layer: {} } as unknown as RenderedMapLayer;
    service.zoom$.subscribe(event => {
      expect(event.layer).toEqual(layer);
      done();
    });

    service.zoom(layer);
  });

  it('should change opacity', (done) => {
    const service: MapLayerService = TestBed.inject(MapLayerService);

    const layer = { id: 'layer1', name: 'Layer One', type: 'grid', layer: {} } as unknown as RenderedMapLayer;
    const opacity = .5;
    service.opacity$.subscribe(event => {
      expect(event.layer).toEqual(layer);
      expect(event.opacity).toEqual(opacity);
      done();
    });

    service.opacity(layer, opacity);
  });

  it('should change style', (done) => {
    const service: MapLayerService = TestBed.inject(MapLayerService);

    const layer = { id: 'layer1', name: 'Layer One', type: 'grid', layer: {} } as unknown as RenderedMapLayer;
    const style = { stroke: '#FFFFFF', fill: '#000000', width: 2};
    service.style$.subscribe(event => {
      expect(event.layer).toEqual(layer);
      expect(event.style).toEqual(style);
      done();
    });

    service.style(layer, style);
  });
});
