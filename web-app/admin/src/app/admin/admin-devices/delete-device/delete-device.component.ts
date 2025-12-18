import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Device } from 'admin/src/@types/dashboard/devices-dashboard';

@Component({
    selector: 'mage-delete-device',
    templateUrl: './delete-device.component.html',
    styleUrls: ['./delete-device.component.scss']
})
export class DeleteDeviceComponent {
    constructor(
        public dialogRef: MatDialogRef<DeleteDeviceComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { device: Device }
    ) { }

    cancel(): void {
        this.dialogRef.close();
    }

    confirmDelete(): void {
        this.dialogRef.close({ confirmed: true });
    }
}
