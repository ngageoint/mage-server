import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { User } from '../user';
import { UserPagingService } from '../../services/user-paging.service';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@Component({
    selector: 'user-search-box',
    templateUrl: './user-search-box.component.html',
    styleUrls: ['./user-search-box.component.scss'],
    imports: [
      FormsModule,
      MatFormFieldModule,
      MatInputModule,
      MatIconModule,
      MatButtonModule,
      MatAutocompleteModule
    ]
})
export class UserSearchBoxComponent {
  private readonly userPagingService = inject(UserPagingService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() placeholder: string = 'Search users...';
  @Output() userSelected = new EventEmitter<User | null>();

  inputValue: User | string = '';
  readonly searchResults = signal<User[]>([]);
  userState: string = 'all';

  private userStateAndData: any;
  private input$ = new Subject<string>();

  constructor() {
    this.userStateAndData = this.userPagingService.constructDefault();

    this.input$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
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
        this.searchResults.set((users || []).slice(0, 10));
      });
  }

  displayUser = (value: User | string | null): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.displayName || '';
  };

  onUserInput(value: User | string): void {
    if (typeof value !== 'string') return;
    if (!value) {
      this.searchResults.set([]);
      this.userSelected.emit(null);
      return;
    }
    this.input$.next(value);
  }

  onOptionSelected(user: User): void {
    this.searchResults.set([]);
    this.userSelected.emit(user);
  }

  clear(): void {
    this.inputValue = '';
    this.searchResults.set([]);
    this.userSelected.emit(null);
  }
}
