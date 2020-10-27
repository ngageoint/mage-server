import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ExportMetadataService, ExportRequest } from './export-metadata.service';
import { FilterService } from '../upgrade/ajs-upgraded-providers';

interface ExportOption {
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
  exportOptions: ExportOption[];
  exportTime: string;
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
      label: 'Last 5 minutes',
      key: 'five'
    }, {
      value: 3600,
      label: 'Last Hour',
      key: 'hour'
    }, {
      value: 43200,
      label: 'Last 12 Hours',
      key:'twelve'
    }, {
      value: 86400,
      label: 'Last 24 Hours',
      key:'twentyfour'
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

  exportData(event: any): void {
    this.showEventError = false;

    let start;
    let end;
    if (this.exportTime === 'custom') {
      //TODO handle time.  Used moment previously
    }

    const exportRequest: ExportRequest = {
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
  }

  onExportTypeChanged(event: any): void {
    this.exportType = event.target.textContent;
  }
}