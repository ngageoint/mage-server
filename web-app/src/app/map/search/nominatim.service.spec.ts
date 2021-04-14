import { TestBed, getTestBed } from '@angular/core/testing';

import { NominatimService } from './nominatim.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('NominatimService', () => {
  let injector: TestBed;
  let service: NominatimService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    injector = getTestBed();
    service = injector.get(NominatimService);
    httpMock = injector.get(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    const service: NominatimService = TestBed.inject(NominatimService);
    expect(service).toBeTruthy();
  });

  it('should return an Observable<Object>', () => {
    const data = {
      features: [{
        geometry: {
          type: 'Point',
          coordinates: [0,0]
        },
        properties: {
          display_name: '123 South'
        }
      }]
    };

    const search = '123 South Madeup Way';
    service.search(search).subscribe((data: any) => {
      expect(data).toEqual(data);
    });

    const req = httpMock.expectOne(req => req.url.startsWith(`${NominatimService.URL}`));
    expect(req.request.method).toBe("GET");
    expect(req.request.params.has('q')).toBeTruthy();
    expect(req.request.params.get('q')).toBe(`${search}`)
    req.flush(data);
  });
});
