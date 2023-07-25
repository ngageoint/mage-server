import { JsonSchemaFormModule } from '@ajsf/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card'
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { MatListModule } from '@angular/material/list'
import { MatPaginatorModule } from '@angular/material/paginator'
import { RawParams, StateOrName, StateService, TransitionOptions, TransitionPromise } from '@uirouter/angular';
import { of } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';
import { Feed, FeedExpanded, ServiceType } from '@ngageoint/mage.web-core-lib/feed/feed.model';
import { JsonSchemaModule } from 'src/app/json-schema/json-schema.module';
import { UserService } from 'src/app/upgrade/ajs-upgraded-providers';
import { AdminBreadcrumbModule } from '../../admin-breadcrumb/admin-breadcrumb.module';
import { AdminServiceComponent } from './admin-service.component';

class MockStateService {
  get params(): any {
    return {
      serviceId: 'serviceid1234'
    };
  }
  go(to: StateOrName, params?: RawParams, options?: TransitionOptions): TransitionPromise {
    return null;
  }
}

class MockUserService {
  get myself(): any {
    return {
      role: {
        permissions: []
      }
    };
  }
}

class MdDialogMock {
  // When the component calls this.dialog.open(...) we'll return an object
  // with an afterClosed method that allows to subscribe to the dialog result observable.
  open(): any {
    return {
      afterClosed: (): Observable<boolean> => {
        console.log('after closed');
        return of(true);
      }
    };
  }
};

describe('AdminServiceComponent', () => {
  let component: AdminServiceComponent;
  let fixture: ComponentFixture<AdminServiceComponent>;
  let element: HTMLElement;

  let httpMock: HttpTestingController;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      providers: [{
        provide: StateService,
        useClass: MockStateService
      }, {
        provide: MatDialogRef, useValue: {}
      }, {
        provide: MAT_DIALOG_DATA, useValue: {}
      }, {
        provide: UserService,
        useClass: MockUserService
      }, {
        provide: MatDialog,
        useClass: MdDialogMock
      }],
      imports: [
        MatDialogModule,
        MatIconModule,
        MatCardModule,
        MatListModule,
        MatPaginatorModule,
        HttpClientTestingModule,
        JsonSchemaFormModule,
        JsonSchemaModule,
        HttpClientTestingModule,
        AdminBreadcrumbModule
      ],
      declarations: [
        AdminServiceComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminServiceComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.get(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  const serviceType: ServiceType = {
    pluginServiceTypeId: 'test:type1',
    id: 'servicetype1234',
    title: 'ServiceType',
    summary: 'summary',
    configSchema: {
      type: 'string',
      title: 'URL',
      description: 'URL of the service',
      default: 'https://nowhere.com'
    }
  };

  const serviceTypeObjectSchema: ServiceType = {
    pluginServiceTypeId: 'test:type2',
    id: 'servicetype1234',
    title: 'ServiceType',
    summary: 'summary',
    configSchema: {
      type: 'object',
      properties: {
        type: 'string',
        title: 'URL',
        description: 'URL of the service',
        default: 'https://nowhere.com'
      }
    }
  };

  const service = {
    serviceType: {
      id: 'servicetype1234',
      title: 'ServiceType',
      summary: 'summary',
      configSchema: {
        type: 'object',
        properties: {
          type: 'string',
          title: 'URL',
          description: 'URL of the service',
          default: 'https://nowhere.com'
        }
      }
    },
    title: 'Service title',
    summary: 'service summary',
    config: 'https://example.com',
    id: 'serviceid1234'
  };
  const feed: FeedExpanded = {
    title: 'Feed 1234',
    service: {
      title: 'Service title',
      summary: 'service summary',
      config: 'https://example.com',
      id: 'serviceid1234',
      serviceType: {
        pluginServiceTypeId: 'test:type2',
        id: 'servicetype1234',
        title: 'ServiceType',
        summary: 'summary',
        configSchema: {
          type: 'object',
          properties: {
            type: 'string',
            title: 'URL',
            description: 'URL of the service',
            default: 'https://nowhere.com'
          }
        }
      }
    },
    topic: {
      id: 'topic',
      title: 'Topic'
    },
    summary:
      'Feed summary 1234',
    itemPropertiesSchema: {},
    constantParams: { newerThanDays: 56 },
    itemsHaveIdentity: true,
    itemsHaveSpatialDimension: true,
    itemPrimaryProperty: 'test1',
    itemSecondaryProperty: 'navArea',
    itemTemporalProperty: 'timestamp',
    updateFrequencySeconds: 915,
    mapStyle: {
      icon: {
        id: 'icon1a2b'
      }
    },
    id: 'feedid1234'
  };

  it('should create', () => {
    expect(component).toBeTruthy();

    const serviceReq = httpMock.expectOne('/api/feeds/services/serviceid1234');
    expect(serviceReq.request.method).toEqual('GET');
    serviceReq.flush({...service});

    const serviceFeedReq = httpMock.expectOne('/api/feeds/services/serviceid1234/feeds');
    expect(serviceFeedReq.request.method).toEqual('GET');
    serviceFeedReq.flush([{...feed}]);

    const serviceTypeReq = httpMock.expectOne('/api/feeds/service_types/servicetype1234');
    expect(serviceTypeReq.request.method).toEqual('GET');
    serviceTypeReq.flush({...serviceType});

    expect(component.breadcrumbs[1]).toEqual({title: service.title});
  });

  it('should wrap non object schemas', () => {
    const serviceReq = httpMock.expectOne('/api/feeds/services/serviceid1234');
    expect(serviceReq.request.method).toEqual('GET');
    serviceReq.flush({...service});

    const serviceFeedReq = httpMock.expectOne('/api/feeds/services/serviceid1234/feeds');
    expect(serviceFeedReq.request.method).toEqual('GET');
    serviceFeedReq.flush([{...feed}]);

    const serviceTypeReq = httpMock.expectOne('/api/feeds/service_types/servicetype1234');
    expect(serviceTypeReq.request.method).toEqual('GET');
    serviceTypeReq.flush({...serviceType});
    expect(component.serviceType.configSchema.type).toEqual('object');
    expect(component.serviceType.configSchema.properties).toBeDefined();
    expect(component.serviceType.configSchema.properties.wrapped).toBeDefined();
    expect(component.serviceType.configSchema.properties.wrapped).toEqual(serviceType.configSchema);
  });

  it('should not wrap object schemas', () => {
    const serviceReq = httpMock.expectOne('/api/feeds/services/serviceid1234');
    expect(serviceReq.request.method).toEqual('GET');
    serviceReq.flush({...service});

    const serviceFeedReq = httpMock.expectOne('/api/feeds/services/serviceid1234/feeds');
    expect(serviceFeedReq.request.method).toEqual('GET');
    serviceFeedReq.flush([{...feed}]);

    const serviceTypeReq = httpMock.expectOne('/api/feeds/service_types/servicetype1234');
    expect(serviceTypeReq.request.method).toEqual('GET');
    serviceTypeReq.flush({...serviceTypeObjectSchema});
    expect(component.serviceType.configSchema.type).toEqual('object');
    expect(component.serviceType.configSchema.properties).toBeDefined();
    expect(component.serviceType.configSchema.properties.wrapped).not.toBeDefined();
    expect(component.serviceType.configSchema).toEqual(serviceTypeObjectSchema.configSchema);
  });

  it('should update the state service to go to the admin.feeds state', () => {
    const stateService: StateService = fixture.debugElement.injector.get(StateService);
    spyOn(stateService, 'go');

    const serviceReq = httpMock.expectOne('/api/feeds/services/serviceid1234');
    expect(serviceReq.request.method).toEqual('GET');
    serviceReq.flush({...service});

    const serviceFeedReq = httpMock.expectOne('/api/feeds/services/serviceid1234/feeds');
    expect(serviceFeedReq.request.method).toEqual('GET');
    serviceFeedReq.flush([{...feed}]);

    const serviceTypeReq = httpMock.expectOne('/api/feeds/service_types/servicetype1234');
    expect(serviceTypeReq.request.method).toEqual('GET');
    serviceTypeReq.flush({...serviceTypeObjectSchema});

    component.goToFeeds();
    expect(stateService.go).toHaveBeenCalledWith('admin.feeds');
  });

  it('should update the state service to go to the admin.feed state with the feed id', () => {
    const stateService: StateService = fixture.debugElement.injector.get(StateService);
    spyOn(stateService, 'go');

    const serviceReq = httpMock.expectOne('/api/feeds/services/serviceid1234');
    expect(serviceReq.request.method).toEqual('GET');
    serviceReq.flush({...service});

    const serviceFeedReq = httpMock.expectOne('/api/feeds/services/serviceid1234/feeds');
    expect(serviceFeedReq.request.method).toEqual('GET');
    serviceFeedReq.flush([{...feed}]);

    const serviceTypeReq = httpMock.expectOne('/api/feeds/service_types/servicetype1234');
    expect(serviceTypeReq.request.method).toEqual('GET');
    serviceTypeReq.flush({...serviceTypeObjectSchema});

    component.goToFeed(feed);
    expect(stateService.go).toHaveBeenCalledWith('admin.feed', { feedId: feed.id });
  });

  xit('should delete a service', () => {
    spyOn(component.dialog, 'open').and.callThrough();
    spyOn(component, 'goToFeeds');

    const serviceReq = httpMock.expectOne({
      url: '/api/feeds/services/serviceid1234',
      method: 'GET'
    });
    expect(serviceReq.request.method).toEqual('GET');
    serviceReq.flush({...service});

    const serviceFeedReq = httpMock.expectOne('/api/feeds/services/serviceid1234/feeds');
    expect(serviceFeedReq.request.method).toEqual('GET');
    serviceFeedReq.flush([{...feed}]);

    const serviceTypeReq = httpMock.expectOne('/api/feeds/service_types/servicetype1234');
    expect(serviceTypeReq.request.method).toEqual('GET');
    serviceTypeReq.flush({...serviceTypeObjectSchema});

    fixture.detectChanges();
    const deleteServiceReq = httpMock.expectOne({
      url: '/api/feeds/services/serviceid1234',
      method: 'DELETE'
    });
    expect(deleteServiceReq.request.method).toEqual('DELETE');
    deleteServiceReq.flush(null);
    component.deleteService();

    expect(component.dialog.open).toHaveBeenCalled();
    expect(component.goToFeeds).toHaveBeenCalled();
  });
});
