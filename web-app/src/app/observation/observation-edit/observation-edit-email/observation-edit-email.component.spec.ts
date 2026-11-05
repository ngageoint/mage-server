import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ObservationEditEmailComponent } from './observation-edit-email.component';
import { testRequiredFieldValidation } from '../observation-edit-field-validation.spec';

@Component({
    selector: `host-component`,
    template: `<observation-edit-email [definition]="definition" [formGroup]="formGroup"></observation-edit-email>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
class TestHostComponent {
  formGroup = new UntypedFormGroup({
    text: new UntypedFormControl('')
  })

  definition: any = {
    name: 'text',
    title: 'Email Field'
  }

  @ViewChild(ObservationEditEmailComponent) component: ObservationEditEmailComponent
}

describe('ObservationEditEmailComponent', () => {
  let component: ObservationEditEmailComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, NoopAnimationsModule, ObservationEditEmailComponent],
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
