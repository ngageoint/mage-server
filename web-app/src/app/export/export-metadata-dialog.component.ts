import { Component, OnInit, AfterViewInit, ViewChild, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ExportMetadataService, ExportMetadata } from './export-metadata.service';
import { EventService } from '../upgrade/ajs-upgraded-providers';

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
    dataSource = new MatTableDataSource<ExportMetadata>();
    isLoadingResults: boolean = true;

    constructor(private dialogRef: MatDialogRef<ExportMetadataDialogComponent>,
        private exportMetaService: ExportMetadataService,
        @Inject(EventService)
        private eventService: any) { }

    openExport(): void {
        this.dialogRef.close('openExport');
    }

    ngOnInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    ngAfterViewInit(): void {
        // If the user changes the sort order, reset back to the first page.
        this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
        this.isLoadingResults = true;
        this.exportMetaService.getMyExportMetadata().subscribe((data: ExportMetadata[]) => {
            let map = new Map<any, string>();
            data.forEach(meta => {
                if(!map.has(meta.options.eventId)) {
                    const eventName = this.eventService.getEventById(meta.options.eventId).name;
                    map.set(meta.options.eventId, eventName);
                }
                meta.eventName = map.get(meta.options.eventId);
            });
            this.dataSource.data = data;
            this.isLoadingResults = false;
        });
    }

    doFilter(filter: string): void {
        this.dataSource.filter = filter.trim().toLocaleLowerCase();
    }

    redirectToDelete(id: string): void {
        //TODO implement
    }
}
