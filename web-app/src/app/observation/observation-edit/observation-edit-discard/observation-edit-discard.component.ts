import { Component } from '@angular/core';
import { MatDialogRef as MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'observation-edit-discard',
    templateUrl: './observation-edit-discard.component.html',
    styleUrls: ['./observation-edit-discard.component.scss'],
    standalone: false
})
export class ObservationEditDiscardComponent {

  constructor(public dialogRef: MatDialogRef<ObservationEditDiscardComponent>) {
  }

  close(): void {
    this.dialogRef.close();
  }

  discard(): void {
    this.dialogRef.close('discard');
  }

}
