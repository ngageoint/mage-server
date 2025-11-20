import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { EventDashboardComponent } from './event-dashboard.component';
import { EventsService } from '../events.service';
import { StateService } from '@uirouter/angular';
import {
  LocalStorageService,
  UserService
} from 'admin/src/app/upgrade/ajs-upgraded-providers';

const mockEventsResponse = {
  totalCount: 2,
  items: [
    {
      id: 1,
      name: 'Event A',
      description: 'Desc A',
      feedIds: [],
      forms: [],
      layers: [],
      style: {
        fill: '#ffffff',
        fillOpacity: 1,
        stroke: '#000000',
        strokeOpacity: 1,
        strokeWidth: 2
      },
      teams: []
    },
    {
      id: 2,
      name: 'Event B',
      description: 'Desc B',
      feedIds: [],
      forms: [],
      layers: [],
      style: {
        fill: '#ffffff',
        fillOpacity: 1,
        stroke: '#000000',
        strokeOpacity: 1,
        strokeWidth: 2
      },
      teams: []
    }
  ]
};

describe('EventDashboardComponent', () => {
  let component: EventDashboardComponent;
  let fixture: ComponentFixture<EventDashboardComponent>;
  let eventServiceSpy: jasmine.SpyObj<EventsService>;
  let userServiceSpy: any;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let stateSpy: jasmine.SpyObj<StateService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;

  beforeEach(async () => {
    eventServiceSpy = jasmine.createSpyObj('EventsService', ['getEvents']);
    userServiceSpy = { myself: { role: { permissions: ['CREATE_USER'] } } };
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    stateSpy = jasmine.createSpyObj('StateService', ['go']);
    localStorageSpy = jasmine.createSpyObj('LocalStorageService', ['getToken']);
    localStorageSpy.getToken.and.returnValue('mockToken');

    await TestBed.configureTestingModule({
      declarations: [EventDashboardComponent],
      imports: [
        MatDialogModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatSelectModule,
        MatOptionModule,
        MatTableModule,
        MatTooltipModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: EventsService, useValue: eventServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: StateService, useValue: stateSpy },
        { provide: LocalStorageService, useValue: localStorageSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize permissions properly', () => {
    component['initPermissions']();
    expect(component.hasEventCreatePermission).toBeTrue();
  });

  it('should fetch events and apply filters', fakeAsync(() => {
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse));
    component.refreshEvents();
    tick();
    expect(eventServiceSpy.getEvents).toHaveBeenCalledWith(
      component.searchOptions
    );
    expect(component.filteredEvents.length).toBe(2);
    expect(component.totalEvents).toBe(2);
  }));

  it('should filter events by search term', () => {
    component.events = mockEventsResponse;
    component.eventSearch = 'event a';
    component['applyFilters']();
    expect(component.filteredEvents.length).toBe(1);
    expect(component.filteredEvents[0].name).toBe('Event A');
  });

  it('should clear search and refresh events', fakeAsync(() => {
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse));
    component.onSearchCleared();
    tick();
    expect(component.eventSearch).toBe('');
    expect(eventServiceSpy.getEvents).toHaveBeenCalled();
  }));

  it('should handle page change', fakeAsync(() => {
    const pageEvent: PageEvent = { length: 20, pageIndex: 1, pageSize: 25 };
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse));
    component.onPageChange(pageEvent);
    tick();
    expect(component.searchOptions.page).toBe(1);
    expect(component.searchOptions.page_size).toBe(25);
    expect(eventServiceSpy.getEvents).toHaveBeenCalled();
  }));

  it('should navigate to event on click', () => {
    const event = { id: 123 };
    component.gotoEvent(event as any);
    expect(stateSpy.go).toHaveBeenCalledWith('admin.event', { eventId: 123 });
  });

  it('should update status filter and refresh events', fakeAsync(() => {
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse));
    component.onStatusFilterChange('active');
    tick();
    expect(component.searchOptions.state).toBe('active');
    expect(eventServiceSpy.getEvents).toHaveBeenCalled();
  }));

  it('should update status filter and refresh events', fakeAsync(() => {
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse));
  
    component.onStatusFilterChange('active');
    tick();
    fixture.detectChanges();
  
    expect(component.searchOptions.state).toBe('active');
    expect(eventServiceSpy.getEvents).toHaveBeenCalled();
  }));
  

  it('should handle window resize updating numChars and tooltip width', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1000);
    component.onResize();
    expect(component.numChars).toBe(Math.ceil(1000 / 8.5));
    expect(component.toolTipWidth).toBe(1000 * 0.75 + 'px');
  });
});
