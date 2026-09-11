import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { ArcAdminComponent } from './arc-admin.component';
import { ArcService, baseUrl } from '../arc.service';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../ArcGISPluginConfig';

describe('Arc Admin - Attributes tab', () => {
  let component: ArcAdminComponent;
  let fixture: ComponentFixture<ArcAdminComponent>;
  let httpMock: HttpTestingController;
  const fakeConfig = (): ArcGISPluginConfig => ({ ...defaultArcGISPluginConfig, featureServices: [] });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatDialogModule],
      declarations: [ArcAdminComponent],
      providers: [ArcService, provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ArcAdminComponent);
    component = fixture.componentInstance;

    httpMock.expectOne(`${baseUrl}/config`).flush(fakeConfig());
    httpMock.expectOne(req => req.url.endsWith('/events')).flush([]);

    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/config`).flush(fakeConfig());
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('saves every changed attribute field to the config and persists it', () => {
    component.attributesForm.setValue({
      observationIdField: 'my_observation_id',
      idSeparator: '::',
      eventIdField: 'my_event_id',
      eventNameField: 'my_event_name',
      userIdField: 'my_user_id',
      usernameField: 'my_username',
      userDisplayNameField: 'my_user_display_name',
      deviceIdField: 'my_device_id',
      createdAtField: 'my_created_at',
      lastModifiedField: 'my_last_modified',
      geometryType: 'my_geometry_type',
      iconSymbolField: 'my_icon_symbol'
    });

    component.onSubmit();

    // the config should reflect every changed field immediately, before the save even completes
    expect(component.config.observationIdField).toEqual('my_observation_id');
    expect(component.config.idSeparator).toEqual('::');
    expect(component.config.eventIdField).toEqual('my_event_id');
    expect(component.config.eventNameField).toEqual('my_event_name');
    expect(component.config.userIdField).toEqual('my_user_id');
    expect(component.config.usernameField).toEqual('my_username');
    expect(component.config.userDisplayNameField).toEqual('my_user_display_name');
    expect(component.config.deviceIdField).toEqual('my_device_id');
    expect(component.config.createdAtField).toEqual('my_created_at');
    expect(component.config.lastModifiedField).toEqual('my_last_modified');
    expect(component.config.geometryType).toEqual('my_geometry_type');
    expect(component.config.iconSymbolField).toEqual('my_icon_symbol');

    // and it should have actually been persisted to the server with those same values
    const saveReq = httpMock.expectOne(`${baseUrl}/config`);
    expect(saveReq.request.method).toEqual('PUT');
    expect(saveReq.request.body.observationIdField).toEqual('my_observation_id');
    expect(saveReq.request.body.iconSymbolField).toEqual('my_icon_symbol');
    saveReq.flush(saveReq.request.body);
  });

  it('leaves fields left blank unchanged, only saving the ones actually edited', () => {
    const originalIconSymbolField = component.config.iconSymbolField;

    component.attributesForm.patchValue({ observationIdField: 'only_this_field_changed' });
    component.onSubmit();

    expect(component.config.observationIdField).toEqual('only_this_field_changed');
    expect(component.config.iconSymbolField).toEqual(originalIconSymbolField);

    const saveReq = httpMock.expectOne(`${baseUrl}/config`);
    expect(saveReq.request.body.iconSymbolField).toEqual(originalIconSymbolField);
    saveReq.flush(saveReq.request.body);
  });
});
