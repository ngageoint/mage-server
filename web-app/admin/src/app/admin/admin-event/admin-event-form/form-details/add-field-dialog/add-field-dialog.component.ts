import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface AddFieldDialogData {
    fieldTypes: { name: string; title: string; hidden?: boolean }[];
}

export interface AddFieldResult {
    title: string;
    type: string;
    required: boolean;
}

@Component({
    selector: 'mage-add-field-dialog',
    templateUrl: './add-field-dialog.component.html',
    styleUrls: ['./add-field-dialog.component.scss']
})
export class AddFieldDialogComponent {
    field: AddFieldResult = {
        type: 'textfield',
        title: '',
        required: false
    };

    constructor(
        public dialogRef: MatDialogRef<AddFieldDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: AddFieldDialogData
    ) {
        // Set default field type to first available type
        if (data.fieldTypes && data.fieldTypes.length > 0) {
            this.field.type = data.fieldTypes[0].name;
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onAdd(): void {
        if (this.field.title && this.field.type) {
            this.dialogRef.close(this.field);
        }
    }
}
