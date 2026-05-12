import { Component, Inject } from '@angular/core'
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EventService } from '../../event/event.service';
import { CommonModule } from '@angular/common';
import { ObservationListItemComponent } from '../observation-list/observation-list-item.component';

export interface Observation {
  id: string;
  eventId: number;
}

@Component({
  selector: 'observation-delete',
  standalone: true,
  imports: [
    CommonModule,
    ObservationListItemComponent
  ],
  templateUrl: './observation-delete.component.html',
  styleUrls: ['./observation-delete.component.scss']
})
export class ObservationDeleteComponent {
  event: any

  constructor(
    public dialogRef: MatDialogRef<ObservationDeleteComponent>,
    private eventService: EventService,
    @Inject(MAT_DIALOG_DATA) public observation: Observation) { 
      this.event = eventService.getEventById(observation.eventId);
  }

  close(): void {
    this.dialogRef.close('cancel');
  }

  delete(): void {
    this.eventService.archiveObservation(this.observation).subscribe(() => {
      this.dialogRef.close('delete');
    })
  }

}