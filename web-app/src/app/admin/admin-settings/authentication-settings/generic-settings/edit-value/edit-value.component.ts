import { Component, Inject } from '@angular/core';
import { GenericSetting } from '../generic-settings.model';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'edit-value',
    templateUrl: './edit-value.component.html',
    styleUrls: ['./edit-value.component.scss']
})
export class EditValueComponent {

    constructor(
        public dialogRef: MatDialogRef<EditValueComponent>,
        @Inject(MAT_DIALOG_DATA) public setting: GenericSetting) {
    }

    close(): void {
        this.dialogRef.close('cancel');
    }

    confirm(): void {
        this.dialogRef.close({ event: 'confirm', data: this.setting });
    }
}