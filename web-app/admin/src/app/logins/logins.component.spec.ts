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
  const mockInjector = { get: (token: string) => (token === '$state' ? mockState : null) };

  const mockLoginService = {
    query: jasmine.createSpy('query').and.returnValue(Promise.resolve({ logins: [], next: undefined, prev: undefined }))
  };

  const mockUserPaging = {
    constructDefault: jasmine.createSpy('constructDefault').and.returnValue({ all: {} }),
    refresh: jasmine.createSpy('refresh').and.returnValue(Promise.resolve()),
    users: jasmine.createSpy('users').and.returnValue([]),
    search: jasmine.createSpy('search').and.returnValue(Promise.resolve([]))
  };

  const mockDevicePaging = {
    constructDefault: jasmine.createSpy('constructDefault').and.returnValue({ all: {} }),
    refresh: jasmine.createSpy('refresh').and.returnValue(Promise.resolve()),
    devices: jasmine.createSpy('devices').and.returnValue([]),
    search: jasmine.createSpy('search').and.returnValue(Promise.resolve([]))
  };

  async function createComponent(init?: Partial<LoginsComponent>) {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [LoginsComponent],
      providers: [
        { provide: '$injector', useValue: mockInjector },
        { provide: LoginService, useValue: mockLoginService },
        { provide: UserPagingService, useValue: mockUserPaging },
        { provide: DevicePagingService, useValue: mockDevicePaging },
        { provide: UserService, useValue: {} },
        { provide: DeviceService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginsComponent);
    component = fixture.componentInstance;

    Object.assign(component, init || {});
    fixture.detectChanges();
  }

  beforeEach(() => {
    mockState.go.calls.reset();
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

  it('ngOnInit should set filter.user/device when userId/deviceId inputs are provided', fakeAsync(async () => {
    await createComponent({ userId: 'u1', deviceId: 'd1' });

    
    tick();

    expect((component.filter as any).user).toEqual({ id: 'u1' } as any);
    expect((component.filter as any).device).toEqual({ id: 'd1' } as any);
  }));

  it('initUserSourceIfNeeded should NOT call paging when users list is provided', fakeAsync(async () => {
    await createComponent({ users: [{ displayName: 'A' } as any] });

    tick();
    expect(mockUserPaging.constructDefault).not.toHaveBeenCalled();
    expect(mockUserPaging.refresh).not.toHaveBeenCalled();
  }));

  it('initUserSourceIfNeeded should call paging when users list empty and no userId', fakeAsync(async () => {
    mockUserPaging.users.and.returnValue([{ displayName: 'Paged User' } as any]);

    await createComponent({ users: [] });

    tick();
    tick();

    expect(mockUserPaging.constructDefault).toHaveBeenCalled();
    expect(mockUserPaging.refresh).toHaveBeenCalled();
    expect(component.users.length).toBe(1);
    expect(component.users[0].displayName).toBe('Paged User');
  }));

  it('initDeviceSourceIfNeeded should copy devices into loginDeviceSearchResults when devices provided', fakeAsync(async () => {
    const devs = [{ uid: 'X' }, { uid: 'Y' }] as any[];
    await createComponent({ devices: devs });

    tick();

    expect(component.loginDeviceSearchResults).toEqual(devs);
    expect(mockDevicePaging.constructDefault).not.toHaveBeenCalled();
  }));

  it('initDeviceSourceIfNeeded should call device paging when devices not provided', fakeAsync(async () => {
    mockDevicePaging.devices.and.returnValue([{ uid: 'Paged Device' } as any]);

    await createComponent({ devices: [] });

    tick();
    tick();

    expect(mockDevicePaging.constructDefault).toHaveBeenCalled();
    expect(mockDevicePaging.refresh).toHaveBeenCalled();
    expect(component.loginDeviceSearchResults.length).toBe(1);
    expect((component.loginDeviceSearchResults[0] as any).uid).toBe('Paged Device');
  }));

  it('hasNext should be false for invalid next links and true for valid link', fakeAsync(async () => {
    await createComponent();

    component.loginPage = { logins: [], next: 'null', prev: null } as any;
    expect(component.hasNext).toBe(false);

    component.loginPage = { logins: [], next: '   ', prev: null } as any;
    expect(component.hasNext).toBe(false);

    component.loginPage = { logins: [], next: 'http://next', prev: null } as any;
    expect(component.hasNext).toBe(true);
  }));

  it('hasPrev should be false when firstLogin missing, no logins, or invalid prev; true when conditions met', fakeAsync(async () => {
    await createComponent();

    component.loginPage = { prev: 'http://prev', logins: [{ id: 'a' }] } as any;
    component.firstLogin = null as any;
    expect(component.hasPrev).toBe(false);

    component.firstLogin = { id: 'a' } as any;
    component.loginPage = { prev: 'http://prev', logins: [] } as any;
    expect(component.hasPrev).toBe(false);

    component.loginPage = { prev: 'null', logins: [{ id: 'b' }] } as any;
    expect(component.hasPrev).toBe(false);

    component.loginPage = { prev: 'http://prev', logins: [{ id: 'b' }] } as any;
    component.firstLogin = { id: 'a' } as any;
    expect(component.hasPrev).toBe(true);

    component.loginPage = { prev: 'http://prev', logins: [{ id: 'a' }] } as any;
    expect(component.hasPrev).toBe(false);
  }));

  it('pageLogin should not call loginService.query for invalid url', fakeAsync(async () => {
    await createComponent();
    mockLoginService.query.calls.reset();

    component.pageLogin('   ');
    tick();

    expect(mockLoginService.query).not.toHaveBeenCalled();
  }));

  it('pageLogin should update loginPage for a non-empty next page', fakeAsync(async () => {
    await createComponent();

    component.loginPage = { logins: [{ id: 'old' }], next: 'http://next', prev: null } as any;

    mockLoginService.query.and.returnValue(Promise.resolve({
      logins: [{ id: 'new' }],
      next: 'http://next2',
      prev: 'http://prev2'
    }));

    component.pageLogin('http://next');
    tick();

    expect(component.loginPage.logins[0].id).toBe('new');
    expect(component.loginPage.next).toBe('http://next2');
    expect(component.loginPage.prev).toBe('http://prev2');
  }));

  it('pageLogin should guard against server next leading to empty page and null out current loginPage.next', fakeAsync(async () => {
    await createComponent();

    component.loginPage = { logins: [{ id: 'old' }], next: 'http://next', prev: null } as any;

    mockLoginService.query.and.returnValue(Promise.resolve({
      logins: [],
      next: 'http://still-next',
      prev: 'http://prev'
    }));

    component.pageLogin('http://next');
    tick();

    expect(component.loginPage.logins[0].id).toBe('old');
    expect((component.loginPage as any).next).toBeNull();
  }));

  it('filterLogins should call loadInitialLogins when no user/device/date filters selected', fakeAsync(async () => {
    await createComponent();

    spyOn(component as any, 'loadInitialLogins').and.callThrough();

    component.user = null as any;
    component.device = [];
    component.login.startDate = null;
    component.login.endDate = null;

    component.filterLogins();
    tick();

    expect((component as any).loadInitialLogins).toHaveBeenCalled();
  }));

  it('filterLogins should set device filter from selected device[0].id, and endDate to end-of-day', fakeAsync(async () => {
    await createComponent();

    const end = new Date('2025-12-17T10:00:00.000Z');
    component.user = { id: 'u2', displayName: 'User Two' } as any;
    component.device = [{ id: 'd2', uid: 'UID2' } as any];
    component.login.startDate = new Date('2025-12-01T00:00:00.000Z');
    component.login.endDate = end;

    mockLoginService.query.and.returnValue(Promise.resolve({ logins: [], next: null, prev: null }));

    component.filterLogins();
    tick();

    const passed = mockLoginService.query.calls.mostRecent().args[0];
    expect(passed.filter.user.id).toBe('u2');
    expect(passed.filter.device.id).toBe('d2');
    expect(passed.filter.startDate).toBe(component.login.startDate);

    expect(new Date(passed.filter.endDate).getTime()).not.toBe(end.getTime());
  }));

  it('onUserSearchChange should clear results and call filterLogins when term is cleared', fakeAsync(async () => {
    await createComponent();

    spyOn(component, 'filterLogins').and.stub();

    component.loginSearchResults = [{ displayName: 'x' } as any];
    component.onUserSearchChange('');
    tick();

    expect(component.loginSearchResults).toEqual([]);
    expect(component.filterLogins).toHaveBeenCalled();
  }));

  it('searchLoginsAgainstUsers should use pagingService.search when userStateAndData is set', fakeAsync(async () => {
    await createComponent();

    (component as any).userStateAndData = { all: {} } as any;

    mockUserPaging.search.and.returnValue(Promise.resolve([
      { displayName: 'U1' } as any,
      { displayName: 'U2' } as any
    ]));

    let res: any;
    component.searchLoginsAgainstUsers('abc').then(r => (res = r));
    tick();

    expect(mockUserPaging.search).toHaveBeenCalledWith((component as any).userStateAndData.all, 'abc');
    expect(component.loginSearchResults.length).toBe(2);
    expect(res.length).toBe(2);
  }));

  it('searchLoginsAgainstUsers should return first 10 users when searchString empty or ".*" (local list branch)', fakeAsync(async () => {
    await createComponent({ users: Array.from({ length: 12 }).map((_, i) => ({ displayName: `User${i}` } as any)) });

    (component as any).userStateAndData = null;

    let res1: any;
    component.searchLoginsAgainstUsers(null).then(r => (res1 = r));
    tick();
    expect(res1.length).toBe(10);

    let res2: any;
    component.searchLoginsAgainstUsers('.*').then(r => (res2 = r));
    tick();
    expect(res2.length).toBe(10);
  }));

  it('onDeviceSearchChange should use devicePagingService.search when deviceStateAndData exists', fakeAsync(async () => {
    await createComponent();

    (component as any).deviceStateAndData = { all: {} } as any;

    mockDevicePaging.search.and.returnValue(Promise.resolve([{ uid: 'A' }, { uid: 'B' }] as any));
    component.onDeviceSearchChange('term');
    tick();

    expect(mockDevicePaging.search).toHaveBeenCalled();
    expect(component.loginDeviceSearchResults.length).toBe(2);
  }));

  it('onDeviceSearchChange should filter local devices by uid/userAgent when no paging state exists', fakeAsync(async () => {
    await createComponent({
      devices: [
        { uid: 'ABC', userAgent: 'iOS Something' } as any,
        { uid: 'ZZZ', userAgent: 'Android Something' } as any
      ] as any
    });

    (component as any).deviceStateAndData = null;

    await component.onDeviceSearchChange('ab');
    expect(component.loginDeviceSearchResults.length).toBe(1);
    expect((component.loginDeviceSearchResults[0] as any).uid).toBe('ABC');

    await component.onDeviceSearchChange('android');
    expect(component.loginDeviceSearchResults.length).toBe(1);
    expect((component.loginDeviceSearchResults[0] as any).uid).toBe('ZZZ');
  }));

  it('selectUser should set user, userText, clear results, and call filterLogins', fakeAsync(async () => {
    await createComponent();
    spyOn(component, 'filterLogins').and.stub();

    component.loginSearchResults = [{ displayName: 'x' } as any];
    component.selectUser({ id: 'u1', displayName: 'Name' } as any);

    expect(component.userText).toBe('Name');
    expect(component.loginSearchResults).toEqual([]);
    expect(component.filterLogins).toHaveBeenCalled();
  }));

  it('selectDevice should set device/deviceText, clear device results, and call filterLogins', fakeAsync(async () => {
    await createComponent();
    spyOn(component, 'filterLogins').and.stub();

    component.loginDeviceSearchResults = [{ uid: 'x' } as any];
    component.selectDevice({ id: 'd1', uid: 'UID1' } as any);

    expect(component.device.length).toBe(1);
    expect(component.deviceText).toBe('UID1');
    expect(component.loginDeviceSearchResults).toEqual([]);
    expect(component.filterLogins).toHaveBeenCalled();
  }));

  it('clearUserFilter and clearDeviceFilter should reset and call filterLogins when no locked ids', fakeAsync(async () => {
    await createComponent();
    spyOn(component, 'filterLogins').and.stub();

    component.user = { id: 'u' } as any;
    component.userText = 'x';
    component.device = [{ id: 'd' } as any];
    component.deviceText = 'y';

    component.clearUserFilter();
    component.clearDeviceFilter();

    expect(component.user).toBeNull();
    expect(component.userText).toBe('');
    expect(component.device.length).toBe(0);
    expect(component.deviceText).toBe('');
    expect(component.filterLogins).toHaveBeenCalled();
  }));

  it('gotoUser and gotoDevice should call $state.go with correct params', fakeAsync(async () => {
    await createComponent();

    component.gotoUser({ id: 'u99' } as any);
    component.gotoDevice({ id: 'd99' } as any);

    expect(mockState.go).toHaveBeenCalledWith('admin.user', { userId: 'u99' });
    expect(mockState.go).toHaveBeenCalledWith('admin.device', { deviceId: 'd99' });
  }));

  it('iconClass should handle null device and device.iconClass override', fakeAsync(async () => {
    await createComponent();

    expect(component.iconClass(null as any)).toContain('fa-mobile');

    expect(component.iconClass({ iconClass: 'custom-class' } as any)).toBe('custom-class');
  }));

  it('displayUser/displayDevice should return empty string when missing fields', fakeAsync(async () => {
    await createComponent();

    expect(component.displayUser(null as any)).toBe('');
    expect(component.displayUser({} as any)).toBe('');

    expect(component.displayDevice(null as any)).toBe('');
    expect(component.displayDevice({} as any)).toBe('');
  }));

  it('hasPermission should check userService.myself.role.permissions', fakeAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [LoginsComponent],
      providers: [
        { provide: '$injector', useValue: mockInjector },
        { provide: LoginService, useValue: mockLoginService },
        { provide: UserPagingService, useValue: mockUserPaging },
        { provide: DevicePagingService, useValue: mockDevicePaging },
        { provide: UserService, useValue: { myself: { role: { permissions: ['p1', 'p2'] } } } },
        { provide: DeviceService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.hasPermission('p1')).toBeTrue();
    expect(component.hasPermission('nope')).toBeFalse();
  }));
});
