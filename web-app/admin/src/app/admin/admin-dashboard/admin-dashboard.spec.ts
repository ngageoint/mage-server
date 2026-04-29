import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, EventEmitter } from '@angular/core';
import { of } from 'rxjs';

import { AdminDashboardComponent } from './admin-dashboard';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatListModule as MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule as MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule as MatTableModule } from '@angular/material/table';

import { RouterTestingModule } from '@angular/router/testing';
import { AdminUserService } from '../services/admin-user.service';
import { AdminDeviceService } from '../services/admin-device.service';
import { DevicePagingService } from '../../services/device-paging.service';
import { UserPagingService } from '../../services/user-paging.service';

const TEST_USERS: any[] = [
  {
    id: '1',
    username: 'lily_h',
    displayName: 'Lily Hoshikawa',
    active: true,
    enabled: true,
    authentication: 'LOCAL',
    createdAt: new Date().toDateString(),
    lastUpdated: new Date().toDateString(),
    recentEventIds: [],
    role: {
      id: 'Test',
      name: 'role',
      permissions: []
    },
    email: 'lily@example.com',
    phones: []
  },
  {
    id: '2',
    username: 'hana_',
    displayName: 'Hana',
    active: true,
    enabled: true,
    authentication: 'LOCAL',
    createdAt: new Date().toDateString(),
    lastUpdated: new Date().toDateString(),
    recentEventIds: [],
    role: {
      id: 'Test',
      name: 'role',
      permissions: []
    },
    email: 'hana@example.com',
    phones: []
  },
  {
    id: '3',
    username: 'kiku_wano',
    displayName: 'Kikunojo',
    active: true,
    enabled: true,
    authentication: 'LOCAL',
    createdAt: new Date().toDateString(),
    lastUpdated: new Date().toDateString(),
    recentEventIds: [],
    role: {
      id: 'Test',
      name: 'role',
      permissions: []
    },
    email: 'kiku@example.com',
    phones: []
  }
];

const TEST_DEVICES: any[] = [
  {
    id: 'd1',
    uid: 'Primary Desktop',
    registered: true,
    appVersion: 'Web Client',
    userAgent: '',
    iconClass: ''
  },
  {
    id: 'd2',
    uid: 'iOS Device',
    registered: true,
    appVersion: 'mobile',
    userAgent: 'iOS',
    iconClass: ''
  },
  {
    id: 'd3',
    uid: 'Android Device',
    registered: false,
    appVersion: 'mobile',
    userAgent: 'android',
    iconClass: ''
  }
];

const mockUserService: Partial<AdminUserService> & any = {
  myself$: of({
    id: 'me',
    role: { permissions: ['test.permission'] }
  }),
  updateUser: jasmine.createSpy('updateUser')
};

const mockDeviceService: Partial<AdminDeviceService> & any = {
  updateDevice: jasmine
    .createSpy('updateDevice')
    .and.callFake((_id: string, patch: any) => {
      const updated = { ...TEST_DEVICES[0], ...patch };
      return of(updated);
    })
};

const userStateAndData = {
  inactive: {}
};

const deviceStateAndData = {
  unregistered: {}
};

const mockUserPagingService: Partial<UserPagingService> & any = {
  constructDefault: jasmine
    .createSpy('constructDefault')
    .and.returnValue(userStateAndData),
  refresh: jasmine.createSpy('refresh').and.returnValue(of([])),
  users: jasmine.createSpy('users').and.callFake((_state: any) => TEST_USERS),
  count: jasmine.createSpy('count').and.returnValue(TEST_USERS.length),
  hasNext: jasmine.createSpy('hasNext').and.returnValue(true),
  hasPrevious: jasmine.createSpy('hasPrevious').and.returnValue(false),
  next: jasmine.createSpy('next').and.returnValue(of([TEST_USERS[1]])),
  previous: jasmine.createSpy('previous').and.returnValue(of([TEST_USERS[0]])),
  search: jasmine
    .createSpy('search')
    .and.callFake((_state: any, term: string) => {
      return of(
        TEST_USERS.filter((u) =>
          (u.displayName || '')
            .toLowerCase()
            .includes((term || '').toLowerCase())
        )
      );
    })
};

const mockDevicePagingService: Partial<DevicePagingService> & any = {
  constructDefault: jasmine
    .createSpy('constructDefault')
    .and.returnValue(deviceStateAndData),
  refresh: jasmine.createSpy('refresh').and.returnValue(of([])),
  devices: jasmine
    .createSpy('devices')
    .and.callFake((_state: any) => TEST_DEVICES),
  count: jasmine.createSpy('count').and.returnValue(TEST_DEVICES.length),
  hasNext: jasmine.createSpy('hasNext').and.returnValue(true),
  hasPrevious: jasmine.createSpy('hasPrevious').and.returnValue(false),
  next: jasmine.createSpy('next').and.returnValue(of([TEST_DEVICES[1]])),
  previous: jasmine
    .createSpy('previous')
    .and.returnValue(of([TEST_DEVICES[0]])),
  search: jasmine
    .createSpy('search')
    .and.callFake((_state: any, term: string) => {
      return of(
        TEST_DEVICES.filter((d) =>
          (d.uid || '')
            .toString()
            .toLowerCase()
            .includes((term || '').toLowerCase())
        )
      );
    })
};

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminDashboardComponent],
      imports: [
        CommonModule,
        FormsModule,
        MatToolbarModule,
        MatIconTestingModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCardModule,
        MatListModule,
        MatBadgeModule,
        MatSelectModule,
        MatDatepickerModule,
        MatAutocompleteModule,
        MatNativeDateModule,
        MatTableModule,
        AdminBreadcrumbModule,
        BrowserAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: AdminUserService, useValue: mockUserService },
        { provide: AdminDeviceService, useValue: mockDeviceService },
        { provide: DevicePagingService, useValue: mockDevicePagingService },
        { provide: UserPagingService, useValue: mockUserPagingService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    (mockUserPagingService.constructDefault as jasmine.Spy).calls.reset();
    (mockUserPagingService.refresh as jasmine.Spy).calls.reset();
    (mockDevicePagingService.constructDefault as jasmine.Spy).calls.reset();
    (mockDevicePagingService.refresh as jasmine.Spy).calls.reset();
    (mockUserPagingService.search as jasmine.Spy).calls.reset();
    (mockDevicePagingService.search as jasmine.Spy).calls.reset();
    (mockUserPagingService.next as jasmine.Spy).calls.reset();
    (mockUserPagingService.previous as jasmine.Spy).calls.reset();
    (mockDevicePagingService.next as jasmine.Spy).calls.reset();
    (mockDevicePagingService.previous as jasmine.Spy).calls.reset();
    (mockUserService.updateUser as jasmine.Spy).calls.reset();
    (mockDeviceService.updateDevice as jasmine.Spy).calls.reset();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call paging refresh in ngOnInit and populate lists', fakeAsync(() => {
    tick();
    expect(mockUserPagingService.refresh).toHaveBeenCalled();
    expect(mockDevicePagingService.refresh).toHaveBeenCalled();
    expect(component.inactiveUsers.length).toBe(TEST_USERS.length);
    expect(component.unregisteredDevices.length).toBe(TEST_DEVICES.length);
  }));

  it('should activate user and emit event', fakeAsync(() => {
    const user = { ...TEST_USERS[0], active: false };
    component.onUserActivated = new EventEmitter();
    spyOn(component.onUserActivated, 'emit');

    (mockUserService.updateUser as jasmine.Spy).and.callFake(
      (_id: string, _user: any) => of(_user)
    );

    component.activateUser(user);
    tick();

    expect(user.active).toBeTrue();
    expect(component.onUserActivated.emit).toHaveBeenCalledWith({ user });
  }));

  it('should register device and emit event', fakeAsync(() => {
    const device = { ...TEST_DEVICES[0], registered: false };
    component.onDeviceEnabled = new EventEmitter();
    spyOn(component.onDeviceEnabled, 'emit');

    component.registerDevice(new MouseEvent('click'), device);
    tick();

    expect(mockDeviceService.updateDevice).toHaveBeenCalledWith(device.id, {
      registered: true
    });
    expect(component.onDeviceEnabled.emit).toHaveBeenCalledWith({
      device: jasmine.objectContaining({ id: 'd1', registered: true })
    });
  }));

  it('should return true if user has permission', () => {
    expect(component.hasPermission('test.permission')).toBeTrue();
    expect(component.hasPermission('other.permission')).toBeFalse();
  });

  it('should search users', fakeAsync(() => {
    component.userSearch = 'Lily Hoshikawa';
    component.search();
    tick();
    expect(component.inactiveUsers).toEqual([TEST_USERS[0]]);
  }));

  it('should search devices', fakeAsync(() => {
    component.deviceSearch = 'iOS Device';
    component.searchDevices();
    tick();
    expect(component.unregisteredDevices).toEqual([TEST_DEVICES[1]]);
  }));

  it('should handle previous and next user pages', fakeAsync(() => {
    expect(component.hasNext()).toBeTrue();
    expect(component.hasPrevious()).toBeFalse();

    component.next();
    tick();
    expect(component.inactiveUsers).toEqual([TEST_USERS[1]]);

    component.previous();
    tick();
    expect(component.inactiveUsers).toEqual([TEST_USERS[0]]);
  }));

  it('should handle previous and next device pages', fakeAsync(() => {
    expect(component.hasNextDevice()).toBeTrue();
    expect(component.hasPreviousDevice()).toBeFalse();

    component.nextDevice();
    tick();
    expect(component.unregisteredDevices).toEqual([TEST_DEVICES[1]]);

    component.previousDevice();
    tick();
    expect(component.unregisteredDevices).toEqual([TEST_DEVICES[0]]);
  }));

  it('should set icon classes correctly', () => {
    expect(component.iconClass(TEST_DEVICES[0])).toContain('desktop');
    expect(component.iconClass(TEST_DEVICES[2])).toContain('android');
    expect(component.iconClass(TEST_DEVICES[1])).toContain('apple');
    expect(
      component.iconClass({ ...TEST_DEVICES[1], userAgent: 'mobile' })
    ).toContain('mobile');
    expect(component.iconClass(null as any)).toEqual('');
  });
});
