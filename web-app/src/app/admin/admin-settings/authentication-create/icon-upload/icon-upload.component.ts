import { Component, Input } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Strategy } from '../../admin-settings.model';

@Component({
  selector: 'icon-upload',
  templateUrl: './icon-upload.component.html',
  styleUrls: ['./icon-upload.component.scss']
})
export class IconUploadComponent {
  @Input() strategy: Strategy;
  imgFile: string;

  uploadForm = new FormGroup({
    file: new FormControl('', [Validators.required]),
    imgSrc: new FormControl('', [Validators.required])
  });

  onImageChange(e) {
    const reader = new FileReader();

    if (e.target.files && e.target.files.length) {
      const [file] = e.target.files;
      reader.readAsDataURL(file);

      reader.onload = (e: any) => {
        this.imgFile = reader.result as string;
        this.uploadForm.patchValue({
          imgSrc: reader.result
        });

        const img = new Image();
        img.src = e.target.result;
        img.onload = (res: any) => {
          const imgBase64Path = res.target.src;
          this.strategy.icon = imgBase64Path;
        };

      };
    }
  }
}