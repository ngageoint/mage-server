import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ObservationFilterDialogComponent } from './observation-filter.component';
import { FilterService } from '../../filter/filter.service';
import { DEFAULT_OBSERVATION_FILTER, INTERVAL_CHOICES } from '../../filter/filter.types';
import { BinaryCondition } from '../../entities/observation/filter/entities.observation.filter';

describe('ObservationFilterDialogComponent', () => {
  let component: ObservationFilterDialogComponent;
  let componentAny: any;
  let fixture: ComponentFixture<ObservationFilterDialogComponent>;
  let filterService: jasmine.SpyObj<FilterService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ObservationFilterDialogComponent>>;

  const mageEvent = { id: 1, name: 'Test Event', teams: [{ id: 't1', name: 'Team 1' }] } as any;

  beforeEach(waitForAsync(() => {
    filterService = jasmine.createSpyObj('FilterService', ['getEvent', 'getObservationFilter', 'setObservationFilter']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    filterService.getEvent.and.returnValue(mageEvent);
    filterService.getObservationFilter.and.returnValue(null);

    TestBed.configureTestingModule({
      imports: [ObservationFilterDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: FilterService, useValue: filterService }
      ]
    }).overrideComponent(ObservationFilterDialogComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationFilterDialogComponent);
    component = fixture.componentInstance;
    componentAny = component;
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

    it('defaults to no filters and the default interval choice when nothing is saved', () => {
      fixture.detectChanges();
      expect(componentAny.initialMemberFilter).toBeNull();
      expect(componentAny.memberFilter).toBeNull();
      expect(componentAny.hasAttachments()).toBe(false);
      expect(componentAny.isFlaggedImportant()).toBe(false);
      expect(componentAny.isUserFavorite()).toBe(false);
      expect(componentAny.condition()).toBeUndefined();
      expect(componentAny.intervalChoice()).toEqual(INTERVAL_CHOICES[0]);
      expect(componentAny.timeZone()).toBe('local');
    });

    it('restores the saved filter state', () => {
      const savedChoice = { filter: 'custom', label: 'Custom' };
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-02T00:00:00Z');
      const condition: BinaryCondition = { formId: 1, field: 'status', operator: '=', value: 'open' };
      filterService.getObservationFilter.and.returnValue({
        ...DEFAULT_OBSERVATION_FILTER,
        memberFilter: { teamIds: ['t1'], userIds: [] },
        hasAttachments: true,
        isFlaggedImportant: true,
        isUserFavorite: true,
        fieldFilter: { keyword: 'flood', condition },
        timeInterval: { choice: savedChoice, options: { startDate, endDate, localTime: false } }
      });

      fixture.detectChanges();

      expect(componentAny.initialMemberFilter).toEqual({ teamIds: ['t1'], userIds: [] });
      expect(componentAny.memberFilter).toEqual({ teamIds: ['t1'], userIds: [] });
      expect(componentAny.hasAttachments()).toBeTrue();
      expect(componentAny.isFlaggedImportant()).toBeTrue();
      expect(componentAny.isUserFavorite()).toBeTrue();
      expect(componentAny.condition()).toEqual(condition);
      expect(componentAny.intervalChoice()).toEqual(savedChoice);
      expect(componentAny.timeZone()).toBe('gmt');
      expect(component.defaultStartDate).toEqual(startDate);
      expect(component.defaultEndDate).toEqual(endDate);
    });
  });

  describe('onMemberFilterChanged', () => {
    beforeEach(() => fixture.detectChanges());

    it('sets the member filter when a team or user is selected', () => {
      component.onMemberFilterChanged({ teamIds: ['t1'], userIds: [] });
      expect(componentAny.memberFilter).toEqual({ teamIds: ['t1'], userIds: [] });
    });

    it('clears the member filter when the selection is empty', () => {
      component.onMemberFilterChanged({ teamIds: [], userIds: [] });
      expect(componentAny.memberFilter).toBeNull();
    });
  });

  describe('onConditionChanged', () => {
    beforeEach(() => fixture.detectChanges());

    it('sets the condition', () => {
      const condition: BinaryCondition = { formId: 1, field: 'status', operator: '=', value: 'open' };
      component.onConditionChanged(condition);
      expect(componentAny.condition()).toEqual(condition);
    });

    it('clears the condition', () => {
      componentAny.condition.set({ formId: 1, field: 'status', operator: '=', value: 'open' });
      component.onConditionChanged(undefined);
      expect(componentAny.condition()).toBeUndefined();
    });
  });

  describe('onTimezone', () => {
    beforeEach(() => fixture.detectChanges());

    it('toggles between local and gmt', () => {
      componentAny.timeZone.set('local');
      component.onTimezone();
      expect(componentAny.timeZone()).toBe('gmt');
      component.onTimezone();
      expect(componentAny.timeZone()).toBe('local');
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

    it('blocks saving and shows an error when the condition builder has a pending, uncommitted condition', () => {
      spyOn(componentAny, 'fieldFilter').and.returnValue({ hasIncompleteCondition: true } as any);

      component.onFilter();

      expect(componentAny.showIncompleteConditionError()).toBeTrue();
      expect(filterService.setObservationFilter).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('saves the filter state and closes the dialog', () => {
      const condition: BinaryCondition = { formId: 1, field: 'status', operator: '=', value: 'open' };
      componentAny.memberFilter = { teamIds: ['t1'], userIds: [] };
      componentAny.hasAttachments.set(true);
      componentAny.isFlaggedImportant.set(true);
      componentAny.isUserFavorite.set(true);
      componentAny.condition.set(condition);
      componentAny.intervalChoice.set({ filter: 86400, label: 'Last 24 Hours' });

      component.onFilter();

      expect(filterService.setObservationFilter).toHaveBeenCalledWith({
        memberFilter: { teamIds: ['t1'], userIds: [] },
        hasAttachments: true,
        isUserFavorite: true,
        isFlaggedImportant: true,
        timeInterval: { choice: { filter: 86400, label: 'Last 24 Hours' } },
      }, condition);
      expect(dialogRef.close).toHaveBeenCalled();
    });

    it('includes start/end dates and the local timezone flag for a custom interval', () => {
      const startDate = new Date('2024-02-01T00:00:00Z');
      const endDate = new Date('2024-02-02T00:00:00Z');
      componentAny.intervalChoice.set({ filter: 'custom', label: 'Custom' });
      componentAny.timeZone.set('gmt');
      component.onStartDate(startDate);
      component.onEndDate(endDate);

      component.onFilter();

      const [base] = filterService.setObservationFilter.calls.mostRecent().args;
      expect(base.timeInterval).toEqual({ choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate, localTime: false } });
    });

    it('keeps the previously saved custom dates when the user does not touch the date pickers', () => {
      const startDate = new Date('2024-02-01T00:00:00Z');
      const endDate = new Date('2024-02-02T00:00:00Z');
      filterService.getObservationFilter.and.returnValue({
        ...DEFAULT_OBSERVATION_FILTER,
        timeInterval: { choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate, localTime: true } }
      });
      fixture = TestBed.createComponent(ObservationFilterDialogComponent);
      component = fixture.componentInstance;
      componentAny = component;
      fixture.detectChanges();

      component.onFilter();

      const [base] = filterService.setObservationFilter.calls.mostRecent().args;
      expect(base.timeInterval).toEqual({ choice: { filter: 'custom', label: 'Custom' }, options: { startDate, endDate, localTime: true } });
    });
  });

  describe('onCancel', () => {
    it('closes the dialog without saving', () => {
      fixture.detectChanges();

      component.onCancel();

      expect(dialogRef.close).toHaveBeenCalled();
      expect(filterService.setObservationFilter).not.toHaveBeenCalled();
    });
  });
});
