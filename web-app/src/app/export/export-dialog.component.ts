import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportMetadataService, ExportRequest, ExportResponse } from './export-metadata.service';
import { FilterService } from '../upgrade/ajs-upgraded-providers';
import { MatDatepickerInputEvent } from '@angular/material';
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
  localOffset: string = moment().format('Z');
  localTime: boolean = true;
  startDate: Date = moment().startOf('day').toDate();
  endDate: Date = moment().endOf('day').toDate();

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

  onStartDate(event: MatDatepickerInputEvent<Date>): void {
    this.startDate = event.value;
    //this.localTime = timeZone === 'local';
  }

  onEndDate(event: MatDatepickerInputEvent<Date>): void {
    this.endDate = event.value;
    //this.localTime = timeZone === 'local';
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
      let startDate = moment(this.startDate);
      if (startDate) {
        startDate = this.localTime ? startDate.utc() : startDate;
        start = startDate.format("YYYY-MM-DD HH:mm:ss");
      }

      let endDate = moment(this.endDate);
      if (endDate) {
        endDate = this.localTime ? endDate.utc() : endDate;
        end = endDate.format("YYYY-MM-DD HH:mm:ss");
      }
    } else if (exportTimeOption.value) {
      start = moment().subtract(exportTimeOption.value, 'seconds').utc().format("YYYY-MM-DD HH:mm:ss");
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

    this.exportMetaService.performExport(exportRequest).subscribe((response: ExportResponse) => {
      const msg: string = "Export started";
      this.snackBar.open(msg, null, { duration: 2000 });
    });
    this.dialogRef.close();
  }
}