import { Component } from '@angular/core'
import { MatDialogRef } from '@angular/material/dialog';


@Component({
    selector: 'admin-settings-unsaved',
    templateUrl: './admin-settings-unsaved.component.html',
    styleUrls: ['./admin-settings-unsaved.component.scss']
})
export class AdminSettingsUnsavedComponent {
    userCount = 0;

    constructor(
        public dialogRef: MatDialogRef<AdminSettingsUnsavedComponent>) {
    }

    stay(): void {
        this.dialogRef.close({ discard: false });
    }

    discard(): void {
        this.dialogRef.close({ discard: true });
    }
}