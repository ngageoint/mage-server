import { Component, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { ExportDialogComponent } from './export-dialog.component';

@Component({
    template: '<div></div>',
    standalone: false
})
export class ExportComponent implements OnChanges {
  @Input() open: any;
  @Input() events: any[];
  @Output() onExportClose = new EventEmitter<void>();

  constructor(public dialog: MatDialog) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.open) {
      if (this.open && this.open.opened) {
        this.openExportDialog();
      }
    }
  }

  openExportDialog(): void {
    this.dialog.open(ExportDialogComponent, { width: '650px', maxWidth: '650px' }).afterClosed().subscribe(result => {
      if (!result || result === 'closeAction') {
        this.onExportClose.emit();
      }
    });
  }
}