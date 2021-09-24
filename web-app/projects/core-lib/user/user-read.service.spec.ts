import { USER_READ_BASE_URL as BASE_URL, UserReadService, UserSearchResult, UserSearchParams } from './user-read.service'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { PageOf } from '@ngageoint/mage.web-core-lib/paging'

describe('user read service', () => {

  let http: HttpClient
  let httpTest: HttpTestingController
  let service: UserReadService

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule
      ]
    })
    http = TestBed.inject(HttpClient)
    httpTest = TestBed.inject(HttpTestingController)
    service = TestBed.inject(UserReadService)
  })

  afterEach(() => {
    httpTest.verify()
  })

  describe('paged searching', () => {

    it('sends the paging parameters', () => {

      const searchParams: UserSearchParams = {
        term: 'boo@ner.bur',
        pageIndex: 3,
        pageSize: 25,
        includeTotalCount: true
      }
      const resBody: PageOf<UserSearchResult> = {
        pageIndex: 3,
        pageSize: 25,
        totalCount: 120,
        items: []
      }

      let page: PageOf<UserSearchResult>
      service.search(searchParams).subscribe(x => {
        page = x
      })

      const testReq = httpTest.expectOne(req => {
        return req.method === 'GET' && req.url === `${BASE_URL}/search`
      })
      testReq.flush(resBody)

      const expectedParams = {
        term: searchParams.term,
        page: '3',
        page_size: '25',
        total: 'true'
      }
      expect(page).toEqual(resBody)
      const receivedParams = testReq.request.params
      expect(receivedParams.keys().sort()).toEqual(Object.keys(expectedParams).sort())
      for (const reqParam of receivedParams.keys()) {
        expect(receivedParams.get(reqParam)).toEqual(expectedParams[reqParam], reqParam)
      }
    })

    it('does not send undefined parameters', () => {

      service.search({ pageIndex: 10, pageSize: 12 }).subscribe(x => null)

      const testReq = httpTest.expectOne(req => {
        return req.method === 'GET' && req.url === `${BASE_URL}/search`
      })

      const resBody: PageOf<UserSearchResult> = {
        pageIndex: 10,
        pageSize: 12,
        items: []
      }
      testReq.flush(resBody)

      const receivedParams = testReq.request.params
      expect(receivedParams.keys().sort()).toEqual([ 'page', 'page_size' ])
      expect(receivedParams.get('page')).toEqual('10')
      expect(receivedParams.get('page_size')).toEqual('12')
    })
  })
})