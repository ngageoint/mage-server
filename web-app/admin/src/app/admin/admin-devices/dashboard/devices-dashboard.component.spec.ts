import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DeviceDashboardComponent } from './devices-dashboard.component';
import { DevicesResponse, DevicesService } from '../devices.service';
import { StateService } from '@uirouter/angular';
import {
  LocalStorageService,
  UserService
} from 'admin/src/app/upgrade/ajs-upgraded-providers';
import { Device } from 'admin/src/@types/dashboard/devices-dashboard';

const mockDevices: Device[] = [
  {
    id: '1',
    uid: 'uidA',
    userAgent: 'UA_A',
    description: 'A Device',
    user: {
      displayName: 'Device A User',
      id: ''
    }
  } as Device,
  {
    id: '2',
    uid: 'uidB',
    userAgent: 'UA_B',
    description: 'B Device',
    user: {
      displayName: 'Device B User',
      id: ''
    }
  } as Device
];

const mockDevicesResponse: DevicesResponse = {
  totalCount: 2,
  items: {
    devices: mockDevices
  }
};

describe('DeviceDashboardComponent', () => {
  let component: DeviceDashboardComponent;
  let fixture: ComponentFixture<DeviceDashboardComponent>;
  let deviceServiceSpy: jasmine.SpyObj<DevicesService>;
  let userServiceSpy: any;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let stateSpy: jasmine.SpyObj<StateService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;

  beforeEach(async () => {
    deviceServiceSpy = jasmine.createSpyObj('DevicesService', ['getDevices']);
    userServiceSpy = { myself: { role: { permissions: ['CREATE_USER'] } } };
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    stateSpy = jasmine.createSpyObj('StateService', ['go']);
    localStorageSpy = jasmine.createSpyObj('LocalStorageService', ['getToken']);
    localStorageSpy.getToken.and.returnValue('mockToken');

    await TestBed.configureTestingModule({
      declarations: [DeviceDashboardComponent],
      imports: [
        MatDialogModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatSelectModule,
        MatOptionModule,
        MatTableModule,
        MatTooltipModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: DevicesService, useValue: deviceServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: StateService, useValue: stateSpy },
        { provide: LocalStorageService, useValue: localStorageSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize permissions properly', () => {
    component['initPermissions']();
    expect(component.hasDeviceCreatePermission).toBeTrue();
  });

  it('should fetch devices and apply filters', fakeAsync(() => {
    deviceServiceSpy.getDevices.and.returnValue(of(mockDevicesResponse));

    component.refreshDevices();
    tick();

    expect(deviceServiceSpy.getDevices).toHaveBeenCalledWith(
      component.searchOptions
    );

    expect(component.filteredDevices.length).toBe(2);
    expect(component.totalDevices).toBe(2);
  }));

  it('should trigger server-side search when search term changes', fakeAsync(() => {
    const filteredResponse: DevicesResponse = {
      totalCount: 1,
      items: {
        devices: [mockDevices[0]]
      }
    };

    deviceServiceSpy.getDevices.and.returnValue(of(filteredResponse));

    component.onSearchTermChanged('device a user');
    tick();

    expect(component.searchOptions.term).toBe('device a user');
    expect(deviceServiceSpy.getDevices).toHaveBeenCalledWith(
      component.searchOptions
    );
    expect(component.filteredDevices.length).toBe(1);
    expect(component.filteredDevices[0].user.displayName).toBe('Device A User');
  }));

  it('should clear search and refresh devices', fakeAsync(() => {
    deviceServiceSpy.getDevices.and.returnValue(of(mockDevicesResponse));

    // simulate a prior search
    component.searchOptions.term = 'something';
    component.deviceSearch = 'something';

    component.onSearchCleared();
    tick();

    expect(component.deviceSearch).toBe('');
    expect(component.searchOptions.term).toBeUndefined();
    expect(deviceServiceSpy.getDevices).toHaveBeenCalled();
  }));

  it('should handle page change', fakeAsync(() => {
    const pageEvent: PageEvent = { length: 20, pageIndex: 1, pageSize: 25 };

    deviceServiceSpy.getDevices.and.returnValue(of(mockDevicesResponse));

    component.onPageChange(pageEvent);
    tick();

    expect(component.searchOptions.page).toBe(1);
    expect(component.searchOptions.page_size).toBe(25);
    expect(deviceServiceSpy.getDevices).toHaveBeenCalled();
  }));

  it('should navigate to device on click', () => {
    const device = { id: "123" } as Device;
    component.gotoDevice(device);

    expect(stateSpy.go).toHaveBeenCalledWith('admin.device', {
      deviceId: "123"
    });
  });

  it('should update status filter and refresh devices', fakeAsync(() => {
    deviceServiceSpy.getDevices.and.returnValue(of(mockDevicesResponse));

    component.onStatusFilterChange('registered');
    tick();

    expect(component.searchOptions.state).toBe('registered');
    expect(deviceServiceSpy.getDevices).toHaveBeenCalled();
  }));

  it('should properly update layout values on window resize', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1000);

    component.onResize();

    expect(component.numChars).toBe(Math.ceil(1000 / 8.5));
    expect(component.toolTipWidth).toBe(1000 * 0.75 + 'px');
  });

  it('should open create device modal and refresh on close', fakeAsync(() => {
    const dialogRefMock = {
      afterClosed: () => of(true)
    };

    dialogSpy.open.and.returnValue(dialogRefMock as any);
    deviceServiceSpy.getDevices.and.returnValue(of(mockDevicesResponse));

    component.createDevice();
    tick();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(deviceServiceSpy.getDevices).toHaveBeenCalled();
  }));
});
