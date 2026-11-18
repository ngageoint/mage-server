import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AdminEventsService } from '../../services/admin-events.service';
import { MageEvent } from 'mage-web-app/entities/event/entities.event';

/**
 * Dialog component for importing a form from a previously exported MAGE form archive (.zip).
 * The archive supplies the form's fields, choices, and icons; only name and color are collected here.
 */
@Component({
    selector: 'mage-upload-form',
    templateUrl: './upload-form.component.html',
    styleUrls: ['./upload-form.component.scss'],
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule
    ]
})
export class UploadFormDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<UploadFormDialogComponent>);
    readonly data = inject<{ event: MageEvent }>(MAT_DIALOG_DATA);
    private readonly fb = inject(FormBuilder);
    private readonly eventsService = inject(AdminEventsService);
    private readonly destroyRef = inject(DestroyRef);

    formGroup: FormGroup;
    readonly errorMessage = signal('');
    selectedFile: File | null = null;
    readonly saving = signal(false);

    constructor() {
        const randomColor = '#' + ('000000' + Math.floor(Math.random() * 0xFFFFFF).toString(16)).slice(-6);

        this.formGroup = this.fb.group({
            name: ['', [Validators.required]],
            description: [''],
            color: [randomColor, [Validators.required, Validators.pattern(/^#[0-9A-F]{6}$/i)]]
        });
    }

    onFileSelected(event: globalThis.Event): void {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            this.selectedFile = target.files[0];
        }
    }

    save(): void {
        if (this.formGroup.invalid || !this.selectedFile) {
            this.errorMessage.set('Please provide a name, color, and form archive.');
            Object.keys(this.formGroup.controls).forEach(key => {
                this.formGroup.get(key)?.markAsTouched();
            });
            return;
        }

        this.errorMessage.set('');
        this.saving.set(true);

        const formData = new FormData();
        formData.append('form', this.selectedFile);
        formData.append('name', this.formGroup.value.name);
        formData.append('description', this.formGroup.value.description || '');
        formData.append('color', this.formGroup.value.color);

        this.eventsService.createForm(String(this.data.event.id), formData).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (newForm) => {
                this.saving.set(false);
                this.dialogRef.close(newForm);
            },
            error: (err) => {
                this.saving.set(false);
                this.errorMessage.set(err.error?.message || err.error || 'Failed to upload form. Please try again.');
            }
        });
    }

    cancel(): void {
        this.dialogRef.close();
    }

    hasError(fieldName: string, errorType: string): boolean {
        const field = this.formGroup.get(fieldName);
        return !!(field && field.hasError(errorType) && field.touched);
    }
}
