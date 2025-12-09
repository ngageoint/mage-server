import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventsService } from '../events.service';
import { Event } from 'src/app/filter/filter.types';
import { Field } from '../helpers/observation-feed-helper';
import { deriveUserFieldNames, prepareFormPayload } from '../helpers/form-field-utils';

/**
 * Dialog component for creating new forms for an event.
 * Provides a form interface with validation for form name, description, color, and optional form archive upload.
 */
@Component({
    selector: 'mage-create-form',
    templateUrl: './create-form.component.html',
    styleUrls: ['./create-form.component.scss']
})
export class CreateFormDialogComponent {
    formGroup: FormGroup;
    errorMessage: string = '';
    selectedFile: File | null = null;
    currentStep: number = 1;
    createdFields: Field[] = [];
    createdUserFields: string[] = [];
    saving: boolean = false;

    fieldTypes = [
        { name: 'textfield', title: 'Text' },
        { name: 'textarea', title: 'Text Area' },
        { name: 'numberfield', title: 'Number' },
        { name: 'email', title: 'Email' },
        { name: 'date', title: 'Date' },
        { name: 'checkbox', title: 'Checkbox' },
        { name: 'radio', title: 'Radio Buttons' },
        { name: 'dropdown', title: 'Select' },
        { name: 'geometry', title: 'Location' },
        { name: 'attachment', title: 'Attachment' },
        { name: 'userDropdown', title: 'User Select' },
        { name: 'hidden', title: 'Hidden' }
    ];

    attachmentAllowedTypes = [
        { name: 'image', title: 'Image' },
        { name: 'video', title: 'Video' },
        { name: 'audio', title: 'Audio' }
    ];

    constructor(
        public dialogRef: MatDialogRef<CreateFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { event: Event },
        private fb: FormBuilder,
        private eventsService: EventsService
    ) {
        const randomColor = '#' + ('000000' + Math.floor(Math.random() * 0xFFFFFF).toString(16)).slice(-6);

        this.formGroup = this.fb.group({
            name: ['', [Validators.required]],
            description: [''],
            color: [randomColor, [Validators.required, Validators.pattern(/^#[0-9A-F]{6}$/i)]]
        });
    }

    /**
     * Handles file selection from the file input
     */
    onFileSelected(event: any): void {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            this.selectedFile = target.files[0];
        }
    }

    /**
     * Proceeds to the next step or saves the form
     */
    next(): void {
        if (this.currentStep === 1) {
            if (this.formGroup.invalid) {
                this.errorMessage = 'Please fill in all required fields correctly.';
                Object.keys(this.formGroup.controls).forEach(key => {
                    this.formGroup.get(key)?.markAsTouched();
                });
                return;
            }
            this.errorMessage = '';
            if (this.selectedFile) {
                this.createFormWithFile();
            } else {
                this.currentStep = 2;
            }
        }
    }

    /**
     * Creates a form with an uploaded file
     */
    private createFormWithFile(): void {
        this.saving = true;
        const formData = new FormData();
        formData.append('form', this.selectedFile!);
        formData.append('name', this.formGroup.value.name);
        formData.append('description', this.formGroup.value.description || '');
        formData.append('color', this.formGroup.value.color);

        this.eventsService.createForm(String(this.data.event.id), formData).subscribe({
            next: (newForm) => {
                this.saving = false;
                this.dialogRef.close(newForm);
            },
            error: (err) => {
                this.saving = false;
                this.errorMessage = err.error || 'Failed to create form. Please try again.';
            }
        });
    }

    /**
     * Goes back to the previous step
     */
    back(): void {
        if (this.currentStep === 2) {
            this.currentStep = 1;
        }
    }

    /**
     * Handles changes to the fields list from the fields-list component
     */
    onFieldsChange(fields: Field[]): void {
        this.createdFields = fields;
        this.createdUserFields = deriveUserFieldNames(this.createdFields);
    }

    /**
     * Handles form submission for creating a new form.
     * Validates the form, creates the form via the events service with fields, and closes the dialog on success.
     */
    save(): void {
        if (this.createdFields.length === 0) {
            this.errorMessage = 'Please add at least one field to the form.';
            return;
        }
        this.errorMessage = '';
        this.saving = true;

        const payloadBase = {
            name: this.formGroup.value.name,
            description: this.formGroup.value.description || '',
            color: this.formGroup.value.color,
            archived: false,
            fields: this.createdFields,
            userFields: this.createdUserFields
        };

        const formPayload = prepareFormPayload(payloadBase);

        this.eventsService.createForm(String(this.data.event.id), formPayload).subscribe({
            next: (newForm) => {
                this.saving = false;
                this.dialogRef.close(newForm);
            },
            error: (err) => {
                this.saving = false;
                this.errorMessage = err.error?.message || err.error || 'Failed to create form. Please try again.';
            }
        });
    }

    /**
     * Closes the dialog without saving any data or making any changes.
     */
    cancel(): void {
        this.dialogRef.close();
    }

    /**
     * Checks if a form field has an error and has been touched
     */
    hasError(fieldName: string, errorType: string): boolean {
        const field = this.formGroup.get(fieldName);
        return !!(field && field.hasError(errorType) && field.touched);
    }
}
