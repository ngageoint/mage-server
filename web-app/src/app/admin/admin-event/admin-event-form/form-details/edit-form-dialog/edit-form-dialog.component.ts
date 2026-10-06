import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';

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
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule
  ]
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
