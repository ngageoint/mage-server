import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { delay, of } from 'rxjs';
import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';

import { LoginsComponent } from './admin-logins.component';

import { LoginService } from './login.service';
import { UserPagingService } from '../services/user-paging.service';
import { DeviceService } from '../admin-devices/device.service';

describe('LoginsComponent', () => {
  let component: LoginsComponent;
  let fixture: ComponentFixture<LoginsComponent>;

  const mockLoginService = {
    query: jasmine.createSpy('query').and.returnValue(
      of({ logins: [], next: undefined, prev: undefined })
    )
  };

  const mockUserPaging = {
    constructDefault: jasmine.createSpy('constructDefault').and.returnValue({ all: {} }),
    refresh: jasmine.createSpy('refresh').and.returnValue(of(null)),
    users: jasmine.createSpy('users').and.returnValue([]),
    search: jasmine.createSpy('search').and.returnValue(of([]))
  };

  const mockDevicePaging = {
    constructDefault: jasmine.createSpy('constructDefault').and.returnValue({ all: {} }),
    refresh: jasmine.createSpy('refresh').and.returnValue(of(null)),
    devices: jasmine.createSpy('devices').and.returnValue([]),
    search: jasmine.createSpy('search').and.returnValue(of([]))
  };

  async function createComponent(inputs?: { userId?: string; deviceId?: string }) {
    await TestBed.configureTestingModule({
      imports: [FormsModule, LoginsComponent],
      providers: [
        { provide: LoginService, useValue: mockLoginService },
        { provide: UserPagingService, useValue: mockUserPaging },
        { provide: DeviceService, useValue: mockDevicePaging }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideTemplate(LoginsComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(LoginsComponent);
    component = fixture.componentInstance;

    Object.entries(inputs || {}).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();
  }

  beforeEach(() => {
    mockLoginService.query.calls.reset();

    mockUserPaging.constructDefault.calls.reset();
    mockUserPaging.refresh.calls.reset();
    mockUserPaging.users.calls.reset();
    mockUserPaging.search.calls.reset();

    mockDevicePaging.constructDefault.calls.reset();
    mockDevicePaging.refresh.calls.reset();
    mockDevicePaging.devices.calls.reset();
    mockDevicePaging.search.calls.reset();
  });

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('ngOnInit should set filter.user/device when userId/deviceId inputs are provided', async () => {
    await createComponent({ userId: 'u1', deviceId: 'd1' });

    component.ngOnInit();

    expect((component.filter as any).user).toEqual({ id: 'u1' } as any);
    expect((component.filter as any).device).toEqual({ id: 'd1' } as any);
  });

  it('initUserSourceIfNeeded should NOT call paging when userId is provided', async () => {
    await createComponent({ userId: 'u1' });

    component.ngOnInit();

    expect(mockUserPaging.constructDefault).not.toHaveBeenCalled();
    expect(mockUserPaging.refresh).not.toHaveBeenCalled();
  });

  it('initUserSourceIfNeeded should call paging when no userId', async () => {
    await createComponent();

    component.ngOnInit();

    expect(mockUserPaging.constructDefault).toHaveBeenCalled();
    expect(mockUserPaging.refresh).toHaveBeenCalled();
  });

  it('initDeviceSourceIfNeeded should NOT call paging when deviceId is provided', async () => {
    await createComponent({ deviceId: 'd1' });

    component.ngOnInit();

    expect(mockDevicePaging.constructDefault).not.toHaveBeenCalled();
  });

  it('initDeviceSourceIfNeeded should call device paging when no deviceId', async () => {
    mockDevicePaging.devices.and.returnValue([{ uid: 'Paged Device' } as any]);

    await createComponent();

    component.ngOnInit();

    expect(mockDevicePaging.constructDefault).toHaveBeenCalled();
    expect(mockDevicePaging.refresh).toHaveBeenCalled();
    expect(component.loginDeviceSearchResults().length).toBe(1);
    expect((component.loginDeviceSearchResults()[0] as any).uid).toBe('Paged Device');
  });

  it('hasNext should be false for invalid next links and true for valid link', async () => {
    await createComponent();

    component.loginPage.set({ logins: [], next: 'null', prev: null } as any);
    expect(component.hasNext).toBe(false);

    component.loginPage.set({ logins: [], next: '   ', prev: null } as any);
    expect(component.hasNext).toBe(false);

    component.loginPage.set({
      logins: [{ id: 'a' }],
      next: 'http://next?start=25&limit=25',
      prev: null
    } as any);
    expect(component.hasNext).toBe(true);
  });

  it('pageLogin should not call loginService.query for invalid url', async () => {
    await createComponent();
    mockLoginService.query.calls.reset();

    component.pageLogin('   ');

    expect(mockLoginService.query).not.toHaveBeenCalled();
  });

  it('pageLogin should update loginPage for a non-empty next page', async () => {
    await createComponent();

    component.loginPage.set({ logins: [{ id: 'old' }], next: 'http://next', prev: null } as any);

    mockLoginService.query.and.returnValue(
      of({ logins: [{ id: 'new' }], next: 'http://next2', prev: 'http://prev2' })
    );

    component.pageLogin('http://next');

    expect(component.loginPage()!.logins[0].id).toBe('new');
    expect((component.loginPage() as any).next).toBe('http://next2');
    expect((component.loginPage() as any).prev).toBe('http://prev2');
  });

  it('pageLogin should guard against empty page and null out current loginPage.next', async () => {
    await createComponent();

    component.loginPage.set({ logins: [{ id: 'old' }], next: 'http://next', prev: null } as any);

    mockLoginService.query.and.returnValue(
      of({ logins: [], next: 'http://still-next', prev: 'http://prev' })
    );

    component.onLoginPage({ pageIndex: 1, previousPageIndex: 0, pageSize: 10, length: 20 });

    expect(component.loginPage()!.logins[0].id).toBe('old');
    expect((component.loginPage() as any).next).toBeNull();
    expect(component.loginPageIndex()).toBe(0);
  });

  it('filterLogins should call loadInitialLogins when no user/device/date filters selected', async () => {
    await createComponent();
    spyOn(component as any, 'loadInitialLogins').and.callThrough();

    component.user = null as any;
    component.device = null;
    component.login.startDate = null;
    component.login.endDate = null;

    component.filterLogins();

    expect((component as any).loadInitialLogins).toHaveBeenCalled();
  });

  it('filterLogins should set device filter from selected device.id, and endDate to end-of-day', async () => {
    await createComponent();

    const end = new Date('2025-12-17T10:00:00.000Z');
    component.user = { id: 'u2', displayName: 'User Two' } as any;
    component.device = { id: 'd2', uid: 'UID2' } as any;
    component.login.startDate = new Date('2025-12-01T00:00:00.000Z');
    component.login.endDate = end;

    mockLoginService.query.and.returnValue(of({ logins: [], next: null, prev: null }));

    component.filterLogins();

    const passed = mockLoginService.query.calls.mostRecent().args[0];
    expect(passed.filter.user.id).toBe('u2');
    expect(passed.filter.device.id).toBe('d2');
    expect(passed.filter.startDate).toBe(component.login.startDate);
    expect(new Date(passed.filter.endDate).getTime()).not.toBe(end.getTime());
  });

  it('onUserSearchChange should clear results and call filterLogins when term is cleared', async () => {
    await createComponent();
    spyOn(component, 'filterLogins').and.stub();

    component.loginSearchResults.set([{ displayName: 'x' } as any]);
    component.onUserSearchChange('');

    expect(component.loginSearchResults()).toEqual([]);
    expect(component.filterLogins).toHaveBeenCalled();
  });

  it('onUserSearchChange should use pagingService.search when userStateAndData is set', async () => {
    await createComponent();
    (component as any).userStateAndData = { all: {} } as any;

    mockUserPaging.search.and.returnValue(
      of([{ displayName: 'U1' } as any, { displayName: 'U2' } as any])
    );

    component.onUserSearchChange('abc');

    expect(mockUserPaging.search).toHaveBeenCalledWith((component as any).userStateAndData.all, 'abc');
    expect(component.loginSearchResults().length).toBe(2);
  });

  it('onDeviceSearchChange should use devicePagingService.search when deviceStateAndData exists', async () => {
    await createComponent();
    (component as any).deviceStateAndData = { all: {} } as any;

    mockDevicePaging.search.and.returnValue(of([{ uid: 'A' }, { uid: 'B' }] as any));

    component.onDeviceSearchChange('term');

    expect(mockDevicePaging.search).toHaveBeenCalled();
    expect(component.loginDeviceSearchResults().length).toBe(2);
  });

  it('selectUser should set user, userText, clear results, and call filterLogins', async () => {
    await createComponent();
    spyOn(component, 'filterLogins').and.stub();

    component.loginSearchResults.set([{ displayName: 'x' } as any]);
    component.selectUser({ id: 'u1', displayName: 'Name' } as any);

    expect(component.userText).toBe('Name');
    expect(component.loginSearchResults()).toEqual([]);
    expect(component.filterLogins).toHaveBeenCalled();
  });

  it('selectDevice should set device/deviceText, clear device results, and call filterLogins', async () => {
    await createComponent();
    spyOn(component, 'filterLogins').and.stub();

    component.loginDeviceSearchResults.set([{ uid: 'x' } as any]);
    component.selectDevice({ id: 'd1', uid: 'UID1' } as any);

    expect(component.device).toEqual({ id: 'd1', uid: 'UID1' } as any);
    expect(component.deviceText).toBe('UID1');
    expect(component.loginDeviceSearchResults()).toEqual([]);
    expect(component.filterLogins).toHaveBeenCalled();
  });

  it('displayUser should return empty string when missing fields', async () => {
    await createComponent();

    expect(component.displayUser(null as any)).toBe('');
    expect(component.displayUser({} as any)).toBe('');
  });
});

describe('LoginsComponent without zone.js', () => {
  it('should render logins that load asynchronously', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: LoginService,
          useValue: {
            query: () => of({
              logins: [{ id: 'login-1', timestamp: new Date().toISOString(), user: { id: 'user-1', displayName: 'User One' } }],
              next: null,
              prev: null
            }).pipe(delay(0))
          }
        },
        { provide: UserPagingService, useValue: { constructDefault: () => ({ all: {} }), refresh: () => of(null), users: () => [] } },
        { provide: DeviceService, useValue: { constructDefault: () => ({ all: {} }), refresh: () => of(null), devices: () => [] } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginsComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('User One');
    expect(fixture.nativeElement.textContent).not.toContain('No login history found');
  });
});
