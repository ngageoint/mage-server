import { HttpEventType, HttpErrorResponse, HttpResponse } from '@angular/common/http'
import { of, throwError, delay } from 'rxjs'
import { fakeAsync, tick } from '@angular/core/testing'
import { OsmSearchComponent } from './osm-search.component'
import { OsmService } from './osm.service'

describe('OsmSearchComponent', () => {
  let component: OsmSearchComponent
  let osm: jasmine.SpyObj<OsmService>
  let layers: any, eventService: any, dialogRef: any, map: any, cdr: any
  const event = { id: 3, name: 'Flood' }
  const response: any = {
    searchId: 's1', type: 'FeatureCollection', attribution: 'OSM attr', expiresAt: new Date(Date.now() + 600000).toISOString(), skipped: 2,
    features: [
      { type: 'Feature', id: 'node/1', geometry: { type: 'Point', coordinates: [-77.01, 38.91] },
        properties: { osm_id: 1, osm_type: 'node', name: '<img src=x onerror=alert(1)>', tags: '{"amenity":"cafe"}', source: 'https://www.openstreetmap.org/node/1' } },
      { type: 'Feature', id: 'way/2', geometry: { type: 'Point', coordinates: [-77.02, 38.92] },
        properties: { osm_id: 2, osm_type: 'way', tags: '{}', source: 'javascript:alert(1)' } }
    ]
  }

  beforeEach(() => {
    osm = jasmine.createSpyObj('OsmService', ['search', 'export', 'shareLayer', 'validateSearch', 'validateBounds'])
    osm.validateSearch.and.returnValue(null)
    osm.validateBounds.and.returnValue(null)
    osm.search.and.returnValue(of(response))
    osm.export.and.returnValue(of(new Blob(['gpkg'])))
    osm.shareLayer.and.returnValue(of({}))
    layers = {
      createLayer: jasmine.createSpy('createLayer').and.returnValue(of(new HttpResponse({ body: { id: 42, name: 'L', state: 'processing' } }))),
      getLayerById: jasmine.createSpy('getLayerById').and.returnValue(of({ id: 42, name: 'L', state: 'available' }))
    }
    eventService = { fetchLayers: jasmine.createSpy('fetchLayers') }
    dialogRef = { close: jasmine.createSpy('close'), disableClose: false }
    cdr = { markForCheck: jasmine.createSpy('markForCheck') }
    const panes: any = {}
    map = {
      getBounds: () => ({ getSouth: () => 38.9, getWest: () => -77.05, getNorth: () => 38.95, getEast: () => -77 }),
      getPane: (n: string) => panes[n], createPane: (n: string) => (panes[n] = { style: {} }),
      addLayer: jasmine.createSpy('addLayer'), removeLayer: jasmine.createSpy('removeLayer'),
      fitBounds: jasmine.createSpy('fitBounds'), setView: jasmine.createSpy('setView'), getZoom: () => 14
    }
    const session: any = { hasPermission: (p: string) => ['READ_LAYER_EVENT', 'CREATE_LAYER'].includes(p) }
    const filter: any = { getEvent: () => event }
    component = new OsmSearchComponent(dialogRef, { map }, osm, filter, eventService, session, layers, cdr)
    component.search = 'cafe'
  })

  afterEach(() => component.ngOnDestroy())
  it('searches the selected shape and its bounds rather than the visible map', () => {
    const area: any = { type: 'Polygon', coordinates: [[[-77.04, 38.91], [-77.02, 38.91], [-77.03, 38.93], [-77.04, 38.91]]] }
    const bounds = { south: 38.91, west: -77.04, north: 38.93, east: -77.02 }
    component.areaDrawing.area = area
    spyOn(component.areaDrawing, 'bounds').and.returnValue(bounds)
    component.runSearch()
    expect(osm.search).toHaveBeenCalledWith(bounds, 'cafe', area)
    component.useVisibleArea()
    expect(component.result).toBeNull()
    expect(component.areaDrawing.area).toBeUndefined()
  })

  it('searches visible bounds, selects all, previews without moving map', () => {
    component.runSearch()
    expect(osm.search).toHaveBeenCalledWith({ south: 38.9, west: -77.05, north: 38.95, east: -77 }, 'cafe', undefined)
    expect(component.selectedCount).toBe(2)
    expect(map.addLayer).toHaveBeenCalled()
    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(cdr.markForCheck).toHaveBeenCalled()
  })

  it('select none / all and per-feature toggle', () => {
    component.runSearch()
    component.selectNone(); expect(component.selectedCount).toBe(0)
    component.toggle(response.features[0], true); expect(component.selectedCount).toBe(1)
    component.selectAll(); expect(component.allSelected).toBeTrue()
  })

  it('popup uses text only and rejects non-OSM links', () => {
    component.runSearch()
    const el: HTMLElement = (component as any).popupElement(response.features[0])
    expect(el.querySelector('img')).toBeNull()
    expect(el.textContent).toContain('<img')
    expect(el.textContent).toContain('OSM attr')
    expect(component.osmLink(response.features[1])).toBeNull()
  })

  it('shows error state and marks for check', () => {
    osm.search.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'Zoom in.' } })))
    component.runSearch()
    expect(component.phase).toBe('error')
    expect(component.errorMessage).toBe('Zoom in.')
    expect(cdr.markForCheck).toHaveBeenCalled()
  })

  it('saves via export + createLayer then shares {eventId, layerId} and refreshes layers', async () => {
    component.runSearch()
    component.saveLayer()
    expect(osm.export).toHaveBeenCalledWith('s1', ['node/1', 'way/2'])
    const form: FormData = layers.createLayer.calls.mostRecent().args[0]
    expect(form.get('type')).toBe('GeoPackage')
    expect(form.get('description')).toBe('OSM attr')
    expect(form.get('geopackage') instanceof File).toBeTrue()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(osm.shareLayer).toHaveBeenCalledWith(3, 42)
    expect(eventService.fetchLayers).toHaveBeenCalledWith(event)
  })

  it('retry sharing never re-uploads', async () => {
    osm.shareLayer.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })))
    component.runSearch()
    component.saveLayer()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(component.shareError).toContain('permission')
    expect(dialogRef.disableClose).toBeFalse()
    osm.shareLayer.and.returnValue(of({}))
    component.share()
    await new Promise(resolve => setTimeout(resolve, 0))
    component.saveLayer()
    expect(layers.createLayer).toHaveBeenCalledTimes(1)
    expect(osm.export).toHaveBeenCalledTimes(1)
    expect(osm.shareLayer).toHaveBeenCalledTimes(2)
    expect(component.shared).toBeTrue()
    expect(eventService.fetchLayers).toHaveBeenCalledWith(event)
  })

  it('waits for optimization before sharing and refreshing the visible layers', async () => {
    layers.getLayerById.and.returnValues(of({ id: 42, state: 'processing' }), of({ id: 42, state: 'available' }))
    component.runSearch()
    component.saveLayer()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(component.sharing).toBeTrue()
    expect(osm.shareLayer).not.toHaveBeenCalled()
    expect(eventService.fetchLayers).not.toHaveBeenCalled()
    await new Promise(resolve => setTimeout(resolve, 1550))
    expect(component.shared).toBeTrue()
    expect(eventService.fetchLayers).toHaveBeenCalledWith(event)
  })

  it('locks close while upload is in flight', () => {
    layers.createLayer.and.returnValue(of({ type: HttpEventType.Sent }))
    component.runSearch()
    component.saveLayer()
    expect(component.closeLocked).toBeTrue()
    expect(dialogRef.disableClose).toBeTrue()
    component.close()
    expect(dialogRef.close).not.toHaveBeenCalled()
  })

  it('lets a status read slower than the polling interval finish, then enables the saved map layer', fakeAsync(() => {
    const show = jasmine.createSpy('showSavedLayer')
    ;(component as any).data.onLayerSaved = show
    layers.getLayerById.and.returnValue(of({ id: 42, state: 'available' }).pipe(delay(2200)))
    component.runSearch()
    component.saveLayer()
    tick(1600)
    expect(layers.getLayerById).toHaveBeenCalledTimes(1)
    expect(component.shared).toBeFalse()
    tick(601)
    expect(component.shared).toBeTrue()
    expect(show).toHaveBeenCalledWith(42)
    expect(eventService.fetchLayers).toHaveBeenCalledWith(event)
  }))

  it('marks expired on 410 export', async () => {
    osm.export.and.returnValue(throwError(() => new HttpErrorResponse({ status: 410, error: new Blob(['{"message":"Search expired"}']) })))
    component.runSearch()
    component.download()
    for (let i = 0; i < 100 && component.downloading; i++) {
      await new Promise(r => setTimeout(r, 10))
    }
    expect(component.expired).toBeTrue()
    expect(component.downloadError).toBe('Search expired')
  })

  for (const format of ['csv', 'kml', 'gpkg'] as const) {
    it(`downloads selected results as ${format} with a matching filename`, () => {
      spyOn(URL, 'createObjectURL').and.returnValue('blob:osm-download')
      spyOn(URL, 'revokeObjectURL')
      const click = spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function(this: HTMLAnchorElement) {
        expect(this.download).toBe(`osm-search.${format}`)
      })
      component.runSearch()
      component.toggle(response.features[1], false)
      component.download(format)
      expect(osm.export).toHaveBeenCalledWith('s1', ['node/1'], format)
      expect(click).toHaveBeenCalledTimes(1)
      expect(component.downloading).toBeFalse()
    })
  }

  it('removes preview on destroy and new search', () => {
    component.runSearch()
    component.runSearch()
    expect(map.removeLayer).toHaveBeenCalledTimes(1)
    component.ngOnDestroy()
    expect(map.removeLayer).toHaveBeenCalledTimes(2)
  })
})
