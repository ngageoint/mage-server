import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LayersComponent } from './layers.component';
import { LayerHeaderComponent } from './layer-header.component';
import { LayerContentComponent } from './layer-content.component';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
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
    [featureOverlays]="featureOverlays"
    [gridOverlays]="gridOverlays">
  </map-layers-panel>`
})
class TestHostComponent {

  mageLayers = [];
  baseLayers= [];
  tileOverlays = [];
  featureOverlays = [];
  gridOverlays = [];

  @ViewChild(LayersComponent) layers: LayersComponent;
}


describe('LayersComponent', () => {
  let component: LayersComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(waitForAsync(() => {
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
