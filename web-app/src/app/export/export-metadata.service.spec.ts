import { TestBed } from '@angular/core/testing';
import { ExportMetadataService, ExportMetadata } from './export-metadata.service';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';

describe('ExportMetadataService', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExportMetadataService],
      imports: [HttpClientTestingModule]
    });

    // Inject the http service and test controller for each test
    httpClient = TestBed.get(HttpClient);
    httpTestingController = TestBed.get(HttpTestingController);
  });

  afterEach(() => {
    // After every test, assert that there are no more pending requests.
    httpTestingController.verify();
  });

  it('Test getMyExportMetadata', () => {
    const myMetadata: ExportMetadata[] = [{
      _id: 1,
      userId: 1,
      physicalPath: '/tmp/test.kml',
      filename: 'test.kml',
      exportType: 'kml',
      location: '/api/exports/1',
      status: 'Running',
      options: {}
    }];


    const service: ExportMetadataService = TestBed.get(ExportMetadataService);
    expect(service).toBeTruthy();

    service.getMyExportMetadata().subscribe(metas => {
      expect(metas).toEqual(myMetadata, 'expected metadata');
    });

    // The following `expectOne()` will match the request's URL.
    // If no requests or multiple requests matched that URL
    // `expectOne()` would throw.
    const req = httpTestingController.expectOne('/api/exports/myself');

    // Assert that the request is a GET.
    expect(req.request.method).toEqual('GET');

    // Respond with mock data, causing Observable to resolve.
    // Subscribe callback asserts that correct data was returned.
    req.flush(myMetadata);

    // Finally, assert that there are no outstanding requests.
    httpTestingController.verify();
  });
});