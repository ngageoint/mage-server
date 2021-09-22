import { Pipe, PipeTransform, Inject } from '@angular/core';
import { LocalStorageService } from '../upgrade/ajs-upgraded-providers';
import * as moment from 'moment';

@Pipe({
  name: 'moment',
  pure: false
})
export class MomentPipe implements PipeTransform {

  constructor(@Inject(LocalStorageService) private localStorageService: any) { }

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