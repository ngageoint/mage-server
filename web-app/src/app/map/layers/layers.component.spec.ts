import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LayersComponent } from './layers.component';
import { Component, ViewChild } from '@angular/core';
import { RenderedMapLayer } from '../entities.map-layer';

@Component({
    selector: `host-component`,
    template: `<map-layers-panel
    [mageLayers]="mageLayers"
    [baseLayers]="baseLayers"
    [tileOverlays]="tileOverlays"
    [featureOverlays]="featureOverlays"
    [gridOverlays]="gridOverlays">
  </map-layers-panel>`,
    standalone: true,
    imports: [LayersComponent]
})
class TestHostComponent {

  mageLayers: RenderedMapLayer[] = [];
  baseLayers: RenderedMapLayer[] = [];
  tileOverlays = [];
  featureOverlays = [];
  gridOverlays = [];

  @ViewChild(LayersComponent) layers!: LayersComponent;
}


describe('LayersComponent', () => {
  let component: LayersComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ TestHostComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = hostComponent.layers;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('should reorder', () => {
    spyOn(component.onReorder, 'emit');

    const event: any = {
      currentIndex: 1,
      previousIndex: 0
    }
    const layers: any[] = [{}];
    component.reorderLayers(event, 'mage', layers);

    expect(component.onReorder.emit).toHaveBeenCalledWith({
      group: 'mage',
      layers: layers,
      currentIndex: 1,
      previousIndex: 0
    });
  });

  it('should toggle panel with the expansion indicator when header is clicked', () => {
    hostComponent.mageLayers = [{ id: 'layer1', name: 'Layer One', type: 'vector', layer: {} } as unknown as RenderedMapLayer];
    fixture.detectChanges();

    const header: HTMLElement = fixture.nativeElement.querySelector('mat-expansion-panel-header');
    expect(header.querySelector('.mat-expansion-indicator')).not.toBeNull();

    header.click();
    fixture.detectChanges();
    expect(header.getAttribute('aria-expanded')).toEqual('true');

    header.click();
    fixture.detectChanges();
    expect(header.getAttribute('aria-expanded')).toEqual('false');
  });

  it('should show move cursor on draggable headers', () => {
    hostComponent.mageLayers = [{ id: 'layer1', name: 'Layer One', type: 'vector', layer: {} } as unknown as RenderedMapLayer];
    hostComponent.baseLayers = [{ id: 1, name: 'Layer Two', type: 'Imagery', layer: {} } as unknown as RenderedMapLayer];
    fixture.detectChanges();

    const [mageHeader, baseHeader] = fixture.nativeElement.querySelectorAll('mat-expansion-panel-header');
    expect(getComputedStyle(mageHeader).cursor).toEqual('move');
    expect(getComputedStyle(baseHeader).cursor).toEqual('pointer');
  });

  it('should not reorder if indices are the same', () => {
    spyOn(component.onReorder, 'emit');

    const event: any = {
      currentIndex: 0,
      previousIndex: 0
    }
    const layers: any[] = [{}];
    component.reorderLayers(event, 'mage', layers);

    expect(component.onReorder.emit).not.toHaveBeenCalled();
  });
});
