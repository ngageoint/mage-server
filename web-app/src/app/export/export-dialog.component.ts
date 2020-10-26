import { Component, OnInit, OnChanges, Input, Output, EventEmitter, ViewChild, SimpleChanges } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ExportMetadataService, ExportMetadata } from './export-metadata.service';

@Component({
  selector: 'export-dialog',
  templateUrl: 'export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  providers: [ExportMetadataService]
})
export class ExportDialogComponent implements OnInit {


  constructor(
    private dialogRef: MatDialogRef<ExportDialogComponent>, private exportMetaService: ExportMetadataService) { }



  ngOnInit(): void {
  }
}