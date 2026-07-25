import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  MatDialogModule as MatDialogModule,
  MatDialogRef as MatDialogRef,
  MAT_DIALOG_DATA as MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { HttpEventType } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, of, throwError } from 'rxjs';

import { CreateLayerDialogComponent } from './create-layer.component';
import { LayersService } from '../layers.service';

describe('CreateLayerDialogComponent', () => {
  let component: CreateLayerDialogComponent;
  let fixture: ComponentFixture<CreateLayerDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CreateLayerDialogComponent>>;
  let layersServiceSpy: jasmine.SpyObj<LayersService>;

  function createComponent(data: { layer: any } = { layer: {} }) {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    layersServiceSpy = jasmine.createSpyObj('LayersService', [
      'getLayers',
      'createLayer',
      'updateLayer'
    ]);
    layersServiceSpy.getLayers.and.returnValue(of([]));

    TestBed.configureTestingModule({
      declarations: [CreateLayerDialogComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [
        ReactiveFormsModule,
        FormsModule,
        MatDialogModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatCheckboxModule,
        MatProgressBarModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: LayersService, useValue: layersServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateLayerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillGeoPackageForm() {
    component.layerForm.patchValue({ name: 'My Layer', type: 'GeoPackage' });
    component.geopackageFile = new File(['content'], 'test.gpkg');
    component.geopackageFileName = 'test.gpkg';
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  describe('save with GeoPackage upload', () => {
    beforeEach(() => createComponent());

    it('should set uploading state and reset progress to 0 when the request starts', () => {
      fillGeoPackageForm();
      layersServiceSpy.createLayer.and.returnValue(new Subject());

      component.save();

      expect(component.uploading).toBeTrue();
      expect(component.uploadProgress).toBe(0);
      expect(component.canSave).toBeTrue();
    });

    it('should update uploadProgress as UploadProgress events arrive', () => {
      fillGeoPackageForm();
      const events = new Subject<any>();
      layersServiceSpy.createLayer.and.returnValue(events);

      component.save();

      events.next({ type: HttpEventType.UploadProgress, loaded: 25, total: 100 });
      expect(component.uploadProgress).toBe(25);

      events.next({ type: HttpEventType.UploadProgress, loaded: 75, total: 100 });
      expect(component.uploadProgress).toBe(75);
    });

    it('should set uploadProgress to null when total is unknown', () => {
      fillGeoPackageForm();
      const events = new Subject<any>();
      layersServiceSpy.createLayer.and.returnValue(events);

      component.save();

      events.next({ type: HttpEventType.UploadProgress, loaded: 25, total: undefined });
      expect(component.uploadProgress).toBeNull();
    });

    it('should close the dialog with the created layer on Response and clear uploading', () => {
      fillGeoPackageForm();
      const events = new Subject<any>();
      layersServiceSpy.createLayer.and.returnValue(events);

      component.save();

      const newLayer = { id: 1, name: 'My Layer', type: 'GeoPackage' };
      events.next({ type: HttpEventType.Response, body: newLayer });

      expect(component.uploading).toBeFalse();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(newLayer);
    });

    it('should show a unique-name error on 400 with a name validation error', () => {
      fillGeoPackageForm();
      layersServiceSpy.createLayer.and.returnValue(
        throwError(() => ({
          status: 400,
          error: { errors: { name: { type: 'unique', message: 'Name already in use' } } }
        }))
      );

      component.save();

      expect(component.uploading).toBeFalse();
      expect(component.uploadProgress).toBeNull();
      expect(component.errorMessage).toBe('Name already in use');
    });

    it('should show the server message on 409 conflict', () => {
      fillGeoPackageForm();
      layersServiceSpy.createLayer.and.returnValue(
        throwError(() => ({ status: 409, error: 'Layer name conflict' }))
      );

      component.save();

      expect(component.errorMessage).toBe('Layer name conflict');
    });

    it('should show a generic error for unexpected failures', () => {
      fillGeoPackageForm();
      layersServiceSpy.createLayer.and.returnValue(
        throwError(() => ({ status: 500, error: {} }))
      );

      component.save();

      expect(component.errorMessage).toBe('Failed to create layer. Please try again.');
    });

    it('should require a GeoPackage file before saving', () => {
      component.layerForm.patchValue({ name: 'My Layer', type: 'GeoPackage' });
      component.geopackageFile = null;

      component.save();

      expect(component.errorMessage).toBe('Please select a GeoPackage file.');
      expect(layersServiceSpy.createLayer).not.toHaveBeenCalled();
    });
  });

  describe('canSave', () => {
    beforeEach(() => createComponent());

    it('should be disabled while an upload is in progress', () => {
      fillGeoPackageForm();
      expect(component.canSave).toBeFalse();

      component.uploading = true;
      expect(component.canSave).toBeTrue();
    });
  });
});
