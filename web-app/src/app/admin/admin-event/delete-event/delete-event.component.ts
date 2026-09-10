import { Component, Inject, signal } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { AdminEventsService } from '../../services/admin-events.service';
import { MageEvent } from 'mage-web-app/entities/event/entities.event';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { A11yModule } from '@angular/cdk/a11y';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

/**
 * Modal component for confirming event deletion.
 * Provides a confirmation dialog before permanently deleting an event.
 */
@Component({
    selector: 'mage-delete-event',
    templateUrl: './delete-event.component.html',
    styleUrls: ['./delete-event.component.scss'],
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        A11yModule,
        MatFormFieldModule,
        MatInputModule,
        FormsModule
    ]
})
export class DeleteEventComponent {
    event: MageEvent;
    readonly deleting = signal(false);
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
        private eventsService: AdminEventsService
    ) {
        this.event = data.event;
    }

    /**
     * Deletes the event after confirmation.
     */
    deleteEvent(): void {
        this.deleting.set(true);

        this.eventsService.deleteEvent(this.event.id.toString()).subscribe({
            next: () => {
                this.dialogRef.close(this.event);
            },
            error: (error) => {
                console.error('Error deleting event:', error);
                this.deleting.set(false);
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
