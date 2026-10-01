import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { ObservationListComponent } from './observation-list.component';
import { EventService } from '../../event/event.service';
import { FilterService } from '../../filter/filter.service';
import { ObservationService } from '../observation.service';
import { DEFAULT_OBSERVATION_FILTER, EventObservationFilter } from '../../filter/filter.types';
import { ObservationFilterDialogComponent } from '../observation-filter/observation-filter.component';

describe('ObservationListComponent', () => {
  let component: ObservationListComponent;
  let fixture: ComponentFixture<ObservationListComponent>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let eventService: jasmine.SpyObj<EventService>;
  let filterService: jasmine.SpyObj<FilterService>;
  let observationService: jasmine.SpyObj<ObservationService>;
  let eventSubject: BehaviorSubject<any>;
  let observationFilterSubject: BehaviorSubject<EventObservationFilter | null>;
  let observationPageSubject: BehaviorSubject<any>;

  beforeEach(waitForAsync(() => {
    eventSubject = new BehaviorSubject<any>(null);
    observationFilterSubject = new BehaviorSubject<EventObservationFilter | null>(null);
    observationPageSubject = new BehaviorSubject<any>(null);

    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    eventService = jasmine.createSpyObj('EventService', ['retrySearch'], {
      observationPage$: observationPageSubject.asObservable()
    });
    filterService = jasmine.createSpyObj('FilterService', ['setObservationKeyword'], {
      event$: eventSubject.asObservable(),
      observationFilter$: observationFilterSubject.asObservable()
    });
    observationService = jasmine.createSpyObj('ObservationService', ['setPagingOptions', 'clearPagingOptions']);

    TestBed.configureTestingModule({
      declarations: [ObservationListComponent],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: EventService, useValue: eventService },
        { provide: FilterService, useValue: filterService },
        { provide: ObservationService, useValue: observationService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('event$', () => {
    it('sets the current event and resets the page index', () => {
      component.currentPageIndex = 3;
      const event = { id: 1, name: 'Test Event' };

      eventSubject.next(event);

      expect(component.event).toEqual(event);
      expect(component.currentPageIndex).toBe(0);
    });
  });

  describe('observationFilter$', () => {
    it('resets paging to the first page at the current page size', () => {
      component.pageSize = 25;

      observationFilterSubject.next(DEFAULT_OBSERVATION_FILTER);

      expect(observationService.setPagingOptions).toHaveBeenCalledWith({ page: 0, page_size: 25 });
    });

    it('resets loaded/searchError/stale while the new page loads', () => {
      component.loaded = true;
      component.searchError = true;
      component.stale = true;

      observationFilterSubject.next(DEFAULT_OBSERVATION_FILTER);

      expect(component.loaded).toBeFalse();
      expect(component.searchError).toBeFalse();
      expect(component.stale).toBeFalse();
    });

    it('syncs the search bar to the filter keyword', () => {
      const searchBar = jasmine.createSpyObj('SearchBarComponent', ['setValue']);
      (component as any).searchBar = searchBar;

      observationFilterSubject.next({ ...DEFAULT_OBSERVATION_FILTER, fieldFilter: { keyword: 'flood' } });

      expect(searchBar.setValue).toHaveBeenCalledWith('flood');
    });

    it('shows "All time" for the "All" interval choice', () => {
      observationFilterSubject.next({
        ...DEFAULT_OBSERVATION_FILTER,
        timeInterval: { choice: { filter: 'all', label: 'All' } }
      });
      expect(component.filterTimerange).toBe('All time');
    });

    it('shows the choice label for a named interval', () => {
      observationFilterSubject.next({
        ...DEFAULT_OBSERVATION_FILTER,
        timeInterval: { choice: { filter: 86400, label: 'Last 24 Hours' } }
      });
      expect(component.filterTimerange).toBe('Last 24 Hours');
    });

    it('formats a custom interval as a date range', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-05T00:00:00Z');
      observationFilterSubject.next({
        ...DEFAULT_OBSERVATION_FILTER,
        timeInterval: { choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate } }
      });

      expect(component.filterTimerange).toContain('2024');
      expect(component.filterTimerange).toContain('–');
    });

    it('builds the active filter icon list and count', () => {
      observationFilterSubject.next({
        ...DEFAULT_OBSERVATION_FILTER,
        memberFilter: { teamIds: ['t1'], userIds: [] },
        hasAttachments: true,
        isUserFavorite: true,
        isFlaggedImportant: true,
        fieldFilter: { condition: { formId: 1, field: 'f', operator: '=', value: 'x' } }
      });

      expect(component.activeFilters.length).toBe(5);
      expect(component.filterCount).toBe(5);
    });

    it('reports no active filters for the default filter', () => {
      observationFilterSubject.next(DEFAULT_OBSERVATION_FILTER);
      expect(component.activeFilters).toEqual([]);
      expect(component.filterCount).toBe(0);
    });

    it('clears the timerange and filters when the filter is null', () => {
      observationFilterSubject.next(DEFAULT_OBSERVATION_FILTER);
      observationFilterSubject.next(null);

      expect(component.filterTimerange).toBe('');
      expect(component.activeFilters).toEqual([]);
    });
  });

  describe('observationPage$', () => {
    it('ignores a null page', () => {
      component.loaded = true;
      observationPageSubject.next(null);
      expect(component.loaded).toBeTrue();
    });

    it('populates observations and pagination state from a successful page', () => {
      observationPageSubject.next({ data: [{ id: 'o1' }], totalCount: 1, pageIndex: 0, error: null });

      expect(component.observations).toEqual([{ id: 'o1' }]);
      expect(component.observationCount).toBe(1);
      expect(component.totalObservations).toBe(1);
      expect(component.loaded).toBeTrue();
      expect(component.searchError).toBeFalse();
      expect(component.stale).toBeFalse();
    });

    it('shows a full-page error when the fetch fails with no prior data', () => {
      observationPageSubject.next({ data: [], totalCount: 0, pageIndex: 0, error: new Error('boom') });

      expect(component.searchError).toBeTrue();
      expect(component.stale).toBeFalse();
    });

    it('shows a stale-data indicator when the fetch fails but prior data remains', () => {
      observationPageSubject.next({ data: [{ id: 'o1' }], totalCount: 1, pageIndex: 0, error: new Error('boom') });

      expect(component.searchError).toBeFalse();
      expect(component.stale).toBeTrue();
    });

    it('defaults to an empty observation list when data is missing', () => {
      observationPageSubject.next({ totalCount: 0, pageIndex: 0, error: null });
      expect(component.observations).toEqual([]);
    });
  });

  describe('onSearch', () => {
    it('sets the observation keyword', () => {
      component.onSearch('flood');
      expect(filterService.setObservationKeyword).toHaveBeenCalledWith('flood');
    });

    it('clears the keyword when the search text is empty', () => {
      component.onSearch('');
      expect(filterService.setObservationKeyword).toHaveBeenCalledWith(undefined);
    });

    it('trims the search text before setting the keyword', () => {
      component.onSearch('  flood  ');
      expect(filterService.setObservationKeyword).toHaveBeenCalledWith('flood');
    });

    it('clears the keyword when the search text is only whitespace', () => {
      component.onSearch('   ');
      expect(filterService.setObservationKeyword).toHaveBeenCalledWith(undefined);
    });
  });

  describe('openFilterDialog', () => {
    it('opens the observation filter dialog', () => {
      component.openFilterDialog();
      expect(dialog.open).toHaveBeenCalledWith(ObservationFilterDialogComponent, jasmine.objectContaining({ width: '675px' }));
    });
  });

  describe('retrySearch', () => {
    it('delegates to the event service', () => {
      component.retrySearch();
      expect(eventService.retrySearch).toHaveBeenCalled();
    });
  });

  describe('onPageChange', () => {
    it('updates the page size and requests the new page', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 25, length: 100 });

      expect(component.pageSize).toBe(25);
      expect(observationService.setPagingOptions).toHaveBeenCalledWith({ page: 2, page_size: 25 });
    });
  });

  describe('ngOnDestroy', () => {
    it('clears the paging options so the page stops being fetched', () => {
      fixture.destroy();

      expect(observationService.clearPagingOptions).toHaveBeenCalled();
    });
  });
});
