import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Field } from '../../../helpers/observation-feed-helper';

export interface FieldDialogData {
    fieldTypes: { name: string; title: string; hidden?: boolean }[];
    attachmentAllowedTypes: { name: string; title: string }[];
    isMemberField?: boolean;
    editMode?: boolean;
    existingField?: Field;
    existingFields?: Field[];
}

export interface FieldResult {
    title: string;
    type: string;
    required: boolean;
    multiselect?: boolean;
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
            this.field = JSON.parse(JSON.stringify(data.existingField));
            const originalType = this.field.type;

            if (data.isMemberField) {
                const wasMultiselect = originalType === 'multiselectdropdown' || !!this.field.multiselect;
                this.field.type = 'userDropdown';
                this.field.multiselect = wasMultiselect;
            } else if (originalType === 'multiselectdropdown') {
                this.field.type = 'dropdown';
                this.field.multiselect = true;
            } else if (originalType === 'multiSelectUserDropdown') {
                this.field.type = 'userDropdown';
                this.field.multiselect = true;
            }
        } else {
            this.field = {
                type: data.fieldTypes && data.fieldTypes.length > 0 ? data.fieldTypes[0].name : 'textfield',
                title: '',
                required: false,
                multiselect: false,
                choices: []
            };
        }

        if (this.field.type === 'attachment') {
            if (!this.field.allowedAttachmentTypes) {
                this.field.allowedAttachmentTypes = [];
            }
        }
    }

    onFieldTypeChange(newType: string): void {
        if (newType === 'attachment') {
            if (!this.field.allowedAttachmentTypes) {
                this.field.allowedAttachmentTypes = [];
            }
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    isFieldNameDuplicate(): boolean {
        if (!this.field.title || !this.data.existingFields) {
            return false;
        }

        const newFieldName = this.field.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        return this.data.existingFields.some(f => {
            if (this.isEditMode && f.id === this.data.existingField?.id) {
                return false;
            }
            const existingName = f.name || (f.title || "").toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            return existingName === newFieldName;
        });
    }

    canSave(): boolean {
        if (!this.field.title) {
            return false;
        }
        if (this.isFieldNameDuplicate()) {
            return false;
        }
        return true;
    }

    hasNoAttachmentTypes(): boolean {
        return this.field.type === 'attachment' &&
            (!this.field.allowedAttachmentTypes || this.field.allowedAttachmentTypes.length === 0);
    }

    onSave(): void {
        if (this.canSave()) {
            this.dialogRef.close(this.field);
        }
    }

    showAddOptions(): boolean {
        return this.field.type === 'radio' || this.field.type === 'dropdown';
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
            this.field.choices.forEach((choice, idx) => choice.value = idx);
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

    toggleDefaultValue(choiceTitle: string, checked: boolean): void {
        if (!Array.isArray(this.field.value)) {
            this.field.value = [];
        }

        if (checked) {
            if (!this.field.value.includes(choiceTitle)) {
                this.field.value.push(choiceTitle);
            }
        } else {
            this.field.value = this.field.value.filter((v: string) => v !== choiceTitle);
        }
    }
}
