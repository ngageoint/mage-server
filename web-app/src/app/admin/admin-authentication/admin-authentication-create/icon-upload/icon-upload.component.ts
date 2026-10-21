import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Strategy } from '../../admin-settings.model';

@Component({
    selector: 'icon-upload',
    templateUrl: './icon-upload.component.html',
    imports: [MatButtonModule]
})
export class IconUploadComponent {
  readonly strategy = input.required<Strategy>();
  readonly iconChange = output<string>();

  onImageChange(e: any): void {
    const reader = new FileReader();

    if (e.target.files && e.target.files.length) {
      const file = e.target.files[0];

      reader.onload = (e: Event): void => {
        const target = e.target as FileReader;
        this.iconChange.emit(target.result as string);
      };

      reader.readAsDataURL(file);
    }

    // Allow re-picking the same file after Remove
    e.target.value = '';
  }
}
