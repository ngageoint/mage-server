import { Component, DestroyRef, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EventService } from '../../event/event.service';
import { Observation } from '../../entities/observation/entities.observation';
import { ObservationListItemComponent } from '../observation-list/observation-list-item.component';

@Component({
    selector: 'observation-delete',
    templateUrl: './observation-delete.component.html',
    styleUrls: ['./observation-delete.component.scss'],
    imports: [MatButtonModule, MatDialogModule, ObservationListItemComponent]
})
export class ObservationDeleteComponent {
  public readonly dialogRef: MatDialogRef<ObservationDeleteComponent> = inject(MatDialogRef)
  private readonly eventService: EventService = inject(EventService)
  private readonly destroyRef: DestroyRef = inject(DestroyRef)
  public readonly observation: Observation = inject(MAT_DIALOG_DATA)

  readonly event = this.eventService.getEventById(this.observation.eventId)

  close(): void {
    this.dialogRef.close('cancel');
  }

  delete(): void {
    this.eventService.archiveObservation(this.observation).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.dialogRef.close('delete');
    })
  }

}