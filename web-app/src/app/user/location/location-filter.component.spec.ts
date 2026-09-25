import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { LocationFilterDialogComponent } from './location-filter.component';
import { FilterService } from '../../filter/filter.service';
import { DEFAULT_LOCATION_FILTER, INTERVAL_CHOICES } from '../../filter/filter.types';

describe('LocationFilterDialogComponent', () => {
  let component: LocationFilterDialogComponent;
  let fixture: ComponentFixture<LocationFilterDialogComponent>;
  let filterService: jasmine.SpyObj<FilterService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<LocationFilterDialogComponent>>;

  const mageEvent = { id: 1, name: 'Test Event', teams: [{ id: 't1', name: 'Team 1' }] } as any;

  beforeEach(waitForAsync(() => {
    filterService = jasmine.createSpyObj('FilterService', ['getEvent', 'getLocationFilter', 'setLocationFilter']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    filterService.getEvent.and.returnValue(mageEvent);
    filterService.getLocationFilter.and.returnValue(null);

    TestBed.configureTestingModule({
      imports: [LocationFilterDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: FilterService, useValue: filterService }
      ]
    }).overrideComponent(LocationFilterDialogComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationFilterDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('populates event and teams from the current event', () => {
      fixture.detectChanges();
      expect(component.mageEvent).toEqual(mageEvent);
      expect(component.teams).toEqual(mageEvent.teams);
    });

    it('defaults to no member filter and the default interval choice when nothing is saved', () => {
      fixture.detectChanges();
      expect(component.initialMemberFilter).toBeNull();
      expect(component.memberFilter).toBeNull();
      expect(component.intervalChoice()).toEqual(INTERVAL_CHOICES[1]);
      expect(component.timeZone()).toBe('local');
    });

    it('restores the saved member filter and interval choice', () => {
      const savedChoice = { filter: 'custom', label: 'Custom' };
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-02T00:00:00Z');
      filterService.getLocationFilter.and.returnValue({
        ...DEFAULT_LOCATION_FILTER,
        memberFilter: { teamIds: ['t1'], userIds: [] },
        timeInterval: { choice: savedChoice, options: { startDate, endDate, localTime: false } }
      });

      fixture.detectChanges();

      expect(component.initialMemberFilter).toEqual({ teamIds: ['t1'], userIds: [] });
      expect(component.memberFilter).toEqual({ teamIds: ['t1'], userIds: [] });
      expect(component.intervalChoice()).toEqual(savedChoice);
      expect(component.timeZone()).toBe('gmt');
      expect(component.defaultStartDate).toEqual(startDate);
      expect(component.defaultEndDate).toEqual(endDate);
    });
  });

  describe('onMemberFilterChanged', () => {
    beforeEach(() => fixture.detectChanges());

    it('sets the member filter when a team or user is selected', () => {
      component.onMemberFilterChanged({ teamIds: ['t1'], userIds: [] });
      expect(component.memberFilter).toEqual({ teamIds: ['t1'], userIds: [] });
    });

    it('clears the member filter when the selection is empty', () => {
      component.onMemberFilterChanged({ teamIds: [], userIds: [] });
      expect(component.memberFilter).toBeNull();
    });
  });

  describe('onTimezone', () => {
    beforeEach(() => fixture.detectChanges());

    it('toggles between local and gmt', () => {
      component.timeZone.set('local');
      component.onTimezone();
      expect(component.timeZone()).toBe('gmt');
      component.onTimezone();
      expect(component.timeZone()).toBe('local');
    });
  });

  describe('compareIntervalChoices', () => {
    beforeEach(() => fixture.detectChanges());

    it('compares by the filter value', () => {
      expect(component.compareIntervalChoices({ filter: 'all', label: 'All' }, { filter: 'all', label: 'Different label' })).toBeTrue();
      expect(component.compareIntervalChoices({ filter: 'all', label: 'All' }, { filter: 'today', label: 'All' })).toBeFalse();
    });
  });

  describe('onFilter', () => {
    beforeEach(() => fixture.detectChanges());

    it('saves the member filter and time interval, then closes the dialog', () => {
      component.memberFilter = { teamIds: ['t1'], userIds: [] };
      component.intervalChoice.set({ filter: 86400, label: 'Last 24 Hours' });

      component.onFilter();

      expect(filterService.setLocationFilter).toHaveBeenCalledWith({
        timeInterval: { choice: { filter: 86400, label: 'Last 24 Hours' } },
        memberFilter: { teamIds: ['t1'], userIds: [] }
      });
      expect(dialogRef.close).toHaveBeenCalled();
    });

    it('includes start/end dates and the local timezone flag for a custom interval', () => {
      const startDate = new Date('2024-02-01T00:00:00Z');
      const endDate = new Date('2024-02-02T00:00:00Z');
      component.intervalChoice.set({ filter: 'custom', label: 'Custom' });
      component.timeZone.set('gmt');
      component.onStartDate(startDate);
      component.onEndDate(endDate);

      component.onFilter();

      expect(filterService.setLocationFilter).toHaveBeenCalledWith({
        timeInterval: { choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate, localTime: false } },
        memberFilter: null
      });
    });

    it('keeps the previously saved custom dates when the user does not touch the date pickers', () => {
      const startDate = new Date('2024-02-01T00:00:00Z');
      const endDate = new Date('2024-02-02T00:00:00Z');
      filterService.getLocationFilter.and.returnValue({
        ...DEFAULT_LOCATION_FILTER,
        timeInterval: { choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate, localTime: true } }
      });
      fixture = TestBed.createComponent(LocationFilterDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      component.onFilter();

      expect(filterService.setLocationFilter).toHaveBeenCalledWith({
        timeInterval: { choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate, localTime: true } },
        memberFilter: null
      });
    });
  });

  describe('onCancel', () => {
    it('closes the dialog without saving', () => {
      fixture.detectChanges();

      component.onCancel();

      expect(dialogRef.close).toHaveBeenCalled();
      expect(filterService.setLocationFilter).not.toHaveBeenCalled();
    });
  });
});
