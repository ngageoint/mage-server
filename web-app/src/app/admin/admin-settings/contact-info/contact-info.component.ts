import { Component, OnInit } from '@angular/core';
import { take, lastValueFrom } from 'rxjs';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog as MatDialog } from '@angular/material/dialog';

import { SettingsService } from '../settings.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminSettingsUnsavedComponent } from '../admin-settings-unsaved/admin-settings-unsaved.component';

@Component({
  selector: 'contact-info',
  templateUrl: 'contact-info.component.html',
  styleUrls: ['./contact-info.component.scss'],
  standalone: false
})
export class ContactInfoComponent implements OnInit {
  readonly breadcrumbs: AdminBreadcrumb[] = [
    { title: 'Contact Info', icon: 'contact_support' }
  ];

  contactinfo = {
    phone: '',
    email: '',
    showDevContact: false
  };

  isDirty = false;

  constructor(
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.settingsService
      .get('contactinfo')
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          const loaded = res?.settings ?? res ?? null;
          if (loaded) {
            this.contactinfo = { ...this.contactinfo, ...loaded };
          }
        },
        error: (err) => {
          console.log(err);
        }
      });
  }

  setDirty(status: boolean): void {
    this.isDirty = status;
  }

  save(): void {
    this.settingsService
      .update('contactinfo', this.contactinfo)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isDirty = false;
          this.snackBar.open('Contact info saved', undefined, { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to save contact info', undefined, { duration: 2000 })
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
