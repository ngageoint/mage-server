import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ExportMetadataService } from './export-metadata.service';
import { FilterService } from '../upgrade/ajs-upgraded-providers';

interface ExportOption {
  all?: boolean,
  custom?: boolean,
  value: number,
  label: string
}

@Component({
  selector: 'export-dialog',
  templateUrl: 'export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  providers: [ExportMetadataService]
})
export class ExportDialogComponent implements OnInit {

  exportEvent: any;
  showEventError: boolean;
  exportObservations: boolean;
  exportLocations: boolean;
  exportFavoriteObservations: boolean;
  exportImportantObservations: boolean;
  excludeObservationsAttachments: boolean;
  advancedOptionsExpanded: boolean;
  exportOptions: ExportOption[];
  exportTime: ExportOption;
  exportType: string;

  constructor(
    private dialogRef: MatDialogRef<ExportDialogComponent>,
    private exportMetaService: ExportMetadataService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    @Inject(FilterService) private filterService: any) { }


  ngOnInit(): void {
    this.exportEvent = { selected: this.filterService.getEvent() };
    if (!this.exportEvent.selected) {
      this.showEventError = true;
    } else {
      this.showEventError = false;
    }

    this.exportObservations = true;
    this.exportLocations = true;

    this.exportType = "KML";

    this.exportOptions = [{
      value: 300,
      label: 'Last 5 minutes'
    }, {
      value: 3600,
      label: 'Last Hour'
    }, {
      value: 43200,
      label: 'Last 12 Hours'
    }, {
      value: 86400,
      label: 'Last 24 Hours'
    }, {
      all: true,
      value: null,
      label: 'All  (Use With Caution)'
    }, {
      custom: true,
      value: null,
      label: 'Custom (Choose your own start/end)'
    }];
    this.exportTime = this.exportOptions[0];

  }

  exportData(): void {

  }
}