import { Component, Input } from '@angular/core';
import { Strategy } from '../../admin-settings.model';

@Component({
  selector: 'icon-upload',
  templateUrl: './icon-upload.component.html',
  styleUrls: ['./icon-upload.component.scss']
})
export class IconUploadComponent {
  @Input() strategy: Strategy;
  imgFile: string;

  onImageChange(e: any) {
    const reader = new FileReader();

    if (e.target.files && e.target.files.length) {
      const file = e.target.files[0];
      reader.readAsDataURL(file);

      reader.onload = (e: any) => {
        this.imgFile = reader.result as string;
        this.strategy.icon = this.imgFile;
      };
    }
  }
}