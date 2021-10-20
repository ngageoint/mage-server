import { UserSelectComponent } from './user-select.component'
import { ComponentFixture, TestBed, async, fakeAsync, tick } from '@angular/core/testing'
import { UserReadService, UserSearchParams } from '../user-read.service'
import { NgSelectModule } from '@ng-select/ng-select'
import { User } from '../user.model'
import { Component } from '@angular/core'
import { FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { By } from '@angular/platform-browser'
import { of, Subject } from 'rxjs'
import { PageOf, itemRangeOfPage, pageForItemIndex } from '@ngageoint/mage.web-core-lib/paging'

@Component({
  selector: 'test-host',
  template: `<form [formGroup]="form"><mage-user-select formControlName="user"></mage-user-select></form>`
})
class TestHostComponent {

  form = new FormGroup({
    user: new FormControl(null)
  })
}

describe('user select component', () => {

  let host: TestHostComponent
  let target: UserSelectComponent
  let fixture: ComponentFixture<TestHostComponent>
  let userService: jasmine.SpyObj<UserReadService>

  beforeEach(async(() => {
    userService = jasmine.createSpyObj<UserReadService>('MockUserReadService', [
      'search'
    ])
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        NgSelectModule,
        ReactiveFormsModule,
      ],
      declarations: [
        TestHostComponent,
        UserSelectComponent,
      ],
      providers: [
        {
          provide: UserReadService,
          useValue: userService
        }
      ]
    })
    .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    host = fixture.componentInstance
    target = fixture.debugElement.query(By.directive(UserSelectComponent)).componentInstance
  })

  it('should create', () => {
    expect(target instanceof UserSelectComponent).toBeTruthy()
  })

  it('accepts an existing value before fetching any users', async () => {

    fixture.detectChanges()
    host.form.setValue({
      user: {
        id: 'user1',
        displayName: 'Saved Before',
      }
    })
    fixture.detectChanges()
    await fixture.whenStable()

    expect(target.userSelect.selectedValues).toEqual([ { id: 'user1', displayName: 'Saved Before' } ])
    expect(target.loading).toBe(false)
    expect(userService.search).not.toHaveBeenCalled()
  })

  it('fetches first page when opened', () => {

    fixture.detectChanges()

    expect(userService.search).not.toHaveBeenCalled()

    const page: PageOf<User> = {
      items: [
        {
          id: 'abc123',
          username: 'user1',
          displayName: 'User 1'
        } as User
      ],
      totalCount: 0,
      pageSize: target.baseFindParams.pageSize,
      pageIndex: 0,
    }
    const findResults = new Subject<PageOf<User>>()
    userService.search.and.returnValue(findResults)
    target.userSelect.open()
    fixture.detectChanges()

    const initialFindParams: UserSearchParams = { ...target.baseFindParams }
    expect(userService.search).toHaveBeenCalledWith(initialFindParams)
    expect(target.loading).toBe(true)

    findResults.next(page)
    findResults.complete()
    fixture.detectChanges()

    expect(target.users).toEqual(page.items)
    expect(target.loading).toBe(false)
    expect(userService.search).toHaveBeenCalledTimes(1)
  })

  it('does not fetch again on second open', () => {

    fixture.detectChanges()

    const page: PageOf<User> = {
      items: [
        {
          id: 'abc123',
          username: 'user1',
          displayName: 'User 1'
        } as User
      ],
      totalCount: 0,
      pageSize: target.baseFindParams.pageSize,
      pageIndex: 0,
    }
    userService.search.and.returnValue(of(page))
    target.userSelect.open()
    fixture.detectChanges()
    target.userSelect.close()
    fixture.detectChanges()
    target.userSelect.open()
    fixture.detectChanges()

    const initialFindParams: UserSearchParams = { ...target.baseFindParams }
    expect(userService.search).toHaveBeenCalledWith(initialFindParams)
    expect(userService.search).toHaveBeenCalledTimes(1)
    expect(target.users).toEqual(page.items)
    expect(target.loading).toBe(false)
  })

  describe('drop-down list', () => {

    let allUsers: User[]
    let pageSize: number
    let pages: PageOf<User>[]

    beforeEach(() => {
      pageSize = target.baseFindParams.pageSize
      allUsers = Array.from({ length: 3 * pageSize + pageSize / 2 }).map((_, count) => {
        return {
          id: String(count).padStart(10, '0'),
          username: `user${count}`,
          displayName: `User ${count}`
        } as User
      })
      pages = allUsers.reduce((pages, user, index) => {
        const pageIndex = pageForItemIndex(index, pageSize)
        let page = pages[pageIndex]
        if (!page) {
          page = {
            items: [ user ],
            pageSize,
            pageIndex,
            totalCount: pageIndex === 0 ? allUsers.length : undefined
          }
          return [ ...pages, page ]
        }
        page.items.push(user)
        return pages
      }, [])
      userService.search.and.callFake(which => {
        return of(pages[which.pageIndex])
      })
      target.userSelect.open()
      fixture.detectChanges()

      // this is not technically a test function, but assert these
      // preconditions for clarity
      expect(pages.length).toEqual(4)
      expect(pages[0].items.length).toEqual(pageSize)
      expect(pages[1].items.length).toEqual(pageSize)
      expect(pages[2].items.length).toEqual(pageSize)
      expect(pages[3].items.length).toEqual(pageSize / 2)
      expect(target.users).toEqual(pages[0].items)
    })

    describe('infinite scrolling with paging', () => {

      it('fetches the next page when scrolled within threshold of last user', () => {

        const threshold = pageSize - target.nextPageScrollThreshold
        target.onScroll({ start: threshold - 20, end: threshold })

        expect(target.users).toEqual([ ...pages[0].items, ...pages[1].items ])
        expect(userService.search).toHaveBeenCalledTimes(2)
        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 1,
            term: null
          }
        ])
      })

      it('does not fetch when scroll event is below threshold', () => {

        const threshold = pageSize - target.nextPageScrollThreshold
        target.onScroll({ start: threshold - 10, end: threshold - 5 })
        target.onScroll({ start: threshold - 9, end: threshold - 4 })
        target.onScroll({ start: threshold - 8, end: threshold - 3 })
        target.onScroll({ start: threshold - 7, end: threshold - 2 })
        target.onScroll({ start: threshold - 6, end: threshold - 1 })

        expect(target.users).toEqual(pages[0].items)
        expect(userService.search).toHaveBeenCalledTimes(1)

        target.onScroll({ start: threshold - 5, end: threshold })

        expect(target.users).toEqual([ ...pages[0].items, ...pages[1].items ])
        expect(userService.search).toHaveBeenCalledTimes(2)
      })

      it('fetches only once for a given page threshold', () => {

        const threshold = pageSize - target.nextPageScrollThreshold
        target.onScroll({ start: threshold - 20, end: threshold })
        target.onScroll({ start: threshold - 19, end: threshold + 1 })

        expect(target.users).toEqual([ ...pages[0].items, ...pages[1].items ])
        expect(userService.search).toHaveBeenCalledTimes(2)
        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 1,
            term: null
          }
        ])
      })

      it('does not fetch a new page while previous page is fetchimg', () => {

        const findResult = new Subject<PageOf<User>>()
        userService.search.and.returnValue(findResult)
        const page0Threshold = itemRangeOfPage(0, pageSize)[1] - target.nextPageScrollThreshold
        const page1Threshold = itemRangeOfPage(1, pageSize)[1] - target.nextPageScrollThreshold

        expect(page0Threshold).toBeLessThanOrEqual(target.users.length)
        expect(page1Threshold).toBeGreaterThan(target.users.length)

        /*
        in theory, this scroll sequence cannot happen because one should not be
        able to generate a scroll event with a range past the number of items
        present, which is why there is no queueing of page fetches
        */
        target.onScroll({ start: page0Threshold - 5, end: page0Threshold })
        target.onScroll({ start: page1Threshold - 5, end: page1Threshold })
        findResult.next(pages[1])
        findResult.complete()

        expect(target.users).toEqual([ ...pages[0].items, ...pages[1].items ])
        expect(userService.search).toHaveBeenCalledTimes(2)
        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 1,
            term: null
          }
        ])
      })

      it('does not fetch after crossing same scroll threshold twice', () => {

        const threshold = pageSize - target.nextPageScrollThreshold
        target.onScroll({ start: threshold - 5, end: threshold })

        expect(target.users).toEqual([ ...pages[0].items, ...pages[1].items ])

        target.onScroll({ start: threshold - 10, end: threshold - 5 })

        expect(target.users).toEqual([ ...pages[0].items, ...pages[1].items ])

        target.onScroll({ start: threshold - 5, end: threshold })

        expect(target.users).toEqual([ ...pages[0].items, ...pages[1].items ])
        expect(userService.search).toHaveBeenCalledTimes(2)
        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 1,
            term: null
          }
        ])
      })

      it('scrolls and fetches until the end', () => {

        const thresholds = pages.map((_, pageIndex) => itemRangeOfPage(pageIndex, pageSize)[1] - target.nextPageScrollThreshold)
        thresholds.pop()

        for (const threshold of thresholds) {
          target.onScroll({ start: threshold - 5, end: threshold })
        }

        expect(userService.search).toHaveBeenCalledTimes(pages.length)
        expect(target.users).toEqual(allUsers)

        target.onScroll({ start: allUsers.length - 5, end: allUsers.length })

        expect(userService.search).toHaveBeenCalledTimes(pages.length)
        expect(target.users).toEqual(allUsers)
      })
    })

    describe('searching', () => {

      it('applies the search term to the find parameters while scrolling pages', fakeAsync(() => {

        target.searchTerm$.next('user1')
        tick(target.searchTermDebounceTime)

        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 0,
            term: 'user1',
          }
        ])

        const page0Threshold = pageSize - target.nextPageScrollThreshold
        target.onScroll({ start: page0Threshold - 5, end: page0Threshold })

        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 1,
            term: 'user1'
          }
        ])
        expect(userService.search).toHaveBeenCalledTimes(3)
      }))

      it('resets to the first page of results when the search term changes', fakeAsync(() => {

        expect(target.currentSearchTerm).toBeNull()
        expect(target.users).toEqual(pages[0].items)

        target.searchTerm$.next('user1')
        tick(target.searchTermDebounceTime)
        target.onScroll({ start: pageSize - target.nextPageScrollThreshold - 5, end: pageSize - target.nextPageScrollThreshold })

        expect(target.currentSearchTerm).toEqual('user1')
        expect(target.users).toEqual([ ...pages[0].items, ...pages[1].items ])
        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 1,
            term: 'user1'
          }
        ])

        target.searchTerm$.next('user12')
        tick(target.searchTermDebounceTime)

        expect(target.users).toEqual(pages[0].items)
        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 0,
            term: 'user12'
          }
        ])
      }))

      it('does not reset the search if the search term sends the same value', fakeAsync(() => {

        target.searchTerm$.next('user31')
        tick(target.searchTermDebounceTime)

        expect(target.users).toEqual(pages[0].items)
        expect(userService.search).toHaveBeenCalledTimes(2)
        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 0,
            term: 'user31'
          }
        ])

        target.searchTerm$.next('user31')
        tick(target.searchTermDebounceTime)

        expect(target.users).toEqual(pages[0].items)
        expect(userService.search).toHaveBeenCalledTimes(2)
        expect(userService.search.calls.mostRecent().args).toEqual([
          {
            pageSize,
            pageIndex: 0,
            term: 'user31'
          }
        ])
      }))

      it('handles changing the search term while fetching', fakeAsync(() => {

        const results1$ = new Subject<PageOf<User>>()
        const results2$ = new Subject<PageOf<User>>()
        userService.search.and.returnValues(results1$, results2$)

        target.searchTerm$.next('wham')
        tick(target.searchTermDebounceTime)

        expect(results1$.observers.length).toEqual(1)

        target.searchTerm$.next('whammy')
        tick(target.searchTermDebounceTime)

        expect(results1$.observers.length).toEqual(0)
        expect(userService.search).toHaveBeenCalledTimes(3)
        const searchCalls = userService.search.calls.all()
        expect(searchCalls[0].args[0]).toEqual(jasmine.objectContaining({ term: null }))
        expect(searchCalls[1].args[0]).toEqual(jasmine.objectContaining({ term: 'wham' }))
        expect(searchCalls[2].args[0]).toEqual(jasmine.objectContaining({ term: 'whammy' }))

        results2$.next(pages[1])
        results1$.next(pages[0])

        expect(target.users).toEqual(pages[1].items)
      }))
    })
  })
})