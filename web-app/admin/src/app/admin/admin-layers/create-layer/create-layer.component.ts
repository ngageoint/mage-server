import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LayersService, Layer } from '../layers.service';

/**
 * Dialog component for creating new layers.
 * Provides a form interface with validation for layer name (required) and description (optional).
 */
@Component({
    selector: 'mage-admin-layer-create',
    templateUrl: './create-layer.component.html',
    styleUrls: ['./create-layer.component.scss']
})
export class CreateLayerDialogComponent {
    layerForm: FormGroup;
    errorMessage: string = '';
    geopackageFile: File | null = null;
    geopackageFileName: string = '';

    constructor(
        public dialogRef: MatDialogRef<CreateLayerDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { layer: Partial<Layer> },
        private fb: FormBuilder,
        private layersService: LayersService
    ) {
        this.layerForm = this.fb.group({
            name: [data.layer?.name ?? '', [Validators.required]],
            type: [data.layer?.type ?? '', [Validators.required]],
            description: [data.layer?.description ?? ''],
            // Imagery fields
            url: [''],
            format: ['XYZ'],
            base: [false]
        });
    }

    /**
     * Handles layer type change to add/remove validators and reset fields
     */
    onTypeChange(): void {
        const type = this.layerForm.get('type')?.value;
        const urlControl = this.layerForm.get('url');
        const formatControl = this.layerForm.get('format');
        const baseControl = this.layerForm.get('base');

        // Reset conditional fields
        urlControl?.clearValidators();
        urlControl?.setValue('');
        formatControl?.setValue('XYZ');
        baseControl?.setValue(false);
        this.geopackageFile = null;
        this.geopackageFileName = '';

        // Add validators based on layer type
        if (type === 'Imagery') {
            urlControl?.setValidators([Validators.required]);
        }

        // Update validity
        urlControl?.updateValueAndValidity();
    }

    /**
     * Handles GeoPackage file selection
     */
    onGeoPackageFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.geopackageFile = input.files[0];
            this.geopackageFileName = this.geopackageFile.name;
        }
    }

    /**
     * Handles form submission for creating a new layer.
     * Validates the form, creates the layer via the layers service, and closes the dialog on success.
     */
    save(): void {
        if (this.layerForm.invalid) {
            this.errorMessage = 'Please fill in all required fields.';
            return;
        }

        // Validate GeoPackage file
        if (this.layerForm.get('type')?.value === 'GeoPackage' && !this.geopackageFile) {
            this.errorMessage = 'Please select a GeoPackage file.';
            return;
        }

        this.errorMessage = '';
        const formValue = this.layerForm.value;
        const layerData: any = {
            name: formValue.name,
            type: formValue.type,
            description: formValue.description
        };

        // Add type-specific fields
        if (formValue.type === 'Imagery') {
            layerData.url = formValue.url;
            layerData.format = formValue.format;
            layerData.base = formValue.base;
        } else if (formValue.type === 'GeoPackage' && this.geopackageFile) {
            layerData.geopackage = this.geopackageFile;
        }

        this.layersService.createLayer(layerData).subscribe({
            next: (newLayer) => {
                this.dialogRef.close(newLayer);
            },
            error: (err) => {
                if (err.status === 400 && err.error?.errors) {
                    const fieldErrors = err.error.errors;
                    if (fieldErrors.name?.type === 'unique') {
                        this.errorMessage = fieldErrors.name.message;
                    } else {
                        this.errorMessage = err.error.message ?? 'Validation failed';
                    }
                } else if (err.status === 409) {
                    this.errorMessage = err.error;
                } else {
                    this.errorMessage = 'Failed to create layer. Please try again.';
                }
            }
        });
    }

    /**
     * Closes the dialog without saving any data or making any changes.
     */
    cancel(): void {
        this.dialogRef.close();
    }
}
