import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DevicesService } from '../devices.service';
import { Device } from 'admin/src/@types/dashboard/devices-dashboard';
import { User } from '../../admin-users/user';

/**
 * Dialog component for creating new devices.
 * Provides a form interface with validation for device name (required) and description (optional).
 */
@Component({
  selector: 'mage-admin-device-create',
  templateUrl: './create-device.component.html',
  styleUrls: ['./create-device.component.scss']
})
export class CreateDeviceDialogComponent {
  deviceForm: FormGroup;
  errorMessage: string = '';

  constructor(
    public dialogRef: MatDialogRef<CreateDeviceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { device: Partial<Device> },
    private fb: FormBuilder,
    private devicesService: DevicesService
  ) {
    this.deviceForm = this.fb.group({
      uid: [data.device?.uid ?? '', [Validators.required]],
      description: [data.device?.description ?? ''],
      userId: null
    });
  }

  onPointOfContactSelected(user: User | null) {
    this.deviceForm.patchValue({
      userId: user ? user.id : ''
    });
  }
  
  /**
   * Handles form submission for creating a new device.
   * Validates the form, creates the device via the devices service, and closes the dialog on success.
   */
  save(): void {
    if (this.deviceForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.errorMessage = '';
    const deviceData = this.deviceForm.value;
    this.devicesService.createDevice(deviceData).subscribe({
      next: (newDevice) => {
        this.dialogRef.close(newDevice);
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
          this.errorMessage = 'Failed to create device. Please try again.';
        }
      }
    });
  }

  /**
   * Closes the dialog without saving any data or making any changes.
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
