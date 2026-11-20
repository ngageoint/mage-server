import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'observation-edit-discard',
    templateUrl: './observation-edit-discard.component.html',
    styleUrls: ['./observation-edit-discard.component.scss'],
    imports: [MatButtonModule, MatDialogModule]
})
export class ObservationEditDiscardComponent {
  public readonly dialogRef: MatDialogRef<ObservationEditDiscardComponent> = inject(MatDialogRef)

  close(): void {
    this.dialogRef.close();
  }

  discard(): void {
    this.dialogRef.close('discard');
  }

}
