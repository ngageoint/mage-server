import { Component, Input } from '@angular/core'
import { ColorEvent } from 'ngx-color';
import { Strategy } from '../../admin-settings.model';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ColorPickerComponent } from 'admin/src/app/color-picker/color-picker.component';
import { IconUploadComponent } from '../icon-upload/icon-upload.component';

@Component({
   selector: 'button-preview',
   standalone: true,
   imports: [
     CommonModule,
     MatFormFieldModule,
     MatIconModule,
     ColorPickerComponent,
     IconUploadComponent
   ],
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