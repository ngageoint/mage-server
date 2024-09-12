import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';
import { LocalStorageService } from '../http/local-storage.service';

@Pipe({
  name: 'moment',
  pure: false
})
export class MomentPipe implements PipeTransform {

  constructor(private localStorageService: LocalStorageService) { }

  transform(value: any, args?: any): any {
    switch (this.localStorageService.getTimeFormat()) {
      case 'relative': {
        return moment(value).fromNow();
      }
      default: {
        const timeZone = this.localStorageService.getTimeZoneView();
        if (timeZone === 'gmt') {
          return moment(value).utc().format('MMM D YYYY h:mm A z');
        } else {
          return moment(value).format('MMM D YYYY h:mm A');
        }
      }
    }
  }
}
