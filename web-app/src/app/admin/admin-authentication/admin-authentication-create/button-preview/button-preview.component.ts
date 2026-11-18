import { Component, input, output } from '@angular/core'
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { authenticationButtonText } from '../../../../api/api.entity';
import { AuthenticationButtonComponent } from '../../../../ingress/authentication/button/authentication-button.component';
import { IconUploadComponent } from '../icon-upload/icon-upload.component';
import { HEX_COLOR, Strategy } from '../../admin-settings.model';

@Component({
    selector: 'button-preview',
    templateUrl: './button-preview.component.html',
    styleUrls: ['./button-preview.component.scss'],
    imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, AuthenticationButtonComponent, IconUploadComponent]
})
export class ButtonPreviewComponent {
   readonly strategy = input.required<Strategy>();
   readonly editable = input(true);
   readonly changed = output<void>();
   readonly hexColorPattern = HEX_COLOR;

   defaultButtonText(): string {
      return authenticationButtonText(this.strategy().title);
   }

   colorChanged(key: 'textColor' | 'buttonColor', color: string): void {
      this.strategy()[key] = color;
      this.changed.emit();
   }

   /** The color input only takes #rrggbb; drop the alpha the old picker saved (#rrggbbaa). */
   swatchColor(color: string | undefined): string | undefined {
      return color?.slice(0, 7);
   }

   iconBase64(): string | undefined {
      const icon: string | undefined = this.strategy().icon;
      return icon?.startsWith('data:') ? icon.split(',')[1] : icon;
   }

   iconChanged(icon: string): void {
      this.strategy().icon = icon;
      this.changed.emit();
   }

   removeIcon(): void {
      this.strategy().icon = null;
      this.changed.emit();
   }
}
