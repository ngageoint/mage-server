import { Component, OnInit, Inject, QueryList, ViewChildren, ElementRef, EventEmitter, Output } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportService, ExportResponse, ExportRequest } from '../export.service';
import { FilterService } from '../../upgrade/ajs-upgraded-providers';
import * as moment from 'moment'
import { first } from 'rxjs/operators';
import { trigger, transition, style, animate, state } from '@angular/animations';

export interface ExportTimeOption {
	all?: boolean,
	custom?: boolean,
	value: number,
	label: string,
	key: string
}

@Component({
	selector: 'export-data',
	templateUrl: 'export-data.component.html',
	styleUrls: ['./export-data.component.scss'],
	animations: [
		trigger('expand', [
			transition(':enter', [
				style({ height: 0, opacity: 0 }),
				animate('250ms', style({ height: '*', opacity: 1 })),
			]),
			transition(':leave', [
				animate('250ms', style({ height: 0, opacity: 0, overflow: 'hidden' }))
			])
		]),
		trigger('rotate', [
			state('true', style({ transform: 'rotate(180deg)' })),
			state('false', style({ transform: 'rotate(0)' })),
			transition('* <=> *', animate('300ms ease-out'))
		])
	]
})
export class ExportDataComponent implements OnInit {

	@ViewChildren('advanced') advanced: QueryList<any>;
	@Output() close = new EventEmitter<void>();

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

	exportTime = 'twentyfour';
	exportFormat: string;
	exportFormats: string[] = ['GeoPackage', 'KML', 'GeoJSON', 'CSV'];
	defaultStartDate: Date
	defaultEndDate: Date
	startDate: Date
	endDate: Date

	constructor(
		public snackBar: MatSnackBar,
		@Inject(ExportService) public exportService: ExportService,
		@Inject(FilterService) private filterService: any) {

		this.defaultStartDate = moment().startOf('day').toDate()
		this.defaultEndDate = moment().endOf('day').toDate()
	}

	ngOnInit(): void {
		this.exportEvent = { selected: this.filterService.getEvent() };
		this.exportFormat = this.exportFormats[0];
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
			if (queryList && queryList.last) {
				queryList.last.nativeElement.scrollIntoView({ behavior: 'smooth' })
			}
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

		this.close.emit();
	}

	changeFormat(format: string): void {
		if (this.exportFormats.indexOf(format) == -1) {
			throw new Error(format + ' is not a supported format');
		}
		this.exportFormat = format;
	}
}
