import { AfterViewInit, Component, Input, OnChanges, SimpleChanges, ViewChild, forwardRef, OnInit } from '@angular/core'
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms'
import { NgSelectComponent } from '@ng-select/ng-select'
import { User } from '../user.model'
import { UserReadService, UserSearchParams, UserSearchResult } from '../user-read.service'
import { pageForItemIndex, itemRangeOfPage } from '@ngageoint/mage.web-core-lib/paging'
import { Subject, BehaviorSubject, SubscriptionLike, Unsubscribable } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { X } from '@angular/cdk/keycodes'

@Component({
  selector: 'mage-user-select',
  templateUrl: './user-select.component.html',
  styleUrls: [
    './user-select.component.scss'
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => UserSelectComponent)
    }
  ]
})
export class UserSelectComponent implements OnInit, OnChanges, AfterViewInit, ControlValueAccessor {

  readonly baseFindParams: Readonly<UserSearchParams> = Object.freeze({
    pageSize: 100,
    pageIndex: 0,
    term: null
  })
  readonly nextPageScrollThreshold = 15
  readonly searchTermDebounceTime = 500
  readonly trackByUserId: (x: User) => User['id'] = x => x.id
  get loading(): boolean {
    return !!this.currentFetch && !this.currentFetch.closed
  }

  users: UserSearchResult[] = []
  totalCount = 0
  searchTerm$ = new Subject<string | null>()
  currentSearchTerm: string | null = null
  @ViewChild(NgSelectComponent, { static: true })
  userSelect: NgSelectComponent

  private currentFetch: SubscriptionLike | null = null

  constructor(private userService: UserReadService) { }

  ngOnInit() {
    this.searchTerm$.pipe(
      distinctUntilChanged(),
      debounceTime(this.searchTermDebounceTime),
    )
    .subscribe(x => {
      this.currentSearchTerm = x
      this.users = []
      this.totalCount = 0
      if (this.currentFetch) {
        this.currentFetch.unsubscribe()
        this.currentFetch = null
      }
      this.fetchNextPage()
    })
  }

  ngOnChanges(changes: SimpleChanges) {
  }

  ngAfterViewInit() {
  }

  writeValue(x: User | null): void {
    this.userSelect.writeValue(x)
  }

  registerOnChange(fn: (...args: any[]) => any): void {
    this.userSelect.registerOnChange(fn)
  }

  registerOnTouched(fn: (...args: any[]) => any): void {
    this.userSelect.registerOnTouched(fn)
  }

  setDisabledState(isDisabled: boolean): void {
    this.userSelect.setDisabledState(isDisabled)
  }

  onOpen() {
    if (this.users.length === 0) {
      this.fetchNextPage()
    }
  }

  onScroll({ end }: { start: number, end: number }) {
    if (end < this.users.length - this.nextPageScrollThreshold || this.users.length === this.totalCount) {
      return
    }
    this.fetchNextPage()
  }

  onScrollToEnd() {

  }

  fetchNextPage() {
    if (this.currentFetch) {
      if (this.currentFetch.closed) {
        this.currentFetch = null
      }
      else {
        return
      }
    }
    const nextPage = pageForItemIndex(this.users.length, this.baseFindParams.pageSize)
    const findParams: UserSearchParams = {
      ...this.baseFindParams,
      pageIndex: nextPage
    }
    if (this.currentSearchTerm) {
      findParams.term = this.currentSearchTerm
    }
    this.currentFetch = this.userService.search(findParams).subscribe(page => {
      this.users = this.users.concat(page.items)
      if (typeof page.totalCount === 'number') {
        this.totalCount = page.totalCount
      }
    })
  }
}