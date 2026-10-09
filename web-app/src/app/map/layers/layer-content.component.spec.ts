import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LayerContentComponent } from './layer-content.component';
import { MapLayerService } from './layer.service';
import { Component, ViewChild } from '@angular/core';
import { RenderedMapLayer } from '../entities.map-layer';

const imageryLayer = { id: 1, name: 'Layer One', type: 'Imagery', layer: {} } as unknown as RenderedMapLayer;
const defaultStyle = { stroke: '#000000FF', fill: '#00000011', width: 2 };
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
    expect(fixture.nativeElement.querySelector('.style-override')).toBeNull();

    hostComponent.layer = geoPackageLayer;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.style-override')).not.toBeNull();
  });

  it('should only show style when override is on', () => {
    hostComponent.layer = geoPackageLayer;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.style')).toBeNull();

    component.overrideChanged(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.style')).not.toBeNull();
  });

  it('should start with override off', () => {
    expect(component.override()).toBeFalse();
    expect(component.style()).toEqual(defaultStyle);
  });

  it('should apply style when override is turned on', () => {
    spyOn(component['layerService'], 'style');
    component.overrideChanged(true);
    expect(component.override()).toBeTrue();
    expect(component['layerService'].style).toHaveBeenCalledWith(
      component.layer(),
      defaultStyle
    );
  });

  it('should remove style when override is turned off', () => {
    component.overrideChanged(true);
    spyOn(component['layerService'], 'style');
    component.overrideChanged(false);
    expect(component.override()).toBeFalse();
    expect(component['layerService'].style).toHaveBeenCalledWith(
      component.layer(),
      null
    );
  });

  it('should restore last style when override is turned back on', () => {
    component.overrideChanged(true);
    component.widthChanged(10);
    component.overrideChanged(false);
    spyOn(component['layerService'], 'style');
    component.overrideChanged(true);
    expect(component['layerService'].style).toHaveBeenCalledWith(
      component.layer(),
      { ...defaultStyle, width: 10 }
    );
  });

  it('should change opacity', () => {
    spyOn(component['layerService'], 'opacity');
    component.opacityChanged(50);
    expect(component.opacity()).toEqual(50);
    expect(component['layerService'].opacity).toHaveBeenCalledWith(
      component.layer(),
      50 / 100
    );
  });

  it('should show opacity in the label', () => {
    const label: HTMLElement = fixture.nativeElement.querySelector('.opacity-label');
    expect(label.textContent?.trim()).toEqual('Opacity 100%');

    component.opacityChanged(75);
    fixture.detectChanges();
    expect(label.textContent?.trim()).toEqual('Opacity 75%');
  });

  it('should change color', () => {
    spyOn(component['layerService'], 'style');
    const event: any = {
      color: '#000000'
    };
    component.colorChanged(event, 'fill');
    expect(component['layerService'].style).toHaveBeenCalledWith(
      component.layer(),
      { ...defaultStyle, fill: '#000000' }
    );
  });

  it('should change line width', () => {
    spyOn(component['layerService'], 'style');
    component.widthChanged(10);
    expect(component['layerService'].style).toHaveBeenCalledWith(
      component.layer(),
      { ...defaultStyle, width: 10 }
    );
  });

  it('should ignore cleared line width', () => {
    spyOn(component['layerService'], 'style');
    component.widthChanged(null);
    expect(component.style()).toEqual(defaultStyle);
    expect(component['layerService'].style).not.toHaveBeenCalled();
  });

  it('should format opacity', () => {
    expect(component.formatOpacity(10)).toEqual('10%');
  });
});
