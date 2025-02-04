import { ComponentFixture, fakeAsync, TestBed, waitForAsync } from '@angular/core/testing';
import { Observable, of, Subject } from 'rxjs';
import { ExportDialogComponent } from './export-dialog.component';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatOptionModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarDismiss, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ExportService, Export, ExportRequest, ExportResponse } from './export.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LocalStorageService } from '../http/local-storage.service';
import { FilterService } from '../filter/filter.service';

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

describe('ExportDialogComponent', () => {

  let component: ExportDialogComponent;
  let fixture: ComponentFixture<ExportDialogComponent>;

  beforeEach(waitForAsync(() => {
    const mockLocalStorageService = { getToken: (): string => '1' };
    const mockFilterService = { getEvent: (): any => { return { id: 1 } } };
    const mockDialogRef = { close: (): void => { } };

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MatPaginatorModule, MatSortModule, MatSnackBarModule, MatTableModule, MatDialogModule,
        MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatIconModule, HttpClientTestingModule,
        NoopAnimationsModule, MatCheckboxModule, MatListModule, MatCardModule, MatExpansionModule, MatRadioModule,
        MatSelectModule, MatOptionModule, MatDatepickerModule, MatNativeDateModule, FormsModule, MatChipsModule],
      providers: [
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: ExportService, useClass: MockExportService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MatSnackBar, useClass: MockSnackbar }
      ],
      declarations: [ExportDialogComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should wire up components to datasource', () => {
    expect(component.dataSource.sort).toBeTruthy();
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
    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].id).toBe(1);
  });

  it('should open export view', () => {
    expect(component.isExportOpen).toBe(false);
    component.openExport();
    expect(component.isExportOpen).toBe(true);
  });

  it('should retry export', () => {
    const exportService: ExportService = fixture.debugElement.injector.get(ExportService);
    const retrySpy = spyOn(exportService, 'retryExport').and.callThrough()

    const retry: Export = {
      id: 1,
      userId: '1',
      physicalPath: '/tmp',
      exportType: 'GeoJSON',
      url: '/export',
      status: 'Failed',
      options: {
        eventName: 'Test Event'
      }
    };

    component.retryExport(retry);
    expect(retrySpy).toHaveBeenCalled();
  });

  it('should schedule export delete', () => {
    component.dataSource.data = [{
      id: '1',
      userId: '1',
      physicalPath: '',
      exportType: 'KML',
      options: {},
      url: '/api/exports/1',
      status: 'Completed'
    }]

    const exp = component.dataSource.data[0];
    component.scheduleDeleteExport(exp);
    expect(component.dataSource.data.length).toEqual(0);
  });

  it('should delete export', fakeAsync(() => {
    const exportService: ExportService = fixture.debugElement.injector.get(ExportService);
    const deleteSpy = spyOn(exportService, 'deleteExport').and.callThrough()

    component.dataSource.data = [{
      id: '1',
      userId: '1',
      physicalPath: '',
      exportType: 'KML',
      options: {},
      url: '/api/exports/1',
      status: 'Completed'
    }]

    const exp = component.dataSource.data[0];
    component.scheduleDeleteExport(exp);
    fixture.detectChanges()

    component.snackBar._openedSnackBarRef.dismiss()

    expect(deleteSpy).toHaveBeenCalled()
  }));

  it('should undo delete export', fakeAsync(() => {
    const exportService: ExportService = fixture.debugElement.injector.get(ExportService);
    const deleteSpy = spyOn(exportService, 'deleteExport').and.callThrough()

    component.dataSource.data = [{
      id: '1',
      userId: '1',
      physicalPath: '',
      exportType: 'KML',
      options: {},
      url: '/api/exports/1',
      status: 'Completed'
    }]

    const exp = component.dataSource.data[0];
    component.scheduleDeleteExport(exp);
    fixture.detectChanges()
    expect(component.dataSource.data.length).toBe(0)

    component.snackBar._openedSnackBarRef.dismissWithAction()
    expect(deleteSpy).toHaveBeenCalledTimes(0)
    expect(component.dataSource.data.length).toBe(1)
  }));
});
