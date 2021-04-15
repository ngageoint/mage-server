import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ExportMetadataDialogComponent, ExportMetadataUI } from './export-metadata-dialog.component';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatOptionModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { LocalStorageService, EventService, FilterService } from '../upgrade/ajs-upgraded-providers';
import { ExportMetadataService, ExportMetadata, ExportRequest, ExportResponse } from './services/export-metadata.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CdkDetailRowDirective } from './directives/cdk-detail-row.directive';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule, NgxMatNativeDateModule } from '@angular-material-components/datetime-picker';
import { FormsModule } from '@angular/forms';

describe('Export Metadata Dialog Component', () => {

    let component: ExportMetadataDialogComponent;
    let fixture: ComponentFixture<ExportMetadataDialogComponent>;
    const tokenString: string = '1234567890';
    let exportMetadataServiceSpy: jasmine.SpyObj<ExportMetadataService>;

    beforeEach(async(() => {
        const fakeLocalStorageService = { getToken: () => tokenString };
        const event = {
            id: 1
        };
        const fakeFilterService = { getEvent: () => event };
        const fakeDialogRef = { close: () => { } };

        exportMetadataServiceSpy =
            jasmine.createSpyObj('ExportMetadataService', ['getMyExportMetadata', 'performExport', 'retryExport']);
        const myMetadata: ExportMetadata[] = [{
            _id: 1,
            userId: 1,
            physicalPath: '/tmp/test.kml',
            filename: 'test.kml',
            exportType: 'kml',
            location: '/api/exports/1',
            status: 'Running',
            options: {
                eventId: event.id
            }
        },
        {
            _id: 2,
            userId: 1,
            physicalPath: '/tmp/test.csv',
            filename: 'test.csv',
            exportType: 'csv',
            location: '/api/exports/2',
            status: 'Completed',
            options: {
                eventId: event.id
            }
        },
        {
            _id: 3,
            userId: 1,
            physicalPath: '/tmp/test.json',
            filename: 'test.json',
            exportType: 'json',
            location: '/api/exports/3',
            status: 'Failed',
            options: {
                eventId: event.id
            }
        }];

        const metaObservable: Observable<ExportMetadata[]> = new Observable<ExportMetadata[]>(
            function subscribe(subscriber) {
                try {
                    subscriber.next(myMetadata);
                    subscriber.complete();
                } catch (e) {
                    subscriber.error(e);
                }
            }
        );

        exportMetadataServiceSpy.getMyExportMetadata.and.returnValue(metaObservable);

        const eventServiceSpy = jasmine.createSpyObj('EventService', ['getEventById']);
        eventServiceSpy.getEventById.withArgs(1).and.returnValue("Test Event Name");

        TestBed.configureTestingModule({
            imports: [MatPaginatorModule, MatSortModule, MatSnackBarModule, MatTableModule, MatDialogModule,
                MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatIconModule, HttpClientTestingModule,
                NoopAnimationsModule, MatCheckboxModule, MatListModule, MatCardModule, MatExpansionModule, MatRadioModule,
                MatSelectModule, MatOptionModule, MatDatepickerModule, MatNativeDateModule,
                NgxMatDatetimePickerModule, NgxMatTimepickerModule, NgxMatNativeDateModule, FormsModule, MatChipsModule],
            providers: [
                { provide: EventService, useValue: eventServiceSpy },
                { provide: LocalStorageService, useValue: fakeLocalStorageService },
                { provide: MatDialogRef, useValue: fakeDialogRef },
                { provide: ExportMetadataService, useValue: exportMetadataServiceSpy },
                { provide: FilterService, useValue: fakeFilterService }
            ],
            declarations: [CdkDetailRowDirective, ExportMetadataDialogComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        expect(TestBed.inject(LocalStorageService)).toBeTruthy();
        expect(TestBed.inject(ExportMetadataService)).toBeTruthy();
        expect(TestBed.inject(EventService)).toBeTruthy();
        expect(TestBed.inject(FilterService)).toBeTruthy();

        fixture = TestBed.createComponent(ExportMetadataDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should wire up components to datasource', () => {
        expect(component.dataSource.paginator).toBeTruthy();
        expect(component.dataSource.sort).toBeTruthy();
        expect(component.token).toEqual(tokenString);

        expect(component.dataSource.data.length).toBe(3);
    });

    it('should filter', () => {
        const event: any = {
            target: {
                value: 'kml'
            }
        };
        expect(component.dataSource.filteredData.length).toBe(3);
        component.applyFilter(event);
        expect(component.dataSource.paginator.pageIndex).toBe(0);
        expect(component.dataSource.filteredData.length).toBe(1);
        expect(component.dataSource.filteredData[0]._id).toBe(1);
    });

    it('should open export view', () => {
        expect(component.isExportOpen).toBe(false);
        component.openExport();
        expect(component.isExportOpen).toBe(true);
    });

    it('should retry export', () => {
        const meta: ExportMetadataUI = {
            _id: '1',
            userId: '1',
            physicalPath: '/tmp',
            exportType: 'GeoJSON',
            location: '/export',
            status: 'Failed',
            options: {},
            eventName: 'Test Event',
            undoable: false
        };

        const responseObs: Observable<ExportResponse> = new Observable<ExportResponse>(
            function subscribe(subscriber) {
                try {
                    const response: ExportResponse = {
                        exportId: '11111'
                    };
                    subscriber.next(response);
                    subscriber.complete();
                } catch (e) {
                    subscriber.error(e);
                }
            }
        );

        exportMetadataServiceSpy.retryExport.withArgs(meta).and.returnValue(responseObs);
        component.retryExport(meta);
        expect(exportMetadataServiceSpy.retryExport).toHaveBeenCalled();
    });

    it('should delete', () => {
        const meta: any = {
            undoable: false,
            undoTimerHandle: null
        };
        component.scheduleDeleteExport(meta);
        expect(meta.undoable).toEqual(true);
        expect(meta.undoTimerHandle).toBeTruthy();
        //TODO wait 10seconds
    });

    it('should undo delete', () => {
        const meta: any = {
            undoable: false,
            undoTimerHandle: null
        };
        component.scheduleDeleteExport(meta);
        expect(meta.undoable).toEqual(true);
        expect(meta.undoTimerHandle).toBeTruthy();
        component.undoDelete(meta);
        expect(meta.undoable).toEqual(false);
        expect(meta.undoTimerHandle).toBeFalsy();
    });

    it('should set start date', () => {
        const start = new Date();
        const event: any = {
            value: start
        };
        component.onStartDate(event);
        expect(component.startDate).toEqual(start);
    });

    it('should set end date', () => {
        const end = new Date();
        const event: any = {
            value: end
        };
        component.onEndDate(event);
        expect(component.endDate).toEqual(end);
    });

    it('should toggle time', () => {
        expect(component.localTime).toBeTruthy();
        expect(component.currentOffset).toContain('LOCAL');
        component.toggleTime();
        expect(component.localTime).toBeFalsy();
        expect(component.currentOffset).toContain('GMT');
    });

    it('should export', () => {
        const start = new Date();
        const end = new Date();
        const event: any = {
            value: start
        };
        component.onStartDate(event);
        event.value = end;
        component.onEndDate(event);
        const exportFormat = component.exportFormats[1];
        component.changeFormat(exportFormat);

        exportMetadataServiceSpy.performExport.and.callFake(fakeExport);
        component.exportData({});
    });

    function fakeExport(request: ExportRequest): Observable<ExportResponse> {
        expect(request).toBeTruthy();
        expect(request.exportType).toEqual(component.exportFormat);
        expect(request.eventId).toEqual(1);
        expect(request.observations).toEqual(component.exportObservations);
        expect(request.locations).toEqual(component.exportLocations);
        expect(request.attachments).toEqual(component.excludeObservationsAttachments);
        expect(request.favorites).toEqual(component.exportFavoriteObservations);
        expect(request.important).toEqual(component.exportImportantObservations);

        const obs: Observable<ExportResponse> = new Observable<ExportResponse>(
            function subscribe(subscriber) {
                try {
                    const response: ExportResponse = {
                        exportId: '0987'
                    }
                    subscriber.next(response);
                    subscriber.complete();
                } catch (e) {
                    subscriber.error(e);
                }
            }
        );

        return obs;
    }

    it('should change export format', () => {
        const badFormat = "test";
        expect(function () {
            component.changeFormat(badFormat);
        }).toThrowError(Error);

        const goodFormat = component.exportFormats[0];
        component.changeFormat(goodFormat);
        expect(component.exportFormat).toEqual(goodFormat);
    });
});