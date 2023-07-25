import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatError } from '@angular/material/form-field';
import { By } from 'protractor';

import { ObservationEditPasswordComponent } from './observation-edit-password.component';

@Component({
  selector: `host-component`,
  template: `<observation-edit-password [definition]="definition" [formGroup]="formGroup"></observation-edit-password>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TestHostComponent {
  formGroup = new FormGroup({
    text: new FormControl('')
  });
  definition = {
    name: 'text',
    title: 'Text Field',
    required: true
  }

  @ViewChild(ObservationEditPasswordComponent) component: ObservationEditPasswordComponent
}

describe('ObservationEditPasswordComponent', () => {
  let component: ObservationEditPasswordComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationEditPasswordComponent, TestHostComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    fixture.detectChanges();
    component = hostComponent.component
  })

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });

  // it('should not indicate required', async () => {
  //   component.definition.required = false

  //   const control = component.formGroup.get('text')
  //   control.clearValidators()
  //   control.updateValueAndValidity()

  //   fixture.detectChanges()
  //   await fixture.whenStable()

  //   expect(control.valid).toBe(true)
  //   const error = fixture.debugElement.query(By.directive(MatError))
  //   expect(error).toBeNull()
  // })

  // it('should indicate required', async () => {
  //   component.definition.required = true

  //   const control = component.formGroup.get('text')
  //   control.setValidators(Validators.required)
  //   control.updateValueAndValidity()

  //   fixture.detectChanges()
  //   await fixture.whenStable()

  //   expect(control.valid).toBe(false)
  // })

  // it('should show error on invalid and touched', async () => {
  //   component.definition.required = true

  //   const control = component.formGroup.get('text')
  //   control.setValidators(Validators.required)
  //   control.updateValueAndValidity()
  //   control.markAsTouched()

  //   fixture.detectChanges()
  //   await fixture.whenStable()

  //   expect(control.valid).toBe(false)
  //   const error = fixture.debugElement.query(By.directive(MatError))
  //   expect(error.nativeElement.innerText).toBe('You must enter a value')
  // })

  // it('should not show error on invalid if not touched', async () => {
  //   component.definition.required = true

  //   const control = component.formGroup.get('text')
  //   control.setValidators(Validators.required)
  //   control.updateValueAndValidity()

  //   fixture.detectChanges()
  //   await fixture.whenStable()

  //   expect(control.valid).toBe(false)
  //   const error = fixture.debugElement.query(By.directive(MatError))
  //   expect(error).toBeNull()
  // })
});
