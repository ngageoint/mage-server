import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

export interface CardActionButton {
  label: string;
  type: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  action: () => void;
}

/**
 * A reusable card navbar component that provides a title, optional search functionality,
 * and configurable action buttons. The component handles search debouncing and emits
 * events for search term changes and search clearing.
 */
@Component({
  selector: 'mage-card-navbar',
  templateUrl: './card-navbar.component.html',
  styleUrls: ['./card-navbar.component.scss']
})
export class CardNavbarComponent implements OnInit, OnDestroy {
  @Input() title: string;
  @Input() isSearchable = false;
  @Input() searchPlaceholder = 'Search...';
  @Input() actionButtons: CardActionButton[] = [];

  @Output() searchTermChanged = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();

  searchTerm: string = '';
  debounceTime = 250;

  private searchSubject$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor() { }

  /**
   * Sets up the search subject with debouncing and change detection.
   */
  ngOnInit(): void {
    this.searchSubject$.pipe(
      debounceTime(this.debounceTime),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchTermChanged.emit(searchTerm);
    });
  }

  /**
   * Component destruction lifecycle hook
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Clears the search input and emits the searchCleared event
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject$.next('');
    this.searchCleared.emit();
  }

  /**
   * Handles action button click events
   * 
   * @param button - The action button that was clicked
   */
  onActionButtonClick(button: CardActionButton): void {
    if (button.action) {
      button.action();
    }
  }

  /**
   * Handles search input changes
   * 
   * @param term - The new search term entered by the user
   */
  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.searchSubject$.next(term);
  }
}
