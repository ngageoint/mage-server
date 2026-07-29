import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Field } from '../../helpers/observation-feed-helper';
import { FieldDialogComponent, FieldDialogData } from '../form-details/field-dialog/field-dialog.component';

export interface FieldType {
    name: string;
    title: string;
}

export interface AttachmentType {
    name: string;
    title: string;
}

@Component({
    selector: 'mage-fields-list',
    templateUrl: './fields-list.component.html',
    styleUrls: ['./fields-list.component.scss'],
    standalone: false
})
export class FieldsListComponent {
    @Input() fields: Field[] = [];
    @Input() fieldTypes: FieldType[] = [];
    @Input() attachmentAllowedTypes: AttachmentType[] = [];
    @Input() userFields: string[] = [];
    @Output() fieldsChange = new EventEmitter<Field[]>();

    constructor(private dialog: MatDialog) { }

    addField(): void {
        const dialogRef = this.dialog.open(FieldDialogComponent, {
            width: '600px',
            data: {
                fieldTypes: this.fieldTypes,
                attachmentAllowedTypes: this.attachmentAllowedTypes,
                editMode: false,
                existingFields: this.fields
            } as FieldDialogData
        });

        dialogRef.afterClosed().subscribe((result: Field | undefined) => {
            if (result) {
                result.id = this.getNextFieldId();
                result.name = 'field' + result.id;
                this.fields.push(result);
                this.fieldsChange.emit(this.fields);
            }
        });
    }

    editField(field: Field): void {
        const dialogRef = this.dialog.open(FieldDialogComponent, {
            width: '600px',
            data: {
                fieldTypes: this.fieldTypes,
                attachmentAllowedTypes: this.attachmentAllowedTypes,
                editMode: true,
                existingField: field,
                isMemberField: this.isMemberField(field),
                existingFields: this.fields
            } as FieldDialogData
        });

        dialogRef.afterClosed().subscribe((result: Field | undefined) => {
            if (result) {
                Object.assign(field, result);
                this.fieldsChange.emit(this.fields);
            }
        });
    }

    removeField(field: Field): void {
        const index = this.fields.findIndex(f => f.id === field.id);
        if (index !== -1) {
            this.fields.splice(index, 1);
        }
        this.fieldsChange.emit(this.fields);
    }

    onDrop(event: CdkDragDrop<Field[]>): void {
        if (event.previousIndex === event.currentIndex) {
            return;
        }

        const activeFields = this.getActiveFields();
        moveItemInArray(activeFields, event.previousIndex, event.currentIndex);

        const archivedFields = this.fields.filter(f => f.archived);
        this.fields = [...activeFields, ...archivedFields];
        this.fieldsChange.emit(this.fields);
    }

    getFieldTypeLabel(type: string, field?: Field): string {
        if (field && this.isMemberField(field)) {
            const userType = this.fieldTypes.find(ft => ft.name === 'userDropdown');
            return userType?.title || 'User Select';
        }

        const lookupType = type === 'multiselectdropdown' ? 'dropdown' : type;
        const fieldType = this.fieldTypes.find(ft => ft.name === lookupType);
        if (fieldType) {
            return fieldType.title;
        }
        return type === 'multiselectdropdown' ? 'Select' : type;
    }

    getActiveFields(): Field[] {
        return this.fields.filter(f => !f.archived);
    }

    showAddOptions(field: Field): boolean {
        return field.type === 'radio' || field.type === 'dropdown' || field.type === 'multiselectdropdown';
    }

    getAttachmentTypesDisplay(field: Field): string {
        if (!field.allowedAttachmentTypes || field.allowedAttachmentTypes.length === 0) {
            return 'All types';
        }
        return field.allowedAttachmentTypes
            .map(type => {
                const attachmentType = this.attachmentAllowedTypes.find(at => at.name === type);
                return attachmentType?.title || type;
            })
            .join(', ');
    }

    isMemberField(field: Field): boolean {
        const isExplicitUserType = field.type === 'userDropdown' || field.type === 'multiSelectUserDropdown';
        return isExplicitUserType || this.userFields.includes(field.name || '');
    }

    private getNextFieldId(): number {
        if (this.fields.length === 0) return 0;
        return Math.max(...this.fields.map(f => f.id || 0)) + 1;
    }

    trackByFieldId(_index: number, field: Field): any {
        return field.id;
    }
}
