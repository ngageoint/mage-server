import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AboutComponent } from './about.component';
import { ApiService } from '../api/api.service';
import { of } from 'rxjs';
import { Location } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockLocation: jasmine.SpyObj<Location>;

  const MOCK_VERSION = { major: 1, minor: 2, micro: 3 };
  const MOCK_APK = 'app.apk';
  const MOCK_NODE_VERSION = 'v18.0.0';
  const MOCK_MONGO_VERSION = '5.0.0';
  const MOCK_CONTACT_INFO = {
    email: 'admin@example.com',
    phone: '1234567890',
    showDevContact: true
  };
  const MOCK_API_RESPONSE_WITH_CONTACT = {
    version: MOCK_VERSION,
    apk: MOCK_APK,
    environment: {
      nodeVersion: MOCK_NODE_VERSION,
      mongodbVersion: MOCK_MONGO_VERSION
    },
    contactInfo: MOCK_CONTACT_INFO
  };

  const MOCK_API_RESPONSE_NO_CONTACT = {
    version: { major: 2, minor: 1, micro: 0 },
    apk: 'another.apk',
    environment: {
      nodeVersion: 'v20.0.0',
      mongodbVersion: '6.0.0'
    },
    contactInfo: null
  };

  beforeEach(waitForAsync(() => {
    mockApiService = jasmine.createSpyObj('ApiService', ['getApi']);
    mockLocation = jasmine.createSpyObj('Location', ['back']);

    TestBed.configureTestingModule({
      imports: [MatToolbarModule, MatIconModule],
      declarations: [AboutComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: Location, useValue: mockLocation }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load API data on init with full contact info', () => {
    mockApiService.getApi.and.returnValue(of(MOCK_API_RESPONSE_WITH_CONTACT));

    component.ngOnInit();

    expect(mockApiService.getApi).toHaveBeenCalled();
    expect(component.mageVersion).toEqual(MOCK_VERSION);
    expect(component.apk).toBe(MOCK_APK);
    expect(component.nodeVersion).toBe(MOCK_NODE_VERSION);
    expect(component.mongoVersion).toBe(MOCK_MONGO_VERSION);
    expect(component.adminEmail).toBe(MOCK_CONTACT_INFO.email);
    expect(component.adminPhone).toBe(MOCK_CONTACT_INFO.phone);
    expect(component.showDevContact).toBeTrue();
  });

  it('should handle missing contactInfo', () => {
    mockApiService.getApi.and.returnValue(of(MOCK_API_RESPONSE_NO_CONTACT));

    component.ngOnInit();

    expect(component.mageVersion).toEqual(MOCK_API_RESPONSE_NO_CONTACT.version);
    expect(component.apk).toBe(MOCK_API_RESPONSE_NO_CONTACT.apk);
    expect(component.nodeVersion).toBe(
      MOCK_API_RESPONSE_NO_CONTACT.environment.nodeVersion
    );
    expect(component.mongoVersion).toBe(
      MOCK_API_RESPONSE_NO_CONTACT.environment.mongodbVersion
    );
    expect(component.adminEmail).toBeNull();
    expect(component.adminPhone).toBeNull();
    expect(component.showDevContact).toBeFalse();
  });

  it('should go back on onBack call', () => {
    component.onBack();
    expect(mockLocation.back).toHaveBeenCalled();
  });
});
