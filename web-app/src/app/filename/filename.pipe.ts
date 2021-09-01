import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filename'
})
export class FilenamePipe implements PipeTransform {

  transform(value: any, limit?: number): any {
    if (!value || !limit) return value;

    let name = value.substr(0, value.lastIndexOf('.'));
    name = name.length > limit ? name.substring(0, limit - 1) + '~' : name
    return name + value.substr(value.lastIndexOf('.'));
  }
}
