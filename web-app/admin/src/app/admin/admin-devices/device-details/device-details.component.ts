import { Component, Inject, OnInit } from '@angular/core';
import { StateService } from '@uirouter/angular';
import { MatDialog } from '@angular/material/dialog';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import {
  DeviceService,
  UserService
} from '../../../upgrade/ajs-upgraded-providers';
import { DeleteDeviceComponent } from '../delete-device/delete-device.component';
import { Device } from 'admin/src/@types/dashboard/devices-dashboard';
import { User } from '../../admin-users/user';

@Component({
  selector: 'mage-device-details',
  templateUrl: './device-details.component.html',
  styleUrls: ['./device-details.component.scss']
})
export class DeviceDetailsComponent implements OnInit {
  device: Device | null = null;

  currentUserDisplayName: string | null = null;
  selectedUserDisplayName: string | null = null;

  hasUpdatePermission = false;
  hasDeletePermission = false;

  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Devices',
      iconClass: 'fa fa-mobile',
      state: { name: 'admin.devices' }
    }
  ];

  editingDetails = false;
  saving = false;
  error: string | null = null;

  deviceEditForm: {
    uid?: string;
    description?: string;
    userAgent?: string;
    userId?: string;
    userDisplayName?: string;
  } = {};

  constructor(
    public stateService: StateService,
    private dialog: MatDialog,
    @Inject(DeviceService) private deviceService: any,
    @Inject(UserService) private userService: any
  ) {}

  ngOnInit(): void {
    const deviceId = this.stateService.params.deviceId;
    if (!deviceId) return;

    this.hasUpdatePermission =
      this.userService.myself?.role?.permissions?.includes('UPDATE_DEVICE') ||
      false;

    this.hasDeletePermission =
      this.userService.myself?.role?.permissions?.includes('DELETE_DEVICE') ||
      false;

    this.deviceService.getDevice(deviceId).then((device: Device) => {
      this.device = device;
      this.breadcrumbs.push({ title: device?.uid || 'Device' });

      this.currentUserDisplayName = device?.user?.displayName || null;
      this.selectedUserDisplayName = null;

      this.resetEditForm();
    });
  }

  toggleEditDetails(): void {
    if (this.editingDetails) {
      this.cancelEditDetails();
    } else {
      this.editingDetails = true;
      this.resetEditForm();
    }
  }

  private resetEditForm(): void {
    if (!this.device) return;
    this.deviceEditForm = {
      uid: this.device.uid,
      description: this.device.description,
      userId: this.device.user?.id
    };

    this.currentUserDisplayName =
      this.device.user?.displayName || this.currentUserDisplayName;
    this.selectedUserDisplayName = null;
  }

  onUserSelected(user: User | null): void {
    this.deviceEditForm.userId = user ? user.id : undefined;
    this.selectedUserDisplayName = user ? user.displayName : null;
  }

  cancelEditDetails(): void {
    this.editingDetails = false;
    this.error = null;
    this.resetEditForm();
  }

  saveDeviceDetails(): void {
    if (!this.device?.id) return;

    this.saving = true;
    this.error = null;

    const payload: any = {
      uid: this.deviceEditForm.uid,
      name: (this.device as any).name,
      description: this.deviceEditForm.description,
      userId: this.deviceEditForm.userId || null
    };

    const updated: any = {
      ...this.device,
      uid: this.deviceEditForm.uid,
      description: this.deviceEditForm.description,
      userId: this.deviceEditForm.userId || null,
      name: (this.device as any).name
    };

    this.deviceService.updateDevice(updated).then(
      () => {
        this.editingDetails = false;
        this.saving = false;

        this.deviceService.getDevice(this.device!.id).then((d: Device) => {
          this.device = d;
          this.currentUserDisplayName = d?.user?.displayName || null;
          this.resetEditForm();
        });
      },
      (err: any) => {
        this.error =
          err?.responseText || err?.data || 'Failed to update device';
        this.saving = false;
      }
    );
  }

  registerDevice(device: Device): void {
    device.registered = true;
    this.deviceService.updateDevice(device);
  }

  unregisterDevice(device: Device): void {
    device.registered = false;
    this.deviceService.updateDevice(device);
  }

  confirmDeleteDevice(): void {
    if (!this.device) return;

    const dialogRef = this.dialog.open(DeleteDeviceComponent, {
      data: { device: this.device }
    });

    dialogRef.afterClosed().subscribe((result?: { confirmed?: boolean }) => {
      if (result?.confirmed) this.deleteDevice();
    });
  }

  private deleteDevice(): void {
    if (!this.device) return;
    this.deviceService.deleteDevice(this.device).then(() => {
      this.stateService.go('admin.devices');
    });
  }

  iconClass(device: Device): string {
    if (!device) return 'fa fa-mobile admin-generic-icon';

    const userAgent = (device.userAgent || '').toLowerCase();

    if (device.appVersion === 'Web Client')
      return 'fa fa-desktop admin-desktop-icon';
    if (userAgent.includes('android'))
      return 'fa fa-android admin-android-icon';
    if (userAgent.includes('ios')) return 'fa fa-apple admin-apple-icon';

    return 'fa fa-mobile admin-generic-icon';
  }
}
