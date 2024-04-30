import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { Strategy } from '../../admin-settings.model';

@Component({
  selector: 'icon-upload',
  templateUrl: './icon-upload.component.html',
  styleUrls: ['./icon-upload.component.scss']
})
export class IconUploadComponent {
  @Input() strategy: Strategy;

  constructor(private changeDetector: ChangeDetectorRef) { }

  onImageChange(e: any): void {
    const reader = new FileReader();

    if (e.target.files && e.target.files.length) {
      const file = e.target.files[0];

      reader.onload = (e: Event): void => {
        const target = e.target as FileReader;
        this.strategy.icon = target.result as string;
        this.changeDetector.detectChanges();
      };

      reader.readAsDataURL(file);
    }
  }
}