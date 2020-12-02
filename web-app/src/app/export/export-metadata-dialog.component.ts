import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { MatDatepickerInputEvent } from '@angular/material';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportMetadataService, ExportMetadata, ExportResponse, ExportRequest } from './services/export-metadata.service';
import { EventService, LocalStorageService, FilterService } from '../upgrade/ajs-upgraded-providers';
import { detailExpandAnimation } from './animations/detail-expand.animation';
import { flyInOutAnimation } from './animations/fly-in-out.animation';
const moment = require('moment');

interface ExportTimeOption {
    all?: boolean,
    custom?: boolean,
    value: number,
    label: string,
    key: string
}

export interface Undoable {
    undoable: boolean;
    undoTimerHandle?: NodeJS.Timer;
}

export class ExportMetadataUI implements ExportMetadata, Undoable {
    _id: any;
    userId: any;
    physicalPath: string;
    exportType: string;
    location: string;
    filename?: string;
    status: string;
    options: any;
    eventName: string;
    undoable: boolean = false;
    undoTimerHandle?: NodeJS.Timer;
}

@Component({
    selector: 'export-metadata-dialog',
    templateUrl: 'export-metadata-dialog.component.html',
    styleUrls: ['./export-metadata-dialog.component.scss'],
    animations: [
        detailExpandAnimation,
        flyInOutAnimation
    ]
})
export class ExportMetadataDialogComponent implements OnInit {
    @ViewChild(MatPaginator, { static: true })
    paginator: MatPaginator;
    @ViewChild(MatSort, { static: true })
    sort: MatSort;
    columnsToDisplay: string[] = ['status', 'type', 'url', 'event', 'delete'];
    dataSource = new MatTableDataSource<ExportMetadataUI>();
    isLoadingResults: boolean = true;
    token: any;
    private uiModels: ExportMetadataUI[] = [];
    isExportOpen: boolean = false;
    exportEvent: any;
    exportObservations: boolean = true;
    exportLocations: boolean = true;
    exportFavoriteObservations: boolean;
    exportImportantObservations: boolean;
    excludeObservationsAttachments: boolean;
    advancedOptionsExpanded: boolean;
    exportTimeOptions: ExportTimeOption[] = [{
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
    exportTime: string = 'five';
    exportFormat: string;
    exportFormats: string[] = ['KML', 'GeoJSON', 'CSV', 'Shapefile'];
    currentOffset: string;
    localTime: boolean = false;
    startDate: Date = moment().startOf('day').toDate();
    endDate: Date = moment().endOf('day').toDate();

    constructor(public dialogRef: MatDialogRef<ExportMetadataDialogComponent>,
        public snackBar: MatSnackBar,
        @Inject(ExportMetadataService)
        public exportMetaService: ExportMetadataService,
        @Inject(EventService)
        public eventService: any,
        @Inject(LocalStorageService)
        public storageService: any,
        @Inject(FilterService) private filterService: any) {
        this.token = this.storageService.getToken();
    }

    openExport(): void {
        this.isExportOpen = true;
    }

    ngOnInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;

        // If the user changes the sort order, reset back to the first page.
        this.sort.sortChange.subscribe(() => this.paginator.firstPage());
        this.loadData();

        this.toggleTime();
        this.exportEvent = { selected: this.filterService.getEvent() };
        this.exportFormat = this.exportFormats[0];
    }

    loadData(): void {
        this.isLoadingResults = true;
        this.uiModels = [];
        this.exportMetaService.getMyExportMetadata().subscribe((data: ExportMetadata[]) => {
            let map = new Map<any, string>();
            data.forEach(meta => {
                if (!map.has(meta.options.eventId)) {
                    const eventName = this.eventService.getEventById(meta.options.eventId).name;
                    map.set(meta.options.eventId, eventName);
                }
                let metaUI: ExportMetadataUI = new ExportMetadataUI();
                Object.keys(meta).forEach(key => metaUI[key] = meta[key]);
                metaUI.eventName = map.get(meta.options.eventId);
                this.uiModels.push(metaUI);
            });
            this.dataSource.data = this.uiModels;
            this.isLoadingResults = false;
        }, (error: any) => {
            console.log("Error getting my export metadata " + error)
        });
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    retryExport(meta: ExportMetadataUI): void {
        this.exportMetaService.retryExport(meta).subscribe((response: ExportResponse) => {
            const msg: string = "Retrying export";
            this.snackBar.open(msg, null, { duration: 2000 });
            //TODO delay by snackbar timeout?
            this.loadData();
        });
    }

    scheduleDeleteExport(meta: ExportMetadataUI): void {
        meta.undoable = true;
        const self = this;
        this.snackBar.open("Export removed", "Undo", {
            duration: 2000,
        }).onAction().subscribe(() => {
            self.undoDelete(meta);
        });
        meta.undoTimerHandle = setTimeout(() => {
            meta.undoTimerHandle = null;
            this.deleteExport(meta);
        }, 10000);
    }

    private deleteExport(meta: ExportMetadataUI): void {
        this.exportMetaService.deleteExport(meta._id).subscribe(() => {
            const idx: number = this.uiModels.indexOf(meta);

            if (idx > -1) {
                this.uiModels.splice(idx, 1);
                this.dataSource.data = this.uiModels;
                if (this.dataSource.paginator) {
                    this.dataSource.paginator.firstPage();
                }
            }
        });
    }

    undoDelete(meta: Undoable): void {
        meta.undoable = false;
        clearTimeout(meta.undoTimerHandle);
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

    private setOffset(): void {
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

    private numDigits(x: number): number {
        return Math.max(Math.floor(Math.log10(Math.abs(x))), 0) + 1;
    }

    exportData($event: any): void {
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
