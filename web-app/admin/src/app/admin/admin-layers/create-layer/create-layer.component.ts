import { Component, Inject } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn,
  ReactiveFormsModule
} from '@angular/forms';
import { LayersService, Layer } from '../layers.service';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, first } from 'rxjs/operators';
import { ImageryLayerConfig, ImageryLayerSettingsComponent } from '../imagery-layer-settings/imagery-layer-settings.component';

@Component({
  selector: 'mage-admin-layer-create',
  standalone: true,
  imports: [ReactiveFormsModule, ImageryLayerSettingsComponent],
  templateUrl: './create-layer.component.html',
  styleUrls: ['./create-layer.component.scss']
})
export class CreateLayerDialogComponent {
  layerForm: FormGroup;
  errorMessage = '';
  geopackageFile: File | null = null;
  geopackageFileName = '';

  imageryConfig: ImageryLayerConfig = {
    url: '',
    format: 'XYZ',
    wmsVersion: '1.3.0',
    wmsTransparent: true,
    wmsStyles: ''
  };

  selectedWmsLayersString = '';

  constructor(
    public dialogRef: MatDialogRef<CreateLayerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { layer: Partial<Layer> },
    private fb: FormBuilder,
    private layersService: LayersService
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

  private duplicateLayerNameValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value;
      if (!value) return of(null);

      return this.layersService.getLayers().pipe(
        debounceTime(300),
        map((layers) => {
          const needle = String(value).toLowerCase();
          const nameExists = (layers ?? []).some(
            (layer) => (layer.name ?? '').toLowerCase() === needle
          );
          return nameExists ? { duplicateName: true } : null;
        }),
        catchError(() => of(null)),
        first()
      );
    };
  }

  onTypeChange(): void {
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

  onGeoPackageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const file = files.item(0);
    if (!file) return;

    this.geopackageFile = file;
    this.geopackageFileName = file.name;
  }

  onImageryConfigChange(config: ImageryLayerConfig): void {
    this.imageryConfig = config;
  }

  onWmsLayersSelected(layers: string): void {
    this.selectedWmsLayersString = layers;
  }

  save(): void {
    if (this.layerForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    const type = this.layerForm.get('type')?.value;

    if (type === 'GeoPackage' && !this.geopackageFile) {
      this.errorMessage = 'Please select a GeoPackage file.';
      return;
    }

    if (type === 'Imagery' && !this.imageryConfig.url) {
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
            format: this.imageryConfig.wmsTransparent
              ? 'image/png'
              : 'image/jpeg',
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

  get canSave(): boolean {
    const nameControl = this.layerForm.get('name');
    const typeControl = this.layerForm.get('type');

    if (!nameControl?.value || !typeControl?.value) return true;

    if (typeControl.value === 'GeoPackage' && !this.geopackageFile) return true;

    if (typeControl.value === 'Imagery' && !this.imageryConfig.url) return true;

    return this.layerForm.invalid;
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
