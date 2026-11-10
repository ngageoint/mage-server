import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ObservationEditPasswordComponent } from './observation-edit-password.component';
import { testRequiredFieldValidation } from '../observation-edit-field-validation.spec';

@Component({
    selector: `host-component`,
    template: `<observation-edit-password [definition]="definition" [formGroup]="formGroup"></observation-edit-password>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ObservationEditPasswordComponent]
})
class TestHostComponent {
  formGroup = new UntypedFormGroup({
    text: new UntypedFormControl('')
  })

  definition: any = {
    name: 'text',
    title: 'Text Field',
    required: true
  }

  component = viewChild.required(ObservationEditPasswordComponent)
}

describe('ObservationEditPasswordComponent', () => {
  let component: ObservationEditPasswordComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, NoopAnimationsModule, ObservationEditPasswordComponent, TestHostComponent]
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

  it('should mask input as a password field', () => {
    const input = fixture.nativeElement.querySelector('input')
    expect(input.type).toBe('password')
  })

  testRequiredFieldValidation(() => component, () => fixture, 'text')
});
