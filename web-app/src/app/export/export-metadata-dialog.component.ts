import { Component, OnInit, AfterViewInit, ViewChild, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportMetadataService, ExportMetadata } from './export-metadata.service';
import { EventService, LocalStorageService } from '../upgrade/ajs-upgraded-providers';

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
    providers: [ExportMetadataService]
})
export class ExportMetadataDialogComponent implements OnInit, AfterViewInit {
    @ViewChild(MatPaginator, { static: true })
    paginator: MatPaginator;
    @ViewChild(MatSort, { static: true })
    sort: MatSort;
    displayedColumns: string[] = ['status', 'type', 'url', 'event', 'startDate', 'endDate', 'delete'];
    dataSource = new MatTableDataSource<ExportMetadataUI>();
    isLoadingResults: boolean = true;
    token: any;
    private uiModels: ExportMetadataUI[] = [];

    constructor(public dialogRef: MatDialogRef<ExportMetadataDialogComponent>,
        public exportMetaService: ExportMetadataService,
        public snackBar: MatSnackBar,
        @Inject(EventService)
        public eventService: any,
        @Inject(LocalStorageService)
        public storageService: any) {
        this.token = this.storageService.getToken();
    }

    openExport(): void {
        this.dialogRef.close('openExport');
    }

    ngOnInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;

        // If the user changes the sort order, reset back to the first page.
        this.sort.sortChange.subscribe(() => this.paginator.firstPage());
    }

    ngAfterViewInit(): void {
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
        console.log("retry " + meta.location);
        //TODO implement
    }

    scheduleDeleteExport(meta: ExportMetadataUI): void {
        meta.undoable = true;
        const self = this;
        this.snackBar.open("Export will be removed in 10 seconds", "Undo", {
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
}
