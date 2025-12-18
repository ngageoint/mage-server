import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, Subject } from 'rxjs';

import { StateService } from '@uirouter/angular';
import { MatDialog } from '@angular/material/dialog';
import { DeviceService, UserService } from '../../../upgrade/ajs-upgraded-providers';

import { DeviceDetailsComponent } from './device-details.component';

describe('DeviceDetailsComponent', () => {
  let fixture: ComponentFixture<DeviceDetailsComponent>;
  let component: DeviceDetailsComponent;

  let stateService: any;
  let dialog: any;
  let deviceService: any;
  let userService: any;

  const makeDevice = (overrides: any = {}) => ({
    id: 'dev-1',
    uid: 'UID-123',
    description: 'Test device',
    userAgent: 'Mozilla/5.0',
    appVersion: 'Native',
    registered: false,
    user: {
      id: 'user-1',
      displayName: 'Alice'
    },
    ...overrides
  });

  beforeEach(async () => {
    stateService = {
      params: { deviceId: 'dev-1' },
      go: jasmine.createSpy('go')
    };

    dialog = {
      open: jasmine.createSpy('open')
    };

    deviceService = {
      getDevice: jasmine.createSpy('getDevice'),
      updateDevice: jasmine.createSpy('updateDevice'),
      deleteDevice: jasmine.createSpy('deleteDevice')
    };

    userService = {
      myself: {
        role: { permissions: [] as string[] }
      }
    };

    await TestBed.configureTestingModule({
      declarations: [DeviceDetailsComponent],
      providers: [
        { provide: StateService, useValue: stateService },
        { provide: MatDialog, useValue: dialog },
        { provide: DeviceService, useValue: deviceService },
        { provide: UserService, useValue: userService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceDetailsComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('does nothing if deviceId is missing', fakeAsync(() => {
      stateService.params.deviceId = undefined;
      deviceService.getDevice.and.returnValue(Promise.resolve(makeDevice()));

      component.ngOnInit();
      tick();

      expect(deviceService.getDevice).not.toHaveBeenCalled();
      expect(component.device).toBeNull();
    }));

    it('sets permissions from user role', fakeAsync(() => {
      userService.myself.role.permissions = ['UPDATE_DEVICE'];
      deviceService.getDevice.and.returnValue(Promise.resolve(makeDevice()));

      component.ngOnInit();
      tick();

      expect(component.hasUpdatePermission).toBeTrue();
      expect(component.hasDeletePermission).toBeFalse();
    }));

    it('loads device and resets edit form', fakeAsync(() => {
      const d = makeDevice({
        uid: 'UID-999',
        description: 'Hello',
        user: { id: 'u2', displayName: 'Bea' }
      });
      deviceService.getDevice.and.returnValue(Promise.resolve(d));

      component.ngOnInit();
      tick();

      expect(component.device).toEqual(d);
      expect(component.currentUserDisplayName).toBe('Bea');
      expect(component.deviceEditForm.uid).toBe('UID-999');
      expect(component.deviceEditForm.description).toBe('Hello');
      expect(component.deviceEditForm.userId).toBe('u2');
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

    it('toggleEditDetails exits edit mode', () => {
      component.editingDetails = true;
      component.toggleEditDetails();
      expect(component.editingDetails).toBeFalse();
    });

    it('onUserSelected sets user', () => {
      component.onUserSelected({ id: 'u9', displayName: 'Zoe' } as any);
      expect(component.deviceEditForm.userId).toBe('u9');
      expect(component.selectedUserDisplayName).toBe('Zoe');
    });

    it('onUserSelected clears user', () => {
      component.onUserSelected(null);
      expect(component.deviceEditForm.userId).toBeUndefined();
      expect(component.selectedUserDisplayName).toBeNull();
    });
  });

  describe('saveDeviceDetails', () => {
    it('returns early without device id', () => {
      component.device = { ...makeDevice(), id: undefined } as any;
      component.saveDeviceDetails();
      expect(deviceService.updateDevice).not.toHaveBeenCalled();
    });

    it('updates device successfully', fakeAsync(() => {
      const original = makeDevice({ id: 'dev-1', uid: 'UID-123', description: 'Old', user: { id: 'u1', displayName: 'Alice' } });
      const refreshed = makeDevice({ id: 'dev-1', uid: 'UID-NEW', description: 'New', user: { id: 'u2', displayName: 'Bea' } });

      (original as any).name = 'Device Name';
      (refreshed as any).name = 'Device Name';

      component.device = original;
      component.editingDetails = true;
      component.deviceEditForm.uid = 'UID-NEW';
      component.deviceEditForm.description = 'New';
      component.deviceEditForm.userId = 'u2';

      deviceService.updateDevice.and.returnValue(Promise.resolve(true));
      deviceService.getDevice.and.returnValue(Promise.resolve(refreshed));

      component.saveDeviceDetails();
      expect(component.saving).toBeTrue();

      tick();
      tick();

      expect(component.editingDetails).toBeFalse();
      expect(component.saving).toBeFalse();
      expect(component.device?.uid).toBe('UID-NEW');
      expect(component.currentUserDisplayName).toBe('Bea');
      expect(component.deviceEditForm.uid).toBe('UID-NEW');
      expect(component.deviceEditForm.description).toBe('New');
      expect(component.deviceEditForm.userId).toBe('u2');
      expect(component.selectedUserDisplayName).toBeNull();
    }));

    it('handles update error (responseText)', fakeAsync(() => {
      const d = makeDevice({ id: 'dev-1' });
      (d as any).name = 'Device Name';
      component.device = d;
      component.editingDetails = true;

      deviceService.updateDevice.and.returnValue(Promise.reject({ responseText: 'Bad stuff happened' }));

      component.saveDeviceDetails();
      tick();

      expect(component.error).toBe('Bad stuff happened');
      expect(component.saving).toBeFalse();
      expect(component.editingDetails).toBeTrue();
    }));

    it('handles update error (data) and default message', fakeAsync(() => {
      const d = makeDevice({ id: 'dev-1' });
      (d as any).name = 'Device Name';
      component.device = d;

      deviceService.updateDevice.and.returnValue(Promise.reject({ data: 'Nope' }));
      component.saveDeviceDetails();
      tick();
      expect(component.error).toBe('Nope');

      deviceService.updateDevice.and.returnValue(Promise.reject({}));
      component.saveDeviceDetails();
      tick();
      expect(component.error).toBe('Failed to update device');
    }));
  });

  describe('register / unregister', () => {
    it('registerDevice', () => {
      const d = makeDevice({ registered: false });
      component.registerDevice(d as any);
      expect(d.registered).toBeTrue();
      expect(deviceService.updateDevice).toHaveBeenCalledWith(d);
    });

    it('unregisterDevice', () => {
      const d = makeDevice({ registered: true });
      component.unregisterDevice(d as any);
      expect(d.registered).toBeFalse();
      expect(deviceService.updateDevice).toHaveBeenCalledWith(d);
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

      const subject = new Subject<any>();
      dialog.open.and.returnValue({
        afterClosed: () => subject.asObservable()
      });

      deviceService.deleteDevice.and.returnValue(Promise.resolve(true));

      component.confirmDeleteDevice();
      subject.next({ confirmed: true });
      subject.complete();

      tick();

      expect(deviceService.deleteDevice).toHaveBeenCalledWith(d);
      expect(stateService.go).toHaveBeenCalledWith('admin.devices');
    }));

    it('does not delete when not confirmed', fakeAsync(() => {
      component.device = makeDevice();

      dialog.open.and.returnValue({
        afterClosed: () => of({ confirmed: false })
      });

      component.confirmDeleteDevice();
      tick();

      expect(deviceService.deleteDevice).not.toHaveBeenCalled();
      expect(stateService.go).not.toHaveBeenCalled();
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
