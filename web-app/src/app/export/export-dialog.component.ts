import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportMetadataService, ExportRequest, ExportResponse } from './services/export-metadata.service';
import { FilterService } from '../upgrade/ajs-upgraded-providers';
import { MatDatepickerInputEvent } from '@angular/material';
import { slideInOutAnimation } from './animations/slide-in-out.animation';
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
  providers: [ExportMetadataService],
  animations: [slideInOutAnimation]
  //host: { '[@slideInOutAnimation]': '' }
})
export class ExportDialogComponent implements OnInit {

  exportEvent: any;
  showEventError: boolean;
  exportObservations: boolean = true;
  exportLocations: boolean = true;
  exportFavoriteObservations: boolean;
  exportImportantObservations: boolean;
  excludeObservationsAttachments: boolean;
  advancedOptionsExpanded: boolean;
  exportTimeOptions: ExportTimeOption[];
  exportTime: string;
  exportFormat: string;
  exportFormats: string[] = ['KML', 'GeoJSON', 'CSV', 'Shapefile'];
  currentOffset: string;
  localTime: boolean = false;
  startDate: Date = moment().startOf('day').toDate();
  endDate: Date = moment().endOf('day').toDate();

  constructor(
    private dialogRef: MatDialogRef<ExportDialogComponent>,
    private exportMetaService: ExportMetadataService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    @Inject(FilterService) private filterService: any,
    private snackBar: MatSnackBar) { }


  ngOnInit(): void {
    this.toggleTime();
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
  }

  onEndDate(event: MatDatepickerInputEvent<Date>): void {
    this.endDate = event.value;
  }

  toggleTime(): void {
    this.localTime = !this.localTime;
    this.setOffset();
  }

  setOffset(): void {
    let offset: string = "";
    if (this.localTime) {
      const totalMinutes: any = moment().parseZone().utcOffset();
      const hours: number = Math.floor(totalMinutes / 60);
      const minutes: number = totalMinutes % 60;

      offset += "LOCAL (";
      if (this.numDigits(hours) == 1) {
        if (hours > 0) {
          offset += "0" + hours;
        } else {
          const hoursStr: string = hours.toString();
          offset += hoursStr[0];
          offset += "0";
          offset += hoursStr[1];
        }

      } else {
        offset += hours.toString();
      }

      offset += ":"

      if (this.numDigits(minutes) == 1) {
        offset += "0" + minutes;
      } else {
        offset += minutes.toString();
      }

      offset += ")";
    }
    else {
      offset = "GMT (+00:00)";
    }

    this.currentOffset = offset;
  }

  numDigits(x: number): number {
    return Math.max(Math.floor(Math.log10(Math.abs(x))), 0) + 1;
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