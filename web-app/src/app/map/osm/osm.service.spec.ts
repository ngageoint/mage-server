import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { OsmService } from './osm.service'

describe('OsmService', () => {
  let service: OsmService
  let http: HttpTestingController
  const bounds = { south: 38.9, west: -77.05, north: 38.95, east: -77.0 }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(OsmService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())
  it('passes a drawn polygon to the server without turning it into a rectangle', () => {
    const area: any = { type: 'Polygon', coordinates: [[[-77, 38], [-76.9, 38], [-77, 38.1], [-77, 38]]] }
    service.search(bounds, 'school', area).subscribe()
    const req = http.expectOne('/api/osm/search')
    expect(req.request.body.area).toEqual(area)
    expect(req.request.body.bounds).toEqual(bounds)
    req.flush({ features: [] })
  })

  it('posts search contract', () => {
    service.search(bounds, 'amenity=cafe').subscribe(r => expect(r.searchId).toBe('s1'))
    const req = http.expectOne('/api/osm/search')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ bounds, search: 'amenity=cafe' })
    req.flush({ searchId: 's1', type: 'FeatureCollection', features: [], attribution: 'a', expiresAt: '', skipped: 0 })
  })

  it('posts export contract as blob', () => {
    service.export('s1', ['node/1']).subscribe(b => expect(b instanceof Blob).toBeTrue())
    const req = http.expectOne('/api/osm/export')
    expect(req.request.body).toEqual({ searchId: 's1', ids: ['node/1'], format: 'gpkg' })
    expect(req.request.responseType).toBe('blob')
    req.flush(new Blob(['x']))
  })

  for (const format of ['csv', 'kml', 'gpkg'] as const) {
    it(`requests a ${format} download using the same owned selection`, () => {
      service.export('s1', ['node/1'], format).subscribe()
      const req = http.expectOne('/api/osm/export')
      expect(req.request.body).toEqual({ searchId: 's1', ids: ['node/1'], format })
      req.flush(new Blob(['file']))
    })
  }

  it('shares with existing {id} body only', () => {
    service.shareLayer(7, 42).subscribe()
    const req = http.expectOne('/api/events/7/layers')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ id: 42 })
    req.flush({})
    const confirmation = http.expectOne('/api/events/7/layers')
    expect(confirmation.request.method).toBe('GET')
    confirmation.flush([{ id: 42 }])
  })

  it('does not report an event save when the confirming read omits the layer', () => {
    let failure: Error
    service.shareLayer(3, 4).subscribe({ next: () => fail('unconfirmed save'), error: e => failure = e })
    http.expectOne('/api/events/3/layers').flush({})
    http.expectOne('/api/events/3/layers').flush([])
    expect(failure.message).toContain('did not confirm')
  })

  it('extracts JSON error message', () => {
    let message = ''
    service.search(bounds, 'x').subscribe({ error: e => message = OsmService.errorMessage(e, 'fallback') })
    http.expectOne('/api/osm/search').flush({ message: 'Zoom in.' }, { status: 422, statusText: 'Unprocessable' })
    expect(message).toBe('Zoom in.')
  })

  it('extracts message from blob error', async () => {
    const err = new HttpErrorResponse({ status: 410, error: new Blob([JSON.stringify({ message: 'Search expired' })]) })
    expect(await OsmService.blobErrorMessage(err, 'f')).toBe('Search expired')
  })

  it('validates search like the server', () => {
    expect(service.validateSearch('building=*')).toBeNull()
    expect(service.validateSearch('amenity=hospital')).toBeNull()
    expect(service.validateSearch('hospital')).toBeNull()
    expect(service.validateSearch('Main Street')).toBeNull()
    expect(service.validateSearch('constructor')).toBeNull()
    expect(service.validateSearch('__proto__')).toBeNull()
    expect(service.validateSearch('')).not.toBeNull()
    expect(service.validateSearch('a'.repeat(65))).not.toBeNull()
    expect(service.validateSearch('amenity~cafe')).not.toBeNull()
    expect(service.validateSearch('amen ity=cafe')).not.toBeNull()
    expect(service.validateSearch('a="b"')).not.toBeNull()
    expect(service.validateSearch('[out:json]')).not.toBeNull()
  })

  it('validates bounds like the server', () => {
    expect(service.validateBounds(bounds)).toBeNull()
    expect(service.validateBounds({ ...bounds, north: 86, south: 85.9 })).not.toBeNull()
    expect(service.validateBounds({ ...bounds, south: 38.96 })).not.toBeNull()
    expect(service.validateBounds({ south: 0, west: 179.9, north: 0.1, east: -179.9 })).not.toBeNull()
    expect(service.validateBounds({ south: 0, west: 0, north: 0.3, east: 0.1 })).toBeNull()
    expect(service.validateBounds({ south: 0, west: 0, north: 0.25, east: 0.25 })).toBeNull()
    expect(service.validateBounds({ south: 38, west: -79, north: 40, east: -77 })).toBeNull()
    expect(service.validateBounds({ south: 0, west: 0, north: 5.01, east: 0.1 })).not.toBeNull()
    expect(service.validateBounds({ south: 0, west: 0, north: 5, east: 5 })).not.toBeNull()
    expect(service.validateBounds({ ...bounds, east: NaN })).not.toBeNull()
  })
})
