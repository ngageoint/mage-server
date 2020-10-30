import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportMetadataService, ExportRequest } from './export-metadata.service';
import { FilterService } from '../upgrade/ajs-upgraded-providers';
const moment = require('moment');

interface ExportTimeOption {
  all?: boolean,
  custom?: boolean,
  value: number,
  label: string,
  key: string
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
  exportTimeOptions: ExportTimeOption[];
  exportTime: string;
  exportFormat: string;
  exportFormats: string[] = ['KML', 'GeoJSON', 'CSV', 'Shapefile'];

  constructor(
    private dialogRef: MatDialogRef<ExportDialogComponent>,
    private exportMetaService: ExportMetadataService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    @Inject(FilterService) private filterService: any,
    private snackBar: MatSnackBar) { }


  ngOnInit(): void {
    this.exportEvent = { selected: this.filterService.getEvent() };
    if (!this.exportEvent.selected) {
      this.showEventError = true;
    } else {
      this.showEventError = false;
    }

    this.exportObservations = true;
    this.exportLocations = true;

    this.exportFormat = this.exportFormats[0];

    this.exportTimeOptions = [{
      value: 300,
      label: 'Last 5 minutes',
      key: 'five'
    }, {
      value: 3600,
      label: 'Last Hour',
      key: 'hour'
    }, {
      value: 43200,
      label: 'Last 12 Hours',
      key: 'twelve'
    }, {
      value: 86400,
      label: 'Last 24 Hours',
      key: 'twentyfour'
    }, {
      all: true,
      value: null,
      label: 'All  (Use With Caution)',
      key: 'all'
    }, {
      custom: true,
      value: null,
      label: 'Custom (Choose your own start/end)',
      key: 'custom'
    }];
    this.exportTime = 'five';
  }

  exportData($event: any): void {
    if (!this.exportEvent.selected) {
      //TODO test this
      $event.preventDefault();
      this.showEventError = true;
      return;
    }

    this.showEventError = false;

    let exportTimeOption: ExportTimeOption;
    for (let i = 0; i < this.exportTimeOptions.length; i++) {
      exportTimeOption = this.exportTimeOptions[i];
      if (exportTimeOption.key === this.exportTime) {
        break;
      }
    }

    let start: string;
    let end: string;
    if (exportTimeOption.custom) {
      //TODO handle time.  Used moment previously
    } else if (exportTimeOption.value) {
      start = moment().subtract('seconds', exportTimeOption.value).utc().format("YYYY-MM-DD HH:mm:ss");
    }

    const exportRequest: ExportRequest = {
      exportType: this.exportFormat,
      eventId: this.exportEvent.selected.id,
      observations: this.exportObservations,
      locations: this.exportLocations
    };

    if (start) exportRequest.startDate = start;
    if (end) exportRequest.endDate = end;

    if (this.exportObservations) {
      exportRequest.attachments = this.excludeObservationsAttachments;
      exportRequest.favorites = this.exportFavoriteObservations;
      exportRequest.important = this.exportImportantObservations;
    }

    this.exportMetaService.performExport(exportRequest).subscribe((response: any) => {
      const msg: string = "Export started with export id " + response.exportId;
      this.snackBar.open(msg, null, { duration: 2000 });
    });
    this.dialogRef.close();
  }
}