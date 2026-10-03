import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LayerContentComponent } from './layer-content.component';
import { MapLayerService } from './layer.service';
import { Component, ViewChild } from '@angular/core';
import { RenderedMapLayer } from '../entities.map-layer';

const imageryLayer = { id: 1, name: 'Layer One', type: 'Imagery', layer: {} } as unknown as RenderedMapLayer;
const geoPackageLayer = { id: 'layer1', name: 'Layer One', type: 'GeoPackage', renderAs: 'feature', layer: {} } as unknown as RenderedMapLayer;

@Component({
    selector: `host-component`,
    template: `<layer-content [layer]="layer"></layer-content>`,
    standalone: true,
    imports: [LayerContentComponent]
})
class TestHostComponent {
  layer = imageryLayer;

  @ViewChild(LayerContentComponent) layerContent!: LayerContentComponent;
}

describe('LayerContentComponent', () => {
  let component: LayerContentComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [MapLayerService]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = hostComponent.layerContent;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should label the opacity slider', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[matSliderThumb]');
    expect(input.getAttribute('aria-label')).toEqual('Opacity');
  });

  it('should only show style override for GeoPackage feature layers', () => {
    expect(fixture.nativeElement.querySelector('.style-actions')).toBeNull();

    hostComponent.layer = geoPackageLayer;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.style-actions')).not.toBeNull();
  });

  it('should toggle default style on', () => {
    component.toggleStyle();
    expect(component.style()).toEqual({
      stroke: '#000000FF',
      fill: '#00000011',
      width: 1
    });
  });

  it('should toggle default style off', () => {
    spyOn(component['layerService'], 'style');
    component.toggleStyle();
    expect(component['layerService'].style).toHaveBeenCalledWith(
      component.layer(),
      component.style()
    );
  });

  it('should change opacity', () => {
    spyOn(component['layerService'], 'opacity');
    component.opacityChanged(0.5 as any);
    expect(component['layerService'].opacity).toHaveBeenCalledWith(
      component.layer(),
      0.5 / 100
    );
  });

  it('should change color', () => {
    spyOn(component['layerService'], 'style');
    const event: any = {
      color: '#000000'
    };
    component.colorChanged(event, 'fill');
    expect(component['layerService'].style).toHaveBeenCalledWith(
      component.layer(),
      { fill: '#000000' }
    );
  });

  it('should change line width', () => {
    spyOn(component['layerService'], 'style');
    component.widthChanged(10);
    expect(component['layerService'].style).toHaveBeenCalledWith(
      component.layer(),
      { width: 10 }
    );
  });

  it('should format opacity', () => {
    expect(component.formatOpacity(10)).toEqual('10%');
  });
});
