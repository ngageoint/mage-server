import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ViewChild } from '@angular/core'

import { ObservationEditMultiselectComponent } from './observation-edit-multiselect.component'
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyChipsModule as MatChipsModule, MatLegacyChipInputEvent as MatChipInputEvent, MatLegacyChipInput as MatChipInput } from '@angular/material/legacy-chips';
import { MatLegacyFormFieldModule as MatFormFieldModule, MatLegacyError as MatError } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { By } from '@angular/platform-browser'

@Component({
  selector: `host-component`,
  template: `<observation-edit-multiselect [definition]="definition" [formGroup]="formGroup"></observation-edit-multiselect>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TestHostComponent {
  formGroup = new UntypedFormGroup({
    select: new UntypedFormControl()
  })

  definition: any = {
    name: 'select',
    required: false,
    title: 'Colors',
    choices: [{
      title: 'red'
    }, {
      title: 'green'
    }, {
      title: 'blue'
    }]
  }

  @ViewChild(ObservationEditMultiselectComponent) component: ObservationEditMultiselectComponent
}

describe('ObservationEditMultiselectComponent', () => {
  let component: ObservationEditMultiselectComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>
  let chipInput: MatChipInput

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, BrowserAnimationsModule, ReactiveFormsModule, MatInputModule, MatAutocompleteModule, MatChipsModule, MatIconModule, MatFormFieldModule],
      declarations: [ObservationEditMultiselectComponent, TestHostComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
      .compileComponents()
  }));


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

  it('should select choice', () => {
    const event: any = {
      option: {
        value: 'red'
      }
    }

    component.selected(event)

    const control = component.formGroup.get('select')
    expect(control.value).toEqual(['red'])
  })

  it('should add choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red',
      chipInput: chipInput
    }
    component.add(event)

    const control = component.formGroup.get('select')
    expect(control.value).toEqual(['red'])
  })

  it('should not add invalid choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'purple',
      chipInput: chipInput
    }
    component.add(event)

    // expect(component.field.value).toBeUndefined()
    const control = component.formGroup.get('select')
    expect(control.value).toBeNull()
  })

  it('should not add duplicate choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red',
      chipInput: chipInput
    }
    component.add(event)
    component.add(event)

    const control = component.formGroup.get('select')
    expect(control.value).toEqual(['red'])
  })

  it('should remove choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red',
      chipInput: chipInput
    }
    component.add(event)
    component.remove('red')

    const control = component.formGroup.get('select')
    expect(control.value).toBeNull()
  })

  it('should not remove non existing choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red',
      chipInput: chipInput
    }
    component.add(event)
    component.remove('blue')

    const control = component.formGroup.get('select')
    expect(control.value).toEqual(['red'])
  })

  it('should show error on invalid and touched', async () => {
    component.definition.required = true

    const control = component.formGroup.get('select')
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

    const control = component.formGroup.get('select')
    control.setValidators(Validators.required)
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error).toBeNull()
  })
});
