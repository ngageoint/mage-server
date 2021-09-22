import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerContentComponent } from './layer-content.component';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { ColorPickerComponent } from 'src/app/color-picker/color-picker.component';
import { CheckboardModule, SaturationModule, HueModule, AlphaModule } from 'ngx-color';
import { FormsModule } from '@angular/forms';
import { LayerService } from './layer.service';
import { Component, ViewChild } from '@angular/core';

@Component({
  selector: `host-component`,
  template: `<layer-content [layer]="layer"></layer-content>`
})
class TestHostComponent {

  layer = {
    layer: {
      type: 'Tile'
    }
  };

  @ViewChild(LayerContentComponent) layerContent: LayerContentComponent;
}

describe('LayerContentComponent', () => {
  let component: LayerContentComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, MatInputModule, MatFormFieldModule, MatCardModule, MatSliderModule, MatIconModule, CheckboardModule, SaturationModule, HueModule, AlphaModule ],
      providers: [ LayerService ],
      declarations: [ ColorPickerComponent, TestHostComponent, LayerContentComponent ]
    })
    .compileComponents();
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

  it('should toggle default style on', () => {
    component.toggleStyle();
    expect(component.style).toEqual({
      stroke: "#000000FF",
      fill: "#00000011",
      width: 1
    });
  });

  it('should toggle default style off', () => {
    spyOn(component['layerService'], 'style');
    component.toggleStyle();
    expect(component['layerService'].style).toHaveBeenCalledWith(component.layer, component.style);
  });

  it('should change opacity', () => {
    spyOn(component['layerService'], 'opacity');
    const event: any = {
      value: .5
    };
    component.opacityChanged(event);
    expect(component['layerService'].opacity).toHaveBeenCalledWith(component.layer, .5 / 100);
  });

  it('should change color', () => {
    spyOn(component['layerService'], 'style');
    const event: any = {
      color: '#000000'
    };
    component.colorChanged(event, 'fill');
    expect(component['layerService'].style).toHaveBeenCalledWith(component.layer, { fill: '#000000'});
  });

  it('should change line width', () => {
    spyOn(component['layerService'], 'style');
    component.widthChanged(10);
    expect(component['layerService'].style).toHaveBeenCalledWith(component.layer, { width: 10 });
  });

  it('should format opacity', () => {
    expect(component.formatOpacity(10)).toEqual('10%');
  });
});
