import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ObservationEditNumberComponent } from './observation-edit-number.component';
import { testRequiredFieldValidation } from '../observation-edit-field-validation.spec';

@Component({
    selector: `host-component`,
    template: `<observation-edit-number [definition]="definition" [formGroup]="formGroup"></observation-edit-number>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ObservationEditNumberComponent]
})
class TestHostComponent {
  formGroup = new UntypedFormGroup({
    number: new UntypedFormControl()
  })

  definition: any = {
    name: 'number',
    title: 'Number Field'
  }


  component = viewChild.required(ObservationEditNumberComponent)
}

describe('ObservationEditNumberComponent', () => {
  let component: ObservationEditNumberComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, NoopAnimationsModule, ObservationEditNumberComponent, TestHostComponent]
    })
    .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    fixture.detectChanges();
    component = hostComponent.component()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  testRequiredFieldValidation(() => component, () => fixture, 'number')
});
