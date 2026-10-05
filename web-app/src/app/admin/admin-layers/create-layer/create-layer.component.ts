import { Component, inject, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  FormControlStatus,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn
} from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LayersService, Layer } from '../layers.service';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, first } from 'rxjs/operators';
import { ImageryLayerConfig, ImageryLayerSettingsComponent } from '../imagery-layer-settings/imagery-layer-settings.component';

@Component({
    selector: 'mage-admin-layer-create',
    templateUrl: './create-layer.component.html',
    styleUrls: ['./create-layer.component.scss'],
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatCheckboxModule,
        MatButtonModule,
        MatProgressBarModule,
        ImageryLayerSettingsComponent
    ]
})
export class CreateLayerDialogComponent {
  layerForm: FormGroup;
  formStatus: Signal<FormControlStatus>;
  errorMessage = signal('');
  geopackageFile: File | null = null;
  geopackageFileName = '';
  uploading = signal(false);
  uploadProgress = signal<number | null>(null);

  isEditMode: boolean;

  imageryConfig: ImageryLayerConfig = {
    url: '',
    format: 'XYZ',
    wmsVersion: '1.3.0',
    wmsTransparent: true,
    wmsStyles: ''
  };

  selectedWmsLayersString = '';

  data = inject<{ layer: Partial<Layer> }>(MAT_DIALOG_DATA);

  constructor(
    public dialogRef: MatDialogRef<CreateLayerDialogComponent>,
    private fb: FormBuilder,
    private layersService: LayersService
  ) {
    this.isEditMode = this.data.layer?.id != null;

    this.layerForm = this.fb.group({
      name: [
        this.data.layer?.name ?? '',
        [Validators.required],
        [this.duplicateLayerNameValidator()]
      ],
      type: [this.data.layer?.type ?? '', [Validators.required]],
      description: [this.data.layer?.description ?? ''],
      base: [this.data.layer?.base ?? false]
    });

    this.formStatus = toSignal(this.layerForm.statusChanges, { initialValue: this.layerForm.status });

    if (this.isEditMode) {
      this.layerForm.get('type')?.disable();

      if (this.data.layer?.type === 'Imagery') {
        this.imageryConfig = {
          url: this.data.layer.url || '',
          format: this.data.layer.format || 'XYZ',
          wmsVersion: this.data.layer.wms?.version || '1.3.0',
          wmsTransparent: this.data.layer.wms?.transparent !== false,
          wmsStyles: this.data.layer.wms?.styles || ''
        };

        this.selectedWmsLayersString =
          this.data.layer.format === 'WMS' ? this.data.layer.wms?.layers || '' : '';
      }
    }
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
            (layer) =>
              (layer.name ?? '').toLowerCase() === needle &&
              String(layer.id) !== String(this.data.layer?.id)
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
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    const formValue = this.layerForm.getRawValue();
    const type = formValue.type;

    if (!this.isEditMode && type === 'GeoPackage' && !this.geopackageFile) {
      this.errorMessage.set('Please select a GeoPackage file.');
      return;
    }

    if (type === 'Imagery' && !this.imageryConfig.url) {
      this.errorMessage.set('Please enter a layer URL.');
      return;
    }

    this.errorMessage.set('');

    if (this.isEditMode) {
      this.saveEdit(formValue, type);
      return;
    }

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

    this.uploading.set(true);
    this.uploadProgress.set(0);

    this.layersService.createLayer(layerData).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress.set(
            event.total ? Math.round((100 * event.loaded) / event.total) : null
          );
        } else if (event.type === HttpEventType.Response) {
          this.uploading.set(false);
          this.dialogRef.close(event.body);
        }
      },
      error: ({ status, error }) => {
        this.uploading.set(false);
        this.uploadProgress.set(null);

        if (status === 400 && error?.errors) {
          const fieldErrors = error.errors;
          if (fieldErrors.name?.type === 'unique') {
            this.errorMessage.set(fieldErrors.name.message);
          } else {
            this.errorMessage.set(error.message ?? 'Validation failed');
          }
        } else if (status === 409) {
          this.errorMessage.set(error);
        } else {
          this.errorMessage.set('Failed to create layer. Please try again.');
        }
      }
    });
  }

  private saveEdit(formValue: any, type: string): void {
    const updatedLayer: any = {
      name: formValue.name,
      description: formValue.description,
      type
    };

    if (type === 'Imagery') {
      updatedLayer.url = this.imageryConfig.url;
      updatedLayer.format = this.imageryConfig.format;
      updatedLayer.base = formValue.base;

      if (this.imageryConfig.format === 'WMS') {
        updatedLayer.wms = {
          layers: this.selectedWmsLayersString || '',
          version: this.imageryConfig.wmsVersion,
          transparent: this.imageryConfig.wmsTransparent,
          format: this.imageryConfig.wmsTransparent ? 'image/png' : 'image/jpeg',
          styles: this.imageryConfig.wmsStyles || ''
        };
      }
    }

    this.layersService.updateLayer(String(this.data.layer!.id), updatedLayer).subscribe({
      next: (updated) => {
        this.dialogRef.close(updated);
      },
      error: ({ status, error }) => {
        if (status === 400 && error?.errors) {
          const fieldErrors = error.errors;
          if (fieldErrors.name?.type === 'unique') {
            this.errorMessage.set(fieldErrors.name.message);
          } else {
            this.errorMessage.set(error.message ?? 'Validation failed');
          }
        } else if (status === 409) {
          this.errorMessage.set(error);
        } else {
          this.errorMessage.set('Failed to save layer. Please try again.');
        }
      }
    });
  }

  get canSave(): boolean {
    if (this.uploading()) return true;

    const nameControl = this.layerForm.get('name');
    const type = this.isEditMode
      ? this.data.layer?.type
      : this.layerForm.get('type')?.value;

    if (!nameControl?.value || !type) return true;

    if (!this.isEditMode && type === 'GeoPackage' && !this.geopackageFile) return true;

    if (type === 'Imagery' && !this.imageryConfig.url) return true;

    return this.formStatus() === 'INVALID';
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
