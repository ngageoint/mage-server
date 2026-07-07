import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { User } from '../user';
import { UserPagingService } from '../../services/user-paging.service';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

@Component({
    selector: 'user-search-box',
    templateUrl: './user-search-box.component.html',
    styleUrls: ['./user-search-box.component.scss'],
    standalone: false
})
export class UserSearchBoxComponent implements OnDestroy {
  @Input() placeholder: string = 'Search users...';
  @Output() userSelected = new EventEmitter<User | null>();

  inputValue: User | string = '';
  searchResults: User[] = [];
  userState: string = 'all';

  private userStateAndData: any;
  private destroy$ = new Subject<void>();
  private input$ = new Subject<string>();

  constructor(private userPagingService: UserPagingService) {
    this.userStateAndData = this.userPagingService.constructDefault();

    this.input$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term.trim()) return of([] as User[]);
          return this.userPagingService.search(
            this.userStateAndData[this.userState],
            term.trim()
          ).pipe(catchError(() => of([] as User[])));
        })
      )
      .subscribe((users: User[]) => {
        this.searchResults = (users || []).slice(0, 10);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  displayUser = (value: User | string | null): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.displayName || '';
  };

  onUserInput(value: User | string): void {
    if (typeof value !== 'string') return;
    if (!value) {
      this.searchResults = [];
      this.userSelected.emit(null);
      return;
    }
    this.input$.next(value);
  }

  onOptionSelected(user: User): void {
    this.searchResults = [];
    this.userSelected.emit(user);
  }

  clear(): void {
    this.inputValue = '';
    this.searchResults = [];
    this.userSelected.emit(null);
  }
}
