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

  it('should only show drag handles on reorderable layers', () => {
    hostComponent.mageLayers = [{ id: 'layer1', name: 'Layer One', type: 'vector', layer: {} } as unknown as RenderedMapLayer];
    hostComponent.baseLayers = [{ id: 1, name: 'Layer Two', type: 'Imagery', layer: {} } as unknown as RenderedMapLayer];
    fixture.detectChanges();

    const [mageItem, baseItem] = fixture.nativeElement.querySelectorAll('layer-item');
    const handle: HTMLElement = mageItem.querySelector('.drag-handle');
    expect(handle.classList).toContain('cdk-drag-handle');
    expect(getComputedStyle(handle).cursor).toEqual('grab');
    expect(baseItem.querySelector('.drag-handle')).toBeNull();
  });

  it('should keep the drag handle visible when the name is long', () => {
    const name = 'Layer One '.repeat(30);
    hostComponent.mageLayers = [{ id: 'layer1', name: name, type: 'vector', layer: {} } as unknown as RenderedMapLayer];
    fixture.detectChanges();

    const row: HTMLElement = fixture.nativeElement.querySelector('layer-item .row');
    const handleRect = row.querySelector<HTMLElement>('.drag-handle')!.getBoundingClientRect();

    expect(handleRect.width).toEqual(24);
    expect(handleRect.right).toBeLessThanOrEqual(row.getBoundingClientRect().right);
  });

  it('should toggle layer settings from the settings button', () => {
    hostComponent.mageLayers = [{ id: 'layer1', name: 'Layer One', type: 'vector', layer: {} } as unknown as RenderedMapLayer];
    fixture.detectChanges();

    const toggle: HTMLElement = fixture.nativeElement.querySelector('layer-item .toggle');
    const settings: HTMLElement = fixture.nativeElement.querySelector('layer-item .settings');
    expect(toggle.getAttribute('aria-expanded')).toEqual('false');
    expect(settings.inert).toBeTrue();

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toEqual('true');
    expect(settings.classList).toContain('settings--expanded');
    expect(settings.inert).toBeFalse();
  });

  it('should keep layer settings rendered when collapsed so they keep their state', () => {
    hostComponent.mageLayers = [{ id: 'layer1', name: 'Layer One', type: 'vector', layer: {} } as unknown as RenderedMapLayer];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('layer-item layer-content')).not.toBeNull();
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
