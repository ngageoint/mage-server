import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditFormComponent } from './observation-edit-form.component';

@Component({
  selector: `host-component`,
  template: `<observation-edit-form [form]="form" [formDefinition]="formDefinition" [geometryStyle]="geometryStyle"></observation-edit-form>`
})
class TestHostComponent {

  form = {}
  formDefinition = {
    name: 'TestForm',
    fields: []
  }
  geometryStyle = {};

  @ViewChild(ObservationEditFormComponent) component: ObservationEditFormComponent
}

describe('ObservationEditFormComponent', () => {
  let component: ObservationEditFormComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationEditFormComponent, TestHostComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    fixture.detectChanges();
    component = hostComponent.component
  })

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
