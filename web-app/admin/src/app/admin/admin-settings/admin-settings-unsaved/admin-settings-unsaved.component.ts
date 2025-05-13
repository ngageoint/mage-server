import { Component, NgZone } from '@angular/core'
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'admin-settings-unsaved',
    templateUrl: './admin-settings-unsaved.component.html',
    styleUrls: ['./admin-settings-unsaved.component.scss']
})
export class AdminSettingsUnsavedComponent {
    constructor(
        private readonly dialogRef: MatDialogRef<AdminSettingsUnsavedComponent>,
        private readonly ngZone: NgZone) {
    }

    stay(): void {
        this.ngZone.run(() => {
            this.dialogRef.close({ discard: false });
        });
    }

    discard(): void {
        this.ngZone.run(() => {
            this.dialogRef.close({ discard: true });
        });
    }
}