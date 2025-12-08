import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CreateFormDialogComponent } from './create-form.component';
import { EventsService } from '../events.service';
import { of, throwError } from 'rxjs';

describe('CreateFormDialogComponent', () => {
    let component: CreateFormDialogComponent;
    let fixture: ComponentFixture<CreateFormDialogComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<CreateFormDialogComponent>>;
    let mockEventsService: jasmine.SpyObj<EventsService>;

    const mockEvent = {
        id: 1,
        name: 'Test Event',
        description: 'Test Description'
    };

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockEventsService = jasmine.createSpyObj('EventsService', ['createForm']);

        await TestBed.configureTestingModule({
            declarations: [CreateFormDialogComponent],
            imports: [ReactiveFormsModule],
            providers: [
                FormBuilder,
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { event: mockEvent } },
                { provide: EventsService, useValue: mockEventsService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CreateFormDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize form with random color', () => {
        expect(component.formGroup.value.color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should validate required fields', () => {
        component.formGroup.patchValue({
            name: '',
            color: ''
        });

        expect(component.formGroup.valid).toBeFalse();
        expect(component.formGroup.get('name')?.hasError('required')).toBeTrue();
        expect(component.formGroup.get('color')?.hasError('required')).toBeTrue();
    });

    it('should validate color format', () => {
        component.formGroup.patchValue({
            color: 'invalid-color'
        });

        expect(component.formGroup.get('color')?.hasError('pattern')).toBeTrue();
    });

    it('should close dialog on cancel', () => {
        component.cancel();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should show error when saving invalid form', () => {
        component.formGroup.patchValue({ name: '' });
        component.save();

        expect(component.errorMessage).toBe('Please fill in all required fields correctly.');
    });

    it('should create form with file upload', () => {
        const mockFile = new File(['form data'], 'test-form.json', { type: 'application/json' });
        const mockResponse = { id: 123, name: 'Test Form' };

        component.selectedFile = mockFile;
        component.formGroup.patchValue({
            name: 'Test Form',
            description: 'Test Description',
            color: '#FF5733'
        });

        mockEventsService.createForm.and.returnValue(of(mockResponse));

        component.save();

        expect(mockEventsService.createForm).toHaveBeenCalled();
        expect(mockDialogRef.close).toHaveBeenCalledWith(mockResponse);
    });

    it('should close with form data when no file selected', () => {
        component.formGroup.patchValue({
            name: 'Test Form',
            description: 'Test Description',
            color: '#FF5733'
        });

        component.save();

        expect(mockDialogRef.close).toHaveBeenCalledWith(component.formGroup.value);
    });

    it('should handle error during form creation', () => {
        const mockFile = new File(['form data'], 'test-form.json', { type: 'application/json' });
        component.selectedFile = mockFile;
        component.formGroup.patchValue({
            name: 'Test Form',
            color: '#FF5733'
        });

        mockEventsService.createForm.and.returnValue(throwError(() => ({ error: 'Test error' })));

        component.save();

        expect(component.errorMessage).toBe('Test error');
    });

    it('should update selected file on file input', () => {
        const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
        const event = {
            target: {
                files: [mockFile]
            }
        };

        component.onFileSelected(event);

        expect(component.selectedFile).toBe(mockFile);
    });
});
