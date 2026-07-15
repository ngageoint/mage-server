import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn } from '@angular/forms';

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\./

export const emailValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  if (!control.value) return null
  return EMAIL_REGEXP.test(control.value) ? null : { email: true }
};

@Directive({
    selector: '[appEmail][formControlName],[appEmail][formControl],[appEmail][ngModel]',
    providers: [{ provide: NG_VALIDATORS, useExisting: EmailValidatorDirective, multi: true }],
    standalone: false
})
export class EmailValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return emailValidator(control);
  }
}
