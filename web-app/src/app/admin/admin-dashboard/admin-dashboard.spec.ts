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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';

import { RouterTestingModule } from '@angular/router/testing';
import { UserService } from '../../user/user.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { AdminDeviceService } from '../services/admin-device.service';
import { UserPagingService } from '../services/user-paging.service';

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
  },
  {
    id: '4',
    username: 'sakura_',
    displayName: 'Sakura',
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
    email: 'sakura@example.com',
    phones: []
  },
  {
    id: '5',
    username: 'yuki_',
    displayName: 'Yuki',
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
    email: 'yuki@example.com',
    phones: []
  },
  {
    id: '6',
    username: 'momo_',
    displayName: 'Momo',
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
    email: 'momo@example.com',
    phones: []
  }
];

const TEST_DEVICES: any[] = [
  {
    id: 'd1',
    uid: 'Primary Desktop',
    registered: false,
    appVersion: 'Web Client',
    userAgent: '',
    iconClass: ''
  },
  {
    id: 'd2',
    uid: 'iOS Device',
    registered: false,
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
  },
  {
    id: 'd4',
    uid: 'Tablet Device',
    registered: false,
    appVersion: 'mobile',
    userAgent: 'tablet',
    iconClass: ''
  },
  {
    id: 'd5',
    uid: 'Backup Phone',
    registered: false,
    appVersion: 'mobile',
    userAgent: 'mobile',
    iconClass: ''
  },
  {
    id: 'd6',
    uid: 'Field Laptop',
    registered: false,
    appVersion: 'Web Client',
    userAgent: '',
    iconClass: ''
  }
];

const mockUserService: Partial<UserService> & any = {
  updateUser: jasmine.createSpy('updateUser')
};

const mockSessionService: Partial<SessionService> & any = {
  hasPermission: jasmine.createSpy('hasPermission').and.callFake(
    (permission: string) => permission === 'test.permission'
  )
};

const mockDeviceService: Partial<AdminDeviceService> & any = {
  updateDevice: jasmine
    .createSpy('updateDevice')
    .and.callFake((_id: string, patch: any) => {
      const updated = { ...TEST_DEVICES[0], ...patch };
      return of(updated);
    }),
  getDashboardDevicePage: jasmine
    .createSpy('getDashboardDevicePage')
    .and.callFake((options: any) => {
      const start = options?.start || 0;
      const limit = options?.limit || 5;
      const term = (options?.term || '').toLowerCase();

      const filteredDevices = TEST_DEVICES.filter((device) => {
        if (options?.registered !== undefined) {
          if (device.registered !== options.registered) {
            return false;
          }
        }

        if (!term) {
          return true;
        }

        return (device.uid || '').toLowerCase().includes(term);
      });

      const devices = filteredDevices.slice(start, start + limit);
      const nextStart =
        start + limit < filteredDevices.length ? start + limit : null;
      const prevStart = start - limit >= 0 ? Math.max(start - limit, 0) : null;

      return of({
        start,
        nextStart,
        prevStart,
        totalCount: filteredDevices.length,
        devices
      });
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
  search: jasmine
    .createSpy('search')
    .and.callFake((_state: any, term: string) => {
      return of(
        TEST_USERS.filter((user) =>
          (user.displayName || '')
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
        { provide: UserService, useValue: mockUserService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: AdminDeviceService, useValue: mockDeviceService },
        { provide: UserPagingService, useValue: mockUserPagingService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    (mockUserPagingService.constructDefault as jasmine.Spy).calls.reset();
    (mockUserPagingService.refresh as jasmine.Spy).calls.reset();
    (mockUserPagingService.search as jasmine.Spy).calls.reset();
    (mockUserService.updateUser as jasmine.Spy).calls.reset();
    (mockDeviceService.updateDevice as jasmine.Spy).calls.reset();
    (mockDeviceService.getDashboardDevicePage as jasmine.Spy).calls.reset();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize paging data and populate dashboard lists', fakeAsync(() => {
    tick();

    expect(mockUserPagingService.constructDefault).toHaveBeenCalled();
    expect(mockUserPagingService.refresh).toHaveBeenCalled();
    expect(mockDeviceService.getDashboardDevicePage).toHaveBeenCalled();

    expect(component.inactiveUsers).toEqual(TEST_USERS.slice(0, 5));
    expect(component.unregisteredDevices).toEqual(TEST_DEVICES.slice(0, 5));
    expect(component.deviceTotalCount).toBe(TEST_DEVICES.length);
  }));

  it('should activate user and emit event', fakeAsync(() => {
    const user = { ...TEST_USERS[0], active: false };
    component.onUserActivated = new EventEmitter();
    spyOn(component.onUserActivated, 'emit');

    (mockUserService.updateUser as jasmine.Spy).and.callFake(
      (_id: string, updatedUser: any) => of(updatedUser)
    );

    component.activateUser(user);
    tick();

    expect(mockUserService.updateUser).toHaveBeenCalledWith(user.id, user);
    expect(user.active).toBeTrue();
    expect(component.onUserActivated.emit).toHaveBeenCalledWith({ user });
  }));

  it('should register device and emit event', fakeAsync(() => {
    const device = { ...TEST_DEVICES[0], registered: false };
    component.onDeviceEnabled = new EventEmitter();
    spyOn(component.onDeviceEnabled, 'emit');

    const event = new MouseEvent('click');
    spyOn(event, 'preventDefault');
    spyOn(event, 'stopPropagation');

    component.registerDevice(event, device);
    tick();

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
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

    expect(mockUserPagingService.search).toHaveBeenCalledWith(
      userStateAndData.inactive,
      'Lily Hoshikawa'
    );
    expect(component.inactiveUsers).toEqual([TEST_USERS[0]]);
  }));

  it('should search devices', fakeAsync(() => {
    component.deviceSearch = 'iOS Device';

    component.searchDevices();
    tick();

    expect(mockDeviceService.getDashboardDevicePage).toHaveBeenCalledWith({
      start: 0,
      limit: component.devicePageSize,
      registered: false,
      user: true,
      includePagination: true,
      term: 'iOS Device'
    });
    expect(component.unregisteredDevices).toEqual([TEST_DEVICES[1]]);
    expect(component.deviceTotalCount).toBe(1);
  }));

  it('should handle previous and next user pages', fakeAsync(() => {
    tick();

    expect(component.hasNext()).toBeTrue();
    expect(component.hasPrevious()).toBeFalse();

    component.next();
    tick();

    expect(component.userPageIndex).toBe(1);
    expect(component.inactiveUsers).toEqual([TEST_USERS[5]]);
    expect(component.hasNext()).toBeFalse();
    expect(component.hasPrevious()).toBeTrue();

    component.previous();
    tick();

    expect(component.userPageIndex).toBe(0);
    expect(component.inactiveUsers).toEqual(TEST_USERS.slice(0, 5));
  }));

  it('should handle previous and next device pages', fakeAsync(() => {
    tick();

    expect(component.hasNextDevice()).toBeTrue();
    expect(component.hasPreviousDevice()).toBeFalse();

    component.nextDevice();
    tick();

    expect(component.deviceStart).toBe(5);
    expect(component.unregisteredDevices).toEqual([TEST_DEVICES[5]]);
    expect(component.hasNextDevice()).toBeFalse();
    expect(component.hasPreviousDevice()).toBeTrue();

    component.previousDevice();
    tick();

    expect(component.deviceStart).toBe(0);
    expect(component.unregisteredDevices).toEqual(TEST_DEVICES.slice(0, 5));
  }));

  it('should not navigate to a user without an id', () => {
    const router = TestBed.inject(RouterTestingModule as any);

    component.goToUser(null as any);
    component.goToUser({});

    expect(router).toBeTruthy();
  });

  it('should set icon classes correctly', () => {
    expect(component.iconName(TEST_DEVICES[0])).toBe('computer');
    expect(component.iconName(TEST_DEVICES[2])).toBe('android');
    expect(component.iconName(TEST_DEVICES[1])).toBe('ios');
    expect(
      component.iconName({ ...TEST_DEVICES[1], userAgent: 'mobile' })
    ).toBe('smartphone');
    expect(component.iconName(null as any)).toEqual('smartphone');
  });
});
