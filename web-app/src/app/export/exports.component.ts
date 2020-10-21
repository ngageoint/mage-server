import { Component, OnInit, OnDestroy, OnChanges, Input, Output, EventEmitter, Inject, ViewChild, SimpleChanges, HostListener } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  { position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H' },
  { position: 2, name: 'Helium', weight: 4.0026, symbol: 'He' },
  { position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li' },
  { position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be' },
  { position: 5, name: 'Boron', weight: 10.811, symbol: 'B' },
  { position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C' },
  { position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N' },
  { position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O' },
  { position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F' },
  { position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne' },
];

@Component({
  selector: 'exports',
  templateUrl: './exports.component.html'
})
export class ExportsComponent implements OnDestroy, OnChanges {
  @Input() open: any;
  @Input() events: any[];
  @Output() onExportClose = new EventEmitter<void>();

  private dialogRef: MatDialogRef<ExportsDialogComponent>;

  constructor(private dialog: MatDialog) {
  }

  ngOnDestroy(): void {
    this.dialogRef = null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.handleDialog();
  }

  handleDialog(): void {
    if (!this.dialogRef) {
      this.dialogRef = this.dialog.open(ExportsDialogComponent, {
        data: { onExportClose: this.onExportClose }
      });
    }
  }
}

@Component({
  selector: 'exports-dialog',
  templateUrl: 'exports-dialog.component.html',
  styleUrls: ['./exports-dialog.component.scss']
})
export class ExportsDialogComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  private dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);

  constructor(
    private dialogRef: MatDialogRef<ExportsDialogComponent>, @Inject(MAT_DIALOG_DATA) private data: any) { }

  @HostListener('unloaded')
  ngOnDestroy(): void {
    this.data.onExportClose.emit();
  }

  newExport(): void {
    //TODO launch old export dialog?
  }

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
  }
}
