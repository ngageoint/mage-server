import { Component, Inject } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Device } from '../../../entities/device/device';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
    selector: 'mage-delete-device',
    templateUrl: './delete-device.component.html',
    styleUrls: ['./delete-device.component.scss'],
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        A11yModule
    ]
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
