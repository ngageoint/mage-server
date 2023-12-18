import { async, ComponentFixture, TestBed, getTestBed, tick, fakeAsync } from '@angular/core/testing';

import { SearchComponent, SearchState } from './search.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule, MatListItem } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PlacenameSearchResult, PlacenameSearchService } from '../search/search.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { defer } from 'rxjs';
import { MobileSearchType, WebSearchType } from 'src/app/entities/map/entities.map';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let injector: TestBed;
  let service: PlacenameSearchService;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, HttpClientTestingModule, MatCardModule, MatButtonModule, MatIconModule, MatInputModule, MatListModule, MatProgressSpinnerModule, MatSnackBarModule ],
      declarations: [ SearchComponent ],
      providers: []
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    injector = getTestBed();
    service = injector.get(PlacenameSearchService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle search on', () => {
    const button = fixture.debugElement.query(By.css('button'));
    button.nativeElement.click();

    expect(component.searchState).toEqual(0);
  });

  it('should toggle search off', () => {
    component.searchState = SearchState.ON;

    const button = fixture.debugElement.query(By.css('button'));
    button.nativeElement.click();

    expect(component.searchState).toEqual(1)
  });

  it('should search', fakeAsync(() => {
    spyOn(component.onSearch, 'emit');

    component.searchState = SearchState.ON

    component.mapSettings = {
      webSearchType: WebSearchType.NOMINATIM,
      webNominatimUrl: '',
      mobileSearchType: MobileSearchType.NONE,
      mobileNominatimUrl: ''
    }

    fixture.detectChanges()

    let results: PlacenameSearchResult[] = [{
      name: "test",
      bbox: [0, 0, 0, 0],
      position: [0, 0]
    }];

    service.search = () => {
      return defer(() => Promise.resolve(results));
    }

    const input = fixture.debugElement.query(By.css('input')).nativeElement
    input.value = "test"
    
    const event = new KeyboardEvent("keydown", {
      "key": "Enter"
    });
    input.dispatchEvent(event);

    tick(100);

    expect(component.searchResults).toEqual(results);

    fixture.detectChanges();

    const item = fixture.debugElement.query(By.directive(MatListItem));
    item.nativeElement.click();

    expect(component.onSearch.emit).toHaveBeenCalledWith({
      result: results[0]
    });
  }));

  it('should clear', () => {
    spyOn(component.onSearchClear, 'emit');

    component.searchState = SearchState.ON

    component.mapSettings = {
      webSearchType: WebSearchType.NOMINATIM,
      webNominatimUrl: '',
      mobileSearchType: MobileSearchType.NONE,
      mobileNominatimUrl: ''
    }

    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input')).nativeElement
    input.value = "test"

    fixture.detectChanges();

    expect(input.value).toEqual("test");

    const clearButton = fixture.debugElement.queryAll(By.css('button'))[1];
    clearButton.nativeElement.click();

    fixture.detectChanges();

    expect(input.value).toEqual("");
    expect(component.onSearchClear.emit).toHaveBeenCalled();
  });
});
