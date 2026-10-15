import { firstValueFrom } from 'rxjs'
import { Team } from './team.model'
import { TeamService, TeamSearch } from './team.service'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { PageOf } from '@ngageoint/mage.web-core-lib/paging'

const BASE_URL = '/api/next-teams'

describe('team service', () => {

  let httpTest: HttpTestingController
  let service: TeamService

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    httpTest = TestBed.inject(HttpTestingController)
    service = TestBed.inject(TeamService)
  })

  afterEach(() => {
    httpTest.verify()
  })

  describe('paged searching', () => {

    it('sends the paging parameters', waitForAsync(async () => {

      const searchParams: TeamSearch = {
        term: 'boo@ner.bur',
        pageIndex: 3,
        pageSize: 25,
        includeTotalCount: true
      }
      const resBody: PageOf<Team> = {
        pageIndex: 3,
        pageSize: 25,
        totalCount: 120,
        items: []
      }
      const pendingPage = firstValueFrom(service.search(searchParams))
      const testReq = httpTest.expectOne(req => {
        return req.method === 'GET' && req.url === `${BASE_URL}/search`
      })
      testReq.flush(resBody)

      const page = await pendingPage
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
    }))

    it('does not send undefined parameters', () => {

      service.search({ pageIndex: 10, pageSize: 12 }).subscribe(() => {})

      const testReq = httpTest.expectOne(req => {
        return req.method === 'GET' && req.url === `${BASE_URL}/search`
      })

      const resBody: PageOf<Team> = {
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
