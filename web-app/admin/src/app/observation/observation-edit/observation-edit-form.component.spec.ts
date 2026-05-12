import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  NO_ERRORS_SCHEMA,
  ViewChild
} from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { UntypedFormGroup } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ObservationEditFormComponent } from './observation-edit-form.component';

@Component({
  standalone: true,
  imports: [ObservationEditFormComponent],
  template: `
    <observation-edit-form
      [formGroup]="formGroup"
      [definition]="definition"
      [geometryStyle]="geometryStyle"
      [options]="options"
    ></observation-edit-form>
  `
})
class TestHostComponent {
  formGroup = new UntypedFormGroup({});
  definition = {
    name: 'TestForm',
    fields: []
  };
  geometryStyle = {};
  options = {
    expand: false
  };

  @ViewChild(ObservationEditFormComponent)
  component: ObservationEditFormComponent;
}

describe('ObservationEditFormComponent', () => {
  let component: ObservationEditFormComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ObservationEditFormComponent,
        TestHostComponent,
        NoopAnimationsModule
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = hostComponent.component;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
