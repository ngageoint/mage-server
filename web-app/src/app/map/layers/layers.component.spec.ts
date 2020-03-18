import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayersComponent } from './layers.component';
import { LayerHeaderComponent } from './layer-header.component';
import { LayerContentComponent } from './layer-content.component';
import { MatExpansionModule, MatCheckboxModule, MatRadioModule, MatFormFieldModule, MatIconModule, MatSliderModule, MatCardModule } from '@angular/material';
import { ColorPickerComponent } from 'src/app/color-picker/color-picker.component';
import { FormsModule } from '@angular/forms';
import { CheckboardModule, HueModule, SaturationModule, AlphaModule } from 'ngx-color';
import { Component, ViewChild } from '@angular/core';

@Component({
  selector: `host-component`,
  template: `<map-layers-panel 
    [mageLayers]="mageLayers" 
    [baseLayers]="baseLayers" 
    [tileOverlays]="tileOverlays" 
    [featureOverlays]="featureOverlays">
  </map-layers-panel>`
})
class TestHostComponent {

  mageLayers = [];
  baseLayers= [];
  tileOverlays = [];
  featureOverlays = [];

  @ViewChild(LayersComponent, { static: false }) layers: LayersComponent;
}


describe('LayersComponent', () => {
  let component: LayersComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, MatCardModule, MatFormFieldModule, MatIconModule, MatSliderModule, MatCheckboxModule, MatRadioModule, MatExpansionModule, CheckboardModule, HueModule, SaturationModule, AlphaModule ],
      declarations: [ LayersComponent, LayerHeaderComponent, LayerContentComponent, ColorPickerComponent, TestHostComponent ]
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
    const type = 'tile';
    const layers: [any] = [{}];
    component.reorderLayers(event, type, layers);

    expect(component.onReorder.emit).toHaveBeenCalledWith({
      type: type,
      layers: layers,
      currentIndex: 1,
      previousIndex: 0
    });
  });

  it('should not reorder if indices are the same', () => {
    spyOn(component.onReorder, 'emit');

    const event: any = {
      currentIndex: 0,
      previousIndex: 0
    }
    const type = 'tile';
    const layers: [any] = [{}];
    component.reorderLayers(event, type, layers);

    expect(component.onReorder.emit).not.toHaveBeenCalled();
  });
});
