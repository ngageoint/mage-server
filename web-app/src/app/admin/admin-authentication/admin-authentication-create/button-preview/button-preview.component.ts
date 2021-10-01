import { Component, Input } from '@angular/core'
import { ColorEvent } from 'ngx-color';
import { Strategy } from 'src/app/admin/admin-settings/admin-settings.model';

@Component({
   selector: 'button-preview',
   templateUrl: './button-preview.component.html',
   styleUrls: ['./button-preview.component.scss']
})
export class ButtonPreviewComponent {
   @Input() strategy: Strategy;

   colorChanged(event: ColorEvent, key: string): void {
      if (this.strategy.hasOwnProperty(key)) {
         this.strategy[key] = event.color;
      } else {
         console.log(key + ' is not a valid strategy property');
      }
   }
}