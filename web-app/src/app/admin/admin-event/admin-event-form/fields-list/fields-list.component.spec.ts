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

    // `fields` is a signal input, so the component no longer mutates it in
    // place — it emits the next array via `fieldsChange` and relies on the
    // parent to pass it back down. This mirrors that round-trip for tests.
    function setFields(fields: Field[]): void {
        fixture.componentRef.setInput('fields', fields);
        fixture.detectChanges();
    }

    function latestEmittedFields(): Field[] {
        const calls = (component.fieldsChange.emit as jasmine.Spy).calls;
        return calls.mostRecent().args[0];
    }

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
        setFields([]);
        fixture.componentRef.setInput('fieldTypes', []);
        fixture.componentRef.setInput('attachmentAllowedTypes', []);
        fixture.componentRef.setInput('userFields', []);
        spyOn(component.fieldsChange, 'emit').and.callThrough();
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

            const fields = latestEmittedFields();
            expect(fields.length).toBe(1);
            expect(fields[0].name).toBe('field0');
        });

        it('should not use lowercase title as field name', () => {
            const dialogResult: Field = { title: 'My Custom Field', type: 'textfield', required: true };
            const dialogRef = { afterClosed: () => of(dialogResult) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            const fields = latestEmittedFields();
            expect(fields[0].name).not.toBe('my_custom_field');
            expect(fields[0].name).not.toBe('my custom field');
            expect(fields[0].name).toBe('field0');
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
                setFields(latestEmittedFields());
            });

            const result = latestEmittedFields();
            expect(result.length).toBe(3);
            expect(result[0].name).toBe('field0');
            expect(result[1].name).toBe('field1');
            expect(result[2].name).toBe('field2');
        });

        it('should assign unique names even when titles are identical', () => {
            const dialogResult1: Field = { title: 'Type', type: 'dropdown', required: true };
            const dialogResult2: Field = { title: 'Type', type: 'dropdown', required: true };

            let dialogRef = { afterClosed: () => of({ ...dialogResult1 }) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);
            component.addField();
            setFields(latestEmittedFields());

            dialogRef = { afterClosed: () => of({ ...dialogResult2 }) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);
            component.addField();

            const result = latestEmittedFields();
            expect(result[0].name).toBe('field0');
            expect(result[1].name).toBe('field1');
            expect(result[0].name).not.toBe(result[1].name);
        });

        it('should match field{id} pattern for all added fields', () => {
            const fieldPattern = /^field\d+$/;

            for (let i = 0; i < 5; i++) {
                const dialogRef = {
                    afterClosed: () => of({ title: `Field ${i}`, type: 'textfield', required: false })
                } as MatDialogRef<any>;
                mockDialog.open.and.returnValue(dialogRef);
                component.addField();
                setFields(latestEmittedFields());
            }

            latestEmittedFields().forEach(field => {
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

            const field = latestEmittedFields()[0];
            expect(field.id).toBeDefined();
            expect(field.name).toBe('field' + field.id);
        });

        it('should use next available id when fields already exist', () => {
            setFields([
                { id: 0, name: 'field0', title: 'Existing', type: 'textfield', required: false }
            ]);

            const dialogRef = {
                afterClosed: () => of({ title: 'New Field', type: 'textarea', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            const result = latestEmittedFields();
            expect(result.length).toBe(2);
            expect(result[1].id).toBe(1);
            expect(result[1].name).toBe('field1');
        });

        it('should handle gap in field ids', () => {
            setFields([
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 5, name: 'field5', title: 'Fifth', type: 'textfield', required: false }
            ]);

            const dialogRef = {
                afterClosed: () => of({ title: 'New', type: 'textfield', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            const result = latestEmittedFields();
            expect(result[2].id).toBe(6);
            expect(result[2].name).toBe('field6');
        });

        it('should not add field when dialog is cancelled', () => {
            const dialogRef = { afterClosed: () => of(undefined) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            expect(component.fieldsChange.emit).not.toHaveBeenCalled();
        });

        it('should emit fieldsChange when field is added', () => {
            const dialogRef = {
                afterClosed: () => of({ title: 'Test', type: 'textfield', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            expect(component.fieldsChange.emit).toHaveBeenCalledWith(latestEmittedFields());
        });
    });

    describe('getNextFieldId', () => {
        it('should return 0 for empty fields', () => {
            setFields([]);

            const dialogRef = {
                afterClosed: () => of({ title: 'First', type: 'textfield', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.addField();

            const result = latestEmittedFields();
            expect(result[0].id).toBe(0);
            expect(result[0].name).toBe('field0');
        });
    });

    describe('removeField', () => {
        it('should remove field and emit change', () => {
            setFields([
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false }
            ]);

            component.removeField(component.fields()[0]);

            const result = latestEmittedFields();
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('field1');
            expect(component.fieldsChange.emit).toHaveBeenCalled();
        });
    });

    describe('editField', () => {
        it('should preserve field name and id when editing', () => {
            setFields([
                { id: 0, name: 'field0', title: 'Original', type: 'textfield', required: false }
            ]);

            const editResult: Field = { title: 'Updated Title', type: 'textarea', required: true };
            const dialogRef = { afterClosed: () => of(editResult) } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);

            component.editField(component.fields()[0]);

            const result = latestEmittedFields();
            expect(result[0].id).toBe(0);
            expect(result[0].name).toBe('field0');
            expect(result[0].title).toBe('Updated Title');
        });
    });
});
