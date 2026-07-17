import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { ColorPickerModule } from '../../color-picker/color-picker.module';
import { SecurityBannerComponent } from './security-banner/security-banner.component';
import { SecurityDisclaimerComponent } from './security-disclaimer/security-disclaimer.component';
import { ContactInfoComponent } from './contact-info/contact-info.component';
import { AdminSettingsUnsavedComponent } from './admin-settings-unsaved/admin-settings-unsaved.component';
import { EmailValidatorDirective } from '../../email/email';

@NgModule({
  declarations: [
    SecurityBannerComponent,
    SecurityDisclaimerComponent,
    ContactInfoComponent,
    AdminSettingsUnsavedComponent,
    EmailValidatorDirective
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    AdminBreadcrumbModule,
    ColorPickerModule
  ],
  exports: [
    SecurityBannerComponent,
    SecurityDisclaimerComponent,
    ContactInfoComponent,
    AdminSettingsUnsavedComponent
  ]
})
export class AdminSettingsModule {}
