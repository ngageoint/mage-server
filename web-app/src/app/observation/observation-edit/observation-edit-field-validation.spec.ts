import { ComponentFixture } from '@angular/core/testing';
import { UntypedFormGroup, Validators } from '@angular/forms';
import { MatError } from '@angular/material/form-field';
import { By } from '@angular/platform-browser';

interface RequiredFieldHost {
  definition: () => any
  formGroup: () => UntypedFormGroup
}

/**
 * Shared `required` validation behavior for the simple observation-edit field
 * components (text/email/number/textarea/password/multiselect/...): toggling
 * `definition().required` and the form control's validators should drive the
 * same `mat-error` visibility in every one of them.
 */
export function testRequiredFieldValidation(
  getComponent: () => RequiredFieldHost,
  getFixture: () => ComponentFixture<any>,
  fieldName: string,
  errorMessage = 'You must enter a value'
): void {
  it('should not indicate required', async () => {
    const component = getComponent()
    const fixture = getFixture()
    component.definition().required = false

    const control = component.formGroup().get(fieldName)
    control.clearValidators()
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(true)
    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error).toBeNull()
  })

  it('should indicate required', async () => {
    const component = getComponent()
    const fixture = getFixture()
    component.definition().required = true

    const control = component.formGroup().get(fieldName)
    control.setValidators(Validators.required)
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
  })

  it('should show error on invalid and touched', async () => {
    const component = getComponent()
    const fixture = getFixture()
    component.definition().required = true

    const control = component.formGroup().get(fieldName)
    control.setValidators(Validators.required)
    control.updateValueAndValidity()
    control.markAsTouched()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error.nativeElement.innerText.trim()).toBe(errorMessage)
  })

  it('should not show error on invalid if not touched', async () => {
    const component = getComponent()
    const fixture = getFixture()
    component.definition().required = true

    const control = component.formGroup().get(fieldName)
    control.setValidators(Validators.required)
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error).toBeNull()
  })
}
