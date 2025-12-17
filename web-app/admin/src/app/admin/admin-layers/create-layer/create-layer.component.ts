import { Component, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { LayersService, Layer } from '../layers.service';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, first } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ImageryLayerConfig } from '../imagery-layer-settings/imagery-layer-settings.component';

/**
 * Dialog component for creating new layers.
 * Provides a form interface with validation for layer name (required) and description (optional).
 */
@Component({
    selector: 'mage-admin-layer-create',
    templateUrl: './create-layer.component.html',
    styleUrls: ['./create-layer.component.scss']
})
export class CreateLayerDialogComponent implements AfterViewInit {
    layerForm: FormGroup;
    errorMessage: string = '';
    geopackageFile: File | null = null;
    geopackageFileName: string = '';

    // Imagery layer configuration for the helper component
    imageryConfig: ImageryLayerConfig = {
        url: '',
        format: 'XYZ',
        wmsVersion: '1.3.0',
        wmsTransparent: true,
        wmsStyles: ''
    };
    selectedWmsLayersString: string = '';

    constructor(
        public dialogRef: MatDialogRef<CreateLayerDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { layer: Partial<Layer> },
        private fb: FormBuilder,
        private layersService: LayersService,
        private http: HttpClient
    ) {
        this.layerForm = this.fb.group({
            name: [
                data.layer?.name ?? '',
                [Validators.required],
                [this.duplicateLayerNameValidator()]
            ],
            type: [data.layer?.type ?? '', [Validators.required]],
            description: [data.layer?.description ?? ''],
            base: [false]
        });
    }
    ngAfterViewInit(): void {
        throw new Error('Method not implemented.');
    }

    /**
     * Async validator to check if a layer name already exists
     */
    private duplicateLayerNameValidator(): AsyncValidatorFn {
        return (control: AbstractControl): Observable<ValidationErrors | null> => {
            if (!control.value) {
                return of(null);
            }

            return this.layersService.getLayers().pipe(
                debounceTime(300),
                map(layers => {
                    const nameExists = layers.some(
                        layer => layer.name?.toLowerCase() === control.value.toLowerCase()
                    );
                    return nameExists ? { duplicateName: true } : null;
                }),
                catchError(() => of(null)),
                first()
            );
        };
    }

    /**
     * Handles layer type change to reset fields
     */
    onTypeChange(): void {
        const type = this.layerForm.get('type')?.value;

        this.imageryConfig = {
            url: '',
            format: 'XYZ',
            wmsVersion: '1.3.0',
            wmsTransparent: true,
            wmsStyles: ''
        };
        this.selectedWmsLayersString = '';
        this.geopackageFile = null;
        this.geopackageFileName = '';
    }

    /**
     * Handles GeoPackage file selection
     */
    onGeoPackageFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length > 0) {
            this.geopackageFile = input.files[0];
            this.geopackageFileName = this.geopackageFile.name;
        }
    }

    /**
     * Handles imagery config changes from the helper component
     */
    onImageryConfigChange(config: ImageryLayerConfig): void {
        this.imageryConfig = config;
    }

    /**
     * Handles WMS layer selection changes from the helper component
     */
    onWmsLayersSelected(layers: string): void {
        this.selectedWmsLayersString = layers;
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

        if (this.layerForm.get('type')?.value === 'GeoPackage' && !this.geopackageFile) {
            this.errorMessage = 'Please select a GeoPackage file.';
            return;
        }

        if (this.layerForm.get('type')?.value === 'Imagery' && !this.imageryConfig.url) {
            this.errorMessage = 'Please enter a layer URL.';
            return;
        }

        this.errorMessage = '';
        const formValue = this.layerForm.value;

        let layerData: any;

        if (formValue.type === 'GeoPackage' && this.geopackageFile) {
            const formData = new FormData();
            formData.append('name', formValue.name);
            formData.append('type', formValue.type);
            if (formValue.description) {
                formData.append('description', formValue.description);
            }
            formData.append('geopackage', this.geopackageFile);
            layerData = formData;
        } else {
            layerData = {
                name: formValue.name,
                type: formValue.type,
                description: formValue.description
            };

            if (formValue.type === 'Imagery') {
                layerData.url = this.imageryConfig.url;
                layerData.format = this.imageryConfig.format;
                layerData.base = formValue.base;

                if (this.imageryConfig.format === 'WMS') {
                    layerData.wms = {
                        layers: this.selectedWmsLayersString || '',
                        version: this.imageryConfig.wmsVersion,
                        transparent: this.imageryConfig.wmsTransparent,
                        format: this.imageryConfig.wmsTransparent ? 'image/png' : 'image/jpeg',
                        styles: this.imageryConfig.wmsStyles || ''
                    };
                }
            }
        }

        this.layersService.createLayer(layerData).subscribe({
            next: (newLayer) => {
                this.dialogRef.close(newLayer);
            },
            error: ({ status, error }) => {
                if (status === 400 && error?.errors) {
                    const fieldErrors = error.errors;
                    if (fieldErrors.name?.type === 'unique') {
                        this.errorMessage = fieldErrors.name.message;
                    } else {
                        this.errorMessage = error.message ?? 'Validation failed';
                    }
                } else if (status === 409) {
                    this.errorMessage = error;
                } else {
                    this.errorMessage = 'Failed to create layer. Please try again.';
                }
            }
        });
    }

    /**
     * Checks if the save button should be disabled
     */
    get canSave(): boolean {
        const nameControl = this.layerForm.get('name');
        const typeControl = this.layerForm.get('type');

        if (!nameControl?.value || !typeControl?.value) {
            return true;
        }
        if (typeControl.value === 'GeoPackage' && !this.geopackageFile) {
            return true;
        }
        if (typeControl.value === 'Imagery' && !this.imageryConfig.url) {
            return true;
        }

        return this.layerForm.invalid;
    }

    /**
     * Closes the dialog without saving any data or making any changes.
     */
    cancel(): void {
        this.dialogRef.close();
    }
}
