import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ExportMetadataDialogComponent } from './export-metadata-dialog.component';
import { MatDialogModule, MatPaginatorModule, MatSortModule, MatSnackBarModule, MatTableModule, MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatIconModule, MatDialogRef, MatTabsModule, MatCheckboxModule, MatListModule } from '@angular/material';
import { LocalStorageService, EventService } from '../upgrade/ajs-upgraded-providers';
import { ExportMetadataService, ExportMetadata } from './export-metadata.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CdkDetailRowDirective } from './cdk-detail-row.directive';

describe('Export Metadata Dialog Component', () => {

    let component: ExportMetadataDialogComponent;
    let fixture: ComponentFixture<ExportMetadataDialogComponent>;
    const tokenString: string = '1234567890';

    beforeEach(async(() => {
        const fakeLocalStorageService = { getToken: () => tokenString };

        const exportMetadataServiceSpy: jasmine.SpyObj<ExportMetadataService> =
            jasmine.createSpyObj('ExportMetadataService', ['getMyExportMetadata']);
        const myMetadata: ExportMetadata[] = [{
            _id: 1,
            userId: 1,
            physicalPath: '/tmp/test.kml',
            filename: 'test.kml',
            exportType: 'kml',
            location: '/api/exports/1',
            status: 'Running',
            options: {
                eventId: 1
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
                eventId: 1
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
                NoopAnimationsModule, MatTabsModule, MatCheckboxModule, MatListModule],
            providers: [
                { provide: EventService, useValue: eventServiceSpy },
                { provide: LocalStorageService, useValue: fakeLocalStorageService },
                { provide: MatDialogRef, useValue: {} },
                { provide: ExportMetadataService, useValue: exportMetadataServiceSpy }
            ],
            declarations: [CdkDetailRowDirective, ExportMetadataDialogComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        expect(TestBed.get(LocalStorageService)).toBeTruthy();
        expect(TestBed.get(ExportMetadataService)).toBeTruthy();
        expect(TestBed.get(EventService)).toBeTruthy();

        fixture = TestBed.createComponent(ExportMetadataDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should wire up components to datasource', () => {
        expect(component.dataSource.paginator).toBeTruthy();
        expect(component.dataSource.sort).toBeTruthy();
        expect(component.token).toEqual(tokenString);

        expect(component.dataSource.data.length).toBe(2);
    });

    it('should filter', () => {
        const event: any = {
            target: {
                value: 'kml'
            }
        };
        expect(component.dataSource.filteredData.length).toBe(2);
        component.applyFilter(event);
        expect(component.dataSource.paginator.pageIndex).toBe(0);
        expect(component.dataSource.filteredData.length).toBe(1);
        expect(component.dataSource.filteredData[0]._id).toBe(1);
    });
});