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
import { RouterTestingModule } from '@angular/router/testing';

import { DeviceDashboardComponent } from './devices-dashboard.component';
import {
  DevicesResponse,
  AdminDeviceService
} from '../../services/admin-device.service';
import { AdminUserService } from '../../services/admin-user.service';
import { Device } from '../../../../@types/dashboard/devices-dashboard';
import { AdminToastService } from '../../services/admin-toast.service';

const mockDevices: Device[] = [
  {
    id: '1',
    uid: 'uidA',
    userAgent: 'UA_A',
    description: 'A Device',
    user: {
      displayName: 'Lily Hoshikawa',
      id: 'u1'
    }
  } as Device,
  {
    id: '2',
    uid: 'uidB',
    userAgent: 'UA_B',
    description: 'B Device',
    user: {
      displayName: 'Kikunojo',
      id: 'u2'
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
  let deviceServiceSpy: jasmine.SpyObj<AdminDeviceService>;
  let userServiceSpy: Partial<AdminUserService> & any;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let toastSpy: jasmine.SpyObj<AdminToastService>;

  beforeEach(async () => {
    deviceServiceSpy = jasmine.createSpyObj('AdminDeviceService', [
      'getDevices'
    ]);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    toastSpy = jasmine.createSpyObj('AdminToastService', ['show']);

    userServiceSpy = {
      myself$: of({ role: { permissions: ['CREATE_DEVICE'] } })
    };

    await TestBed.configureTestingModule({
      declarations: [DeviceDashboardComponent],
      imports: [
        RouterTestingModule.withRoutes([]),
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
        { provide: AdminDeviceService, useValue: deviceServiceSpy },
        { provide: AdminUserService, useValue: userServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: AdminToastService, useValue: toastSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize permissions properly', fakeAsync(() => {
    deviceServiceSpy.getDevices.and.returnValue(of(mockDevicesResponse));

    fixture.detectChanges();
    tick();

    expect(component.hasDeviceCreatePermission).toBeTrue();
  }));

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

    component.onSearchTermChanged('lily');
    tick();

    expect(component.searchOptions.term).toBe('lily');
    expect(deviceServiceSpy.getDevices).toHaveBeenCalledWith(
      component.searchOptions
    );
    expect(component.filteredDevices.length).toBe(1);

    const [first] = component.filteredDevices;
    expect(first.user?.displayName || '').toBe('Lily Hoshikawa');
  }));

  it('should clear search and refresh devices', fakeAsync(() => {
    deviceServiceSpy.getDevices.and.returnValue(of(mockDevicesResponse));

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

  it('should update status filter and refresh devices', fakeAsync(() => {
    deviceServiceSpy.getDevices.and.returnValue(of(mockDevicesResponse));

    component.onStatusFilterChange('registered');
    tick();

    expect(component.searchOptions.state).toBe('registered');
    expect(component.searchOptions.page).toBe(0);
    expect(deviceServiceSpy.getDevices).toHaveBeenCalled();
  }));

  it('should properly update layout values on window resize', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1000);

    component.onResize();

    expect(component.numChars).toBe(Math.ceil(1000 / 8.5));
    expect(component.toolTipWidth).toBe(`${1000 * 0.75}px`);
  });

  it('should open create device modal and refresh on close', fakeAsync(() => {
    const dialogRefMock = {
      afterClosed: () => of({ id: '3' } as any)
    };

    dialogSpy.open.and.returnValue(dialogRefMock as any);
    deviceServiceSpy.getDevices.and.returnValue(of(mockDevicesResponse));

    component.createDevice();
    tick();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(toastSpy.show).toHaveBeenCalled();
    expect(deviceServiceSpy.getDevices).toHaveBeenCalled();
  }));
});
