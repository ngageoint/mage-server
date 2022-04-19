import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaxValueDirective } from './max-value.directive';
import { MinValueDirective } from './min-value.directive';

import { ObservationEditNumberComponent } from './observation-edit-number.component';

@Component({
  selector: `host-component`,
  template: `<observation-edit-number [definition]="definition" [formGroup]="formGroup"></observation-edit-number>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TestHostComponent {
  formGroup = new FormGroup({
    number: new FormControl()
  })

  definition: any = {
    name: 'number',
    title: 'Number Field'
  }


  @ViewChild(ObservationEditNumberComponent) component: ObservationEditNumberComponent
}

describe('ObservationEditNumberComponent', () => {
  let component: ObservationEditNumberComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, NoopAnimationsModule],
      declarations: [ObservationEditNumberComponent, MaxValueDirective, MinValueDirective, TestHostComponent]
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

    const control = component.formGroup.get('number')
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

    const control = component.formGroup.get('number')
    control.setValidators(Validators.required)
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
  })

  it('should show error on invalid and touched', async () => {
    component.definition.required = true

    const control = component.formGroup.get('number')
    control.setValidators(Validators.required)
    control.updateValueAndValidity()
    control.markAsTouched()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error.nativeElement.innerText).toBe('You must enter a value')
  })

  it('should not show error on invalid if not touched', async () => {
    component.definition.required = true

    const control = component.formGroup.get('number')
    control.setValidators(Validators.required)
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error).toBeNull()
  })
});
