import { Component, OnInit, ViewChild, Inject, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportService, Export, ExportResponse } from './export.service';
import { LocalStorageService } from '../upgrade/ajs-upgraded-providers';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Observable, Subscription, timer } from 'rxjs';

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
		trigger('detailExpand', [
			state('collapsed', style({ height: '0px', minHeight: '0' })),
			state('expanded', style({ height: '*' })),
			transition('expanded <=> collapsed', animate('250ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
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

	columnsToDisplay: string[] = ['status', 'type', 'url', 'event', 'delete'];
	expandedExport: any
	dataSource = new MatTableDataSource<Export>();

	isLoadingResults = true;
	token: any;
	isExportOpen = false;
	isEmptyStateDisplayed = true;

	refreshTimer: Observable<number> = timer(0, 5000)
	private refreshSubscription: Subscription;

	constructor(public dialogRef: MatDialogRef<ExportDialogComponent>,
		public snackBar: MatSnackBar,
		@Inject(ExportService) public exportService: ExportService,
		@Inject(LocalStorageService) public storageService: any) {

		this.token = this.storageService.getToken();
	}

	ngOnInit(): void {
		this.dataSource.sort = this.sort;

		this.fetchExports();
	}

	ngOnDestroy(): void {
		if (this.refreshSubscription) {
			this.refreshSubscription.unsubscribe();
		}
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

	showExport(): boolean {
		return this.isExportOpen;
	}

	onExportDataClosed(): void {
		this.dialogRef.close();
	}

	showEmptyState(): boolean {
		if (this.isLoadingResults) {
			return false;
		}
		if (!this.isEmptyStateDisplayed) {
			return false;
		}

		return this.dataSource.data == null || this.dataSource.data.length === 0;
	}

	onEmptyStateClosed(): void {
		this.isEmptyStateDisplayed = false;
		this.openExport();
	}
}
