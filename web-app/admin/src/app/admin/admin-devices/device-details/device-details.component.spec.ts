import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';

import { DeviceDetailsComponent } from './device-details.component';
import { AdminDeviceService } from '../../services/admin-device.service';
import { AdminUserService } from '../../services/admin-user.service';
import { Device } from '../../../../@types/dashboard/devices-dashboard';

describe('DeviceDetailsComponent', () => {
  let fixture: ComponentFixture<DeviceDetailsComponent>;
  let component: DeviceDetailsComponent;

  let route: any;
  let router: any;
  let dialog: any;
  let deviceService: any;
  let adminUserService: any;

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

    adminUserService = {
      hasPermission: jasmine.createSpy('hasPermission').and.returnValue(false)
    };

    await TestBed.configureTestingModule({
      declarations: [DeviceDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: dialog },
        { provide: AdminDeviceService, useValue: deviceService },
        { provide: AdminUserService, useValue: adminUserService }
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
      adminUserService.hasPermission.and.callFake((perm: string) => perm === 'UPDATE_DEVICE');

      deviceService.getDeviceById.and.returnValue(of(makeDevice()));

      component.ngOnInit();
      tick();

      expect(adminUserService.hasPermission).toHaveBeenCalledWith('UPDATE_DEVICE');
      expect(adminUserService.hasPermission).toHaveBeenCalledWith('DELETE_DEVICE');
      expect(component.hasUpdatePermission).toBeTrue();
      expect(component.hasDeletePermission).toBeFalse();
    }));

    it('loads device and resets edit form', fakeAsync(() => {
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
      expect(component.deviceEditForm.uid).toBe('UID-999');
      expect(component.deviceEditForm.description).toBe('Hello');
      expect(component.deviceEditForm.userId).toBe('u2');
      expect(component.selectedUserDisplayName).toBeNull();

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

  describe('editing helpers', () => {
    beforeEach(() => {
      component.device = makeDevice();
      (component as any).resetEditForm();
    });

    it('toggleEditDetails enters edit mode', () => {
      component.toggleEditDetails();
      expect(component.editingDetails).toBeTrue();
    });

    it('toggleEditDetails exits edit mode (cancel)', () => {
      component.editingDetails = true;
      component.toggleEditDetails();
      expect(component.editingDetails).toBeFalse();
      expect(component.error).toBeNull();
    });

    it('onUserSelected sets user', () => {
      component.onUserSelected({ id: 'u9', displayName: 'Hana' } as any);
      expect(component.deviceEditForm.userId).toBe('u9');
      expect(component.selectedUserDisplayName).toBe('Hana');
    });

    it('onUserSelected clears user', () => {
      component.onUserSelected(null);
      expect(component.deviceEditForm.userId).toBeUndefined();
      expect(component.selectedUserDisplayName).toBeNull();
    });
  });

  describe('saveDeviceDetails', () => {
    it('returns early without device id', () => {
      component.device = makeDevice({ id: undefined as any });
      component.saveDeviceDetails();
      expect(deviceService.updateDevice).not.toHaveBeenCalled();
    });

    it('updates device successfully and reloads', fakeAsync(() => {
      const original = makeDevice({
        id: 'dev-1',
        uid: 'UID-123',
        description: 'Old',
        user: { id: 'u1', displayName: 'Lily Hoshikawa' } as any
      })
    
      const refreshed = makeDevice({
        id: 'dev-1',
        uid: 'UID-NEW',
        description: 'New',
        user: { id: 'u2', displayName: 'Kikunojo' } as any
      })
    
      component.device = original
      component.hasUpdatePermission = true
      component.editingDetails = true
    
      component.deviceEditForm.uid = 'UID-NEW'
      component.deviceEditForm.description = 'New'
      component.deviceEditForm.userId = 'u2'
    
      deviceService.updateDevice.and.returnValue(of({}).pipe(delay(0)))
      deviceService.getDeviceById.and.returnValue(of(refreshed))
    
      component.saveDeviceDetails()
    
      expect(component.saving).toBeTrue()
    
      tick(0)
    
      expect(deviceService.updateDevice).toHaveBeenCalledWith('dev-1', jasmine.any(Object))
      expect(component.editingDetails).toBeFalse()
      expect(component.saving).toBeFalse()
      expect(component.device?.uid).toBe('UID-NEW')
      expect(component.currentUserDisplayName).toBe('Kikunojo')
      expect(component.deviceEditForm.uid).toBe('UID-NEW')
      expect(component.deviceEditForm.description).toBe('New')
      expect(component.deviceEditForm.userId).toBe('u2')
      expect(component.selectedUserDisplayName).toBeNull()
    }))

    it('handles update error message and resets saving', fakeAsync(() => {
      component.device = makeDevice({ id: 'dev-1' });
      component.editingDetails = true;

      deviceService.updateDevice.and.returnValue(
        throwError(() => ({ error: { message: 'Bad stuff happened' } }))
      );

      component.saveDeviceDetails();
      tick();

      expect(component.error).toBe('Bad stuff happened');
      expect(component.saving).toBeFalse();
      expect(component.editingDetails).toBeTrue();
    }));

    it('handles update error default message', fakeAsync(() => {
      component.device = makeDevice({ id: 'dev-1' });

      deviceService.updateDevice.and.returnValue(throwError(() => ({})));

      component.saveDeviceDetails();
      tick();

      expect(component.error).toBe('Failed to update device');
      expect(component.saving).toBeFalse();
    }));
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
      expect(router.navigate).toHaveBeenCalledWith(
        ['/../../devices'],
        jasmine.any(Object)
      );
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
      expect(component.iconClass(null as any)).toBe('fa fa-mobile admin-generic-icon');
    });

    it('desktop icon for web client', () => {
      expect(component.iconClass(makeDevice({ appVersion: 'Web Client' }) as any)).toBe(
        'fa fa-desktop admin-desktop-icon'
      );
    });

    it('android icon', () => {
      expect(component.iconClass(makeDevice({ userAgent: 'ANDROID' }) as any)).toBe(
        'fa fa-android admin-android-icon'
      );
    });

    it('apple icon', () => {
      expect(component.iconClass(makeDevice({ userAgent: 'iOS' }) as any)).toBe(
        'fa fa-apple admin-apple-icon'
      );
    });

    it('generic mobile icon otherwise', () => {
      expect(component.iconClass(makeDevice({ userAgent: 'windows phone' }) as any)).toBe(
        'fa fa-mobile admin-generic-icon'
      );
    });
  });
});
