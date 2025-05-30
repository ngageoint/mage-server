import { HttpClientTestingModule } from "@angular/common/http/testing";
import { ComponentFixture, TestBed, waitForAsync } from "@angular/core/testing";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatChipsModule } from "@angular/material/chips";
import { MatOptionModule, MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatListModule } from "@angular/material/list";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar, MatSnackBarDismiss, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatSortModule } from "@angular/material/sort";
import { MatTableModule } from "@angular/material/table";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { Observable, of, Subject } from "rxjs";
import { ExportDialogComponent } from "../export-dialog.component";
import { ExportRequest, ExportResponse, Export, ExportService } from "../export.service";
import { ExportDataComponent } from "./export-data.component";
import { FilterService } from "src/app/filter/filter.service";

class MockExportService {
    getExports(): Observable<any> {
        return of([{
            id: 1,
            userId: 1,
            physicalPath: '/tmp/test.kml',
            filename: 'test.kml',
            exportType: 'kml',
            url: '/api/exports/1',
            status: 'Running',
            options: {
                event: {
                    name: 'Test Event'
                }
            }
        }, {
            id: 2,
            userId: 1,
            physicalPath: '/tmp/test.csv',
            filename: 'test.csv',
            exportType: 'csv',
            url: '/api/exports/2',
            status: 'Completed',
            options: {
                event: {
                    name: 'Test Event'
                }
            }
        }, {
            id: 3,
            userId: 1,
            physicalPath: '/tmp/test.json',
            filename: 'test.json',
            exportType: 'json',
            url: '/api/exports/3',
            status: 'Failed',
            options: {
                event: {
                    name: 'Test Event'
                }
            }
        }])
    }

    export(request: ExportRequest): Observable<ExportResponse> {
        return of({ id: '1' })
    }

    retryExport(retry: Export): Observable<ExportResponse> {
        return of({ id: retry.id })
    }

    deleteExport(id: string): Observable<{ id: string }> {
        return of({ id })
    }
}

class MockSnackbarRef {
    private readonly _afterDismissed = new Subject<MatSnackBarDismiss>()

    afterDismissed(): Observable<MatSnackBarDismiss> {
      return this._afterDismissed
    }

    dismiss(): void {
      this._afterDismissed.next({ dismissedByAction: false })
      this._afterDismissed.complete()
    }

    dismissWithAction(): void {
      this._afterDismissed.next({ dismissedByAction: true })
      this._afterDismissed.complete()
    }
  }

class MockSnackbar {
    private snackbarRef = new MockSnackbarRef()

    get _openedSnackBarRef(): any {
      return this.snackbarRef
    }

    open(): any {
      return this.snackbarRef
    }
  }

describe('ExportDataComponent', () => {
    let component: ExportDataComponent;
    let fixture: ComponentFixture<ExportDataComponent>;

    beforeEach(waitForAsync(() => {
        const mockFilterService = { getEvent: (): any => { return { id: 1 } } };

        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, MatPaginatorModule, MatSortModule, MatSnackBarModule, MatTableModule,
                MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatIconModule, HttpClientTestingModule,
                NoopAnimationsModule, MatCheckboxModule, MatListModule, MatCardModule, MatExpansionModule, MatRadioModule,
                MatSelectModule, MatOptionModule, MatDatepickerModule, MatNativeDateModule, FormsModule, MatChipsModule],
            providers: [
                { provide: ExportService, useClass: MockExportService },
                { provide: FilterService, useValue: mockFilterService },
                { provide: MatSnackBar, useClass: MockSnackbar }
            ],
            declarations: [ExportDialogComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ExportDataComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should set start date', () => {
        const date = new Date();
        component.onStartDate(date);
        expect(component.startDate).toEqual(date);
    });

    it('should set end date', () => {
        const date = new Date();
        component.onEndDate(date);
        expect(component.endDate).toEqual(date);
    });

    it('should export', () => {
        const exportService: ExportService = fixture.debugElement.injector.get(ExportService)
        const exportSpy = spyOn(exportService, 'export').and.callThrough()

        const start = '2021-05-04T00:00:00.000Z'
        component.onStartDate(new Date(Date.parse(start)))

        const end = '2021-05-05T00:00:00.000Z'
        component.onEndDate(new Date(Date.parse(end)))

        component.exportTime = 'custom'

        component.changeFormat('KML');

        component.exportData();
        expect(exportSpy).toHaveBeenCalledWith({
            exportType: 'KML',
            eventId: 1,
            observations: true,
            locations: true,
            startDate: start,
            endDate: end,
            attachments: undefined,
            favorites: undefined,
            important: undefined
        })
    })

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
