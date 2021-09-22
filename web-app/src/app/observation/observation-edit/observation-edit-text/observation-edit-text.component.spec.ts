import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatError, MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ObservationEditTextComponent } from './observation-edit-text.component';

@Component({
  selector: `host-component`,
  template: `<observation-edit-text [field]="field"></observation-edit-text>`
})
class TestHostComponent {

  field = {
    title: 'Text',
    name: 'field1'
  }

  @ViewChild(ObservationEditTextComponent) component: ObservationEditTextComponent
}

describe('ObservationEditTextComponent', () => {
  let component: ObservationEditTextComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, NoopAnimationsModule],
      declarations: [ObservationEditTextComponent, TestHostComponent]
    })
    .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    fixture.detectChanges();
    component = hostComponent.component
  })

  // it('should create', () => {
  //   expect(component).toBeTruthy()
  // })

  // it('should not indicate required', () => {
  //   component.definition.required = false
  //   fixture.detectChanges()
  //   const input = fixture.debugElement.query(By.directive(MatFormField)).componentInstance
  //   expect(input._control.required).toBeFalsy()
  // })

  // it('should indicate required', () => {
  //   component.definition.required = true
  //   fixture.detectChanges()
  //   const input = fixture.debugElement.query(By.directive(MatFormField)).componentInstance
  //   expect(input._control.required).toBeTruthy()
  // })

  // it('should show error on invalid and touched', async () => {
  //   component.definition.required = true

  //   const input = fixture.debugElement.query(By.directive(MatInput)).references['text']
  //   input.control.markAsTouched()

  //   fixture.detectChanges()
  //   await fixture.whenStable()

  //   const error = fixture.debugElement.query(By.directive(MatError))
  //   expect(error.nativeElement.innerText).toBe('You must enter a value')
  // })

  // it('should not show error on invalid if not touched', async () => {
  //   component.definition.required = true

  //   fixture.detectChanges()
  //   await fixture.whenStable()

  //   const error = fixture.debugElement.query(By.directive(MatError))
  //   expect(error).toBeNull()
  // })
});
