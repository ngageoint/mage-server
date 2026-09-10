import { Component, Inject } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
    standalone: false
})
export class CreateEventDialogComponent {
  eventForm: FormGroup;
  errorMessage: string = '';
  isEditMode: boolean;

  constructor(
    public dialogRef: MatDialogRef<CreateEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { event: Partial<MageEvent> },
    private fb: FormBuilder,
    private eventsService: AdminEventsService
  ) {
    this.isEditMode = !!data.event?.id;
    this.eventForm = this.fb.group({
      name: [data.event?.name ?? '', [Validators.required]],
      description: [data.event?.description ?? '']
    });
  }

  /**
   * Handles form submission for creating or editing an event.
   * Validates the form, creates/updates the event via the events service, and closes the dialog on success.
   */
  save(): void {
    if (this.eventForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.errorMessage = '';
    const eventData = this.eventForm.value;
    const request = this.isEditMode
      ? this.eventsService.updateEvent(String(this.data.event.id), eventData)
      : this.eventsService.createEvent(eventData);

    request.subscribe({
      next: (savedEvent) => {
        this.dialogRef.close(savedEvent);
      },
      error: (err) => {
        if (err.status === 400 && err.error?.errors) {
          const fieldErrors = err.error.errors;
          if (fieldErrors.name?.type === 'unique') {
            this.errorMessage = fieldErrors.name.message;
          } else {
            this.errorMessage = err.error.message ?? 'Validation failed';
          }
        } else {
          this.errorMessage = `Failed to ${this.isEditMode ? 'save' : 'create'} event. Please try again.`;
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
