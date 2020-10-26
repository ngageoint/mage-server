import { Component, OnInit, OnChanges, Input, Output, EventEmitter, ViewChild, SimpleChanges } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ExportMetadataService, ExportMetadata } from './export-metadata.service';
import { ExportDialogComponent } from './export-dialog.component';


@Component({
  template: '<div></div>'
})
export class ExportsComponent implements OnChanges {
  @Input() open: any;
  @Input() events: any[];
  @Output() onExportClose = new EventEmitter<void>();

  constructor(private dialog: MatDialog) {
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
        this.dialog.open(ExportDialogComponent).afterClosed().subscribe(() => {
          this.onExportClose.emit();
        });
      }
    });
  }
}

@Component({
  selector: 'export-metadata-dialog',
  templateUrl: 'export-metadata-dialog.component.html',
  styleUrls: ['./export-metadata-dialog.component.scss'],
  providers: [ExportMetadataService]
})
export class ExportMetadataDialogComponent implements OnInit {
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  displayedColumns: string[] = ['status', 'user', 'type', 'url', 'event', 'delete'];
  dataSource = new MatTableDataSource<ExportMetadata>();

  constructor(
    private dialogRef: MatDialogRef<ExportMetadataDialogComponent>, private exportMetaService: ExportMetadataService) { }


  openExport(): void {
    this.dialogRef.close('openExport');
  }

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.exportMetaService.getMyExportMetadata().subscribe((data: ExportMetadata[]) => {
      this.dataSource.data.concat(data);
    });
  }

  doFilter(filter: string): void {
    this.dataSource.filter = filter.trim().toLocaleLowerCase();
  }

  redirectToDelete(id: string): void {
    //TODO implement
  }
}
