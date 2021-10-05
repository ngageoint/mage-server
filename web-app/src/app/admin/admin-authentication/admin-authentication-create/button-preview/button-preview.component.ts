import { Component, Input } from '@angular/core'
import { ColorEvent } from 'ngx-color';
import { Strategy } from '../../admin-settings.model';

@Component({
   selector: 'button-preview',
   templateUrl: './button-preview.component.html',
   styleUrls: ['./button-preview.component.scss']
})
export class ButtonPreviewComponent {
   @Input() strategy: Strategy;
   @Input() editable = true

   colorChanged(event: ColorEvent, key: string): void {
      if (this.strategy.hasOwnProperty(key)) {
         this.strategy[key] = event.color;
      } else {
         console.log(key + ' is not a valid strategy property');
      }
   }
}