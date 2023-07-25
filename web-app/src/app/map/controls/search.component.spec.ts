import { async, ComponentFixture, TestBed, getTestBed, tick, fakeAsync } from '@angular/core/testing';

import { SearchComponent, SearchState } from './search.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule, MatListItem } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NominatimService } from '../search/nominatim.service';
import { By } from '@angular/platform-browser';
import { defer } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let injector: TestBed;
  let service: NominatimService;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, MatIconModule, MatButtonModule, HttpClientTestingModule, MatInputModule, MatProgressSpinnerModule, MatListModule, MatCardModule],
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
    service = injector.get(NominatimService);
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

    let mockResult: any = {
      features: [{
        properties: {
          display_name: 'test'
        }
      }]
    };

    service.search = () => {
      return defer(() => Promise.resolve(mockResult));
    }

    const button = fixture.debugElement.query(By.css('button'));
    button.nativeElement.click();

    fixture.detectChanges();

    component.searchInput.value = "test";

    const event = new KeyboardEvent("keydown", {
      "key": "Enter"
    });
    component.searchInput.nativeElement.dispatchEvent(event);

    tick(100);

    expect(component.searchResults).toEqual(mockResult.features);

    fixture.detectChanges();

    const item = fixture.debugElement.query(By.directive(MatListItem));
    item.nativeElement.click();

    expect(component.onSearch.emit).toHaveBeenCalledWith({
      feature: mockResult.features[0]
    });
  }));

  it('should clear', () => {
    spyOn(component.onSearchClear, 'emit');

    const button = fixture.debugElement.query(By.css('button'));
    button.nativeElement.click();

    fixture.detectChanges();

    component.searchInput.nativeElement.value = "test";

    fixture.detectChanges();

    const clearButton = fixture.debugElement.queryAll(By.css('button'))[1];
    clearButton.nativeElement.click();

    fixture.detectChanges();

    expect(component.searchInput.nativeElement.value).toEqual("");
    expect(component.onSearchClear.emit).toHaveBeenCalled();
  });
});
