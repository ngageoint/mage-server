import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventsService } from '../events.service';
import { Event } from 'src/app/filter/filter.types';

/**
 * Dialog component for creating new events.
 * Provides a form interface with validation for event name (required) and description (optional).
 */
@Component({
  selector: 'mage-admin-event-create',
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss']
})
export class CreateEventDialogComponent {
  eventForm: FormGroup;
  errorMessage: string = '';

  constructor(
    public dialogRef: MatDialogRef<CreateEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { event: Partial<Event> },
    private fb: FormBuilder,
    private eventsService: EventsService
  ) {
    this.eventForm = this.fb.group({
      name: [data.event?.name ?? '', [Validators.required]],
      description: [data.event?.description ?? '']
    });
  }

  /**
   * Handles form submission for creating a new event.
   * Validates the form, creates the event via the events service, and closes the dialog on success.
   */
  save(): void {
    if (this.eventForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.errorMessage = '';
    const eventData = this.eventForm.value;
    this.eventsService.createEvent(eventData).subscribe({
      next: (newEvent) => {
        this.dialogRef.close(newEvent);
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
          this.errorMessage = 'Failed to create event. Please try again.';
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
