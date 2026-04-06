import { Component, Inject } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { User } from '../user';

@Component({
    selector: 'mage-delete-user',
    templateUrl: './delete-user.component.html',
    styleUrls: ['./delete-user.component.scss']
})
export class DeleteUserComponent {
    constructor(
        public dialogRef: MatDialogRef<DeleteUserComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { user: User }
    ) { }

    cancel(): void {
        this.dialogRef.close();
    }

    confirmDelete(): void {
        this.dialogRef.close({ confirmed: true });
    }
}
