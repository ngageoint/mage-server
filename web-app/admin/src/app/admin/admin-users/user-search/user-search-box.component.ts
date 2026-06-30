import { Component, EventEmitter, Inject, Input, Output, OnDestroy } from '@angular/core';
import { User } from '../user';
import { UserPagingService } from '../../../services/user-paging.service';
import { Subject, of, lastValueFrom } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'user-search-box',
  templateUrl: './user-search-box.component.html',
  styleUrls: ['./user-search-box.component.scss']
})
export class UserSearchBoxComponent implements OnDestroy {
  @Input() placeholder: string = 'Search users...';
  @Output() userSelected = new EventEmitter<User | null>();

  userText: string = '';
  searchResults: User[] = [];
  userStateAndData: any;
  userState: string = 'all';

  private destroy$ = new Subject<void>();
  private input$ = new Subject<string>();

  constructor(private userPagingService: UserPagingService) {
    this.userStateAndData = this.userPagingService.constructDefault();

    lastValueFrom(
      this.userPagingService.refresh(this.userStateAndData).pipe(catchError(() => of(null)))
    ).then(() => {
    });

    this.input$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((term) => {
          const trimmed = (term || '').trim();
          if (!trimmed) return of([] as User[]);

          return this.userPagingService.search(
            this.userStateAndData[this.userState],
            trimmed
          ).pipe(
            catchError(() => of([] as User[]))
          );
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

  onUserInput(term: string): void {
    this.userText = term;
    if (!term) {
      this.searchResults = [];
      return;
    }
    this.input$.next(term);
  }

  selectUser(u: User): void {
    this.userText = u?.displayName || '';
    this.searchResults = [];
    this.userSelected.emit(u);
  }

  clear(): void {
    this.userText = '';
    this.searchResults = [];
    this.userSelected.emit(null);
  }
}
