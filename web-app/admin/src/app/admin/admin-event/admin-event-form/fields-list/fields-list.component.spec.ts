import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog as MatDialog, MatDialogRef as MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { FieldsListComponent } from './fields-list.component';
import { Field } from '../../helpers/observation-feed-helper';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('FieldsListComponent', () => {
    let component: FieldsListComponent;
    let fixture: ComponentFixture<FieldsListComponent>;
    let mockDialog: jasmine.SpyObj<MatDialog>;

    beforeEach(waitForAsync(() => {
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

        TestBed.configureTestingModule({
            imports: [FieldsListComponent],
            providers: [
                { provide: MatDialog, useValue: mockDialog }
            ],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(FieldsListComponent);
        component = fixture.componentInstance;
        component.fields = [];
        component.fieldTypes = [];
        component.attachmentAllowedTypes = [];
        component.userFields = [];
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('addField', () => {
        it('should assign name using field{id} format', () => {
            const dialogResult: Field = { title: 'Description', type: 'textarea', required: false };
            const dialogRef = { afterClosed: () => of(dialogResult) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            expect(component.fields.length).toBe(1);
            expect(component.fields[0].name).toBe('field0');
        });

        it('should not use lowercase title as field name', () => {
            const dialogResult: Field = { title: 'My Custom Field', type: 'textfield', required: true };
            const dialogRef = { afterClosed: () => of(dialogResult) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            expect(component.fields[0].name).not.toBe('my_custom_field');
            expect(component.fields[0].name).not.toBe('my custom field');
            expect(component.fields[0].name).toBe('field0');
        });

        it('should assign sequential field{id} names for multiple fields', () => {
            const fields: Field[] = [
                { title: 'Type', type: 'dropdown', required: true },
                { title: 'Description', type: 'textarea', required: false },
                { title: 'Priority', type: 'radio', required: true }
            ];

            fields.forEach(fieldData => {
                const dialogRef = { afterClosed: () => of({ ...fieldData }) } as MatDialogRef<any>;
                mockDialog.open.and.returnValue(dialogRef);
                component.addField();
            });

            expect(component.fields.length).toBe(3);
            expect(component.fields[0].name).toBe('field0');
            expect(component.fields[1].name).toBe('field1');
            expect(component.fields[2].name).toBe('field2');
        });

        it('should assign unique names even when titles are identical', () => {
            const dialogResult1: Field = { title: 'Type', type: 'dropdown', required: true };
            const dialogResult2: Field = { title: 'Type', type: 'dropdown', required: true };

            let dialogRef = { afterClosed: () => of({ ...dialogResult1 }) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);
            component.addField();

            dialogRef = { afterClosed: () => of({ ...dialogResult2 }) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);
            component.addField();

            expect(component.fields[0].name).toBe('field0');
            expect(component.fields[1].name).toBe('field1');
            expect(component.fields[0].name).not.toBe(component.fields[1].name);
        });

        it('should match field{id} pattern for all added fields', () => {
            const fieldPattern = /^field\d+$/;

            for (let i = 0; i < 5; i++) {
                const dialogRef = {
                    afterClosed: () => of({ title: `Field ${i}`, type: 'textfield', required: false })
                } as MatDialogRef<any>;
                mockDialog.open.and.returnValue(dialogRef);
                component.addField();
            }

            component.fields.forEach(field => {
                expect(field.name).toMatch(fieldPattern);
                expect(field.name).toBe('field' + field.id);
            });
        });

        it('should assign id before setting name', () => {
            const dialogRef = {
                afterClosed: () => of({ title: 'Test', type: 'textfield', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            const field = component.fields[0];
            expect(field.id).toBeDefined();
            expect(field.name).toBe('field' + field.id);
        });

        it('should use next available id when fields already exist', () => {
            component.fields = [
                { id: 0, name: 'field0', title: 'Existing', type: 'textfield', required: false }
            ];

            const dialogRef = {
                afterClosed: () => of({ title: 'New Field', type: 'textarea', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            expect(component.fields.length).toBe(2);
            expect(component.fields[1].id).toBe(1);
            expect(component.fields[1].name).toBe('field1');
        });

        it('should handle gap in field ids', () => {
            component.fields = [
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 5, name: 'field5', title: 'Fifth', type: 'textfield', required: false }
            ];

            const dialogRef = {
                afterClosed: () => of({ title: 'New', type: 'textfield', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            expect(component.fields[2].id).toBe(6);
            expect(component.fields[2].name).toBe('field6');
        });

        it('should not add field when dialog is cancelled', () => {
            const dialogRef = { afterClosed: () => of(undefined) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            expect(component.fields.length).toBe(0);
        });

        it('should emit fieldsChange when field is added', () => {
            spyOn(component.fieldsChange, 'emit');

            const dialogRef = {
                afterClosed: () => of({ title: 'Test', type: 'textfield', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            expect(component.fieldsChange.emit).toHaveBeenCalledWith(component.fields);
        });
    });

    describe('getNextFieldId', () => {
        it('should return 0 for empty fields', () => {
            component.fields = [];

            const dialogRef = {
                afterClosed: () => of({ title: 'First', type: 'textfield', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            expect(component.fields[0].id).toBe(0);
            expect(component.fields[0].name).toBe('field0');
        });
    });

    describe('removeField', () => {
        it('should remove field and emit change', () => {
            component.fields = [
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false }
            ];
            spyOn(component.fieldsChange, 'emit');

            component.removeField(component.fields[0]);

            expect(component.fields.length).toBe(1);
            expect(component.fields[0].name).toBe('field1');
            expect(component.fieldsChange.emit).toHaveBeenCalled();
        });
    });

    describe('editField', () => {
        it('should preserve field name and id when editing', () => {
            component.fields = [
                { id: 0, name: 'field0', title: 'Original', type: 'textfield', required: false }
            ];

            const editResult: Field = { title: 'Updated Title', type: 'textarea', required: true };
            const dialogRef = { afterClosed: () => of(editResult) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.editField(component.fields[0]);

            expect(component.fields[0].id).toBe(0);
            expect(component.fields[0].name).toBe('field0');
            expect(component.fields[0].title).toBe('Updated Title');
        });
    });
});
