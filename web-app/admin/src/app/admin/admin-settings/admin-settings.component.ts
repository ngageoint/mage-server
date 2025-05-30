import { Component, OnInit } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AdminSettingsUnsavedComponent } from './admin-settings-unsaved/admin-settings-unsaved.component';
import { TransitionService } from '@uirouter/core';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'admin-settings',
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
    private readonly snackBar: MatSnackBar,
    private readonly transitionService: TransitionService) { }

  ngOnInit(): void {
    this.transitionService.onExit({}, this.onUnsavedChanges, { bind: this });
  }

  save(): void {
    this.onSave = {};
  }

  onBannerDirty(isDirty: boolean): void {
    this.isBannerDirty = isDirty;
  }

  onBannerSaved(status: boolean): void {
    if (status) {
      this.snackBar.open('Banner successfully saved', null, {
        duration: 2000,
      });
    } else {
      this.snackBar.open('Failed to save banner', null, {
        duration: 2000,
      });
    };
    this.isBannerDirty = false;
  }

  onDisclaimerDirty(isDirty: boolean): void {
    this.isDisclaimerDirty = isDirty;
  }

  onDisclaimerSaved(status: boolean): void {
    if (status) {
      this.snackBar.open('Disclaimer successfully saved', null, {
        duration: 2000,
      });
    } else {
      this.snackBar.open('Failed to save disclaimer', null, {
        duration: 2000,
      });
    };
    this.isDisclaimerDirty = false;
  }

  onContactInfoDirty(isDirty: boolean): void {
    this.isContactInfoDirty = isDirty;
  }

  onContactInfoSaved(status: boolean): void {
    if (status) {
      this.snackBar.open('Contact info successfully saved', null, {
        duration: 2000,
      });
    } else {
      this.snackBar.open('Failed to save contact info', null, {
        duration: 2000,
      });
    };
    this.isContactInfoDirty = false;
  }

  isDirty(): boolean {
    return this.isDisclaimerDirty || this.isAuthenticationDirty || this.isBannerDirty || this.isContactInfoDirty;
  }

  async onUnsavedChanges(): Promise<boolean> {
    if (this.isDirty()) {
      const ref = this.dialog.open(AdminSettingsUnsavedComponent);

      const result_2 = await lastValueFrom(ref.afterClosed());
      let discard = true;
      if (result_2) {
        discard = result_2.discard;
      }
      if (discard) {
        this.isAuthenticationDirty = false;
        this.isBannerDirty = false;
        this.isDisclaimerDirty = false;
        this.isContactInfoDirty = false;
      }
      return await Promise.resolve(discard);
    }

    return Promise.resolve(true);
  }
}
