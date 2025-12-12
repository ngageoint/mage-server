import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventsService } from '../events.service';
import { Event } from 'src/app/filter/filter.types';

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

    constructor(
        public dialogRef: MatDialogRef<CreateFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { event: Event },
        private fb: FormBuilder,
        private eventsService: EventsService
    ) {
        // Generate random color for the form
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
     * Handles form submission for creating a new form.
     * Validates the form, creates the form via the events service, and closes the dialog on success.
     */
    save(): void {
        if (this.formGroup.invalid) {
            this.errorMessage = 'Please fill in all required fields correctly.';
            Object.keys(this.formGroup.controls).forEach(key => {
                this.formGroup.get(key)?.markAsTouched();
            });
            return;
        }

        this.errorMessage = '';

        // If a file is selected, upload it with the form data
        if (this.selectedFile) {
            const formData = new FormData();
            formData.append('form', this.selectedFile);
            formData.append('name', this.formGroup.value.name);
            formData.append('description', this.formGroup.value.description || '');
            formData.append('color', this.formGroup.value.color);

            this.eventsService.createForm(String(this.data.event.id), formData).subscribe({
                next: (newForm) => {
                    this.dialogRef.close(newForm);
                },
                error: (err) => {
                    this.errorMessage = err.error || 'Failed to create form. Please try again.';
                }
            });
        } else {
            // If no file, just close with the form data (to be handled by the parent component)
            this.dialogRef.close(this.formGroup.value);
        }
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
