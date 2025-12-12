import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { LoginsComponent } from './logins.component';
import {
  UserService,
  DeviceService,
  LoginService,
  UserPagingService,
  DevicePagingService,
} from 'admin/src/app/upgrade/ajs-upgraded-providers';

describe('LoginsComponent', () => {
  let component: LoginsComponent;
  let fixture: ComponentFixture<LoginsComponent>;
  const mockState = { go: jasmine.createSpy('go') };

  const mockInjector = {
    get: (token: string) => (token === '$state' ? mockState : null)
  };

  const mockLoginService = {
    query: jasmine.createSpy('query').and.returnValue(Promise.resolve({
      logins: [],
      next: undefined,
      prev: undefined
    }))
  };

  const mockUserPaging = {
    constructDefault: jasmine.createSpy('constructDefault').and.returnValue({}),
    refresh: jasmine.createSpy('refresh').and.returnValue(Promise.resolve()),
    users: jasmine.createSpy('users').and.returnValue([]),
    search: jasmine.createSpy('search').and.returnValue(Promise.resolve([]))
  };

  const mockDevicePaging = {
    constructDefault: jasmine.createSpy('constructDefault').and.returnValue({}),
    refresh: jasmine.createSpy('refresh').and.returnValue(Promise.resolve()),
    devices: jasmine.createSpy('devices').and.returnValue([]),
    search: jasmine.createSpy('search').and.returnValue(Promise.resolve([]))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [LoginsComponent],
      providers: [
        { provide: '$injector', useValue: mockInjector },
        { provide: LoginService, useValue: mockLoginService },
        { provide: UserPagingService, useValue: mockUserPaging },
        { provide: DevicePagingService, useValue: mockDevicePaging },
        // Unused in current spec but required by DI graph
        { provide: UserService, useValue: {} },
        { provide: DeviceService, useValue: {} }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LoginsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loginService on init and set empty state', fakeAsync(() => {
    expect(mockLoginService.query).toHaveBeenCalled();
    tick();
    expect(component.loginPage).toBeTruthy();
    expect(component.loginPage.logins.length).toBe(0);
  }));

  it('iconClass should return appropriate classes', () => {
    expect(component.iconClass({ appVersion: 'Web Client', userAgent: '' } as any)).toContain('fa-desktop');
    expect(component.iconClass({ userAgent: 'Android' } as any)).toContain('fa-android');
    expect(component.iconClass({ userAgent: 'iOS' } as any)).toContain('fa-apple');
    expect(component.iconClass({ userAgent: 'Other' } as any)).toContain('fa-mobile');
  });
});
