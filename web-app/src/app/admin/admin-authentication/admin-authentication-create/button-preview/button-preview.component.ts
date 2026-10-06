import { Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon';
import { ColorEvent } from 'ngx-color';
import { ColorPickerModule } from '../../../../color-picker/color-picker.module';
import { IconUploadComponent } from '../icon-upload/icon-upload.component';
import { Strategy } from '../../admin-settings.model';

@Component({
    selector: 'button-preview',
    templateUrl: './button-preview.component.html',
    styleUrls: ['./button-preview.component.scss'],
    imports: [MatIconModule, ColorPickerModule, IconUploadComponent]
})
export class ButtonPreviewComponent {
   readonly strategy = input.required<Strategy>();
   readonly editable = input(true);

   colorChanged(event: ColorEvent, key: string): void {
      const strategy = this.strategy();
      if (strategy.hasOwnProperty(key)) {
         strategy[key] = event.color;
      } else {
         console.log(key + ' is not a valid strategy property');
      }
   }

   iconChanged(icon: string): void {
      this.strategy().icon = icon;
   }
}
