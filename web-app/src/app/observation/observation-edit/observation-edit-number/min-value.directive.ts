import { Directive, Input } from '@angular/core';
import { FormControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

@Directive({
  selector: '[minValue][formControlName],[minValue][formControl],[minValue][ngModel]',
  providers: [{ provide: NG_VALIDATORS, useExisting: MinValueDirective, multi: true }]
})
export class MinValueDirective implements Validator {
  @Input()
  minValue: number

  validate(control: FormControl): ValidationErrors | null {
    return (control.value < this.minValue) ? { "minValue": true } : null
  }
}
