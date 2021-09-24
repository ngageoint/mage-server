import { Component, OnInit, ViewChild, Inject, QueryList, ViewChildren, ElementRef, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportService, Export, ExportResponse, ExportRequest } from './export.service';
import { LocalStorageService, FilterService } from '../upgrade/ajs-upgraded-providers';
import { animate, state, style, transition, trigger } from '@angular/animations';
import * as moment from 'moment'
import { Observable, Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';

export interface ExportTimeOption {
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
	animations: [
		trigger('slide', [
			transition(':enter', [
				style({ transform: 'translateX(100%)' }),
				animate('250ms', style({ transform: 'translateX(0%)' })),
			]),
			transition(':leave', [
				animate('250ms', style({ transform: 'translateX(100%)' }))
			])
		]),
		trigger('expand', [
			transition(':enter', [
				style({ height: 0, opacity: 0 }),
				animate('250ms', style({ height: '*', opacity: 1 })),
			]),
			transition(':leave', [
				animate('250ms', style({ height: 0, opacity: 0, overflow: 'hidden' }))
			])
		]),
		trigger('detailExpand', [
			state('collapsed', style({ height: '0px', minHeight: '0' })),
			state('expanded', style({ height: '*' })),
			transition('expanded <=> collapsed', animate('250ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
		]),
		trigger('rotate', [
			state('true', style({ transform: 'rotate(180deg)' })),
			state('false', style({ transform: 'rotate(0)' })),
			transition('* <=> *', animate('300ms ease-out'))
		]),
		trigger('cell', [
			transition(':enter', [
				style({ 'min-height': 0, height: 0, opacity: 0 }),
				animate('250ms', style({ 'min-height': '*', height: '*', opacity: 1 })),
			]),
			transition(':leave', [
				animate('250ms', style({ 'min-height': 0, height: 0, opacity: 0 }))
			])
		])
	]
})
export class ExportDialogComponent implements OnInit, OnDestroy {

	@ViewChild(MatTable, { static: true }) table: MatTable<Export>
	@ViewChild(MatSort, { static: true }) sort: MatSort
	@ViewChildren('advanced') advanced: QueryList<any>
	
	columnsToDisplay: string[] = ['status', 'type', 'url', 'event', 'delete'];
	expandedExport: any
	dataSource = new MatTableDataSource<Export>();

	isLoadingResults = true;
	token: any;
	isExportOpen = false;
	exportEvent: any;
	exportObservations = true;
	exportLocations = true;
	exportFavoriteObservations: boolean;
	exportImportantObservations: boolean;
	excludeObservationsAttachments: boolean;
	showAdvanced = false;
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

	exportTime = 'five';
	exportFormat: string;
	exportFormats: string[] = ['KML', 'GeoJSON', 'GeoPackage', 'CSV'];
	defaultStartDate: Date
	defaultEndDate: Date
	startDate: Date
	endDate: Date

	refreshTimer: Observable<number> = timer(0, 5000)
	private refreshSubscription: Subscription;

	constructor(public dialogRef: MatDialogRef<ExportDialogComponent>,
		public snackBar: MatSnackBar,
		@Inject(ExportService) public exportService: ExportService,
		@Inject(LocalStorageService) public storageService: any,
		@Inject(FilterService) private filterService: any) {

		this.token = this.storageService.getToken();

		this.defaultStartDate = moment().startOf('day').toDate()
		this.defaultEndDate = moment().endOf('day').toDate()
	}

	ngOnInit(): void {
		this.dataSource.sort = this.sort;

		this.fetchExports();
		this.exportEvent = { selected: this.filterService.getEvent() };
		this.exportFormat = this.exportFormats[0];
	}

	ngOnDestroy(): void {
		this.refreshSubscription.unsubscribe()
	}

	openExport(): void {
		this.isExportOpen = true;
	}

	fetchExports(): void {
		this.dataSource.data = [];
		this.exportService.getExports().subscribe((exports: Export[]) => {
			this.isLoadingResults = false;
			this.dataSource.data = exports;
			this.refreshSubscription = this.refreshTimer.subscribe(() => this.refreshExports())
		}, () => {
			this.isLoadingResults = false;
			this.snackBar.open("Failed to load exports", null, { duration: 2000 });
		});
	}

	refreshExports(): void {
		this.exportService.getExports().subscribe((exports: Export[]) => {
			exports.forEach(exp => {
				const existingExport = this.dataSource.data.find(data => data.id === exp.id)
				if (existingExport) {
					existingExport.status = exp.status
				}
			})
		})
	}

	applyFilter(event: Event): void {
		const filterValue = (event.target as HTMLInputElement).value;
		this.dataSource.filter = filterValue.trim().toLowerCase();
	}

	retryExport(retry: Export): void {
		this.exportService.retryExport(retry).subscribe((response: ExportResponse) => {
			this.snackBar.open('Retrying Export', null, { duration: 3000 })
			const retryExport = this.dataSource.data.find(data => data.id === retry.id)
			retryExport.status = 'Running'
		});
	}

	scheduleDeleteExport(exp: Export): void {
		const exports = this.dataSource.data
		const index: number = exports.indexOf(exp)
		if (index !== -1) {
			exports.splice(index, 1);
			this.dataSource.data = exports
		}

		const ref = this.snackBar.open("Export Deleted", "Undo", {
			duration: 5000,
		})
		
		ref.afterDismissed().subscribe(event => {
			console.log('CODE = snackbar dismissed', event)
			if (event.dismissedByAction) {
				exports.splice(index, 0, exp);
				this.dataSource.data = exports
			} else {
				this.deleteExport(exp)
			}
		})
	}

	private deleteExport(exp: Export): void {
		this.exportService.deleteExport(exp.id).subscribe();
	}

	onStartDate(date: Date): void {
		this.startDate = date;
	}

	onEndDate(date: Date): void {
		this.endDate = date;
	}

	onAdvanced(): void {
		this.showAdvanced = !this.showAdvanced

		this.advanced.changes.pipe(first()).subscribe((queryList: QueryList<ElementRef>) => {
			queryList.last.nativeElement.scrollIntoView({ behavior: 'smooth'})
		})
	}

	exportData(): void {
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
			start = moment(this.startDate).toISOString();
			end = moment(this.endDate).toISOString();
		} else if (exportTimeOption.value) {
			start = moment().subtract(exportTimeOption.value, 'seconds').toISOString();
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

		this.exportService.export(exportRequest).subscribe((response: ExportResponse) => {
			this.snackBar.open('Export Started', null, { duration: 3000 });
		});

		this.dialogRef.close();
	}

	changeFormat(format: string): void {
		if (this.exportFormats.indexOf(format) == -1) {
			throw new Error(format + ' is not a supported format');
		}
		this.exportFormat = format;
	}
}
