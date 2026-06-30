import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  NO_ERRORS_SCHEMA
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AdminFeedComponent } from './admin-feed.component';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminEventsService } from '../../services/admin-events.service';
import { EventService } from '../../../../app/services/event.service';
import { FeedService } from 'core-lib-src/feed';

describe('AdminFeedComponent', () => {
  let component: AdminFeedComponent;
  let fixture: ComponentFixture<AdminFeedComponent>;

  let feedServiceSpy: jasmine.SpyObj<FeedService>;
  let adminUserServiceSpy: jasmine.SpyObj<AdminUserService>;
  let adminEventsServiceSpy: jasmine.SpyObj<AdminEventsService>;
  let eventServiceSpy: jasmine.SpyObj<EventService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let routerSpy: jasmine.SpyObj<Router>;

  const routeStub = {
    snapshot: {
      paramMap: convertToParamMap({ feedId: 'feed-1' })
    }
  };

  const mockFeed = {
    id: 'feed-1',
    title: 'Example Feed',
    service: {
      id: 'service-1',
      title: 'Example Service',
      serviceType: 'service-type-1'
    },
    topic: {
      id: 'topic-1',
      title: 'Example Topic'
    }
  } as any;

  const mockServiceType = {
    id: 'service-type-1',
    title: 'Example Service Type',
    summary: 'Example Summary'
  } as any;

  const mockFeedEvents = [
    {
      id: 'event-1',
      name: 'Event One',
      feedId: 'feed-1'
    },
    {
      id: 'event-2',
      name: 'Event Two',
      feed: { id: 'feed-1' }
    },
    {
      id: 'event-3',
      name: 'Event Three',
      feeds: [{ id: 'feed-1' }]
    },
    {
      id: 'event-4',
      name: 'Different Feed Event',
      feedId: 'feed-2'
    }
  ] as any[];

  beforeEach(waitForAsync(() => {
    feedServiceSpy = jasmine.createSpyObj<FeedService>('FeedService', [
      'fetchFeed',
      'fetchServiceType',
      'deleteFeed'
    ]);

    adminUserServiceSpy = jasmine.createSpyObj<AdminUserService>(
      'AdminUserService',
      ['getMyself']
    );

    adminEventsServiceSpy = jasmine.createSpyObj<AdminEventsService>(
      'AdminEventsService',
      ['getEvents']
    );

    eventServiceSpy = jasmine.createSpyObj<EventService>('EventService', [
      'addFeed',
      'removeFeed'
    ]);

    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    adminUserServiceSpy.getMyself.and.returnValue(
      of({
        id: 'user-1',
        role: { permissions: [] }
      } as any)
    );

    feedServiceSpy.fetchFeed.and.returnValue(of(mockFeed));
    feedServiceSpy.fetchServiceType.and.returnValue(of(mockServiceType));

    adminEventsServiceSpy.getEvents.and.returnValue(
      of({
        items: mockFeedEvents,
        totalCount: mockFeedEvents.length
      } as any)
    );

    eventServiceSpy.addFeed.and.returnValue(
      of({ name: 'Example Event' } as any)
    );

    eventServiceSpy.removeFeed.and.returnValue(of({} as any));
    feedServiceSpy.deleteFeed.and.returnValue(of({} as any));

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(false)
    } as any);

    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, NoopAnimationsModule],
      declarations: [AdminFeedComponent],
      providers: [
        { provide: FeedService, useValue: feedServiceSpy },
        { provide: AdminUserService, useValue: adminUserServiceSpy },
        { provide: AdminEventsService, useValue: adminEventsServiceSpy },
        { provide: EventService, useValue: eventServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeStub }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load feed, service type, and initial events on init', () => {
    expect(adminUserServiceSpy.getMyself).toHaveBeenCalled();
    expect(feedServiceSpy.fetchFeed).toHaveBeenCalledWith('feed-1');
    expect(feedServiceSpy.fetchServiceType).toHaveBeenCalledWith(
      'service-type-1'
    );

    expect(adminEventsServiceSpy.getEvents).toHaveBeenCalledWith({
      feedId: 'feed-1',
      page: 0,
      page_size: 1000
    } as any);

    expect(component.feed.id).toBe('feed-1');
    expect(component.feedServiceType.id).toBe('service-type-1');
    expect(component.totalFeedEvents).toBe(3);
    expect(component.feedEvents.length).toBe(3);
  });

  it('should handle user permissions when getMyself succeeds', () => {
    expect(component.hasFeedCreatePermission).toBeFalse();
    expect(component.hasFeedEditPermission).toBeFalse();
    expect(component.hasFeedDeletePermission).toBeFalse();
    expect(component.hasUpdateEventPermission).toBeFalse();
  });

  it('should set permissions to true when user has permissions', () => {
    adminUserServiceSpy.getMyself.and.returnValue(
      of({
        id: 'user-1',
        role: {
          permissions: ['FEEDS_CREATE_FEED', 'UPDATE_EVENT']
        }
      } as any)
    );

    const f2 = TestBed.createComponent(AdminFeedComponent);
    const c2 = f2.componentInstance;

    f2.detectChanges();

    expect(c2.hasFeedCreatePermission).toBeTrue();
    expect(c2.hasFeedEditPermission).toBeTrue();
    expect(c2.hasFeedDeletePermission).toBeTrue();
    expect(c2.hasUpdateEventPermission).toBeTrue();
  });

  it('should set permissions to false when getMyself errors', () => {
    adminUserServiceSpy.getMyself.and.returnValue(
      throwError(() => new Error('fail'))
    );

    const f2 = TestBed.createComponent(AdminFeedComponent);
    const c2 = f2.componentInstance;

    f2.detectChanges();

    expect(c2.hasFeedCreatePermission).toBeFalse();
    expect(c2.hasFeedEditPermission).toBeFalse();
    expect(c2.hasFeedDeletePermission).toBeFalse();
    expect(c2.hasUpdateEventPermission).toBeFalse();
    expect(feedServiceSpy.fetchFeed).toHaveBeenCalledWith('feed-1');
  });

  it('toggleNewEvent should flip addEvent and try to focus eventSelect when opening', () => {
    const focusSpy = jasmine.createSpy('focus');

    component.eventSelect = {
      nativeElement: { focus: focusSpy }
    } as ElementRef;

    jasmine.clock().install();

    component.toggleNewEvent();
    jasmine.clock().tick(0);

    jasmine.clock().uninstall();

    expect(component.addEvent).toBeTrue();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('addFeedToEvent should call addFeed, reload events, and show success snackbar', () => {
    const autocompleteEvent = { option: { id: 99 } } as any;

    adminEventsServiceSpy.getEvents.calls.reset();

    component.addFeedToEvent(autocompleteEvent);

    expect(eventServiceSpy.addFeed).toHaveBeenCalledWith('99', `"feed-1"`);
    expect(adminEventsServiceSpy.getEvents).toHaveBeenCalledWith({
      feedId: 'feed-1',
      page: 0,
      page_size: 1000
    } as any);
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(component.addEvent).toBeFalse();
    expect(component.eventModel).toBeNull();
  });

  it('addFeedToEvent should show failure snackbar when addFeed errors', () => {
    const autocompleteEvent = { option: { id: 99 } } as any;

    eventServiceSpy.addFeed.and.returnValue(
      throwError(() => new Error('add failed'))
    );

    component.addFeedToEvent(autocompleteEvent);

    expect(eventServiceSpy.addFeed).toHaveBeenCalledWith('99', `"feed-1"`);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Failed to add feed to event',
      undefined,
      { duration: 5000 }
    );
  });

  it('removeFeedFromEvent should stop propagation, call removeFeed, reload events, and show snackbar', () => {
    const stopSpy = jasmine.createSpy('stopPropagation');
    const mouseEvent = { stopPropagation: stopSpy } as any;

    adminEventsServiceSpy.getEvents.calls.reset();

    component.removeFeedFromEvent(mouseEvent, { id: 123, name: 'Example Event' });

    expect(stopSpy).toHaveBeenCalled();
    expect(eventServiceSpy.removeFeed).toHaveBeenCalledWith('123', 'feed-1');
    expect(adminEventsServiceSpy.getEvents).toHaveBeenCalledWith({
      feedId: 'feed-1',
      page: 0,
      page_size: 1000
    } as any);
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('removeFeedFromEvent should show failure snackbar when removeFeed errors', () => {
    const stopSpy = jasmine.createSpy('stopPropagation');
    const mouseEvent = { stopPropagation: stopSpy } as any;

    eventServiceSpy.removeFeed.and.returnValue(
      throwError(() => new Error('remove failed'))
    );

    component.removeFeedFromEvent(mouseEvent, { id: 123 });

    expect(stopSpy).toHaveBeenCalled();
    expect(eventServiceSpy.removeFeed).toHaveBeenCalledWith('123', 'feed-1');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Failed to remove feed from event',
      undefined,
      { duration: 5000 }
    );
  });

  it('onEventsPageChange should update paging and page events locally', () => {
    adminEventsServiceSpy.getEvents.calls.reset();

    component.onEventsPageChange({ pageIndex: 2, pageSize: 25 });

    expect(component.eventsPage).toBe(2);
    expect(component.eventsPerPage).toBe(25);
    expect(adminEventsServiceSpy.getEvents).not.toHaveBeenCalled();
  });

  it('loadAvailableEvents should search events and exclude events already attached to the feed', (done) => {
    adminEventsServiceSpy.getEvents.and.returnValue(
      of({
        items: [
          {
            id: 'available-1',
            name: 'Available Event',
            acl: {
              'user-1': {
                permissions: ['update']
              }
            }
          },
          {
            id: 'attached-1',
            name: 'Attached Event',
            feedId: 'feed-1',
            acl: {
              'user-1': {
                permissions: ['update']
              }
            }
          }
        ]
      } as any)
    );

    component.loadAvailableEvents('available').subscribe((events) => {
      expect(adminEventsServiceSpy.getEvents).toHaveBeenCalledWith({
        term: 'available',
        excludeFeedId: 'feed-1',
        page: 0,
        page_size: 1000
      } as any);
      expect(events.length).toBe(1);
      expect(events[0].id).toBe('available-1');
      done();
    });
  });

  it('loadAvailableEvents should keep all non-feed events when user has UPDATE_EVENT permission', (done) => {
    adminUserServiceSpy.getMyself.and.returnValue(
      of({
        id: 'user-1',
        role: {
          permissions: ['UPDATE_EVENT']
        }
      } as any)
    );

    const f2 = TestBed.createComponent(AdminFeedComponent);
    const c2 = f2.componentInstance;

    adminEventsServiceSpy.getEvents.and.returnValue(
      of({
        items: [
          {
            id: 'available-without-acl',
            name: 'Available Without ACL'
          }
        ]
      } as any)
    );

    f2.detectChanges();

    c2.loadAvailableEvents('').subscribe((events) => {
      expect(events.length).toBe(1);
      expect(events[0].id).toBe('available-without-acl');
      done();
    });
  });

  it('deleteFeed should open dialog and do nothing when dialog returns false', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);

    component.deleteFeed();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(feedServiceSpy.deleteFeed).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('deleteFeed should delete and navigate back to feeds when dialog returns true', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);

    component.deleteFeed();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(feedServiceSpy.deleteFeed).toHaveBeenCalledWith(mockFeed);

    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['../../feeds'],
      jasmine.objectContaining({ relativeTo: routeStub })
    );
  });

  it('tagEventsAutocompleteOverlayPane should add overlay pane class when autocomplete panel exists', () => {
    const panel = document.createElement('div');
    panel.id = 'autocomplete-id';

    const overlayPane = document.createElement('div');
    overlayPane.classList.add('cdk-overlay-pane');
    overlayPane.appendChild(panel);
    document.body.appendChild(overlayPane);

    component.eventAutocompleteTrigger = {
      autocomplete: {
        id: 'autocomplete-id'
      }
    } as any;

    jasmine.clock().install();

    component.tagEventsAutocompleteOverlayPane();
    jasmine.clock().tick(0);

    jasmine.clock().uninstall();

    expect(
      overlayPane.classList.contains('events-add-autocomplete-overlay-pane')
    ).toBeTrue();

    document.body.removeChild(overlayPane);
  });
});