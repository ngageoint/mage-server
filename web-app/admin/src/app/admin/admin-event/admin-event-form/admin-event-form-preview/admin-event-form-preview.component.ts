import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AdminEventFormPreviewDialogComponent } from './form-preview-dialog/admin-event-form-preview-dialog.component';

@Component({
  selector: 'admin-event-form-preview',
  templateUrl: './admin-event-form-preview.component.html',
  styleUrls: ['./admin-event-form-preview.component.scss']
})
export class AdminEventFormPreviewComponent implements OnChanges {
  @Input() formDefinition: any[];
  @Output() onClose = new EventEmitter<void>();

  constructor(public dialog: MatDialog) { }

  ngOnChanges(): void {
    if (this.formDefinition) {
      this.openDialog()
    }
  }

  openDialog(): void {
    const dialog = this.dialog.open(AdminEventFormPreviewDialogComponent, {
      data: this.formDefinition,
      width: '600px',
      maxWidth: '90vw'
    })

    dialog.afterClosed().subscribe(() => {
      this.onClose.emit();
    });
  }
}