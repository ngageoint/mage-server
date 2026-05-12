import {
  Component,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { DomEvent } from 'leaflet';
import { MapSettingsService } from '../settings/map.settings.service';
import { MapSettings } from 'src/app/entities/map/entities.map';
import {
  PlacenameSearchResult,
  PlacenameSearchService
} from '../search/search.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export enum SearchState {
  ON,
  OFF
}

export interface SearchEvent {
  result: PlacenameSearchResult;
}

@Component({
  selector: 'map-control-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatListModule
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('searchList') matList!: ElementRef<HTMLElement>;

  @Output() onSearch = new EventEmitter<SearchEvent>();
  @Output() onSearchClear = new EventEmitter<void>();

  mapSettings: MapSettings;

  SearchState = SearchState;
  searchState = SearchState.OFF;

  searchResults: any[] = [];
  searching = false;

  constructor(
    private mapSettingsService: MapSettingsService,
    private searchService: PlacenameSearchService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.mapSettingsService
      .getMapSettings()
      .subscribe((settings: MapSettings) => {
        this.mapSettings = settings;
      });
  }

  ngAfterViewInit(): void {
    if (this.matList?.nativeElement) {
      DomEvent.disableClickPropagation(this.matList.nativeElement);
      DomEvent.disableScrollPropagation(this.matList.nativeElement);
    }
  }

  searchToggle(): void {
    this.searchState =
      this.searchState === SearchState.ON ? SearchState.OFF : SearchState.ON;

    if (this.searchState === SearchState.ON) {
      setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      });
    }
  }

  search(value: string): void {
    this.searching = true;
    this.searchService.search(this.mapSettings, value).subscribe(
      (results: PlacenameSearchResult[]) => {
        this.searching = false;
        this.searchResults = results;
      },
      () => {
        this.searching = false;
        this.snackBar.open('Error accessing place name server ', undefined, {
          duration: 2000
        });
      }
    );
  }

  clear($event: MouseEvent, input: HTMLInputElement): void {
    $event.stopPropagation();
    $event.preventDefault();
    input.value = '';
    this.searchResults = [];

    this.onSearchClear.emit();
  }

  searchResultClick(result: PlacenameSearchResult): void {
    this.searchToggle();
    this.onSearch.emit({ result });
  }
}
