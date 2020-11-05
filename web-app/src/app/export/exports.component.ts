import { Component, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ExportDialogComponent } from './export-dialog.component';
import { ExportMetadataDialogComponent } from './export-metadata-dialog.component';

@Component({
  template: '<div></div>'
})
export class ExportsComponent implements OnChanges {
  @Input() open: any;
  @Input() events: any[];
  @Output() onExportClose = new EventEmitter<void>();

  constructor(public dialog: MatDialog) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.open && this.open.opened && this.dialog.openDialogs.length === 0) {
      this.openExportMetadataDialog();
    }
  }
  openExportMetadataDialog(): void {
    this.dialog.open(ExportMetadataDialogComponent).afterClosed().subscribe(result => {
      if (!result || result === 'closeAction') {
        this.onExportClose.emit();
      } else {
        this.dialog.open(ExportDialogComponent, {
          data: { events: this.events }
        }).afterClosed().subscribe(() => {
          this.onExportClose.emit();
        });
      }
    });
  }
}