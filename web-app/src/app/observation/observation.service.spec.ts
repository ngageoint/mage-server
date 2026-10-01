import { TestBed } from '@angular/core/testing'
import { ObservationService } from './observation.service'
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing'
import { SessionService } from '../http/session.service'
import { BinaryCondition } from '../entities/observation/filter/entities.observation.filter'

const mockEvent: any = { id: 1, name: 'Test Event', forms: [], style: {} }

const mockSessionService = {
  getToken: jasmine.createSpy('getToken').and.returnValue('test-token')
}

describe('ObservationService', () => {
  let service: ObservationService
  let httpTestingController: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ObservationService,
        { provide: SessionService, useValue: mockSessionService }
      ],
      imports: [HttpClientTestingModule]
    })
    service = TestBed.inject(ObservationService)
    httpTestingController = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    httpTestingController.verify()
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  describe('getObservationsForMap', () => {

    it('uses GET when no filter provided', () => {
      service.getObservationsForMap(mockEvent, {}).subscribe()

      const req = httpTestingController.expectOne(r => r.method === 'GET')
      expect(req.request.url).toBe(`/api/events/${mockEvent.id}/observations`)
      req.flush([])
    })

    it('does not send a view param, the server has no map view', () => {
      service.getObservationsForMap(mockEvent, {}).subscribe()

      const req = httpTestingController.expectOne(r => r.method === 'GET')
      expect(req.request.params.has('view')).toBeFalse()
      req.flush([])
    })

    it('transforms the observations so the map gets their style and icon', () => {
      let result: any[] = []
      service.getObservationsForMap(mockEvent, {}).subscribe(observations => result = observations)

      const req = httpTestingController.expectOne(r => r.method === 'GET')
      req.flush([{ id: 'o1', type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { forms: [] } }])

      expect(result[0].style.iconUrl).toBe('/api/events/1/icons?access_token=test-token')
    })

    it('uses GET when filter is empty object', () => {
      service.getObservationsForMap(mockEvent, { filter: {} }).subscribe()

      const req = httpTestingController.expectOne(r => r.method === 'GET')
      expect(req.request.url).toBe(`/api/events/${mockEvent.id}/observations`)
      req.flush([])
    })

    it('uses POST to search endpoint when keyword filter provided', () => {
      service.getObservationsForMap(mockEvent, { filter: { keyword: 'flood' } }).subscribe()

      const req = httpTestingController.expectOne(r => r.method === 'POST')
      expect(req.request.url).toBe(`/api/events/${mockEvent.id}/observations/search`)
      expect(req.request.body.keyword).toBe('flood')
      expect(req.request.body.condition).toBeUndefined()
      req.flush([])
    })

    it('uses POST to search endpoint when condition filter provided', () => {
      const condition: BinaryCondition = { formId: 1, field: 'status', operator: '=', value: 'open' }
      service.getObservationsForMap(mockEvent, { filter: { condition } }).subscribe()

      const req = httpTestingController.expectOne(r => r.method === 'POST')
      expect(req.request.url).toBe(`/api/events/${mockEvent.id}/observations/search`)
      expect(req.request.body.condition).toEqual(condition)
      expect(req.request.body.keyword).toBeUndefined()
      req.flush([])
    })

    it('uses POST with both keyword and condition when both provided', () => {
      const condition: BinaryCondition = { formId: 1, field: 'status', operator: '=', value: 'open' }
      service.getObservationsForMap(mockEvent, { filter: { keyword: 'flood', condition } }).subscribe()

      const req = httpTestingController.expectOne(r => r.method === 'POST')
      expect(req.request.url).toBe(`/api/events/${mockEvent.id}/observations/search`)
      expect(req.request.body.keyword).toBe('flood')
      expect(req.request.body.condition).toEqual(condition)
      req.flush([])
    })

    it('includes base options as query params on search POST', () => {
      service.getObservationsForMap(mockEvent, { filter: { keyword: 'flood' }, states: 'active' }).subscribe()

      const req = httpTestingController.expectOne(r => r.method === 'POST')
      expect(req.request.params.get('states')).toBe('active')
      req.flush([])
    })
  })

  describe('paging options', () => {
    it('has none until they are set', () => {
      expect(service.getPagingOptions()).toBeNull()
    })

    it('clears the options and tells subscribers', () => {
      const emitted: any[] = []
      service.paging$.subscribe(paging => emitted.push(paging))
      service.setPagingOptions({ page: 2, page_size: 25 })

      service.clearPagingOptions()

      expect(service.getPagingOptions()).toBeNull()
      expect(emitted[emitted.length - 1]).toBeNull()
    })
  })

  describe('archiveObservationForEvent', () => {
    it('posts the server\'s archive state name', () => {
      const observation: any = { id: 'o1' }

      service.archiveObservationForEvent(mockEvent, observation).subscribe()

      const req = httpTestingController.expectOne(r => r.method === 'POST')
      expect(req.request.url).toBe(`/api/events/${mockEvent.id}/observations/o1/states`)
      expect(req.request.body).toEqual({ name: 'archive' })
      req.flush({})
    })
  })

  describe('getObservationIconUrlForEvent', () => {
    const iconUrl = (formId: number | null, primary: string | null, variant: string | null) =>
      service.getObservationIconUrlForEvent(1, formId, primary, variant)

    it('uses only the event when there is no form', () => {
      expect(iconUrl(null, null, null)).toBe('/api/events/1/icons?access_token=test-token')
    })

    it('adds each segment in form, primary, variant order', () => {
      expect(iconUrl(5, null, null)).toBe('/api/events/1/icons/5?access_token=test-token')
      expect(iconUrl(5, 'a', null)).toBe('/api/events/1/icons/5/a?access_token=test-token')
      expect(iconUrl(5, 'a', 'b')).toBe('/api/events/1/icons/5/a/b?access_token=test-token')
    })

    it('drops a segment that has no preceding segment, since the route is positional', () => {
      expect(iconUrl(5, null, 'b')).toBe('/api/events/1/icons/5?access_token=test-token')
      expect(iconUrl(null, 'a', 'b')).toBe('/api/events/1/icons?access_token=test-token')
    })
  })
})
