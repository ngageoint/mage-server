import { Directive, Input } from '@angular/core';
import { FormControl, NG_VALIDATORS, ValidationErrors } from '@angular/forms';

@Directive({
  selector: '[maxValue][formControlName],[maxValue][formControl],[maxValue][ngModel]',
  providers: [{ provide: NG_VALIDATORS, useExisting: MaxValueDirective, multi: true }]
})
export class MaxValueDirective {
  @Input()
  maxValue: number

  validate(control: FormControl): ValidationErrors | null {
    return (control.value > this.maxValue) ? { 'maxValue': true } : null
  }

}
