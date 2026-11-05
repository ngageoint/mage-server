import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ObservationEditTextareaComponent } from './observation-edit-textarea.component';
import { testRequiredFieldValidation } from '../observation-edit-field-validation.spec';

@Component({
    selector: `host-component`,
    template: `<observation-edit-textarea [formGroup]="formGroup" [definition]="definition"></observation-edit-textarea>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
class TestHostComponent {
  formGroup = new UntypedFormGroup({
    text: new UntypedFormControl()
  })

  definition = {
    name: 'text',
    title: 'Text Field',
    required: true
  }

  @ViewChild(ObservationEditTextareaComponent) component: ObservationEditTextareaComponent
}

describe('ObservationEditTextareaComponent', () => {
  let component: ObservationEditTextareaComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, NoopAnimationsModule, ObservationEditTextareaComponent],
      declarations: [TestHostComponent]
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    fixture.detectChanges();
    component = hostComponent.component
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  testRequiredFieldValidation(() => component, () => fixture, 'text')
});
