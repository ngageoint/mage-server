import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LayerHeaderComponent } from './layer-header.component';
import { Component, ViewChild } from '@angular/core';
import { MapLayerService } from './layer.service';
import { By } from '@angular/platform-browser';
import { RenderedMapLayer } from '../entities.map-layer';

const gridLayer = { id: 'gars', name: 'Layer One', type: 'grid', layer: {} } as unknown as RenderedMapLayer;
const vectorLayer = { id: 'layer1', name: 'Layer One', type: 'vector', layer: { getBounds: () => null } } as unknown as RenderedMapLayer;
const geoPackageLayer = { id: 'layer1', name: 'Layer One', type: 'GeoPackage', bbox: [0, 0, 0, 0], layer: {} } as unknown as RenderedMapLayer;

@Component({
    selector: `host-component`,
    template: `<layer-header [layer]="layer"></layer-header>`,
    standalone: true,
    imports: [LayerHeaderComponent]
})
class TestHostComponent {

  layer = gridLayer;

  @ViewChild(LayerHeaderComponent) layerHeader!: LayerHeaderComponent;
}

describe('LayerHeaderComponent', () => {
  let component: LayerHeaderComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ TestHostComponent ],
      providers: [MapLayerService ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = hostComponent.layerHeader
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have getBounds', () => {
    hostComponent.layer = vectorLayer;
    fixture.detectChanges();
    expect(component.hasBounds()).toBeTruthy();
  });

  it('should have bbox', () => {
    hostComponent.layer = geoPackageLayer;
    fixture.detectChanges();
    expect(component.hasBounds()).toBeTruthy();
  });

  it('should not have bounds', () => {
    expect(component.hasBounds()).toBeFalsy();
  });

  it('should toggle check on', () => {
    spyOn(component['layerService'], 'toggle');
    const event: any = {
      checked: true
    };
    component.checkChanged(event);
    expect(component['layerService'].toggle).toHaveBeenCalledWith(component.layer(), true);
  });

  it('should toggle check off', () => {
    spyOn(component['layerService'], 'toggle');
    const event: any = {
      checked: false
    };
    component.checkChanged(event);
    expect(component['layerService'].toggle).toHaveBeenCalledWith(component.layer(), false);
  });

  it('should toggle radio on', () => {
    spyOn(component['layerService'], 'toggle');
    component.radioChanged();
    expect(component['layerService'].toggle).toHaveBeenCalledWith(component.layer(), true);
  });

  it('should zoom', () => {
    hostComponent.layer = geoPackageLayer;
    fixture.detectChanges();
    spyOn(component['layerService'], 'zoom');
    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();
    expect(component['layerService'].zoom).toHaveBeenCalledWith(component.layer());
  });
});
