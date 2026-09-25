import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ExportCreateComponent } from './export-create.component';
import { ExportService } from '../export.service';
import { EventService } from 'src/app/event/event.service';
import { FilterService } from 'src/app/filter/filter.service';
import { ObservationService } from 'src/app/observation/observation.service';
import { SessionService } from 'src/app/http/session.service';
import { LocationService } from 'src/app/user/location/location.service';
import { ExportFormat, FormProjection } from '../entities.export';
import { MageEvent } from 'src/app/entities/event/entities.event';

describe('ExportCreateComponent', () => {
  let component: ExportCreateComponent;
  let fixture: ComponentFixture<ExportCreateComponent>;

  const event = {
    id: 1,
    name: 'Test Event',
    forms: [{
      id: 10,
      name: 'Form One',
      archived: false,
      fields: [
        { id: 1, name: 'field1', title: 'Field 1', type: 'text', archived: false },
        { id: 2, name: 'field2', title: 'Field 2', type: 'text', archived: false }
      ]
    }]
  } as unknown as MageEvent;

  const exportService = jasmine.createSpyObj('ExportService', ['export']);
  const eventService = jasmine.createSpyObj('EventService', ['query']);
  const filterService = jasmine.createSpyObj('FilterService', ['getEvent', 'getObservationFilter', 'getLocationFilter']);
  const observationService = jasmine.createSpyObj('ObservationService', ['getObservationsPage']);
  const locationService = jasmine.createSpyObj('LocationService', ['getUserLocationsCount']);
  const sessionService = { user: { id: 'user1' } };

  beforeEach(waitForAsync(() => {
    exportService.export.and.returnValue(of({}));
    eventService.query.and.returnValue(of([event]));
    filterService.getEvent.and.returnValue(event);
    filterService.getObservationFilter.and.returnValue(null);
    filterService.getLocationFilter.and.returnValue(null);
    observationService.getObservationsPage.and.returnValue(of({ items: [], totalCount: 0, links: { next: null, prev: null } }));
    locationService.getUserLocationsCount.and.returnValue(of({ totalCount: 0 }));
    exportService.export.calls.reset();

    TestBed.configureTestingModule({
      imports: [
        FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule,
        MatCheckboxModule, MatChipsModule, MatSelectModule, MatToolbarModule, MatIconModule, MatCardModule,
        MatRippleModule, MatExpansionModule, MatSlideToggleModule, MatListModule, MatPaginatorModule,
        MatDatepickerModule, MatProgressSpinnerModule, MatDividerModule
      ],
      declarations: [ExportCreateComponent],
      providers: [
        { provide: ExportService, useValue: exportService },
        { provide: EventService, useValue: eventService },
        { provide: FilterService, useValue: filterService },
        { provide: ObservationService, useValue: observationService },
        { provide: LocationService, useValue: locationService },
        { provide: SessionService, useValue: sessionService },
        provideNoopAnimations()
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportCreateComponent);
    component = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should build form projections from the selected event', () => {
    expect(component.formProjections.length).toEqual(1);
    expect(component.formProjections[0].fieldProjections.length).toEqual(2);
  });

  it('defaults to exporting both observations and locations', () => {
    expect(component.exportObservations).toBe(true);
    expect(component.exportLocations).toBe(true);
  });

  it('sends both observations and locations when both are checked', () => {
    component.eventControl.setValue(event);
    component.exportFormat = ExportFormat.CSV;
    component.submit();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.observations).toBeDefined();
    expect(request.locations).toBeDefined();
  });

  it('sends only observations when locations is unchecked', () => {
    component.eventControl.setValue(event);
    component.exportLocations = false;
    component.submit();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.observations).toBeDefined();
    expect(request.locations).toBeUndefined();
  });

  it('sends only locations when observations is unchecked', () => {
    component.eventControl.setValue(event);
    component.exportObservations = false;
    component.submit();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.observations).toBeUndefined();
    expect(request.locations).toBeDefined();
  });

  it('requires at least one type to be checked', () => {
    component.eventControl.setValue(event);
    component.exportObservations = false;
    component.exportLocations = false;
    component.submit();
    expect(component.showTypeRequiredError).toBe(true);
    expect(exportService.export).not.toHaveBeenCalled();
  });

  it('omits projection when all fields selected', () => {
    component.eventControl.setValue(event);
    component.exportFormat = ExportFormat.CSV;
    component.submit();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.observations.projection).toBeUndefined();
  });

  it('includes projection when a subset is selected', () => {
    const formProjection: FormProjection = component.formProjections[0];
    formProjection.fieldProjections[1].selected = false;
    component.eventControl.setValue(event);
    component.submit();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.observations.projection).toEqual([{ formId: 10, fields: ['field1'] }]);
  });

  it('sends independent time ranges for observations and locations', () => {
    component.eventControl.setValue(event);
    component.observationExportTime = 3600;
    component.locationExportTime = 43200;
    component.submit();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.observations.startDate).toBeDefined();
    expect(request.locations.startDate).toBeDefined();
    expect(request.observations.startDate).not.toEqual(request.locations.startDate);
  });

  it('includes keyword and condition in the export request from the field filter', fakeAsync(() => {
    component.eventControl.setValue(event);
    component.keywordControl.setValue('wildfire');
    tick(300);
    component.submit();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.observations.keyword).toEqual('wildfire');
  }));

  it('applies the same keyword typed again after switching events', fakeAsync(() => {
    component.eventControl.setValue(event);
    component.keywordControl.setValue('wildfire');
    tick(300);

    component.onEventSelected({ option: { value: event } } as any);
    component.keywordControl.setValue('wildfire');
    tick(300);
    component.submit();

    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.observations.keyword).toEqual('wildfire');
  }));

  describe('defaults from the current filters', () => {
    const condition = { formId: 10, field: 'field1', operator: '=', value: 'open' } as any;

    function createWithFilters(observationFilter: any, locationFilter: any = null): ExportCreateComponent {
      filterService.getObservationFilter.and.returnValue(observationFilter);
      filterService.getLocationFilter.and.returnValue(locationFilter);
      const seeded = TestBed.createComponent(ExportCreateComponent);
      seeded.detectChanges();
      return seeded.componentInstance;
    }

    it('starts with no filters when there are none', () => {
      const seeded = createWithFilters(null);

      expect(seeded.hasAttachments).toBe(false);
      expect(seeded.isFavorite).toBe(false);
      expect(seeded.isImportant).toBe(false);
      expect(seeded.memberFilter).toBeNull();
      expect(seeded.keywordControl.value).toBe('');
      expect(seeded.filter).toBeNull();
    });

    it('seeds the attachment, favorite and important toggles', () => {
      const seeded = createWithFilters({ timeInterval: {}, hasAttachments: true, isUserFavorite: true, isFlaggedImportant: true });

      expect(seeded.hasAttachments).toBe(true);
      expect(seeded.isFavorite).toBe(true);
      expect(seeded.isImportant).toBe(true);
    });

    it('seeds the observation and location member filters separately', () => {
      const seeded = createWithFilters(
        { timeInterval: {}, memberFilter: { teamIds: ['t1'], userIds: [] } },
        { timeInterval: {}, memberFilter: { teamIds: [], userIds: ['u1'] } }
      );

      expect(seeded.memberFilter).toEqual({ teamIds: ['t1'], userIds: [] });
      expect(seeded.locationMemberFilter).toEqual({ teamIds: [], userIds: ['u1'] });
    });

    it('seeds the keyword and condition into the field filter', () => {
      const seeded = createWithFilters({ timeInterval: {}, fieldFilter: { keyword: 'wildfire', condition } });

      expect(seeded.keywordControl.value).toBe('wildfire');
      expect(seeded.currentCondition).toEqual(condition);
      expect(seeded.filter).toEqual({ keyword: 'wildfire', condition });
    });

    it('sends the seeded filters in the export request', () => {
      const seeded = createWithFilters({
        timeInterval: {},
        hasAttachments: true,
        isUserFavorite: true,
        isFlaggedImportant: true,
        memberFilter: { teamIds: ['t1'], userIds: [] },
        fieldFilter: { keyword: 'wildfire', condition }
      });

      seeded.submit();

      const request = exportService.export.calls.mostRecent().args[1];
      expect(request.observations.hasAttachments).toBe(true);
      expect(request.observations.favorites).toBe(true);
      expect(request.observations.important).toBe(true);
      expect(request.observations.teams).toEqual(['t1']);
      expect(request.observations.keyword).toEqual('wildfire');
      expect(request.observations.condition).toEqual(condition);
    });

    it('requests the preview with the seeded filters', () => {
      observationService.getObservationsPage.calls.reset();

      createWithFilters({ timeInterval: {}, isFlaggedImportant: true, fieldFilter: { keyword: 'wildfire' } });

      const options = observationService.getObservationsPage.calls.mostRecent().args[1];
      expect(options.important).toBe(true);
      expect(options.filter).toEqual({ keyword: 'wildfire', condition: undefined });
    });

    it('clears the seeded filters when a different event is selected', () => {
      const seeded = createWithFilters({
        timeInterval: {},
        hasAttachments: true,
        memberFilter: { teamIds: ['t1'], userIds: [] },
        fieldFilter: { keyword: 'wildfire', condition }
      });

      seeded.onEventSelected({ option: { value: event } } as any);

      expect(seeded.memberFilter).toBeNull();
      expect(seeded.keywordControl.value).toBe('');
      expect(seeded.currentCondition).toBeUndefined();
      expect(seeded.filter).toBeNull();
    });
  });

  it('clears the condition chips when the event is selected', () => {
    const conditionFilter = jasmine.createSpyObj('ObservationFieldFilterComponent', ['clear']);
    component.conditionFilter = conditionFilter;
    component.eventControl.setValue(event);

    component.onEventSelected({ option: { value: event } } as any);

    expect(conditionFilter.clear).toHaveBeenCalled();
  });

  it('exports the day shown in the date pickers when a custom time range is left untouched', () => {
    component.eventControl.setValue(event);
    component.observationExportTime = 'custom';
    component.locationExportTime = 'custom';

    component.submit();

    const request = exportService.export.calls.mostRecent().args[1];
    const start = component.defaultStartDate.toISOString();
    const end = component.defaultEndDate.toISOString();
    expect(request.observations.startDate).toEqual(start);
    expect(request.observations.endDate).toEqual(end);
    expect(request.locations.startDate).toEqual(start);
    expect(request.locations.endDate).toEqual(end);
  });

  it('keeps observation and location member filters independent', () => {
    component.eventControl.setValue(event);
    component.onMemberFilterChanged({ teamIds: [ 'team1' ], userIds: [ 'user1' ] });
    component.onLocationMemberFilterChanged({ teamIds: [ 'team2' ], userIds: [ 'user2' ] });
    component.submit();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.observations.teams).toEqual([ 'team1' ]);
    expect(request.observations.users).toEqual([ 'user1' ]);
    expect(request.locations.teams).toEqual([ 'team2' ]);
    expect(request.locations.users).toEqual([ 'user2' ]);
  });
});
