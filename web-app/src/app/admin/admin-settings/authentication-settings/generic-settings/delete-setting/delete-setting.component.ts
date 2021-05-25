import { Component, Inject } from '@angular/core';
import { GenericSetting } from '../generic-settings.model';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'delete-setting',
  templateUrl: './delete-setting.component.html',
  styleUrls: ['./delete-setting.component.scss']
})
export class DeleteSettingComponent {

  constructor(
    public dialogRef: MatDialogRef<DeleteSettingComponent>,
    @Inject(MAT_DIALOG_DATA) public setting: GenericSetting) {
  }

  close(): void {
    this.dialogRef.close('cancel');
  }

  confirm(): void {
    this.dialogRef.close({ event: 'confirm', data: this.setting });
  }
}