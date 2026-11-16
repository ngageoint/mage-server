import {
  Component,
  Directive,
  ElementRef,
  AfterViewInit,
  ViewEncapsulation,
  inject,
  input,
  output,
  viewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DomEvent } from 'leaflet';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlacenameSearchResult } from '../../geocoder/search/search.service';
import { GeocoderService } from '../../geocoder/geocoder';

export enum SearchState {
  ON,
  OFF
}

@Directive()
export abstract class BaseSearchComponent {
  protected readonly geocoderService = inject(GeocoderService);
  private readonly snackBar = inject(MatSnackBar);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  onSearch = output<PlacenameSearchResult>();
  onSearchClear = output<void>();

  SearchState = SearchState;
  searchState = SearchState.OFF;

  searchResults: PlacenameSearchResult[] = [];
  searching = false;
  hint = '';

  searchToggle(): void {
    this.searchState =
      this.searchState === SearchState.ON ? SearchState.OFF : SearchState.ON;

    if (this.searchState === SearchState.ON) {
      setTimeout(() => {
        this.searchInput()?.nativeElement?.focus();
      });
    }
  }

  async search(value: string): Promise<void> {
    this.searching = true;

    try {
      this.searchResults = await this.geocoderService.geocode(value);
      if (!this.searchResults.length) {
        const message = this.geocoderService.placenameSearchEnabled
          ? 'No results found'
          : 'Place name search is not available, enter coordinates';
        this.snackBar.open(message, undefined, { duration: 3000 });
      }
    } catch {
      this.searchResults = [];
      this.snackBar.open('Error accessing place name server', undefined, {
        duration: 2000
      });
    } finally {
      this.searching = false;
    }
  }

  clear($event: MouseEvent): void {
    $event.stopPropagation();
    $event.preventDefault();
    this.clearResults();
    this.searchState = SearchState.OFF;

    this.onSearchClear.emit();
  }

  searchResultClick(result: PlacenameSearchResult): void {
    this.onSearch.emit(result);
  }

  clearResults(): void {
    const input = this.searchInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
    this.searchResults = [];
  }
}

@Component({
  selector: 'map-control-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: false
})
export class SearchComponent extends BaseSearchComponent implements AfterViewInit {
  matList = viewChild<ElementRef<HTMLElement>>('searchList');

  get placeholder(): string {
    return this.geocoderService.placenameSearchEnabled ? 'Place name or coordinates' : 'Coordinates';
  }

  ngAfterViewInit(): void {
    const list = this.matList()?.nativeElement;
    if (list) {
      DomEvent.disableClickPropagation(list);
      DomEvent.disableScrollPropagation(list);
    }
  }
}

@Component({
  selector: 'embedded-control-search',
  templateUrl: './embedded.search.component.html',
  styleUrls: ['./embedded.search.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    DecimalPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ]
})
export class EmbeddedSearchComponent extends BaseSearchComponent {
  label = input('Search by name, address, or coordinates');

  displayFn(option: PlacenameSearchResult | null): string {
    return option?.name ?? '';
  }

  async search(value: string): Promise<void> {
    await super.search(value);

    // Coordinates and MGRS come back as a single result named after the input, take it without the dropdown
    if (this.searchResults.length === 1 && this.searchResults[0].name === value) {
      const result = this.searchResults[0];
      this.searchResults = [];
      this.searchResultClick(result);
    }
  }

  searchResultClick(result: PlacenameSearchResult): void {
    super.searchResultClick(result);
    this.hint = result.coordinateString();
  }
}
