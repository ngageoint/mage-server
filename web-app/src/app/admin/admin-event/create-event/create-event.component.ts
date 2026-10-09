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
 * Dialog component for creating or editing events.
 * Provides a form interface with validation for event name (required) and description (optional).
 */
@Component({
    selector: 'mage-admin-event-create',
    templateUrl: './create-event.component.html',
    styleUrls: ['./create-event.component.scss'],
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule
    ]
})
export class CreateEventDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CreateEventDialogComponent>);
  readonly data = inject<{ event: Partial<MageEvent> }>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly eventsService = inject(AdminEventsService);
  private readonly destroyRef = inject(DestroyRef);

  eventForm: FormGroup;
  readonly errorMessage = signal('');
  readonly isEditMode: boolean;

  constructor() {
    this.isEditMode = !!this.data.event?.id;
    this.eventForm = this.fb.group({
      name: [this.data.event?.name ?? '', [Validators.required]],
      description: [this.data.event?.description ?? '']
    });
  }

  /**
   * Handles form submission for creating or editing an event.
   * Validates the form, creates/updates the event via the events service, and closes the dialog on success.
   */
  save(): void {
    if (this.eventForm.invalid) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    this.errorMessage.set('');
    const eventData = this.eventForm.value;
    const request = this.isEditMode
      ? this.eventsService.updateEvent(String(this.data.event.id), eventData)
      : this.eventsService.createEvent(eventData);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (savedEvent) => {
        this.dialogRef.close(savedEvent);
      },
      error: (err) => {
        if (err.status === 400 && err.error?.errors) {
          const fieldErrors = err.error.errors;
          if (fieldErrors.name?.type === 'unique') {
            this.errorMessage.set(fieldErrors.name.message);
          } else {
            this.errorMessage.set(err.error.message ?? 'Validation failed');
          }
        } else {
          this.errorMessage.set(`Failed to ${this.isEditMode ? 'save' : 'create'} event. Please try again.`);
        }
      }
    });
  }

  /**
   * Closes the dialog without saving any data or making any changes.
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
