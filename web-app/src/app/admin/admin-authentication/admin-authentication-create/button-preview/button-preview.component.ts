import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ColorEvent } from 'ngx-color';
import { ColorPickerModule } from '../../../../color-picker/color-picker.module';
import { IconUploadComponent } from '../icon-upload/icon-upload.component';
import { Strategy } from '../../admin-settings.model';

@Component({
    selector: 'button-preview',
    templateUrl: './button-preview.component.html',
    styleUrls: ['./button-preview.component.scss'],
    standalone: true,
    imports: [CommonModule, MatIconModule, ColorPickerModule, IconUploadComponent]
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