import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { MatDialog as MatDialog } from '@angular/material/dialog';

import { AdminFeedsComponent } from './admin-feeds.component';
import { FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { SessionService } from 'mage-web-app/http/session.service';

describe('AdminFeedsComponent', () => {
  let component: AdminFeedsComponent;
  let fixture: ComponentFixture<AdminFeedsComponent>;

  let feedService: jasmine.SpyObj<FeedService>;
  let sessionService: { hasPermission: jasmine.Spy };
  let dialog: jasmine.SpyObj<MatDialog>;

  const setPermissions = (permissions: string[]) => {
    sessionService.hasPermission.and.callFake((permission: string) => permissions.includes(permission));
  };

  const makeService = (overrides: any = {}) =>
    ({
      id: 'svc-1',
      title: 'Alpha Service',
      summary: 'Summary',
      ...overrides
    } as any);

  const makeFeed = (overrides: any = {}) =>
    ({
      id: 'feed-1',
      title: 'Alpha Feed',
      summary: 'Summary',
      service: 'svc-1',
      ...overrides
    } as any);

  beforeEach(async () => {
    feedService = jasmine.createSpyObj('FeedService', [
      'fetchServices',
      'fetchAllFeeds',
      'deleteService',
      'deleteFeed'
    ]);

    sessionService = { hasPermission: jasmine.createSpy('hasPermission').and.returnValue(false) };

    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [AdminFeedsComponent],
      providers: [
        { provide: FeedService, useValue: feedService },
        { provide: MatDialog, useValue: dialog },
        { provide: SessionService, useValue: sessionService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFeedsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('sets permissions from myself$', fakeAsync(() => {
      setPermissions(['FEEDS_CREATE_SERVICE', 'FEEDS_CREATE_FEED']);

      feedService.fetchServices.and.returnValue(of([] as any));
      feedService.fetchAllFeeds.and.returnValue(of([] as any));

      component.ngOnInit();
      tick();

      expect(component.hasServiceDeletePermission).toBeTrue();
      expect(component.hasFeedCreatePermission).toBeTrue();
      expect(component.hasFeedEditPermission).toBeTrue();
      expect(component.hasFeedDeletePermission).toBeTrue();
    }));

    it('clears permissions when myself$ emits null', fakeAsync(() => {
      setPermissions([]);

      feedService.fetchServices.and.returnValue(of([] as any));
      feedService.fetchAllFeeds.and.returnValue(of([] as any));

      component.ngOnInit();
      tick();

      expect(component.hasServiceDeletePermission).toBeFalse();
      expect(component.hasFeedCreatePermission).toBeFalse();
      expect(component.hasFeedEditPermission).toBeFalse();
      expect(component.hasFeedDeletePermission).toBeFalse();
    }));

    it('loads and sorts services + feeds and copies to public arrays', fakeAsync(() => {
      setPermissions([]);

      const services = [
        makeService({ id: 'svc-2', title: 'Zulu Service' }),
        makeService({ id: 'svc-1', title: 'Alpha Service' })
      ];

      const feeds = [
        makeFeed({ id: 'feed-2', title: 'Zulu Feed' }),
        makeFeed({ id: 'feed-1', title: 'Alpha Feed' })
      ];

      feedService.fetchServices.and.returnValue(of(services as any));
      feedService.fetchAllFeeds.and.returnValue(of(feeds as any));

      component.ngOnInit();
      tick();

      expect(component.services.length).toBe(2);
      expect(component.services[0].title).toBe('Alpha Service');
      expect(component.services[1].title).toBe('Zulu Service');

      expect(component.feeds.length).toBe(2);
      expect(component.feeds[0].title).toBe('Alpha Feed');
      expect(component.feeds[1].title).toBe('Zulu Feed');
    }));
  });

  describe('search + clear', () => {
    beforeEach(fakeAsync(() => {
      setPermissions([]);

      feedService.fetchServices.and.returnValue(
        of([
          makeService({ id: 'svc-1', title: 'Alpha', summary: 'one' }),
          makeService({ id: 'svc-2', title: 'Beta', summary: 'two' })
        ] as any)
      );

      feedService.fetchAllFeeds.and.returnValue(
        of([
          makeFeed({
            id: 'feed-1',
            title: 'Gamma',
            summary: 'hello',
            service: 'svc-1'
          }),
          makeFeed({
            id: 'feed-2',
            title: 'Delta',
            summary: 'world',
            service: 'svc-2'
          })
        ] as any)
      );

      component.ngOnInit();
      tick();
    }));

    it('onFeedSearchChange resets page and filters feeds', () => {
      component.feedPage = 3;
      component.feedSearch = 'gam';
      component.onFeedSearchChange();

      expect(component.feedPage).toBe(0);
      expect(component.feeds.length).toBe(1);
      expect(component.feeds[0].title).toBe('Gamma');
    });

    it('onServiceSearchChange resets page and filters services', () => {
      component.servicePage = 2;
      component.serviceSearch = 'beta';
      component.onServiceSearchChange();

      expect(component.servicePage).toBe(0);
      expect(component.services.length).toBe(1);
      expect(component.services[0].title).toBe('Beta');
    });

    it('clearFeedSearch resets page, clears text, restores feeds', () => {
      component.feedSearch = 'x';
      component.feeds = [];
      component.feedPage = 9;

      component.clearFeedSearch();

      expect(component.feedPage).toBe(0);
      expect(component.feedSearch).toBe('');
      expect(component.feeds.length).toBe(2);
    });

    it('clearServiceSearch resets page, clears text, restores services', () => {
      component.serviceSearch = 'x';
      component.services = [];
      component.servicePage = 9;

      component.clearServiceSearch();

      expect(component.servicePage).toBe(0);
      expect(component.serviceSearch).toBe('');
      expect(component.services.length).toBe(2);
    });
  });

  describe('deleteService', () => {
    beforeEach(fakeAsync(() => {
      setPermissions([]);

      feedService.fetchServices.and.returnValue(
        of([
          makeService({ id: 'svc-1', title: 'Alpha' }),
          makeService({ id: 'svc-2', title: 'Beta' })
        ] as any)
      );

      feedService.fetchAllFeeds.and.returnValue(
        of([
          makeFeed({ id: 'feed-1', title: 'One', service: 'svc-1' }),
          makeFeed({ id: 'feed-2', title: 'Two', service: 'svc-2' })
        ] as any)
      );

      component.ngOnInit();
      tick();
    }));

    it('does nothing when dialog not confirmed', fakeAsync(() => {
      const svc = component.services[0] as any;
      const clickEvent = new MouseEvent('click');
      spyOn(clickEvent, 'stopPropagation');

      const dialogRef = { afterClosed: () => of(false) } as any;
      dialog.open.and.returnValue(dialogRef);

      component.deleteService(clickEvent, svc);
      tick();

      expect(clickEvent.stopPropagation).toHaveBeenCalled();
      expect(feedService.deleteService).not.toHaveBeenCalled();
    }));

    it('deletes service and removes related feeds when confirmed', fakeAsync(() => {
      const svc = component.services.find((s: any) => s.id === 'svc-1') as any;
      const clickEvent = new MouseEvent('click');
      spyOn(clickEvent, 'stopPropagation');

      const dialogRef = { afterClosed: () => of(true) } as any;
      dialog.open.and.returnValue(dialogRef);

      feedService.deleteService.and.returnValue(of(undefined as any));

      feedService.fetchServices.and.returnValue(
        of([makeService({ id: 'svc-2', title: 'Beta' })] as any)
      );
      feedService.fetchAllFeeds.and.returnValue(
        of([makeFeed({ id: 'feed-2', title: 'Two', service: 'svc-2' })] as any)
      );

      component.deleteService(clickEvent, svc);
      tick();
      tick();

      expect(feedService.deleteService).toHaveBeenCalledWith(svc);
      expect(component.services.some((s: any) => s.id === 'svc-1')).toBeFalse();
      expect(
        component.feeds.some((f: any) => f.service === 'svc-1')
      ).toBeFalse();
    }));
  });

  describe('deleteFeed', () => {
    beforeEach(fakeAsync(() => {
      setPermissions([]);

      feedService.fetchServices.and.returnValue(
        of([makeService({ id: 'svc-1' })] as any)
      );
      feedService.fetchAllFeeds.and.returnValue(
        of([
          makeFeed({ id: 'feed-1', title: 'Alpha', service: 'svc-1' }),
          makeFeed({ id: 'feed-2', title: 'Beta', service: 'svc-1' })
        ] as any)
      );

      component.ngOnInit();
      tick();
    }));

    it('does nothing when dialog not confirmed', fakeAsync(() => {
      const feed = component.feeds[0] as any;
      const clickEvent = new MouseEvent('click');
      spyOn(clickEvent, 'stopPropagation');

      const dialogRef = { afterClosed: () => of(false) } as any;
      dialog.open.and.returnValue(dialogRef);

      component.deleteFeed(clickEvent, feed);
      tick();

      expect(clickEvent.stopPropagation).toHaveBeenCalled();
      expect(feedService.deleteFeed).not.toHaveBeenCalled();
    }));

    it('deletes feed when confirmed', fakeAsync(() => {
      const feed = component.feeds.find((f: any) => f.id === 'feed-1') as any;
      const clickEvent = new MouseEvent('click');
      spyOn(clickEvent, 'stopPropagation');

      const dialogRef = { afterClosed: () => of(true) } as any;
      dialog.open.and.returnValue(dialogRef);

      feedService.deleteFeed.and.returnValue(of(undefined as any));

      component.deleteFeed(clickEvent, feed);
      tick();
      tick();

      expect(feedService.deleteFeed).toHaveBeenCalledWith(feed);
      expect(component.feeds.some((f: any) => f.id === 'feed-1')).toBeFalse();
    }));
  });
});
