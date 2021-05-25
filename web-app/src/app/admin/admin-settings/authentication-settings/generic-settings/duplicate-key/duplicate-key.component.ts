import { Component, Inject } from '@angular/core';
import { GenericSetting } from '../generic-settings.model';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'duplicate-key',
  templateUrl: './duplicate-key.component.html',
  styleUrls: ['./duplicate-key.component.scss']
})
export class DuplicateKeyComponent {

  constructor(
    public dialogRef: MatDialogRef<DuplicateKeyComponent>,
    @Inject(MAT_DIALOG_DATA) public setting: GenericSetting) {
  }

  close(): void {
    this.dialogRef.close('cancel');
  }

  confirm(): void {
    this.dialogRef.close({ event: 'conmfirm', data: this.setting });
  }
}