import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Field } from '../observation-feed-helper';

export interface FieldDialogData {
    fieldTypes: { name: string; title: string; hidden?: boolean }[];
    attachmentAllowedTypes: { name: string; title: string }[];
    isMemberField?: boolean;
    editMode?: boolean;
    existingField?: Field;
}

export interface FieldResult {
    title: string;
    type: string;
    required: boolean;
    choices?: any[];
    value?: any;
    min?: number;
    max?: number;
    allowedAttachmentTypes?: string[];
}

@Component({
    selector: 'mage-field-dialog',
    templateUrl: './field-dialog.component.html',
    styleUrls: ['./field-dialog.component.scss']
})
export class FieldDialogComponent {
    field: Field;
    newOptionTitle = '';
    isEditMode = false;

    constructor(
        public dialogRef: MatDialogRef<FieldDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: FieldDialogData
    ) {
        this.isEditMode = data.editMode || false;

        if (this.isEditMode && data.existingField) {
            // Edit mode: create a deep copy of the existing field
            this.field = JSON.parse(JSON.stringify(data.existingField));
        } else {
            // Add mode: create new field with defaults
            this.field = {
                type: data.fieldTypes && data.fieldTypes.length > 0 ? data.fieldTypes[0].name : 'textfield',
                title: '',
                required: false,
                choices: []
            };
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.field.title) {
            this.dialogRef.close(this.field);
        }
    }

    showAddOptions(): boolean {
        return this.field.type === 'radio' ||
            this.field.type === 'dropdown' ||
            this.field.type === 'multiselectdropdown';
    }

    addOption(optionTitle: string): void {
        if (!optionTitle || !optionTitle.trim()) {
            return;
        }

        if (!this.field.choices) {
            this.field.choices = [];
        }

        const maxChoiceId = this.field.choices.length > 0
            ? Math.max(...this.field.choices.map(c => c.id || 0))
            : 0;
        const choiceId = maxChoiceId + 1;

        this.field.choices.push({
            id: choiceId,
            title: optionTitle,
            value: this.field.choices.length
        });

        this.newOptionTitle = '';
    }

    deleteOption(option: any): void {
        if (!this.field.choices) return;

        const index = this.field.choices.findIndex(c => c.id === option.id);
        if (index !== -1) {
            this.field.choices.splice(index, 1);
        }
    }

    moveOptionUp(option: any): void {
        if (!this.field.choices) return;

        const index = this.field.choices.findIndex(c => c.id === option.id);
        if (index > 0) {
            const temp = this.field.choices[index];
            this.field.choices[index] = this.field.choices[index - 1];
            this.field.choices[index - 1] = temp;
            // Update values to reflect new order
            this.field.choices.forEach((choice, idx) => choice.value = idx);
        }
    }

    moveOptionDown(option: any): void {
        if (!this.field.choices) return;

        const index = this.field.choices.findIndex(c => c.id === option.id);
        if (index < this.field.choices.length - 1 && index !== -1) {
            const temp = this.field.choices[index];
            this.field.choices[index] = this.field.choices[index + 1];
            this.field.choices[index + 1] = temp;
            // Update values to reflect new order
            this.field.choices.forEach((choice, idx) => choice.value = idx);
        }
    }

    toggleAttachmentTypeRestriction(): void {
        if (this.field.allowedAttachmentTypes && this.field.allowedAttachmentTypes.length > 0) {
            this.field.allowedAttachmentTypes = [];
        } else {
            this.field.allowedAttachmentTypes = this.data.attachmentAllowedTypes.map(type => type.name);
        }
    }

    isAttachmentTypeSelected(typeName: string): boolean {
        return this.field.allowedAttachmentTypes?.includes(typeName) || false;
    }

    toggleAttachmentType(typeName: string, checked: boolean): void {
        if (!this.field.allowedAttachmentTypes) {
            this.field.allowedAttachmentTypes = [];
        }

        if (checked) {
            if (!this.field.allowedAttachmentTypes.includes(typeName)) {
                this.field.allowedAttachmentTypes.push(typeName);
            }
        } else {
            this.field.allowedAttachmentTypes = this.field.allowedAttachmentTypes.filter(t => t !== typeName);
        }
    }
}
