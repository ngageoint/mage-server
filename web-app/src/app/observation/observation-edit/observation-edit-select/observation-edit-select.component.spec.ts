import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';

import { ObservationEditSelectComponent } from './observation-edit-select.component';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatError } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  template: `<observation-edit-dropdown [definition]="definition" [formGroup]="formGroup"></observation-edit-dropdown>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TestHostComponent {
  formGroup = new FormGroup({
    select: new FormControl()
  })

  definition = {
    name: 'select',
    title: 'Colors',
    choices: [{
      title: 'red'
    },{
      title: 'green'
    },{
      title: 'blue'
    }]
  }

  @ViewChild(ObservationEditSelectComponent) component: ObservationEditSelectComponent
}

describe('ObservationEditSelectComponent', () => {
  let component: ObservationEditSelectComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, FormsModule, ReactiveFormsModule, NgxMatSelectSearchModule, MatInputModule, MatSelectModule],
      declarations: [ObservationEditSelectComponent, TestHostComponent]
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

  it('should not indicate required', async () => {
    component.definition.required = false

    const control = component.formGroup.get('select')
    control.clearValidators()
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(true)
    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error).toBeNull()
  })

  it('should indicate required', async () => {
    component.definition.required = true

    const control = component.formGroup.get('select')
    control.setValidators(Validators.required)
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
  })

  // it('should show error on invalid and touched', async () => {
  //   component.definition.required = true

  //   const input = fixture.debugElement.query(By.directive(MatSelect)).references['dropdown']
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
