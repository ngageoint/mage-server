import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LayerHeaderComponent } from './layer-header.component';
import { Component, ViewChild } from '@angular/core';
import { MapLayerService } from './layer.service';
import { RenderedMapLayer } from '../entities.map-layer';

const gridLayer = { id: 'gars', name: 'Layer One', type: 'grid', layer: {} } as unknown as RenderedMapLayer;

@Component({
    selector: `host-component`,
    template: `<layer-header [layer]="layer"></layer-header>`,
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
});
