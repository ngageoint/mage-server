import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SearchComponent, SearchState } from './search.component';
import {
  PlacenameSearchResult,
  PlacenameSearchService
} from '../search/search.service';
import {
  MapSettings,
  MobileSearchType,
  WebSearchType
} from 'src/app/entities/map/entities.map';
import { MapSettingsService } from '../settings/map.settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ElementRef } from '@angular/core';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let mapSettingsService: jasmine.SpyObj<MapSettingsService>;
  let searchService: jasmine.SpyObj<PlacenameSearchService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mapSettings: MapSettings = {
    webSearchType: WebSearchType.NOMINATIM,
    webNominatimUrl: '',
    mobileSearchType: MobileSearchType.NONE,
    mobileNominatimUrl: ''
  };

  beforeEach(() => {
    mapSettingsService = jasmine.createSpyObj<MapSettingsService>(
      'MapSettingsService',
      ['getMapSettings']
    );

    searchService = jasmine.createSpyObj<PlacenameSearchService>(
      'PlacenameSearchService',
      ['search']
    );

    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    mapSettingsService.getMapSettings.and.returnValue(of(mapSettings));

    component = new SearchComponent(
      mapSettingsService,
      searchService,
      snackBar
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load map settings on init', () => {
    component.ngOnInit();

    expect(mapSettingsService.getMapSettings).toHaveBeenCalled();
    expect(component.mapSettings).toEqual(mapSettings);
  });

  it('should toggle search on', fakeAsync(() => {
    const focusSpy = jasmine.createSpy('focus');

    component.searchInput = {
      nativeElement: {
        focus: focusSpy
      }
    } as any as ElementRef<HTMLInputElement>;

    component.searchToggle();

    tick();

    expect(component.searchState as SearchState).toBe(SearchState.ON);
    expect(focusSpy).toHaveBeenCalled();
  }));

  it('should toggle search off', () => {
    component.searchState = SearchState.ON;

    component.searchToggle();

    expect(component.searchState as SearchState).toBe(SearchState.OFF);
  });

  it('should search', () => {
    component.mapSettings = mapSettings;

    const results: PlacenameSearchResult[] = [
      {
        name: 'test',
        bbox: [0, 0, 0, 0],
        position: [0, 0]
      }
    ];

    searchService.search.and.returnValue(of(results));

    component.search('test');

    expect(component.searching).toBe(false);
    expect(searchService.search).toHaveBeenCalledWith(mapSettings, 'test');
    expect(component.searchResults).toEqual(results);
  });

  it('should show snack bar when search fails', () => {
    component.mapSettings = mapSettings;

    searchService.search.and.returnValue(
      throwError(() => new Error('Search failed'))
    );

    component.search('test');

    expect(component.searching).toBe(false);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Error accessing place name server ',
      undefined,
      {
        duration: 2000
      }
    );
  });

  it('should clear', () => {
    spyOn(component.onSearchClear, 'emit');

    const event = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
      'stopPropagation',
      'preventDefault'
    ]);

    const input = {
      value: 'test'
    } as HTMLInputElement;

    component.searchResults = [
      {
        name: 'test',
        bbox: [0, 0, 0, 0],
        position: [0, 0]
      }
    ];

    component.clear(event, input);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(input.value).toEqual('');
    expect(component.searchResults).toEqual([]);
    expect(component.onSearchClear.emit).toHaveBeenCalled();
  });

  it('should emit selected search result and close search', () => {
    spyOn(component.onSearch, 'emit');
    spyOn(component, 'searchToggle').and.callThrough();

    component.searchState = SearchState.ON;

    const result: PlacenameSearchResult = {
      name: 'test',
      bbox: [0, 0, 0, 0],
      position: [0, 0]
    };

    component.searchResultClick(result);

    expect(component.searchToggle).toHaveBeenCalled();
    expect(component.searchState as SearchState).toBe(SearchState.OFF);
    expect(component.onSearch.emit).toHaveBeenCalledWith({ result });
  });
});