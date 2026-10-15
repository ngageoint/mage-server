import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AdminDeviceService } from '../../services/admin-device.service';
import { Device } from '../../../entities/device/device';
import { User } from '../../admin-users/user';
import { UserSearchBoxComponent } from '../../admin-users/user-search/user-search-box.component';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Component({
    selector: 'mage-admin-device-create',
    templateUrl: './create-device.component.html',
    styleUrls: ['./create-device.component.scss'],
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        UserSearchBoxComponent
    ]
})
export class CreateDeviceDialogComponent {
  readonly dialogRef: MatDialogRef<CreateDeviceDialogComponent> =
    inject(MatDialogRef<CreateDeviceDialogComponent>);
  readonly data: { device: Partial<Device> } = inject(MAT_DIALOG_DATA);
  private readonly formBuilder: FormBuilder = inject(FormBuilder);
  private readonly deviceService: AdminDeviceService = inject(AdminDeviceService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly isEditMode: boolean = this.data.device?.id != null;
  readonly currentUserDisplayName: string | null = this.data.device?.user?.displayName || null;

  readonly errorMessage = signal('');

  deviceForm: FormGroup = this.formBuilder.group({
    uid: [this.data.device?.uid ?? '', [Validators.required], [this.uidTakenValidator()]],
    description: [this.data.device?.description ?? ''],
    userId: this.data.device?.user?.id ?? null
  });

  private uidTakenValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const uid = (control.value || '').trim().toLowerCase();
      if (!uid) return of(null);

      return of(uid).pipe(
        debounceTime(300),
        switchMap((value) => {
          const filter: any = { limit: 5 };
          filter.or = {
            uid: `^${escapeRegExp(value)}$`
          };

          return this.deviceService.getAllDevices(filter);
        }),
        map(({ devices }) => {
          const taken = devices.some((d) => d.uid?.toLowerCase() === uid && d.id !== this.data.device?.id);
          return taken ? { duplicate: true } : null;
        }),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      );
    };
  }

  onPointOfContactSelected(user: User | null) {
    this.deviceForm.patchValue({
      userId: user ? user.id : ''
    });
  }

  save(): void {
    this.errorMessage.set('');
    const deviceData = this.deviceForm.value;

    const request = this.isEditMode
      ? this.deviceService.updateDevice(String(this.data.device!.id), {
          uid: deviceData.uid,
          description: deviceData.description,
          userId: deviceData.userId || null
        })
      : this.deviceService.createDevice(deviceData);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (device) => {
        this.dialogRef.close(device);
      },
      error: (err) => {
        if (err.status === 400 && err.error?.errors) {
          const fieldErrors = err.error.errors;
          if (fieldErrors.name?.type === 'unique') {
            this.errorMessage.set(fieldErrors.name.message);
          } else {
            this.errorMessage.set(err.error.message ?? 'Validation failed');
          }
        } else {
          const action = this.isEditMode ? 'save' : 'create';
          this.errorMessage.set(`Failed to ${action} device. Please try again.`);
        }
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
