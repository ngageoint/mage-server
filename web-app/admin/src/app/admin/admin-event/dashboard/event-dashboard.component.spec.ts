import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';

import { EventDashboardComponent } from './event-dashboard.component';
import { AdminEventsService } from '../../services/admin-events.service';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminToastService } from '../../services/admin-toast.service';

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

  let eventServiceSpy: jasmine.SpyObj<AdminEventsService>;
  let userServiceSpy: jasmine.SpyObj<AdminUserService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<AdminToastService>;

  beforeEach(async () => {
    eventServiceSpy = jasmine.createSpyObj('AdminEventsService', ['getEvents']);
    userServiceSpy = jasmine.createSpyObj('AdminUserService', ['getMyself']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('AdminToastService', ['show']);

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
        { provide: AdminEventsService, useValue: eventServiceSpy },
        { provide: AdminUserService, useValue: userServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: Router, useValue: routerSpy },
        { provide: AdminToastService, useValue: toastSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize permissions properly (has CREATE_EVENT)', fakeAsync(() => {
    userServiceSpy.getMyself.and.returnValue(
      of({ role: { permissions: ['CREATE_EVENT'] } } as any)
    );

    (component as any).initPermissions();
    tick();

    expect(userServiceSpy.getMyself).toHaveBeenCalled();
    expect(component.hasEventCreatePermission).toBeTrue();
  }));

  it('should set hasEventCreatePermission false on permission load error', fakeAsync(() => {
    userServiceSpy.getMyself.and.returnValue(
      throwError(() => new Error('nope'))
    );

    (component as any).initPermissions();
    tick();

    expect(component.hasEventCreatePermission).toBeFalse();
  }));

  it('should fetch events and set filtered list + totals', fakeAsync(() => {
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse as any));

    component.refreshEvents();
    tick();

    expect(eventServiceSpy.getEvents).toHaveBeenCalledWith(
      component.searchOptions
    );
    expect(component.filteredEvents.length).toBe(2);
    expect(component.totalEvents).toBe(2);
  }));

  it('should send search term to server when searching', fakeAsync(() => {
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse as any));

    component.onSearchTermChanged('event a');
    tick();

    expect(component.eventSearch).toBe('event a');
    expect(component.searchOptions.term).toBe('event a');
    expect(component.searchOptions.page).toBe(0);
    expect(eventServiceSpy.getEvents).toHaveBeenCalledWith(
      jasmine.objectContaining({ term: 'event a', page: 0 })
    );
  }));

  it('should clear search and refresh events', fakeAsync(() => {
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse as any));

    component.eventSearch = 'something';
    component.searchOptions = { ...component.searchOptions, term: 'something' };

    component.onSearchCleared();
    tick();

    expect(component.eventSearch).toBe('');
    expect(component.searchOptions.term).toBe('');
    expect(component.searchOptions.page).toBe(0);
    expect(eventServiceSpy.getEvents).toHaveBeenCalled();
  }));

  it('should reset filters and refresh events', fakeAsync(() => {
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse as any));

    component.eventSearch = 'abc';
    component.eventStatusFilter = 'active';
    component.searchOptions = {
      ...component.searchOptions,
      page: 3,
      state: 'active',
      term: 'abc'
    };

    component.reset();
    tick();

    expect(component.eventSearch).toBe('');
    expect(component.eventStatusFilter).toBe('all');
    expect(component.searchOptions.page).toBe(0);
    expect(component.searchOptions.state).toBe('all');
    expect(component.searchOptions.term).toBe('');
    expect(eventServiceSpy.getEvents).toHaveBeenCalled();
  }));

  it('should handle page change', fakeAsync(() => {
    const pageEvent: PageEvent = { length: 20, pageIndex: 1, pageSize: 25 };
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse as any));

    component.onPageChange(pageEvent);
    tick();

    expect(component.searchOptions.page).toBe(1);
    expect(component.searchOptions.page_size).toBe(25);
    expect(eventServiceSpy.getEvents).toHaveBeenCalled();
  }));

  it('should update status filter and refresh events', fakeAsync(() => {
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse as any));

    component.onStatusFilterChange('active');
    tick();

    expect(component.eventStatusFilter).toBe('active');
    expect(component.searchOptions.state).toBe('active');
    expect(component.searchOptions.page).toBe(0);
    expect(eventServiceSpy.getEvents).toHaveBeenCalled();
  }));

  it('should open create event dialog and call toast + refresh on close when event has id', fakeAsync(() => {
    const dialogRefMock = {
      afterClosed: () => of({ id: 123 } as any)
    };

    dialogSpy.open.and.returnValue(dialogRefMock as any);
    eventServiceSpy.getEvents.and.returnValue(of(mockEventsResponse as any));

    component.createEvent();
    tick();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(toastSpy.show).toHaveBeenCalled();
    expect(eventServiceSpy.getEvents).toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  }));

  it('should not toast or refresh if dialog closes without event id', fakeAsync(() => {
    const dialogRefMock = {
      afterClosed: () => of(undefined)
    };

    dialogSpy.open.and.returnValue(dialogRefMock as any);

    component.createEvent();
    tick();

    expect(toastSpy.show).not.toHaveBeenCalled();
    expect(eventServiceSpy.getEvents).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  }));

  it('should handle window resize updating numChars and tooltip width', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1000);

    component.onResize();

    expect(component.numChars).toBe(Math.ceil(1000 / 8.5));
    expect(component.toolTipWidth).toBe('750px');
  });

  it('trackByEventId returns id when present', () => {
    expect(component.trackByEventId(0, { id: 5 } as any)).toBe(5);
  });

  it('trackByEventId returns event when id is missing', () => {
    const obj = { name: 'no-id' } as any;
    expect(component.trackByEventId(0, obj)).toBe(obj);
  });
});
