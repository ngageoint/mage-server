import {
  ComponentFixture,
  TestBed,
  getTestBed,
  tick,
  fakeAsync,
  flush,
  discardPeriodicTasks,
  waitForAsync
} from '@angular/core/testing';

import { EmbeddedSearchComponent, SearchComponent, SearchState } from './search.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule, MatListItem } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  PlacenameSearchResult,
  PlacenameSearchService
} from '../../geocoder/search/search.service';
import { GeocoderService } from '../../geocoder/geocoder';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let injector: TestBed;
  let service: PlacenameSearchService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [SearchComponent],
    imports: [BrowserAnimationsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTooltipModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    injector = getTestBed();
    service = injector.inject(PlacenameSearchService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle search on', () => {
    const button = fixture.debugElement.query(By.css('.search-toggle'));
    button.nativeElement.click();

    expect(component.searchState as SearchState).toBe(SearchState.ON);
  });

  it('should toggle search off', () => {
    component.searchState = SearchState.ON;

    const button = fixture.debugElement.query(By.css('.search-toggle'));
    button.nativeElement.click();

    expect(component.searchState as SearchState).toBe(SearchState.OFF);
  });

  it('should search', fakeAsync(() => {
    spyOn(component.onSearch, 'emit');

    component.searchState = SearchState.ON;

    const results: PlacenameSearchResult[] = [
      new PlacenameSearchResult('test', [0, 0, 0, 0], [0, 0])
    ];

    spyOn(service, 'search').and.returnValue(of(results));

    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input')).nativeElement;
    input.value = 'test';

    const event = new KeyboardEvent('keydown', {
      key: 'Enter'
    });
    input.dispatchEvent(event);

    tick();
    fixture.detectChanges();

    expect(component.searchResults).toEqual(results);

    const item = fixture.debugElement.query(By.directive(MatListItem));
    expect(item).toBeTruthy();

    item.nativeElement.click();

    expect(component.onSearch.emit).toHaveBeenCalledWith(results[0]);

    flush();
    discardPeriodicTasks();
  }));

  it('should clear', () => {
    spyOn(component.onSearchClear, 'emit');

    component.searchState = SearchState.ON;

    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input')).nativeElement;
    input.value = 'test';

    fixture.detectChanges();

    expect(input.value).toEqual('test');

    const clearButton = fixture.debugElement.query(By.css('.search-clear'));
    clearButton.nativeElement.click();

    fixture.detectChanges();

    expect(input.value).toEqual('');
    expect(component.onSearchClear.emit).toHaveBeenCalled();
  });
});

describe('EmbeddedSearchComponent', () => {
  let component: EmbeddedSearchComponent;
  let geocoderService: jasmine.SpyObj<GeocoderService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    geocoderService = jasmine.createSpyObj<GeocoderService>('GeocoderService', ['geocode'], { placenameSearchEnabled: true });
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [EmbeddedSearchComponent, BrowserAnimationsModule],
      providers: [
        { provide: GeocoderService, useValue: geocoderService },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    });

    component = TestBed.createComponent(EmbeddedSearchComponent).componentInstance;
    spyOn(component.onSearch, 'emit');
  });

  it('should accept typed coordinates without showing results', async () => {
    const result = new PlacenameSearchResult('39.75, -104.98', [-104.98, 39.75, -104.98, 39.75], [-104.98, 39.75]);
    geocoderService.geocode.and.resolveTo([result]);

    await component.search('39.75, -104.98');

    expect(component.onSearch.emit).toHaveBeenCalledWith(result);
    expect(component.searchResults).toEqual([]);
  });

  it('should show placename results for selection', async () => {
    const result = new PlacenameSearchResult('Denver, CO', [-105, 39, -104, 40], [-104.98, 39.75]);
    geocoderService.geocode.and.resolveTo([result]);

    await component.search('denver');

    expect(component.onSearch.emit).not.toHaveBeenCalled();
    expect(component.searchResults).toEqual([result]);
  });

  it('should say when a search finds nothing', async () => {
    geocoderService.geocode.and.resolveTo([]);

    await component.search('nowhere');

    expect(snackBar.open).toHaveBeenCalledWith('No results found', undefined, { duration: 3000 });
  });

  it('should ask for coordinates when place name search is not available', async () => {
    (Object.getOwnPropertyDescriptor(geocoderService, 'placenameSearchEnabled')!.get as jasmine.Spy).and.returnValue(false);
    geocoderService.geocode.and.resolveTo([]);

    await component.search('denver');

    expect(snackBar.open).toHaveBeenCalledWith('Place name search is not available, enter coordinates', undefined, { duration: 3000 });
  });

  it('should stop searching and show an error when the place name server fails', async () => {
    geocoderService.geocode.and.rejectWith(new Error('offline'));

    await component.search('denver');

    expect(component.searching).toBeFalse();
    expect(component.searchResults).toEqual([]);
    expect(snackBar.open).toHaveBeenCalledWith('Error accessing place name server', undefined, { duration: 2000 });
  });
});
