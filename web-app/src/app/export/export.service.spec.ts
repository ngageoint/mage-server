import { TestBed } from '@angular/core/testing';
import { ExportService, Export } from './export.service';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

describe('ExportService', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExportService],
      imports: [HttpClientTestingModule]
    });

    // Inject the http service and test controller for each test
    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // After every test, assert that there are no more pending requests.
    httpTestingController.verify();
  });

  it('should get my metadata', () => {
    const data: Export[] = [{
      id: 1,
      userId: 1,
      physicalPath: '/tmp/test.kml',
      filename: 'test.kml',
      exportType: 'kml',
      url: '/api/exports/1',
      status: 'Running',
      options: {}
    }];

    const service: ExportService = TestBed.inject(ExportService);
    expect(service).toBeTruthy();

    service.getExports().subscribe(exports => {
      expect(exports).toEqual(data, 'expected metadata');
    });

    // The following `expectOne()` will match the request's URL.
    // If no requests or multiple requests matched that URL
    // `expectOne()` would throw.
    const req = httpTestingController.expectOne('/api/exports/myself');

    // Assert that the request is a GET.
    expect(req.request.method).toEqual('GET');

    // Respond with mock data, causing Observable to resolve.
    // Subscribe callback asserts that correct data was returned.
    req.flush(data);

    // Finally, assert that there are no outstanding requests.
    httpTestingController.verify();
  });

  it('should fail to get my metadata due to error', () => {
    const emsg = 'deliberate 404 error';

    const service: ExportService = TestBed.inject(ExportService);
    expect(service).toBeTruthy();
    service.getExports().subscribe(data => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      }
    );

    const req = httpTestingController.expectOne('/api/exports/myself');

    // Respond with mock error
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });
});