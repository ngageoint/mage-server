import { Component, Inject } from '@angular/core';
import { GenericSetting } from '../generic-settings.model';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'edit-setting',
    templateUrl: './edit-setting.component.html',
    styleUrls: ['./edit-setting.component.scss']
})
export class EditSettingComponent {

    constructor(
        public dialogRef: MatDialogRef<EditSettingComponent>,
        @Inject(MAT_DIALOG_DATA) public setting: GenericSetting) {
    }

    close(): void {
        this.dialogRef.close('cancel');
    }

    confirm(): void {
        this.dialogRef.close({ event: 'confirm', data: this.setting });
    }
}