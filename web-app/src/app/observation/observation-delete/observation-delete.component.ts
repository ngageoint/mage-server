import { Component, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EventService } from '../../event/event.service';

export interface Observation {
  id: string;
  eventId: number;
}

@Component({
  selector: 'observation-delete',
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