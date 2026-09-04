import { TestBed } from '@angular/core/testing';
import { ExportService } from './export.service';
import { Export, ExportFormat, ExportRequest, ExportStatus } from './entities.export';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

function stubExport(id: string): Export {
  return {
    id,
    exportType: 'kml',
    url: `/api/exports/mine/${id}`,
    status: ExportStatus.Running,
    options: {}
  };
}

describe('ExportService', () => {
  let httpTestingController: HttpTestingController;
  let service: ExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [ExportService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
    });

    TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ExportService);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should fetch my exports and publish them', () => {
    const data: Export[] = [stubExport('1')];

    service.fetchExports().subscribe(exports => {
      expect(exports).toEqual(data);
    });

    const req = httpTestingController.expectOne('/api/exports/mine');
    expect(req.request.method).toEqual('GET');
    req.flush(data);

    service.exports$.subscribe(exports => {
      expect(exports.length).toEqual(1);
    });
  });

  it('should create an export scoped to an event', () => {
    const request: ExportRequest = {
      format: ExportFormat.KML,
      observations: {}
    };
    const created = stubExport('2');

    service.export(5, request).subscribe(e => {
      expect(e).toEqual(created);
    });

    const req = httpTestingController.expectOne('/api/events/5/exports');
    expect(req.request.method).toEqual('POST');
    req.flush(created);
  });

  it('should delete an export', () => {
    service.deleteExport('3').subscribe();

    const req = httpTestingController.expectOne('/api/exports/mine/3');
    expect(req.request.method).toEqual('DELETE');
    req.flush(null);
  });
});