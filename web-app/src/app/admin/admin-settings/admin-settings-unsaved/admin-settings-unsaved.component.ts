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

    close(): void {
        this.dialogRef.close('cancel');
    }

    procede(): void {
        this.dialogRef.close('procede');
    }
}