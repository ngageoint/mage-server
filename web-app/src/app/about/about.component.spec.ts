import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AboutComponent } from './about.component';
import { ApiService } from '../api/api.service';
import { of } from 'rxjs';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockLocation: jasmine.SpyObj<Location>;
  let mockRouter: jasmine.SpyObj<Router>;

  const MOCK_CONTACT_INFO = {
    email: 'admin@example.com',
    phone: '1234567890',
    showDevContact: true
  };
  const MOCK_API_RESPONSE_WITH_CONTACT = {
    version: { major: 1, minor: 2, patch: 3 },
    apk: 'app.apk',
    environment: {
      nodeVersion: 'v18.0.0',
      mongodbVersion: '5.0.0'
    },
    contactInfo: MOCK_CONTACT_INFO
  };

  const MOCK_API_RESPONSE_NO_CONTACT = {
    contactInfo: null
  };

  function createComponent(apiResponse: any): void {
    mockApiService.getApi.and.returnValue(of(apiResponse));
    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    mockApiService = jasmine.createSpyObj('ApiService', ['getApi']);
    mockLocation = jasmine.createSpyObj('Location', ['back']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: Location, useValue: mockLocation },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    createComponent(MOCK_API_RESPONSE_WITH_CONTACT);

    expect(component).toBeTruthy();
  });

  it('should load API data', () => {
    createComponent(MOCK_API_RESPONSE_WITH_CONTACT);

    expect(mockApiService.getApi).toHaveBeenCalled();
    expect(component.api()).toEqual(MOCK_API_RESPONSE_WITH_CONTACT);
  });

  it('should show contact info when present', () => {
    createComponent(MOCK_API_RESPONSE_WITH_CONTACT);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Contact Us');
    expect(text).toContain(MOCK_CONTACT_INFO.phone);
    expect(text).toContain(MOCK_CONTACT_INFO.email);
    expect(text).toContain('NGA Support');
  });

  it('should hide contact info when missing', () => {
    createComponent(MOCK_API_RESPONSE_NO_CONTACT);

    expect(fixture.nativeElement.textContent).not.toContain('Contact Us');
  });

  it('should go back on onBack call when navigation history exists', () => {
    createComponent(MOCK_API_RESPONSE_WITH_CONTACT);
    spyOnProperty(window.history, 'state', 'get').and.returnValue({ navigationId: 2 });

    component.onBack();

    expect(mockLocation.back).toHaveBeenCalled();
  });

  it('should navigate home on onBack call when no navigation history exists', () => {
    createComponent(MOCK_API_RESPONSE_WITH_CONTACT);
    spyOnProperty(window.history, 'state', 'get').and.returnValue({ navigationId: 1 });

    component.onBack();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['home']);
  });
});
