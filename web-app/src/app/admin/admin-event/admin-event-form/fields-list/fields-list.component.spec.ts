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

    describe('onDrop', () => {
        // Drops, then passes any emitted fields back in as the parent would.
        function drop(previousIndex: number, currentIndex: number): void {
            component.onDrop({ previousIndex, currentIndex } as CdkDragDrop<Field[]>);
            if ((component.fieldsChange.emit as jasmine.Spy).calls.any()) {
                setFields(latestEmittedFields());
            }
        }

        function activeNamesInIdOrder(): string[] {
            return component.getActiveFields().map(f => f.name || '');
        }

        it('should list active fields in id order regardless of array order', () => {
            setFields([
                { id: 2, name: 'field2', title: 'Third', type: 'textfield', required: false },
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false }
            ]);

            expect(activeNamesInIdOrder()).toEqual(['field0', 'field1', 'field2']);
        });

        it('should reassign ids to match the new order', () => {
            setFields([
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false },
                { id: 2, name: 'field2', title: 'Third', type: 'textfield', required: false }
            ]);

            drop(2, 0);

            expect(activeNamesInIdOrder()).toEqual(['field2', 'field0', 'field1']);
            expect(component.fields().find(f => f.name === 'field2')?.id).toBe(0);
            expect(component.fields().find(f => f.name === 'field0')?.id).toBe(1);
            expect(component.fields().find(f => f.name === 'field1')?.id).toBe(2);
        });

        it('should reuse the existing set of ids when ids have gaps', () => {
            setFields([
                { id: 1, name: 'field1', title: 'First', type: 'textfield', required: false },
                { id: 4, name: 'field4', title: 'Second', type: 'textfield', required: false },
                { id: 7, name: 'field7', title: 'Third', type: 'textfield', required: false }
            ]);

            drop(0, 2);

            expect(activeNamesInIdOrder()).toEqual(['field4', 'field7', 'field1']);
            expect(component.getActiveFields().map(f => f.id)).toEqual([1, 4, 7]);
        });

        it('should not change archived field ids', () => {
            setFields([
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Archived', type: 'textfield', required: false, archived: true },
                { id: 2, name: 'field2', title: 'Second', type: 'textfield', required: false }
            ]);

            drop(1, 0);

            expect(activeNamesInIdOrder()).toEqual(['field2', 'field0']);
            expect(component.getActiveFields().map(f => f.id)).toEqual([0, 2]);
            const archived = component.fields().find(f => f.archived);
            expect(archived?.name).toBe('field1');
            expect(archived?.id).toBe(1);
        });

        it('should not reuse an existing field name for a field added after reordering', () => {
            setFields([
                { id: 1, name: 'field1', title: 'First', type: 'textfield', required: false },
                { id: 2, name: 'field2', title: 'Second', type: 'textfield', required: false }
            ]);

            drop(1, 0);

            const dialogRef = {
                afterClosed: () => of({ title: 'New', type: 'textfield', required: false })
            } as MatDialogRef<any>;
            mockDialog.open.and.returnValue(dialogRef);
            component.addField();

            const result = latestEmittedFields();
            const names = result.map(f => f.name);
            expect(new Set(names).size).toBe(names.length);
            expect(result[result.length - 1].name).toBe('field3');
        });

        it('should emit the reordered fields', () => {
            setFields([
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false }
            ]);

            drop(0, 1);

            expect(latestEmittedFields().map(f => f.name)).toEqual(['field1', 'field0']);
            expect(latestEmittedFields().map(f => f.id)).toEqual([0, 1]);
        });

        it('should do nothing when dropped in place', () => {
            const fields: Field[] = [
                { id: 0, name: 'field0', title: 'First', type: 'textfield', required: false },
                { id: 1, name: 'field1', title: 'Second', type: 'textfield', required: false }
            ];
            setFields(fields);

            drop(1, 1);

            expect(component.fields()).toBe(fields);
            expect(component.fieldsChange.emit).not.toHaveBeenCalled();
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
