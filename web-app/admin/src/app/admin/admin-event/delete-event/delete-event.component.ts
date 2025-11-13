import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EventsService } from '../events.service';
import { Event as MageEvent } from 'src/app/filter/filter.types';

/**
 * Modal component for confirming event deletion.
 * Provides a confirmation dialog before permanently deleting an event.
 */
@Component({
    selector: 'mage-delete-event',
    templateUrl: './delete-event.component.html',
    styleUrls: ['./delete-event.component.scss']
})
export class DeleteEventComponent {
    event: MageEvent;
    deleting = false;
    confirm: { text?: string } = {};

    /**
     * Constructor - initializes the component with injected services and event data.
     * @param dialogRef - Reference to the dialog for closing and returning results
     * @param data - Injected data containing the event to delete
     * @param eventsService - Service for event operations
     */
    constructor(
        public dialogRef: MatDialogRef<DeleteEventComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { event: MageEvent },
        private eventsService: EventsService
    ) {
        this.event = data.event;
    }

    /**
     * Deletes the event after confirmation.
     */
    deleteEvent(): void {
        this.deleting = true;

        this.eventsService.deleteEvent(this.event.id.toString()).subscribe({
            next: () => {
                this.dialogRef.close(this.event);
            },
            error: (error) => {
                console.error('Error deleting event:', error);
                this.deleting = false;
            }
        });
    }

    /**
     * Cancels the deletion and closes the dialog without any action.
     */
    cancel(): void {
        this.dialogRef.close();
    }
}
