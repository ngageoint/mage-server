import { TestBed, getTestBed } from '@angular/core/testing';

import { PlacenameSearchResult, PlacenameSearchService } from './search.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MapSettings, MobileSearchType, WebSearchType } from 'src/app/entities/map/entities.map';
import { FeatureCollection } from 'geojson';

describe('SearchService', () => {
  let injector: TestBed;
  let service: PlacenameSearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    injector = getTestBed();
    service = injector.get(PlacenameSearchService);
    httpMock = injector.get(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    const service: PlacenameSearchService = TestBed.inject(PlacenameSearchService);
    expect(service).toBeTruthy();
  });

  it('should return an Observable<Object>', () => {
    const results: PlacenameSearchResult[] = [new PlacenameSearchResult(
      "somewhere",
      [0, 0, 0, 0],
      [0, 0]
    )]

    const featureCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: [{
        "type": "Feature",
        "properties": {
          "display_name": "somewhere",
        },
        "bbox": [0,0,0,0],
        "geometry": {
          "type": "Point",
          "coordinates": [0,0]
        }
      }]
    }

    const mapSettings: MapSettings = {
      webSearchType: WebSearchType.NOMINATIM,
      webNominatimUrl: "www.test.com",
      mobileSearchType: MobileSearchType.NONE,
      mobileNominatimUrl: null
    }

    const search = '123 South Madeup Way';
    service.search(mapSettings, search).subscribe((response: PlacenameSearchResult[]) => {
      console.log("response", response)
      console.log("results", results)
      expect(results).toEqual(response);
    });

    const req = httpMock.expectOne(req => req.url.startsWith("www.test.com"));
    expect(req.request.method).toBe("GET");
    expect(req.request.params.has('q')).toBeTruthy();
    expect(req.request.params.get('q')).toBe(`${search}`)
    req.flush(featureCollection);
  });
});
