import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\./

export const emailValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  if (!control.value) return null
  return EMAIL_REGEXP.test(control.value) ? null : { email: true }
};
