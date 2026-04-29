import { CommonModule } from '@angular/common';
import { Component, NgZone } from '@angular/core'
import { MatDialogModule, MatDialogRef as MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'admin-settings-unsaved',
    standalone: true,
    imports: [
      CommonModule,
      MatDialogModule
    ],  
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