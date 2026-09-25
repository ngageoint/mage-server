import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { UserListComponent } from './user-list.component';
import { EventService } from '../../event/event.service';
import { FilterService } from '../../filter/filter.service';
import { EventLocationFilter, DEFAULT_LOCATION_FILTER } from '../../filter/filter.types';
import { LocationFilterDialogComponent } from '../location/location-filter.component';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let eventService: jasmine.SpyObj<EventService>;
  let locationFilterSubject: BehaviorSubject<EventLocationFilter | null>;
  let locationsSubject: BehaviorSubject<any>;

  function userLocation(id: string, timestamp: string) {
    return { id, location: { properties: { timestamp } } };
  }

  beforeEach(waitForAsync(() => {
    locationFilterSubject = new BehaviorSubject<EventLocationFilter | null>(null);
    locationsSubject = new BehaviorSubject<any>(null);

    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    eventService = jasmine.createSpyObj('EventService', ['retryLocations'], {
      locations$: locationsSubject.asObservable()
    });
    const filterService = jasmine.createSpyObj('FilterService', [], {
      locationFilter$: locationFilterSubject.asObservable()
    });

    TestBed.configureTestingModule({
      declarations: [UserListComponent],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: EventService, useValue: eventService },
        { provide: FilterService, useValue: filterService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('locationFilter$', () => {
    it('resets loading state and page index', () => {
      component.loaded = true;
      component.currentUserPage = 3;

      locationFilterSubject.next(DEFAULT_LOCATION_FILTER);

      expect(component.loaded).toBeFalse();
      expect(component.currentUserPage).toBe(0);
    });

    it('shows "All time" when there is no filter', () => {
      locationFilterSubject.next(null);
      expect(component.filterTimerange).toBe('All time');
    });

    it('shows "All time" for the "All" interval choice', () => {
      locationFilterSubject.next({
        ...DEFAULT_LOCATION_FILTER,
        timeInterval: { choice: { filter: 'all', label: 'All' } }
      });
      expect(component.filterTimerange).toBe('All time');
    });

    it('shows the choice label for a named interval', () => {
      locationFilterSubject.next({
        ...DEFAULT_LOCATION_FILTER,
        timeInterval: { choice: { filter: 86400, label: 'Last 24 Hours' } }
      });
      expect(component.filterTimerange).toBe('Last 24 Hours');
    });

    it('formats a custom interval as a date range', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-05T00:00:00Z');
      locationFilterSubject.next({
        ...DEFAULT_LOCATION_FILTER,
        timeInterval: { choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate } }
      });

      expect(component.filterTimerange).toContain('2024');
      expect(component.filterTimerange).toContain('–');
    });

    it('shows a group filter icon when a member filter is active', () => {
      locationFilterSubject.next({
        ...DEFAULT_LOCATION_FILTER,
        memberFilter: { teamIds: ['t1'], userIds: [] }
      });

      expect(component.activeFilterIcons).toEqual(['group']);
      expect(component.filterCount).toBe(1);
    });

    it('shows no filter icons when the member filter is empty', () => {
      locationFilterSubject.next({
        ...DEFAULT_LOCATION_FILTER,
        memberFilter: { teamIds: [], userIds: [] }
      });

      expect(component.activeFilterIcons).toEqual([]);
      expect(component.filterCount).toBe(0);
    });

    it('clears stale error state left over from a prior fetch', () => {
      const u1 = userLocation('u1', '2024-01-01T00:00:00Z');
      locationsSubject.next({ data: [u1], error: null });
      locationsSubject.next({ data: [u1], error: 'boom' });
      expect(component.stale).toBeTrue();

      locationFilterSubject.next(DEFAULT_LOCATION_FILTER);

      expect(component.searchError).toBeFalse();
      expect(component.stale).toBeFalse();
    });
  });

  describe('locations$', () => {
    it('ignores a null result', () => {
      component.loaded = true;
      locationsSubject.next(null);
      expect(component.loaded).toBeTrue();
    });

    it('populates users and pagination state from a result', () => {
      const u1 = userLocation('u1', '2024-01-01T00:00:00Z');
      locationsSubject.next({ data: [u1] });

      expect(component.userCount).toBe(1);
      expect(component.totalUsers).toBe(1);
      expect(component.userPages).toEqual([[u1]]);
      expect(component.loaded).toBeTrue();
    });

    it('defaults to an empty list when data is missing', () => {
      locationsSubject.next({});
      expect(component.userCount).toBe(0);
      expect(component.userPages).toEqual([]);
    });

    it('sorts users by most recent location first', () => {
      const older = userLocation('u1', '2024-01-01T00:00:00Z');
      const newer = userLocation('u2', '2024-01-02T00:00:00Z');
      locationsSubject.next({ data: [older, newer] });

      expect(component.userPages[0]).toEqual([newer, older]);
    });

    it('shows a full-page error when the fetch fails with no prior data', () => {
      locationsSubject.next({ data: [], error: new Error('boom') });

      expect(component.searchError).toBeTrue();
      expect(component.stale).toBeFalse();
    });

    it('shows a stale-data indicator when the fetch fails but prior data remains', () => {
      const u1 = userLocation('u1', '2024-01-01T00:00:00Z');
      locationsSubject.next({ data: [u1], error: new Error('boom') });

      expect(component.searchError).toBeFalse();
      expect(component.stale).toBeTrue();
    });

    it('clears the error/stale state on a successful fetch', () => {
      locationsSubject.next({ data: [], error: new Error('boom') });
      expect(component.searchError).toBeTrue();

      locationsSubject.next({ data: [], error: null });

      expect(component.searchError).toBeFalse();
      expect(component.stale).toBeFalse();
    });
  });

  describe('retryLocations', () => {
    it('delegates to the event service', () => {
      component.retryLocations();
      expect(eventService.retryLocations).toHaveBeenCalled();
    });
  });

  describe('calculateUserPages', () => {
    it('splits users into pages of usersPerPage', () => {
      component.usersPerPage = 2;
      const users = [
        userLocation('u1', '2024-01-01T00:00:00Z'),
        userLocation('u2', '2024-01-02T00:00:00Z'),
        userLocation('u3', '2024-01-03T00:00:00Z')
      ];

      component.calculateUserPages(users);

      expect(component.userPages.length).toBe(2);
      expect(component.userPages[0].length).toBe(2);
      expect(component.userPages[1].length).toBe(1);
    });

    it('clamps the current page when it no longer exists', () => {
      component.usersPerPage = 50;
      component.currentUserPage = 5;

      component.calculateUserPages([userLocation('u1', '2024-01-01T00:00:00Z')]);

      expect(component.currentUserPage).toBe(0);
    });
  });

  describe('onPageChange', () => {
    it('updates the current page index', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 50, length: 100 });
      expect(component.currentUserPage).toBe(2);
    });

    it('recalculates pages when the page size changes', () => {
      spyOn(component, 'calculateUserPages');

      component.onPageChange({ pageIndex: 0, pageSize: 25, length: 100 });

      expect(component.usersPerPage).toBe(25);
      expect(component.calculateUserPages).toHaveBeenCalled();
    });

    it('does not recalculate pages when the page size is unchanged', () => {
      spyOn(component, 'calculateUserPages');

      component.onPageChange({ pageIndex: 1, pageSize: 50, length: 100 });

      expect(component.calculateUserPages).not.toHaveBeenCalled();
    });
  });

  describe('openFilterDialog', () => {
    it('opens the location filter dialog', () => {
      component.openFilterDialog();
      expect(dialog.open).toHaveBeenCalledWith(LocationFilterDialogComponent, jasmine.objectContaining({ width: '675px' }));
    });
  });
});
