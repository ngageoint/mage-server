import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { AdminServiceEditComponent } from './admin-service-edit.component';
import {
  FeedService,
  Service,
  ServiceType
} from '@ngageoint/mage.web-core-lib/feed';

describe('AdminServiceEditComponent', () => {
  @Component({
    selector: 'app-host-component',
    template: `<app-create-service [expanded]="expanded"></app-create-service>`
  })
  class TestHostComponent {
    expanded = false;

    @ViewChild(AdminServiceEditComponent, { static: true })
    createServiceComponent!: AdminServiceEditComponent;
  }

  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let component: AdminServiceEditComponent;

  let feedService: jasmine.SpyObj<FeedService>;

  const serviceType: ServiceType = {
    pluginServiceTypeId: 'plugin1:type1',
    id: 'serviceTypeId',
    title: 'ServiceType',
    summary: 'summary',
    configSchema: {
      type: 'string',
      title: 'URL',
      description: 'URL of the service',
      default: 'https://nowhere.com'
    }
  } as any;

  const existingService: Service = {
    id: 'svc-1',
    title: 'Existing',
    summary: 'Existing summary',
    serviceType: 'serviceTypeId',
    config: 'https://example.com'
  } as any;

  beforeEach(async () => {
    feedService = jasmine.createSpyObj('FeedService', [
      'fetchServiceTypes',
      'fetchServices',
      'createService'
    ]);

    await TestBed.configureTestingModule({
      declarations: [TestHostComponent, AdminServiceEditComponent],
      providers: [{ provide: FeedService, useValue: feedService }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    component = host.createServiceComponent;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should load serviceTypes and services', () => {
    feedService.fetchServiceTypes.and.returnValue(of([serviceType] as any));
    feedService.fetchServices.and.returnValue(of([existingService] as any));

    fixture.detectChanges();

    expect(feedService.fetchServiceTypes).toHaveBeenCalled();
    expect(feedService.fetchServices).toHaveBeenCalled();
    expect(component.serviceTypes.length).toBe(1);
    expect(component.services.length).toBe(1);
  });

  it('should emit cancelled', () => {
    spyOn(component.cancelled, 'emit');

    component.cancel();

    expect(component.cancelled.emit).toHaveBeenCalled();
  });

  it('serviceTypeSelected should build title/summary schema and mark form ready', () => {
    component.selectedServiceType = serviceType;

    component.serviceTypeSelected();

    expect(component.serviceFormReady).toBeTrue();
    expect(component.serviceTitleSummarySchema).toEqual(
      jasmine.objectContaining({
        properties: jasmine.objectContaining({
          title: jasmine.objectContaining({ default: serviceType.title }),
          summary: jasmine.objectContaining({ default: serviceType.summary })
        })
      })
    );
  });

  it('createService should do nothing if no selectedServiceType', () => {
    spyOn(component.serviceCreated, 'emit');

    component.selectedServiceType = undefined as any;
    component.createService();

    expect(feedService.createService).not.toHaveBeenCalled();
    expect(component.serviceCreated.emit).not.toHaveBeenCalled();
  });

  it('createService should call service create and emit serviceCreated', () => {
    spyOn(component.serviceCreated, 'emit');

    const created: Service = {
      id: 'new-service',
      title: 'New',
      summary: 'New summary',
      serviceType: 'serviceTypeId',
      config: 'https://nowhere.com'
    } as any;

    component.selectedServiceType = serviceType;
    component.serviceTitleSummary = { title: 'New', summary: 'New summary' };
    component.serviceConfiguration = 'https://nowhere.com';

    feedService.createService.and.returnValue(of(created as any));

    component.createService();

    expect(feedService.createService).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'New',
        summary: 'New summary',
        config: 'https://nowhere.com',
        serviceType: 'serviceTypeId'
      })
    );
    expect(component.serviceCreated.emit).toHaveBeenCalledWith(created);
  });

  it('serviceTitleSummaryChanged and serviceConfigurationChanged should store values', () => {
    component.serviceTitleSummaryChanged({ title: 'T', summary: 'S' });
    component.serviceConfigurationChanged('cfg');

    expect(component.serviceTitleSummary).toEqual({ title: 'T', summary: 'S' });
    expect(component.serviceConfiguration).toBe('cfg');
  });
});
