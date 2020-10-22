import { Component, OnInit, OnChanges, Input, Output, EventEmitter, ViewChild, SimpleChanges } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ExportMetadataService, ExportMetadata } from './export-metadata.service';


@Component({
  selector: 'exports',
  templateUrl: './exports.component.html'
})
export class ExportsComponent implements OnChanges {
  @Input() open: any;
  @Input() events: any[];
  @Output() onExportClose = new EventEmitter<void>();

  /**
   * Keep track of the dialog ref to detect if the dialog is open or not
   */
  private matDialogRef: MatDialogRef<ExportsDialogComponent>;

  constructor(private dialog: MatDialog) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.open && this.open.opened && !this.matDialogRef) {
      this.openDialog();
    }
  }
  openDialog(): void {
    this.matDialogRef = this.dialog.open(ExportsDialogComponent);

    this.matDialogRef.afterClosed().subscribe(() => {
      this.onExportClose.emit();
      this.matDialogRef = null;
    });
  }
}

@Component({
  selector: 'exports-dialog',
  templateUrl: 'exports-dialog.component.html',
  styleUrls: ['./exports-dialog.component.scss'],
  providers: [ExportMetadataService]
})
export class ExportsDialogComponent implements OnInit {
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  displayedColumns: string[] = ['status', 'user', 'type', 'url'];
  dataSource = new MatTableDataSource<ExportMetadata>();

  constructor(
    private dialogRef: MatDialogRef<ExportsDialogComponent>, private exportMetaService: ExportMetadataService) { }


  newExport(): void {
    //TODO launch old export dialog?
  }

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.data.splice(0, this.dataSource.data.length);

    this.exportMetaService.getMyExports().subscribe((data: ExportMetadata[]) => {
      for (const meta of data) {
        this.dataSource.data.push(meta);
        //TODO filter?
        //TODO page?
      }
    });
  }
}
