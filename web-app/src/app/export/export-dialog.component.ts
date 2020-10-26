import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ExportMetadataService } from './export-metadata.service';

@Component({
  selector: 'export-dialog',
  templateUrl: 'export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  providers: [ExportMetadataService]
})
export class ExportDialogComponent implements OnInit {

  exportEvent: string;

  constructor(
    private dialogRef: MatDialogRef<ExportDialogComponent>, private exportMetaService: ExportMetadataService,
    @Inject(MAT_DIALOG_DATA) public data: any) { }


  ngOnInit(): void {
    this.exportEvent = "TODO";
  }
}