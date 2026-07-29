import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'password',
    standalone: false
})
export class PasswordPipe implements PipeTransform {

  transform(value: any, ...args: unknown[]): unknown {
    if (!value) return null;

    return value.replace(/./g, "*");
  }

}
