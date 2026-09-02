import { Component, NgZone } from '@angular/core'
import { MatDialogRef, MatDialogModule} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { A11yModule } from '@angular/cdk/a11y'

@Component({
    selector: 'admin-settings-unsaved',
    templateUrl: './admin-settings-unsaved.component.html',
    styleUrls: ['./admin-settings-unsaved.component.scss'],
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        A11yModule
    ]
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