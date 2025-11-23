import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Field } from '../form-details/observation-feed-helper';
import { FieldDialogComponent, FieldDialogData } from '../form-details/field-dialog/field-dialog.component';
import { CoreModule } from "admin/src/app/core/core.module";

export interface FieldType {
    name: string;
    title: string;
    hidden?: boolean;
}

export interface AttachmentType {
    name: string;
    title: string;
}

/**
 * Reusable component for managing form fields.
 * Can be used in both create form and edit form contexts.
 */
@Component({
    selector: 'mage-fields-list',
    templateUrl: './fields-list.component.html',
    styleUrls: ['./fields-list.component.scss']
})
export class FieldsListComponent {
    @Input() fields: Field[] = [];
    @Input() fieldTypes: FieldType[] = [];
    @Input() attachmentAllowedTypes: AttachmentType[] = [];
    @Input() showDetailedView: boolean = false;
    @Output() fieldsChange = new EventEmitter<Field[]>();

    constructor(private dialog: MatDialog) { }

    /**
     * Opens dialog to add a new field
     */
    addField(): void {
        const dialogRef = this.dialog.open(FieldDialogComponent, {
            width: '600px',
            data: {
                fieldTypes: this.fieldTypes,
                attachmentAllowedTypes: this.attachmentAllowedTypes,
                editMode: false
            } as FieldDialogData
        });

        dialogRef.afterClosed().subscribe((result: Field | undefined) => {
            if (result) {
                // Generate a unique field name
                const fieldName = result.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                result.name = fieldName;
                result.id = this.getNextFieldId();
                this.fields.push(result);
                this.fieldsChange.emit(this.fields);
            }
        });
    }

    /**
     * Opens dialog to edit an existing field
     */
    editField(field: Field): void {
        const dialogRef = this.dialog.open(FieldDialogComponent, {
            width: '600px',
            data: {
                fieldTypes: this.fieldTypes,
                attachmentAllowedTypes: this.attachmentAllowedTypes,
                editMode: true,
                existingField: field,
                isMemberField: this.isMemberField(field)
            } as FieldDialogData
        });

        dialogRef.afterClosed().subscribe((result: Field | undefined) => {
            if (result) {
                // Update the field in place
                Object.assign(field, result);
                this.fieldsChange.emit(this.fields);
            }
        });
    }

    /**
     * Removes a field from the list (permanently deletes)
     */
    removeField(field: Field): void {
        if (!this.canRemoveField()) {
            return;
        }
        const index = this.fields.findIndex(f => f.id === field.id);
        if (index !== -1) {
            this.fields.splice(index, 1);
        }
        this.fieldsChange.emit(this.fields);
    }

    /**
     * Checks if a field can be removed (must have at least one active field)
     */
    canRemoveField(): boolean {
        return this.showDetailedView && this.getActiveFields().length > 1;
    }

    /**
     * Moves a field up in the list
     */
    moveFieldUp(field: Field): void {
        const activeFields = this.getActiveFields();
        const index = activeFields.findIndex(f => f.id === field.id);
        if (index > 0) {
            // Swap IDs to reorder
            const temp = activeFields[index].id;
            activeFields[index].id = activeFields[index - 1].id;
            activeFields[index - 1].id = temp;
            this.fieldsChange.emit(this.fields);
        }
    }

    /**
     * Moves a field down in the list
     */
    moveFieldDown(field: Field): void {
        const activeFields = this.getActiveFields();
        const index = activeFields.findIndex(f => f.id === field.id);
        if (index >= 0 && index < activeFields.length - 1) {
            // Swap IDs to reorder
            const temp = activeFields[index].id;
            activeFields[index].id = activeFields[index + 1].id;
            activeFields[index + 1].id = temp;
            this.fieldsChange.emit(this.fields);
        }
    }

    /**
     * Handles drag and drop reordering
     */
    onFieldDrop(event: CdkDragDrop<Field[]>): void {
        const activeFields = this.getActiveFields();
        moveItemInArray(activeFields, event.previousIndex, event.currentIndex);

        // Update IDs to reflect new order
        activeFields.forEach((field, index) => {
            field.id = index;
        });

        this.fieldsChange.emit(this.fields);
    }

    /**
     * Handles items reordered from draggable-list component
     */
    onItemsReordered(reorderedFields: Field[]): void {
        // Sync the reordered active fields back to the full fields array
        const archivedFields = this.fields.filter(f => f.archived);
        this.fields = [...reorderedFields, ...archivedFields];
        this.fieldsChange.emit(this.fields);
    }

    /**
     * Gets the display label for a field type
     */
    getFieldTypeLabel(type: string): string {
        const fieldType = this.fieldTypes.find(ft => ft.name === type);
        return fieldType?.title || type;
    }

    /**
     * Gets the icon for a field type
     */
    getFieldTypeIcon(type: string): string {
        const iconMap: { [key: string]: string } = {
            'textfield': 'fa-font',
            'textarea': 'fa-align-left',
            'numberfield': 'fa-hashtag',
            'email': 'fa-envelope',
            'password': 'fa-lock',
            'radio': 'fa-dot-circle-o',
            'dropdown': 'fa-caret-square-o-down',
            'multiselectdropdown': 'fa-list-ul',
            'date': 'fa-calendar',
            'datetime': 'fa-clock-o',
            'geometry': 'fa-map-marker',
            'attachment': 'fa-paperclip',
            'checkbox': 'fa-check-square-o',
            'userDropdown': 'fa-user',
            'multiSelectUserDropdown': 'fa-users'
        };
        return iconMap[type] || 'fa-file-text-o';
    }

    /**
     * Gets active (non-archived) fields
     */
    getActiveFields(): Field[] {
        return this.fields.filter(f => !f.archived);
    }

    /**
     * Checks if field type has options/choices
     */
    showAddOptions(field: Field): boolean {
        return field.type === 'radio' || field.type === 'dropdown' || field.type === 'multiselectdropdown';
    }

    /**
     * Gets display string for allowed attachment types
     */
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

    /**
     * Checks if a field is a member/user field
     */
    isMemberField(field: Field): boolean {
        return field.type === 'userDropdown' || field.type === 'multiSelectUserDropdown';
    }

    /**
     * Gets the next available field ID
     */
    private getNextFieldId(): number {
        if (this.fields.length === 0) return 0;
        return Math.max(...this.fields.map(f => f.id || 0)) + 1;
    }

    /**
     * TrackBy function for ngFor optimization
     */
    trackByFieldId(index: number, field: Field): any {
        return field.id;
    }
}
