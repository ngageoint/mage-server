import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, of, Subject } from 'rxjs';
import { ExportDialogComponent } from './export-dialog.component';
import {
  ExportService,
  Export,
  ExportRequest,
  ExportResponse
} from './export.service';
import { MatSnackBarDismiss } from '@angular/material/snack-bar';

class MockExportService {
  getExports(): Observable<any> {
    return of([
      {
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
      },
      {
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
      },
      {
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
      }
    ]);
  }

  export(_request: ExportRequest): Observable<ExportResponse> {
    return of({ id: '1' });
  }

  retryExport(retry: Export): Observable<ExportResponse> {
    return of({ id: String(retry.id) });
  }

  deleteExport(id: string): Observable<{ id: string }> {
    return of({ id });
  }
}

class MockSnackbarRef {
  private readonly afterDismissedSubject = new Subject<MatSnackBarDismiss>();

  afterDismissed(): Observable<MatSnackBarDismiss> {
    return this.afterDismissedSubject.asObservable();
  }

  dismiss(): void {
    this.afterDismissedSubject.next({ dismissedByAction: false });
    this.afterDismissedSubject.complete();
  }

  dismissWithAction(): void {
    this.afterDismissedSubject.next({ dismissedByAction: true });
    this.afterDismissedSubject.complete();
  }
}

class MockSnackbar {
  private snackbarRef = new MockSnackbarRef();

  get _openedSnackBarRef(): MockSnackbarRef {
    return this.snackbarRef;
  }

  open(): MockSnackbarRef {
    this.snackbarRef = new MockSnackbarRef();
    return this.snackbarRef;
  }
}

describe('ExportDialogComponent', () => {
  let component: ExportDialogComponent;
  let exportService: MockExportService;
  let snackBar: MockSnackbar;

  beforeEach(() => {
    const mockDialogRef = {
      close: (): void => {}
    };

    const mockLocalStorageService = {
      getToken: (): string => '1'
    };

    exportService = new MockExportService();
    snackBar = new MockSnackbar();

    component = new ExportDialogComponent(
      mockDialogRef as any,
      snackBar as any,
      exportService as any,
      mockLocalStorageService as any
    );
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should wire up components to datasource', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.dataSource).toBeTruthy();
    expect(component.dataSource.data.length).toBe(3);
    expect(component.dataSource.filteredData.length).toBe(3);
  }));

  it('should filter', () => {
    component.dataSource.filterPredicate = (data: any, filter: string) =>
      data.exportType.toLowerCase().includes(filter.trim().toLowerCase());

    component.dataSource.data = [
      { id: 1, exportType: 'kml' } as any,
      { id: 2, exportType: 'csv' } as any,
      { id: 3, exportType: 'json' } as any
    ];

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
    const retrySpy = spyOn(exportService, 'retryExport').and.callThrough();

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

    component.dataSource.data = [retry];

    component.retryExport(retry);

    expect(retrySpy).toHaveBeenCalledWith(retry);
    expect(component.dataSource.data[0].status).toBe('Running');
  });

  it('should schedule export delete', () => {
    component.dataSource.data = [
      {
        id: '1',
        userId: '1',
        physicalPath: '',
        exportType: 'KML',
        options: {},
        url: '/api/exports/1',
        status: 'Completed'
      } as any
    ];

    const exp = component.dataSource.data[0];

    component.scheduleDeleteExport(exp);

    expect(component.dataSource.data.length).toEqual(0);
  });

  it('should delete export', fakeAsync(() => {
    const deleteSpy = spyOn(exportService, 'deleteExport').and.callThrough();

    component.dataSource.data = [
      {
        id: '1',
        userId: '1',
        physicalPath: '',
        exportType: 'KML',
        options: {},
        url: '/api/exports/1',
        status: 'Completed'
      } as any
    ];

    const exp = component.dataSource.data[0];

    component.scheduleDeleteExport(exp);

    snackBar._openedSnackBarRef.dismiss();
    tick();

    expect(deleteSpy).toHaveBeenCalledWith('1');
  }));

  it('should undo delete export', fakeAsync(() => {
    const deleteSpy = spyOn(exportService, 'deleteExport').and.callThrough();

    component.dataSource.data = [
      {
        id: '1',
        userId: '1',
        physicalPath: '',
        exportType: 'KML',
        options: {},
        url: '/api/exports/1',
        status: 'Completed'
      } as any
    ];

    const exp = component.dataSource.data[0];

    component.scheduleDeleteExport(exp);

    expect(component.dataSource.data.length).toBe(0);

    snackBar._openedSnackBarRef.dismissWithAction();
    tick();

    expect(deleteSpy).toHaveBeenCalledTimes(0);
    expect(component.dataSource.data.length).toBe(1);
  }));
});