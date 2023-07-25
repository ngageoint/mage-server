import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { async, TestBed } from '@angular/core/testing'
import * as _ from 'lodash'
import { defer, throwError } from 'rxjs'
import { RegisteredStaticIconReference, SourceUrlStaticIconReference, StaticIcon } from './static-icon.model'

import { StaticIconService } from './static-icon.service'

describe('StaticIconService', () => {

  let http: HttpClient
  let httpTest: HttpTestingController
  let service: StaticIconService

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule
      ]
    })
    http = TestBed.inject(HttpClient)
    httpTest = TestBed.inject(HttpTestingController)
    service = TestBed.inject(StaticIconService)
  })

  afterEach(() => {
    httpTest.verify()
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  describe('fetching icon by id', () => {

    it('fetches icon by id', async(() => {

      const icon: StaticIcon = {
        id: 'icon1',
        sourceUrl: 'test://source/1.png',
        contentPath: '/api/icons/icon1',
      }
      service.fetchIconById(icon.id).subscribe(
        x => {
          expect(x).toEqual(icon)
        },
        fail
      )

      const req = httpTest.expectOne('/api/icons/icon1')
      req.flush(icon)
      httpTest.verify()
    }))

    it('emits an error when the icon does not exist', () => {

      // TODO: might be better just to emit null or typed app layer error
      // instead of http layer error

      const icon: StaticIcon = {
        id: 'icon1',
        sourceUrl: 'test://source/1.png',
        contentPath: '/api/icons/icon1',
      }
      service.fetchIconById(icon.id).subscribe(
        x => {
          fail(`unexpected response ${x}`)
        },
        (err: HttpErrorResponse) => {
          expect(err.status).toEqual(404)
          expect(err.error).toEqual('icon not found')
        }
      )

      const req = httpTest.expectOne('/api/icons/icon1')
      req.flush('icon not found', {
        status: 404,
        statusText: '',
        headers: { 'content-type': 'application/json' }
      })
      httpTest.verify()
    })
  })

  describe('fetching by source url', () => {

    it('fetches icon by source url', () => {

      const icon: StaticIcon = {
        id: 'icon1',
        contentPath: '/api/icons/icon1',
        sourceUrl: 'test://source/1?type=png',
      }
      service.fetchIconBySourceUrl(icon.sourceUrl).subscribe(
        x => {
          expect(x).toEqual(icon)
        },
        fail
      )

      const query = new HttpParams().set('source_url', icon.sourceUrl)
      const req = httpTest.expectOne(x => {
        return x.url === '/api/icons' && String(x.params) === String(query)
      })
      req.flush(icon)
      httpTest.verify()
    })

    it('returns null when no icon is found', () => {

      const sourceUrl = 'test://mage/unregistered.png'
      service.fetchIconBySourceUrl(sourceUrl).subscribe(
        x => {
          expect(x).toBeNull()
        },
        fail
      )
      const req = httpTest.expectOne(x => x.url === '/api/icons')
      req.flush(null)
      httpTest.verify()
    })
  })

  it('fetches icon by registered reference', () => {

    const icon: StaticIcon = {
      id: 'icon1',
      contentPath: '/icons/icon1/content',
      sourceUrl: 'test://source/1?type=png',
    }
    const ref: RegisteredStaticIconReference = { id: icon.id }
    service.fetchIconByReference(ref).subscribe(
      x => {
        expect(x).toEqual(icon)
      },
      fail
    )

    const req = httpTest.expectOne('/api/icons/icon1')
    req.flush(icon)
    httpTest.verify()
  })

  it('fetches icon by source url reference', () => {

    const icon: StaticIcon = {
      id: 'icon1',
      contentPath: '/icons/icon1',
      sourceUrl: 'test://source/1?type=png',
    }
    const ref: SourceUrlStaticIconReference = { sourceUrl: icon.sourceUrl }
    service.fetchIconByReference(ref).subscribe(
      x => {
        expect(x).toEqual(icon)
      },
      fail
    )

    const query = new HttpParams().set('source_url', icon.sourceUrl)
    const req = httpTest.expectOne(x => {
      return x.url === '/api/icons' && String(x.params) === String(query)
    })
    req.flush(icon)
    httpTest.verify()
  })
})
