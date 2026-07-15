import { Component, Inject } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminDeviceService } from '../../services/admin-device.service';
import { Device } from '../../../entities/device/device';
import { User } from '../../admin-users/user';

@Component({
    selector: 'mage-admin-device-create',
    templateUrl: './create-device.component.html',
    styleUrls: ['./create-device.component.scss'],
    standalone: false
})
export class CreateDeviceDialogComponent {
  deviceForm: FormGroup;
  errorMessage: string = '';

  isEditMode: boolean;
  currentUserDisplayName: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<CreateDeviceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { device: Partial<Device> },
    private formBuilder: FormBuilder,
    private deviceService: AdminDeviceService
  ) {
    this.isEditMode = data.device?.id != null;
    this.currentUserDisplayName = data.device?.user?.displayName || null;

    this.deviceForm = this.formBuilder.group({
      uid: [data.device?.uid ?? '', [Validators.required]],
      description: [data.device?.description ?? ''],
      userId: data.device?.user?.id ?? null
    });
  }

  onPointOfContactSelected(user: User | null) {
    this.deviceForm.patchValue({
      userId: user ? user.id : ''
    });
  }

  save(): void {
    this.errorMessage = '';
    const deviceData = this.deviceForm.value;

    const request = this.isEditMode
      ? this.deviceService.updateDevice(String(this.data.device!.id), {
          uid: deviceData.uid,
          description: deviceData.description,
          userId: deviceData.userId || null
        })
      : this.deviceService.createDevice(deviceData);

    request.subscribe({
      next: (device) => {
        this.dialogRef.close(device);
      },
      error: (err) => {
        if (err.status === 400 && err.error?.errors) {
          const fieldErrors = err.error.errors;
          if (fieldErrors.name?.type === 'unique') {
            this.errorMessage = fieldErrors.name.message;
          } else {
            this.errorMessage = err.error.message ?? 'Validation failed';
          }
        } else {
          this.errorMessage = `Failed to ${this.isEditMode ? 'save' : 'create'} device. Please try again.`;
        }
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
