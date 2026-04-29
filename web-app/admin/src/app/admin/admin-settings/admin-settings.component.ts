import { Component, OnInit } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { AdminSettingsUnsavedComponent } from './admin-settings-unsaved/admin-settings-unsaved.component';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { AdminBreadcrumbComponent } from '../admin-breadcrumb/admin-breadcrumb.component';
import { ContactInfoComponent, SecurityBannerComponent, SecurityDisclaimerComponent } from './admin-settings';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'admin-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    AdminBreadcrumbComponent,
    SecurityBannerComponent,
    SecurityDisclaimerComponent,
    ContactInfoComponent
  ],
  templateUrl: 'admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit {
  readonly breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Settings',
    icon: 'build'
  }];

  onSave = {};
  isBannerDirty = false;
  isDisclaimerDirty = false;
  isAuthenticationDirty = false;
  isContactInfoDirty = false;

  constructor(
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
  }

  save(): void {
    this.onSave = {};
  }

  onBannerDirty(isDirty: boolean): void {
    this.isBannerDirty = isDirty;
  }

  onBannerSaved(status: boolean): void {
    this.snackBar.open(status ? 'Banner successfully saved' : 'Failed to save banner', undefined, { duration: 2000 });
    this.isBannerDirty = false;
  }

  onDisclaimerDirty(isDirty: boolean): void {
    this.isDisclaimerDirty = isDirty;
  }

  onDisclaimerSaved(status: boolean): void {
    this.snackBar.open(status ? 'Disclaimer successfully saved' : 'Failed to save disclaimer', undefined, { duration: 2000 });
    this.isDisclaimerDirty = false;
  }

  onContactInfoDirty(isDirty: boolean): void {
    this.isContactInfoDirty = isDirty;
  }

  onContactInfoSaved(status: boolean): void {
    this.snackBar.open(status ? 'Contact info successfully saved' : 'Failed to save contact info', undefined, { duration: 2000 });
    this.isContactInfoDirty = false;
  }

  isDirty(): boolean {
    return this.isDisclaimerDirty || this.isAuthenticationDirty || this.isBannerDirty || this.isContactInfoDirty;
  }

  async onUnsavedChanges(): Promise<boolean> {
    if (!this.isDirty()) return true;

    const ref = this.dialog.open(AdminSettingsUnsavedComponent);
    const result = await lastValueFrom(ref.afterClosed());

    const discard = result ? !!result.discard : true;

    if (discard) {
      this.isAuthenticationDirty = false;
      this.isBannerDirty = false;
      this.isDisclaimerDirty = false;
      this.isContactInfoDirty = false;
    }

    return discard;
  }
}
