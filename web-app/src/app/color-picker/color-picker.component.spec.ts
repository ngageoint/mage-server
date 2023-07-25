import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorPickerComponent } from './color-picker.component';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CheckboardModule, SaturationModule, HueModule, AlphaModule } from 'ngx-color';
import { Component, ViewChild } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TinyColor } from '@ctrl/tinycolor';

@Component({
  selector: `host-component`,
  template: `<color-picker hexColor="hexColor"></color-picker>`
})
class TestHostComponent {
  hexColor = '#000000FF';

 @ViewChild(ColorPickerComponent) colorPicker: ColorPickerComponent;
}

describe('ColorPickerComponent', () => {
  let hostComponent: TestHostComponent;
  let component: ColorPickerComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ NoopAnimationsModule, MatInputModule, MatFormFieldModule, MatCardModule, CheckboardModule, SaturationModule, HueModule, AlphaModule ],
      declarations: [ TestHostComponent, ColorPickerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = hostComponent.colorPicker;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show color picker on open', () => {
    component.open();
    expect(component.showColorPicker).toEqual(true);
  });

  it('should hide color picker on cancel', () => {
    component.showColorPicker = true;
    component.cancel();
    expect(component.showColorPicker).toEqual(false);
  });

  it('should emit color', () => {
    spyOn(component.onColorChanged, 'emit');
    component.showColorPicker = true;
    component.rgb = { r: 1, g: 0, b: 1, a: 1 };
    component.ok();
    expect(component.showColorPicker).toEqual(false);
    expect(component.background).toEqual('rgba(1, 0, 1, 1)');
    expect(component.onColorChanged.emit).toHaveBeenCalledWith({
      color: new TinyColor(component.rgb).toHex8String()
    });
  });
});


