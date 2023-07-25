import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerHeaderComponent } from './layer-header.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { Component, ViewChild } from '@angular/core';
import { LayerService } from './layer.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

@Component({
  selector: `host-component`,
  template: `<layer-header [layer]="layer"></layer-header>`
})
class TestHostComponent {

  layer = {
    layer: {
      type: 'Tile'
    }
  };

  @ViewChild(LayerHeaderComponent) layerHeader: LayerHeaderComponent;
}

describe('LayerHeaderComponent', () => {
  let component: LayerHeaderComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ NoopAnimationsModule, MatFormFieldModule, MatCheckboxModule, MatRadioModule, MatIconModule ],
      providers: [ LayerService ],
      declarations: [ LayerHeaderComponent, TestHostComponent ]
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
    component.layer.layer.getBounds = function(): any { return null; };
    expect(component.hasBounds()).toBeTruthy();
  });

  it('should have bbox', () => {
    component.layer.layer.table = {
      bbox: [0,0,0,0]
    };
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
    expect(component['layerService'].toggle).toHaveBeenCalledWith(component.layer, true);
  });

  it('should toggle check off', () => {
    spyOn(component['layerService'], 'toggle');
    const event: any = {
      checked: false
    };
    component.checkChanged(event);
    expect(component['layerService'].toggle).toHaveBeenCalledWith(component.layer, false);
  });

  it('should toggle radio on', () => {
    spyOn(component['layerService'], 'toggle');
    component.radioChanged();
    expect(component['layerService'].toggle).toHaveBeenCalledWith(component.layer, true);
  });

  it('should zoom', () => {
    component.layer.layer.table = {
      bbox: [0, 0, 0, 0]
    };
    fixture.detectChanges();
    spyOn(component['layerService'], 'zoom');
    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();
    expect(component['layerService'].zoom).toHaveBeenCalledWith(component.layer);
  });

  it('should toggle expanded', () => {
    spyOn(component.onToggle, 'emit');
    component.expanded = false;
    component.toggle();
    expect(component.expanded).toBeTruthy();
    expect(component.onToggle.emit).toHaveBeenCalled();
  });
});
