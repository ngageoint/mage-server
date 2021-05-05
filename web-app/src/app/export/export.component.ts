import { Component, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ExportDialogComponent } from './export-dialog.component';

@Component({
  template: '<div></div>'
})
export class ExportComponent implements OnChanges {
  @Input() open: any;
  @Input() events: any[];
  @Output() onExportClose = new EventEmitter<void>();

  constructor(public dialog: MatDialog) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.open && this.open.opened && this.dialog.openDialogs.length === 0) {
      this.openExportDialog();
    }
  }

  openExportDialog(): void {
    this.dialog.open(ExportDialogComponent).afterClosed().subscribe(result => {
      if (!result || result === 'closeAction') {
        this.onExportClose.emit();
      } 
    });
  }
}