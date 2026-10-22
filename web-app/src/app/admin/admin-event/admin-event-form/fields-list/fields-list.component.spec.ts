import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog as MatDialog, MatDialogRef as MatDialogRef } from '@angular/material/dialog';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
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
            declarations: [FieldsListComponent],
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

    describe('onDrop', () => {
        function drop(previousIndex: number, currentIndex: number): void {
            component.onDrop({ previousIndex, currentIndex } as CdkDragDrop<Field[]>);
        }

        function activeNamesInIdOrder(): string[] {
            return component.getActiveFields().map(f => f.name || '');
        }

        it('should list active fields in id order regardless of array order', () => {
            component.fields = [
                { id: 2, name: 'field2', title: 'Third', type: 'textfield', required: false },
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false }
            ];

            expect(activeNamesInIdOrder()).toEqual(['field0', 'field1', 'field2']);
        });

        it('should reassign ids to match the new order', () => {
            component.fields = [
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false },
                { id: 2, name: 'field2', title: 'Third', type: 'textfield', required: false }
            ];

            drop(2, 0);

            expect(activeNamesInIdOrder()).toEqual(['field2', 'field0', 'field1']);
            expect(component.fields.find(f => f.name === 'field2')?.id).toBe(0);
            expect(component.fields.find(f => f.name === 'field0')?.id).toBe(1);
            expect(component.fields.find(f => f.name === 'field1')?.id).toBe(2);
        });

        it('should reuse the existing set of ids when ids have gaps', () => {
            component.fields = [
                { id: 1, name: 'field1', title: 'First', type: 'textfield', required: false },
                { id: 4, name: 'field4', title: 'Second', type: 'textfield', required: false },
                { id: 7, name: 'field7', title: 'Third', type: 'textfield', required: false }
            ];

            drop(0, 2);

            expect(activeNamesInIdOrder()).toEqual(['field4', 'field7', 'field1']);
            expect(component.getActiveFields().map(f => f.id)).toEqual([1, 4, 7]);
        });

        it('should not change archived field ids', () => {
            component.fields = [
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Archived', type: 'textfield', required: false, archived: true },
                { id: 2, name: 'field2', title: 'Second', type: 'textfield', required: false }
            ];

            drop(1, 0);

            expect(activeNamesInIdOrder()).toEqual(['field2', 'field0']);
            expect(component.getActiveFields().map(f => f.id)).toEqual([0, 2]);
            const archived = component.fields.find(f => f.archived);
            expect(archived?.name).toBe('field1');
            expect(archived?.id).toBe(1);
        });

        it('should not reuse an existing field name for a field added after reordering', () => {
            component.fields = [
                { id: 1, name: 'field1', title: 'First', type: 'textfield', required: false },
                { id: 2, name: 'field2', title: 'Second', type: 'textfield', required: false }
            ];

            drop(1, 0);

            const dialogRef = {
                afterClosed: () => of({ title: 'New', type: 'textfield', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);
            component.addField();

            const names = component.fields.map(f => f.name);
            expect(new Set(names).size).toBe(names.length);
            expect(component.fields[component.fields.length - 1].name).toBe('field3');
        });

        it('should emit the reordered fields', () => {
            component.fields = [
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false }
            ];
            spyOn(component.fieldsChange, 'emit');

            drop(0, 1);

            expect(component.fieldsChange.emit).toHaveBeenCalledWith(component.fields);
        });

        it('should do nothing when dropped in place', () => {
            const fields: Field[] = [
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false }
            ];
            component.fields = fields;
            spyOn(component.fieldsChange, 'emit');

            drop(1, 1);

            expect(component.fields).toBe(fields);
            expect(component.fieldsChange.emit).not.toHaveBeenCalled();
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
