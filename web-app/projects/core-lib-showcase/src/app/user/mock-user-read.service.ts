import { User, UserReadService, UserSearchParams } from '@ngageoint/mage.web-core-lib/user'
import { PageOf, itemRangeOfPage } from '@ngageoint/mage.web-core-lib/paging'
import { Observable, of } from 'rxjs'
import { delay } from 'rxjs/operators'
import { UserPhone, UserSearchResult } from 'core-lib-src/user'

const userList: User[] = Array.from({ length: 5000 }).map((_, count: number) => {
  const phones: UserPhone[] = []
  let phoneCount = count % 3
  while (phoneCount--) {
    phones.push({ type: 'test phone', number: `55510${phoneCount}${String(count).padStart(4, '0')}` })
  }
  return {
    id: String(count).padStart(10, '0'),
    username: `user${count}`,
    displayName: `I am user ${count}`,
    email: `me${count}@test${count % 5 + 1}.wut`,
    active: true,
    enabled: true,
    authentication: {},
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    roleId: 'test',
    phones,
    recentEventIds: [],
  }
})

type UserReadServiceInterface = { [K in keyof UserReadService]: UserReadService[K] extends Function ? UserReadService[K] : never }

export class MockUserReadService implements UserReadServiceInterface {

  search(which: UserSearchParams): Observable<PageOf<UserSearchResult>> {
    const [ pageStart, pageEnd ] = itemRangeOfPage(which)
    const searchPattern = which.searchTerm ? new RegExp(which.searchTerm) : null
    const matching = searchPattern ? userList.filter(x => {
      return searchPattern.test(x.username)
        || searchPattern.test(x.displayName)
        || searchPattern.test(x.email!)
        || x.phones.some(x => searchPattern.test(x.number))
    }) : userList.slice()
    const page: PageOf<UserSearchResult> = {
      pageSize: which.pageSize,
      pageIndex: which.pageIndex,
      items: matching.slice(pageStart, pageEnd).map(x => ({
        id: x.id,
        username: x.username,
        displayName: x.displayName,
        email: x.email,
        active: x.active,
        enabled: x.enabled,
        allPhones: x.phones.reduce<string>((concat, phone)  => {
          if (concat) {
            return `${concat}; ${phone.number}`
          }
          return phone.number
        }, null)
      })),
    }
    if (typeof which.includeTotalCount === 'boolean') {
      if (which.includeTotalCount) {
        page.totalCount = matching.length
      }
    }
    else if (which.pageIndex === 0) {
      page.totalCount = matching.length
    }
    return of(page).pipe(delay(600))
  }
}