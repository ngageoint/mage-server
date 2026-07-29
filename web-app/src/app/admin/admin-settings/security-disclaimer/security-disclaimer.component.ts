import { Component, OnInit } from '@angular/core';
import { take, lastValueFrom } from 'rxjs';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog as MatDialog } from '@angular/material/dialog';

import { Disclaimer } from './security-disclaimer.model';
import { SettingsService } from '../settings.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { AdminSettingsUnsavedComponent } from '../admin-settings-unsaved/admin-settings-unsaved.component';

@Component({
  selector: 'security-disclaimer',
  templateUrl: 'security-disclaimer.component.html',
  styleUrls: ['./security-disclaimer.component.scss'],
  standalone: false
})
export class SecurityDisclaimerComponent implements OnInit {
  readonly breadcrumbs: AdminBreadcrumb[] = [{ title: 'Disclaimer', icon: 'verified' }];

  disclaimer: Disclaimer = {
    show: false,
    title: '',
    text: ''
  };

  isDirty = false;

  constructor(
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

    this.settingsService
      .get('disclaimer')
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          const loaded = res?.settings ?? res ?? null;
          if (loaded) {
            this.disclaimer = { ...this.disclaimer, ...loaded };
          }
        },
        error: (err) => console.log(err)
      });
  }

  setDirty(status: boolean): void {
    this.isDirty = status;
  }

  save(): void {
    this.settingsService
      .update('disclaimer', this.disclaimer)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isDirty = false;
          this.snackBar.open('Disclaimer saved', undefined, { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to save disclaimer', undefined, { duration: 2000 })
      });
  }

  async onUnsavedChanges(): Promise<boolean> {
    if (!this.isDirty) return true;
    const ref = this.dialog.open(AdminSettingsUnsavedComponent);
    const result = await lastValueFrom(ref.afterClosed());
    const discard = result ? !!result.discard : true;
    if (discard) this.isDirty = false;
    return discard;
  }
}
