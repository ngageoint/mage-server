import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { AdminServiceComponent } from './admin-service.component';
import { FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { AdminUserService } from '../../services/admin-user.service';

describe('AdminServiceComponent', () => {
  let component: AdminServiceComponent;
  let fixture: ComponentFixture<AdminServiceComponent>;

  let feedService: jasmine.SpyObj<FeedService>;
  let adminUserService: jasmine.SpyObj<AdminUserService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const activatedRouteStub = {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'serviceId' ? 'serviceid1234' : null)
      }
    }
  };

  const serviceTypeNonObject: any = {
    id: 'servicetype1234',
    title: 'ServiceType',
    summary: 'summary',
    configSchema: {
      type: 'string',
      title: 'URL',
      description: 'URL of the service',
      default: 'https://example.com'
    }
  };

  const serviceTypeObject: any = {
    id: 'servicetype1234',
    title: 'ServiceType',
    summary: 'summary',
    configSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          title: 'URL'
        }
      }
    }
  };

  const service: any = {
    id: 'serviceid1234',
    title: 'Service title',
    summary: 'service summary',
    config: 'https://example.com',
    serviceType: { id: 'servicetype1234' }
  };

  const feeds: any[] = [
    { id: 'feed1', title: 'Feed 1', service: 'serviceid1234' },
    { id: 'feed2', title: 'Feed 2', service: 'serviceid1234' }
  ];

  beforeEach(async () => {
    feedService = jasmine.createSpyObj('FeedService', [
      'fetchService',
      'fetchServiceFeeds',
      'fetchServiceType',
      'deleteService'
    ]);

    adminUserService = jasmine.createSpyObj('AdminUserService', ['getMyself']);

    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [AdminServiceComponent],
      providers: [
        { provide: FeedService, useValue: feedService },
        { provide: AdminUserService, useValue: adminUserService },
        { provide: MatDialog, useValue: dialog },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminServiceComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should do nothing if serviceId is missing', fakeAsync(() => {
    const routeNoId = {
      snapshot: {
        paramMap: {
          get: (_: string) => null
        }
      }
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [AdminServiceComponent],
      providers: [
        { provide: FeedService, useValue: feedService },
        { provide: AdminUserService, useValue: adminUserService },
        { provide: MatDialog, useValue: dialog },
        { provide: ActivatedRoute, useValue: routeNoId }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const f = TestBed.createComponent(AdminServiceComponent);
    const c = f.componentInstance;

    c.ngOnInit();
    tick();

    expect(feedService.fetchService).not.toHaveBeenCalled();
    expect(feedService.fetchServiceFeeds).not.toHaveBeenCalled();
  }));

  it('should set permissions from getMyself', fakeAsync(() => {
    adminUserService.getMyself.and.returnValue(
      of({ role: { permissions: ['FEEDS_CREATE_SERVICE'] } } as any)
    );

    feedService.fetchService.and.returnValue(of(service));
    feedService.fetchServiceFeeds.and.returnValue(of(feeds as any));
    feedService.fetchServiceType.and.returnValue(of(serviceTypeObject));

    component.ngOnInit();
    tick();

    expect(component.hasServiceEditPermission).toBeTrue();
    expect(component.hasServiceDeletePermission).toBeTrue();
  }));

  it('should clear permissions when getMyself errors', fakeAsync(() => {
    adminUserService.getMyself.and.returnValue(
      throwError(() => new Error('nope'))
    );

    feedService.fetchService.and.returnValue(of(service));
    feedService.fetchServiceFeeds.and.returnValue(of(feeds as any));
    feedService.fetchServiceType.and.returnValue(of(serviceTypeObject));

    component.ngOnInit();
    tick();

    expect(component.hasServiceEditPermission).toBeFalse();
    expect(component.hasServiceDeletePermission).toBeFalse();
  }));

  it('should load service + feeds, then push breadcrumb with route', fakeAsync(() => {
    adminUserService.getMyself.and.returnValue(
      of({ role: { permissions: [] } } as any)
    );

    feedService.fetchService.and.returnValue(of(service));
    feedService.fetchServiceFeeds.and.returnValue(of(feeds as any));
    feedService.fetchServiceType.and.returnValue(of(serviceTypeObject));

    component.ngOnInit();
    tick();

    expect(component.service.id).toBe('serviceid1234');
    expect(component.feeds.length).toBe(2);

    expect(component.breadcrumbs.length).toBe(2);
    expect(component.breadcrumbs[1].title).toBe('Service title');

    expect(component.breadcrumbs[1] as any).toEqual(
      jasmine.objectContaining({
        title: 'Service title'
      })
    );
    expect((component.breadcrumbs[1] as any).route).toBeUndefined();
  }));

  it('should wrap non-object serviceType configSchema and service.config', fakeAsync(() => {
    adminUserService.getMyself.and.returnValue(
      of({ role: { permissions: [] } } as any)
    );

    const localService = { ...service, config: 'https://example.com' };

    feedService.fetchService.and.returnValue(of(localService as any));
    feedService.fetchServiceFeeds.and.returnValue(of([] as any));
    feedService.fetchServiceType.and.returnValue(
      of({ ...serviceTypeNonObject } as any)
    );

    component.ngOnInit();
    tick();

    expect(component.serviceType.configSchema.type).toBe('object');
    expect(component.serviceType.configSchema.properties).toBeDefined();
    expect(component.serviceType.configSchema.properties.wrapped).toEqual(
      serviceTypeNonObject.configSchema
    );

    expect((component.service as any).config).toEqual({
      wrapped: 'https://example.com'
    });

    expect(component.serviceLoaded).toBeDefined();
  }));

  it('should not wrap object serviceType configSchema', fakeAsync(() => {
    adminUserService.getMyself.and.returnValue(
      of({ role: { permissions: [] } } as any)
    );

    const localService = { ...service, config: { url: 'https://example.com' } };

    feedService.fetchService.and.returnValue(of(localService as any));
    feedService.fetchServiceFeeds.and.returnValue(of([] as any));
    feedService.fetchServiceType.and.returnValue(
      of({ ...serviceTypeObject } as any)
    );

    component.ngOnInit();
    tick();

    expect(component.serviceType.configSchema).toEqual(
      serviceTypeObject.configSchema
    );
    expect(
      component.serviceType.configSchema.properties?.wrapped
    ).toBeUndefined();
    expect((component.service as any).config).toEqual({
      url: 'https://example.com'
    });
  }));

  it('deleteService should call deleteService and history.back when confirmed', fakeAsync(() => {
    adminUserService.getMyself.and.returnValue(
      of({ role: { permissions: [] } } as any)
    );

    feedService.fetchService.and.returnValue(of(service));
    feedService.fetchServiceFeeds.and.returnValue(of(feeds as any));
    feedService.fetchServiceType.and.returnValue(of(serviceTypeObject));
    component.ngOnInit();
    tick();

    const dialogRef = { afterClosed: () => of(true) } as any;
    dialog.open.and.returnValue(dialogRef);

    feedService.deleteService.and.returnValue(of(undefined as any));
    spyOn(history, 'back');

    component.deleteService();
    tick();
    tick();

    expect(dialog.open).toHaveBeenCalled();
    expect(feedService.deleteService).toHaveBeenCalledWith(service);
    expect(history.back).toHaveBeenCalled();
  }));

  it('deleteService should do nothing when not confirmed', fakeAsync(() => {
    adminUserService.getMyself.and.returnValue(
      of({ role: { permissions: [] } } as any)
    );

    feedService.fetchService.and.returnValue(of(service));
    feedService.fetchServiceFeeds.and.returnValue(of(feeds as any));
    feedService.fetchServiceType.and.returnValue(of(serviceTypeObject));
    component.ngOnInit();
    tick();

    const dialogRef = { afterClosed: () => of(false) } as any;
    dialog.open.and.returnValue(dialogRef);

    spyOn(history, 'back');

    component.deleteService();
    tick();

    expect(feedService.deleteService).not.toHaveBeenCalled();
    expect(history.back).not.toHaveBeenCalled();
  }));
});
