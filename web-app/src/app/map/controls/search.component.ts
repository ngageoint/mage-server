import { Component, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NominatimService } from '../search/nominatim.service';
import { MatList } from '@angular/material/list';
import { DomEvent } from 'leaflet';

export enum SearchState {
  ON,
  OFF
}

export interface SearchEvent {
  feature: any;
}

@Component({
  selector: 'map-control-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements AfterViewInit {

  @ViewChild('searchInput', { static: true }) searchInput: any;
  @ViewChild(MatList, { read: ElementRef }) matList: ElementRef;

  @Output() onSearch = new EventEmitter<SearchEvent>();
  @Output() onSearchClear = new EventEmitter<void>();

  SearchState = SearchState;
  searchState = SearchState.OFF;

  searchResults: any[] = [];
  searching = false;

  constructor(private nominatim: NominatimService) { }

  ngAfterViewInit(): void {
    DomEvent.disableClickPropagation(this.matList.nativeElement);
    DomEvent.disableScrollPropagation(this.matList.nativeElement);
  }

  searchToggle(): void {
    this.searchState = this.searchState === SearchState.ON ? SearchState.OFF : SearchState.ON;

    if (this.searchState === SearchState.ON) {
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      });
    }
  }

  search(value: string): void {
    this.searching = true;
    this.nominatim.search(value).subscribe((data: any) => {
      this.searching = false;
      this.searchResults = data.features;
    });
  }

  clear($event: MouseEvent, input: HTMLInputElement): void {
    $event.stopPropagation();
    $event.preventDefault();
    input.value = null;
    this.searchResults = [];

    this.onSearchClear.emit();
  }

  searchResultClick(result: any): void {
    this.searchToggle();
    this.onSearch.emit({ feature: result });
  }
}
