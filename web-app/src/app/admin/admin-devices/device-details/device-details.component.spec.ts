import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { MatDialog as MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';

import { DeviceDetailsComponent } from './device-details.component';
import { AdminDeviceService } from '../../services/admin-device.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { Device } from '../../../entities/device/device';

describe('DeviceDetailsComponent', () => {
  let fixture: ComponentFixture<DeviceDetailsComponent>;
  let component: DeviceDetailsComponent;

  let route: any;
  let router: any;
  let dialog: any;
  let deviceService: any;
  let sessionService: any;

  const makeDevice = (overrides: Partial<Device> = {}) =>
    ({
      id: 'dev-1',
      uid: 'UID-123',
      description: 'Test device',
      userAgent: 'Mozilla/5.0',
      appVersion: 'Native',
      registered: false,
      user: {
        id: 'user-1',
        displayName: 'Lily Hoshikawa'
      },
      ...overrides
    } as any as Device);

  beforeEach(async () => {
    route = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('dev-1')
        }
      }
    };

    router = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true))
    };

    dialog = {
      open: jasmine.createSpy('open')
    };

    deviceService = {
      getDeviceById: jasmine.createSpy('getDeviceById'),
      updateDevice: jasmine.createSpy('updateDevice'),
      deleteDevice: jasmine.createSpy('deleteDevice')
    };

    sessionService = {
      hasPermission: jasmine.createSpy('hasPermission').and.returnValue(false)
    };

    await TestBed.configureTestingModule({
      declarations: [DeviceDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: dialog },
        { provide: AdminDeviceService, useValue: deviceService },
        { provide: SessionService, useValue: sessionService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('sets error and returns if deviceId is missing', () => {
      route.snapshot.paramMap.get.and.returnValue(null);

      component.ngOnInit();

      expect(component.error).toBe('Missing deviceId route param');
      expect(deviceService.getDeviceById).not.toHaveBeenCalled();
      expect(component.device).toBeNull();
    });

    it('sets permissions from adminUserService', fakeAsync(() => {
      sessionService.hasPermission.and.callFake((perm: string) => perm === 'UPDATE_DEVICE');

      deviceService.getDeviceById.and.returnValue(of(makeDevice()));

      component.ngOnInit();
      tick();

      expect(sessionService.hasPermission).toHaveBeenCalledWith('UPDATE_DEVICE');
      expect(sessionService.hasPermission).toHaveBeenCalledWith('DELETE_DEVICE');
      expect(component.hasUpdatePermission).toBeTrue();
      expect(component.hasDeletePermission).toBeFalse();
    }));

    it('loads device and updates breadcrumbs', fakeAsync(() => {
      const d = makeDevice({
        uid: 'UID-999',
        description: 'Hello',
        user: { id: 'u2', displayName: 'Kikunojo' } as any
      });

      deviceService.getDeviceById.and.returnValue(of(d));

      component.ngOnInit();
      tick();

      expect(component.device).toEqual(d);
      expect(component.currentUserDisplayName).toBe('Kikunojo');

      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[0].title).toBe('Devices');
      expect(component.breadcrumbs[1].title).toBe('UID-999');
    }));

    it('sets error when device load fails', fakeAsync(() => {
      deviceService.getDeviceById.and.returnValue(throwError(() => new Error('nope')));

      component.ngOnInit();
      tick();

      expect(component.error).toBe('Failed to load device');
      expect(component.device).toBeNull();
    }));
  });

  describe('editDeviceDetails', () => {
    it('does nothing without device', () => {
      component.device = null;
      component.editDeviceDetails();
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('opens the create/edit device dialog with the current device', () => {
      const d = makeDevice({ id: 'dev-1' });
      component.device = d;

      dialog.open.and.returnValue({
        afterClosed: () => of(undefined)
      });

      component.editDeviceDetails();

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: { device: d } })
      );
    });

    it('applies the updated device when the dialog closes with a result', () => {
      const d = makeDevice({ id: 'dev-1' });
      const updated = makeDevice({
        id: 'dev-1',
        uid: 'UID-NEW',
        user: { id: 'u2', displayName: 'Kikunojo' } as any
      });

      component.device = d;

      dialog.open.and.returnValue({
        afterClosed: () => of(updated)
      });

      component.editDeviceDetails();

      expect(component.device).toEqual(updated);
      expect(component.currentUserDisplayName).toBe('Kikunojo');
    });

    it('leaves the device unchanged when the dialog closes without a result', () => {
      const d = makeDevice({ id: 'dev-1' });
      component.device = d;

      dialog.open.and.returnValue({
        afterClosed: () => of(undefined)
      });

      component.editDeviceDetails();

      expect(component.device).toBe(d);
    });
  });

  describe('register / unregister', () => {
    it('registerDevice', () => {
      const d = makeDevice({ id: 'dev-1', registered: false });
      deviceService.updateDevice.and.returnValue(of({}));

      component.registerDevice(d);

      expect(deviceService.updateDevice).toHaveBeenCalledWith('dev-1', { registered: true });
    });

    it('unregisterDevice', () => {
      const d = makeDevice({ id: 'dev-1', registered: true });
      deviceService.updateDevice.and.returnValue(of({}));

      component.unregisterDevice(d);

      expect(deviceService.updateDevice).toHaveBeenCalledWith('dev-1', { registered: false });
    });

    it('registerDevice returns early without id', () => {
      const d = makeDevice({ id: undefined as any });
      component.registerDevice(d);
      expect(deviceService.updateDevice).not.toHaveBeenCalled();
    });

    it('unregisterDevice returns early without id', () => {
      const d = makeDevice({ id: undefined as any });
      component.unregisterDevice(d);
      expect(deviceService.updateDevice).not.toHaveBeenCalled();
    });
  });

  describe('delete flow', () => {
    it('does nothing without device', () => {
      component.device = null;
      component.confirmDeleteDevice();
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('deletes on confirm', fakeAsync(() => {
      const d = makeDevice({ id: 'dev-1' });
      component.device = d;

      dialog.open.and.returnValue({
        afterClosed: () => of({ confirmed: true })
      });

      deviceService.deleteDevice.and.returnValue(of({}));

      component.confirmDeleteDevice();
      tick();

      expect(deviceService.deleteDevice).toHaveBeenCalledWith('dev-1');
      expect(router.navigate).toHaveBeenCalledWith(['/admin/devices']);
    }));

    it('does not delete when not confirmed', fakeAsync(() => {
      component.device = makeDevice({ id: 'dev-1' });

      dialog.open.and.returnValue({
        afterClosed: () => of({ confirmed: false })
      });

      component.confirmDeleteDevice();
      tick();

      expect(deviceService.deleteDevice).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('sets error when delete fails', fakeAsync(() => {
      component.device = makeDevice({ id: 'dev-1' });

      dialog.open.and.returnValue({
        afterClosed: () => of({ confirmed: true })
      });

      deviceService.deleteDevice.and.returnValue(throwError(() => new Error('nope')));

      component.confirmDeleteDevice();
      tick();

      expect(component.error).toBe('Failed to delete device');
      expect(router.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('iconClass', () => {
    it('generic icon for null', () => {
      expect(component.iconClass(null as any)).toBe('smartphone');
    });

    it('desktop icon for web client', () => {
      expect(component.iconClass(makeDevice({ appVersion: 'Web Client' }) as any)).toBe(
        'computer'
      );
    });

    it('android icon', () => {
      expect(component.iconClass(makeDevice({ userAgent: 'ANDROID' }) as any)).toBe(
        'android'
      );
    });

    it('apple icon', () => {
      expect(component.iconClass(makeDevice({ userAgent: 'iOS' }) as any)).toBe(
        'ios'
      );
    });

    it('generic mobile icon otherwise', () => {
      expect(component.iconClass(makeDevice({ userAgent: 'windows phone' }) as any)).toBe(
        'smartphone'
      );
    });
  });
});
