import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface EditFormDialogData {
  name: string;
  description: string;
  color: string;
  default: boolean;
}

@Component({
  selector: 'mage-edit-form-dialog',
  templateUrl: './edit-form-dialog.component.html',
  styleUrls: ['./edit-form-dialog.component.scss'],
  standalone: false
})
export class EditFormDialogComponent {
  form: EditFormDialogData;

  constructor(
    public dialogRef: MatDialogRef<EditFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditFormDialogData
  ) {
    this.form = { ...data };
  }

  onSave(): void {
    this.dialogRef.close(this.form);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
