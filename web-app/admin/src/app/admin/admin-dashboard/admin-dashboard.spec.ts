import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from "@angular/core/testing";
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AdminDashboardComponent } from "./admin-dashboard";
import { EventEmitter } from "@angular/core";
import {
  UserService,
  DeviceService,
  DevicePagingService,
  EventService,
  LayerService,
  UserPagingService,
} from "admin/src/app/upgrade/ajs-upgraded-providers";
import { User } from "core-lib-src/user";
import { Device } from "admin/src/@types/dashboard/admin-dashboard";
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
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
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StateService } from "@uirouter/angular";

const TEST_USERS: User[] = [
  {
    id: "1",
    username: "ranma77",
    displayName: "Ranma Saotome",
    active: true,
    enabled: true,
    authentication: "LOCAL",
    createdAt: new Date().toDateString(),
    lastUpdated: new Date().toDateString(),
    recentEventIds: [],
    role: "martial artist",
    email: "ranma@example.com",
    phones: [],
  },
  {
    id: "2",
    username: "yusuke23",
    displayName: "Yusuke Urameshi",
    active: true,
    enabled: true,
    authentication: "LOCAL",
    createdAt: new Date().toDateString(),
    lastUpdated: new Date().toDateString(),
    recentEventIds: [],
    role: "spirit detective",
    email: "yusuke@example.com",
    phones: [],
  },
  {
    id: "3",
    username: "goku_saiyan",
    displayName: "Goku",
    active: true,
    enabled: true,
    authentication: "LOCAL",
    createdAt: new Date().toDateString(),
    lastUpdated: new Date().toDateString(),
    recentEventIds: [],
    role: "saiyan warrior",
    email: "goku@example.com",
    phones: [],
  },
];

const TEST_DEVICES: Device[] = [
  {
    id: "d1",
    uid: "Ranma's Phone",
    registered: true,
    appVersion: "Web Client",
    userAgent: "",
    userId: "1",
    iconClass: "",
  },
  {
    id: "d2",
    uid: "Yusuke's Spirit Detector Device",
    registered: true,
    appVersion: "mobile",
    userAgent: "iOS",
    userId: "2",
    iconClass: "",
  },
  {
    id: "d3",
    uid: "Goku's Dragon Radar",
    registered: false,
    appVersion: "mobile",
    userAgent: "android",
    userId: "3",
    iconClass: "",
  },
];

const mockState = {
  go: jasmine.createSpy('go'),
};

const mockInjector = {
  get: (token: string) => {
    if (token === '$state') {
      return mockState;
    }
    return null;
  },
};


const mockUserService = {
  myself: { role: { permissions: ["test.permission"] } },
  updateUser: jasmine.createSpy("updateUser"),
};

const mockDeviceService = {
  updateDevice: jasmine
    .createSpy("updateDevice")
    .and.returnValue(Promise.resolve(TEST_DEVICES[0])),
};

const mockUserPagingService = {
  constructDefault: () => ({}),
  refresh: jasmine.createSpy("refresh").and.returnValue(Promise.resolve()),
  users: jasmine.createSpy("users").and.callFake((state) => TEST_USERS),
  count: jasmine.createSpy("count").and.returnValue(TEST_USERS.length),
  hasNext: jasmine.createSpy("hasNext").and.returnValue(true),
  hasPrevious: jasmine.createSpy("hasPrevious").and.returnValue(false),
  next: jasmine
    .createSpy("next")
    .and.returnValue(Promise.resolve([TEST_USERS[1]])),
  previous: jasmine
    .createSpy("previous")
    .and.returnValue(Promise.resolve([TEST_USERS[0]])),
  search: jasmine.createSpy("search").and.callFake((state, term) => {
    return Promise.resolve(
      TEST_USERS.filter((u) =>
        u.displayName.toLowerCase().includes(term.toLowerCase()),
      ),
    );
  }),
};

const mockDevicePagingService = {
  constructDefault: () => ({}),
  refresh: jasmine.createSpy("refresh").and.returnValue(Promise.resolve()),
  devices: jasmine.createSpy("devices").and.returnValue(TEST_DEVICES),
  count: jasmine.createSpy("count").and.returnValue(TEST_DEVICES.length),
  hasNext: jasmine.createSpy("hasNext").and.returnValue(true),
  hasPrevious: jasmine.createSpy("hasPrevious").and.returnValue(false),
  next: jasmine
    .createSpy("next")
    .and.returnValue(Promise.resolve([TEST_DEVICES[1]])),
  previous: jasmine
    .createSpy("previous")
    .and.returnValue(Promise.resolve([TEST_DEVICES[0]])),
  search: jasmine.createSpy("search").and.callFake((state, term) => {
    return Promise.resolve(
      TEST_DEVICES.filter((d) =>
        d.uid.toString().toLowerCase().includes(term.toLowerCase()),
      ),
    );
  }),
};

const mockEventService = {};
const mockLayerService = {};

describe("AdminDashboardComponent", () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminDashboardComponent],
      imports: [
        CommonModule,
        FormsModule,
        MatToolbarModule,
        MatIconModule,
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
        BrowserAnimationsModule],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: DevicePagingService, useValue: mockDevicePagingService },
        { provide: EventService, useValue: mockEventService },
        { provide: LayerService, useValue: mockLayerService },
        { provide: UserPagingService, useValue: mockUserPagingService },
        { provide: '$injector', useValue: mockInjector },
        { provide: StateService, useValue: mockState },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should call services in ngOnInit", fakeAsync(() => {
    tick();
    expect(mockUserPagingService.refresh).toHaveBeenCalled();
    expect(mockDevicePagingService.refresh).toHaveBeenCalled();
    expect(component.inactiveUsers.length).toBe(TEST_USERS.length);
    expect(component.unregisteredDevices.length).toBe(TEST_DEVICES.length);
  }));

  it("should navigate to user and device", () => {
    component.gotoUser(TEST_USERS[0]);
    expect(mockState.go).toHaveBeenCalledWith('admin.user', { userId: TEST_USERS[0].id });


    component.gotoDevice(TEST_DEVICES[0]);
    expect(mockState.go).toHaveBeenCalledWith('admin.device', { deviceId: TEST_DEVICES[0].id });

  });

  it("should activate user and emit event", fakeAsync(() => {
    const user = { ...TEST_USERS[0], active: false };
    component.onUserActivated = new EventEmitter();
    spyOn(component.onUserActivated, "emit");

    mockUserService.updateUser.and.callFake((id, user, cb) => cb());

    component.activateUser(new MouseEvent("click"), user);
    tick();

    expect(user.active).toBeTrue();
    expect(component.onUserActivated.emit).toHaveBeenCalledWith({ user });
  }));

  it("should register device and emit event", fakeAsync(() => {
    const device = { ...TEST_DEVICES[0], registered: false };
    component.onDeviceEnabled = new EventEmitter();
    spyOn(component.onDeviceEnabled, "emit");

    component.registerDevice(new MouseEvent("click"), device);
    tick();

    expect(device.registered).toBeTrue();
    expect(component.onDeviceEnabled.emit).toHaveBeenCalledWith({
      user: TEST_DEVICES[0],
    });
  }));

  it("should return true if user has permission", () => {
    expect(component.hasPermission("test.permission")).toBeTrue();
    expect(component.hasPermission("other.permission")).toBeFalse();
  });

  it("should search users", fakeAsync(() => {
    component.userSearch = "Ranma Saotome";
    component.search();
    tick();
    expect(component.inactiveUsers).toEqual([TEST_USERS[0]]);
  }));

  it("should search devices", fakeAsync(() => {
    component.deviceSearch = "Yusuke's Spirit Detector Device";
    component.searchDevices();
    tick();
    expect(component.unregisteredDevices).toEqual([TEST_DEVICES[1]]);
  }));

  it("should handle previous and next user pages", fakeAsync(() => {
    expect(component.hasNext()).toBeTrue();
    expect(component.hasPrevious()).toBeFalse();

    component.next();
    tick();
    expect(component.inactiveUsers).toEqual([TEST_USERS[1]]);

    component.previous();
    tick();
    expect(component.inactiveUsers).toEqual([TEST_USERS[0]]);
  }));

  it("should handle previous and next device pages", fakeAsync(() => {
    expect(component.hasNextDevice()).toBeTrue();
    expect(component.hasPreviousDevice()).toBeFalse();

    component.nextDevice();
    tick();
    expect(component.unregisteredDevices).toEqual([TEST_DEVICES[1]]);

    component.previousDevice();
    tick();
    expect(component.unregisteredDevices).toEqual([TEST_DEVICES[0]]);
  }));

  it("should set icon classes correctly", () => {
    expect(component.iconClass(TEST_DEVICES[0])).toContain(
      "desktop",
    );
    expect(component.iconClass(TEST_DEVICES[2])).toContain("android");
    expect(component.iconClass(TEST_DEVICES[1])).toContain("apple");
    expect(component.iconClass({ ...TEST_DEVICES[1], userAgent: "mobile" })).toContain("mobile");
    expect(component.iconClass(null)).toEqual("");
  });
});
