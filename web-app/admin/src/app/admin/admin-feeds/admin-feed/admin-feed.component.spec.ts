import { ElementRef } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { AdminFeedComponent } from './admin-feed.component';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminEventsService } from '../../services/admin-events.service';
import { EventService } from '../../../../app/services/event.service';
import { FeedService } from 'core-lib-src/feed';

describe('AdminFeedComponent', () => {
  let component: AdminFeedComponent;

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
  } as Partial<ActivatedRoute>;

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

  function setupSpies(): void {
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
      of({ items: [], totalCount: 0 } as any)
    );

    eventServiceSpy.addFeed.and.returnValue(
      of({ name: 'Example Event' } as any)
    );

    eventServiceSpy.removeFeed.and.returnValue(of({} as any));
    feedServiceSpy.deleteFeed.and.returnValue(of({} as any));

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(false)
    } as any);
  }

  function createComponent(): AdminFeedComponent {
    component = new AdminFeedComponent(
      feedServiceSpy,
      routeStub as ActivatedRoute,
      routerSpy,
      dialogSpy,
      snackBarSpy,
      adminEventsServiceSpy,
      adminUserServiceSpy,
      eventServiceSpy
    );

    component.ngOnInit();

    return component;
  }

  beforeEach(() => {
    setupSpies();
    createComponent();
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
      page_size: 10
    } as any);

    expect(component.feed.id).toBe('feed-1');
    expect(component.feedServiceType.id).toBe('service-type-1');
    expect(component.totalFeedEvents).toBe(0);
  });

  it('should handle user permissions when getMyself succeeds', () => {
    expect(component.hasFeedCreatePermission).toBeFalse();
    expect(component.hasFeedEditPermission).toBeFalse();
    expect(component.hasFeedDeletePermission).toBeFalse();
    expect(component.hasUpdateEventPermission).toBeFalse();
  });

  it('should set permissions to false when getMyself errors', () => {
    setupSpies();

    adminUserServiceSpy.getMyself.and.returnValue(
      throwError(() => new Error('fail'))
    );

    component = new AdminFeedComponent(
      feedServiceSpy,
      routeStub as ActivatedRoute,
      routerSpy,
      dialogSpy,
      snackBarSpy,
      adminEventsServiceSpy,
      adminUserServiceSpy,
      eventServiceSpy
    );

    component.ngOnInit();

    expect(component.hasFeedCreatePermission).toBeFalse();
    expect(component.hasFeedEditPermission).toBeFalse();
    expect(component.hasFeedDeletePermission).toBeFalse();
    expect(component.hasUpdateEventPermission).toBeFalse();
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

  it('addFeedToEvent should call addFeed and show success snackbar', () => {
    const autocompleteEvent = { option: { id: 99 } } as any;

    component.feed = mockFeed;
    component.addFeedToEvent(autocompleteEvent);

    expect(eventServiceSpy.addFeed).toHaveBeenCalledWith('99', `"feed-1"`);
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('removeFeedFromEvent should stop propagation, call removeFeed, and show snackbar', () => {
    const stopSpy = jasmine.createSpy('stopPropagation');
    const mouseEvent = { stopPropagation: stopSpy } as any;

    component.feed = mockFeed;
    component.removeFeedFromEvent(mouseEvent, { id: 123 });

    expect(stopSpy).toHaveBeenCalled();
    expect(eventServiceSpy.removeFeed).toHaveBeenCalledWith('123', 'feed-1');
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('onEventsPageChange should update paging and reload events', () => {
    component.feed = mockFeed;

    adminEventsServiceSpy.getEvents.calls.reset();

    component.onEventsPageChange({ pageIndex: 2, pageSize: 25 });

    expect(component.eventsPage).toBe(2);
    expect(component.eventsPerPage).toBe(25);
    expect(adminEventsServiceSpy.getEvents).toHaveBeenCalledWith({
      feedId: 'feed-1',
      page: 2,
      page_size: 25
    } as any);
  });

  it('deleteFeed should open dialog and do nothing when dialog returns false', () => {
    component.feed = mockFeed;

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(false)
    } as any);

    component.deleteFeed();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(feedServiceSpy.deleteFeed).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('deleteFeed should delete and navigate back to feeds when dialog returns true', () => {
    component.feed = mockFeed;

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true)
    } as any);

    component.deleteFeed();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(feedServiceSpy.deleteFeed).toHaveBeenCalledWith(mockFeed);

    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['../../feeds'],
      jasmine.objectContaining({ relativeTo: routeStub })
    );
  });
});
