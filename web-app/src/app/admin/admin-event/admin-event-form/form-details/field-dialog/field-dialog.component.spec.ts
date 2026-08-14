import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FieldDialogComponent, FieldDialogData } from './field-dialog.component';

describe('FieldDialogComponent', () => {
  let component: FieldDialogComponent;
  let fixture: ComponentFixture<FieldDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FieldDialogComponent>>;

  function configureWith(data: FieldDialogData) {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      declarations: [FieldDialogComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    fixture = TestBed.createComponent(FieldDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const fieldTypes = [
    { name: 'textfield', title: 'Text Field' },
    { name: 'dropdown', title: 'Dropdown' }
  ];

  describe('creating a new field', () => {

    beforeEach(waitForAsync(() => {
      configureWith({ fieldTypes, attachmentAllowedTypes: [] });
    }));

    it('leaves maxRecent undefined so recent choices are off by default', () => {
      expect(component.field.maxRecent).toBeUndefined();
    });
  });

  describe('editing an existing dropdown field', () => {

    beforeEach(waitForAsync(() => {
      configureWith({
        fieldTypes,
        attachmentAllowedTypes: [],
        editMode: true,
        existingField: {
          id: 1,
          name: 'field1',
          title: 'Field 1',
          type: 'dropdown',
          required: false,
          maxRecent: 3,
          choices: [{ id: 1, title: 'red', value: 0 }, { id: 2, title: 'blue', value: 1 }]
        }
      });
    }));

    it('preserves the existing maxRecent value', () => {
      expect(component.field.maxRecent).toEqual(3);
    });

    it('does not mutate the original existingField data', () => {
      component.field.maxRecent = 10;

      expect(component.data.existingField.maxRecent).toEqual(3);
    });
  });

  describe('editing an existing field with no maxRecent saved yet', () => {

    beforeEach(waitForAsync(() => {
      configureWith({
        fieldTypes,
        attachmentAllowedTypes: [],
        editMode: true,
        existingField: {
          id: 1,
          name: 'field1',
          title: 'Field 1',
          type: 'dropdown',
          required: false,
          choices: []
        }
      });
    }));

    it('leaves maxRecent undefined rather than inventing a default', () => {
      expect(component.field.maxRecent).toBeUndefined();
    });
  });
});
