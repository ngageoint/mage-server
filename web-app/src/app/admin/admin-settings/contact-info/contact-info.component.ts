import { Component, OnInit, signal } from '@angular/core';
import { take, lastValueFrom } from 'rxjs';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog as MatDialog } from '@angular/material/dialog';

import { SettingsService } from '../settings.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { AdminSettingsUnsavedComponent } from '../admin-settings-unsaved/admin-settings-unsaved.component';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { EmailValidatorDirective } from '../../../email/email';

@Component({
  selector: 'contact-info',
  templateUrl: 'contact-info.component.html',
  styleUrls: ['./contact-info.component.scss'],
  standalone: true,
  imports: [
    // MatDialog/MatSnackBar are injected services, not template directives —
    // no MatDialogModule/MatSnackBarModule needed here.
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    EmailValidatorDirective
  ]
})
export class ContactInfoComponent implements OnInit {
  readonly breadcrumbs: AdminBreadcrumb[] = [{ title: 'Contact Info', icon: 'contact_support' }];

  readonly phone = signal('');
  readonly email = signal('');
  readonly showDevContact = signal(false);
  readonly isDirty = signal(false);

  constructor(
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

    this.settingsService
      .get('contactinfo')
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          const loaded = res?.settings ?? res ?? null;
          if (loaded) {
            if (loaded.phone !== undefined) this.phone.set(loaded.phone);
            if (loaded.email !== undefined) this.email.set(loaded.email);
            if (loaded.showDevContact !== undefined) this.showDevContact.set(loaded.showDevContact);
          }
        },
        error: (err) => {
          console.log(err);
        }
      });
  }

  setDirty(status: boolean): void {
    this.isDirty.set(status);
  }

  save(): void {
    this.settingsService
      .update('contactinfo', {
        phone: this.phone(),
        email: this.email(),
        showDevContact: this.showDevContact()
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isDirty.set(false);
          this.snackBar.open('Contact info saved', undefined, { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to save contact info', undefined, { duration: 2000 })
      });
  }

  async onUnsavedChanges(): Promise<boolean> {
    if (!this.isDirty()) return true;
    const ref = this.dialog.open(AdminSettingsUnsavedComponent);
    const result = await lastValueFrom(ref.afterClosed());
    const discard = result ? !!result.discard : true;
    if (discard) this.isDirty.set(false);
    return discard;
  }
}
