import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { DeleteDeviceComponent } from '../delete-device/delete-device.component';
import { Device } from '../../../../@types/dashboard/devices-dashboard';
import { User } from '../../admin-users/user';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminDeviceService } from '../../services/admin-device.service';

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
      route: ['../devices']
    }
  ];

  editingDetails = false;
  saving = false;
  error: string | null = null;

  deviceEditForm: {
    uid?: string;
    description?: string;
    userId?: string;
  } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private deviceService: AdminDeviceService,
    private adminUserService: AdminUserService
  ) {}

  ngOnInit(): void {
    const deviceId = this.route.snapshot.paramMap.get('deviceId');
    if (!deviceId) {
      this.error = 'Missing deviceId route param';
      return;
    }

    this.hasUpdatePermission =
      this.adminUserService.hasPermission('UPDATE_DEVICE');

    this.hasDeletePermission =
      this.adminUserService.hasPermission('DELETE_DEVICE');

    this.deviceService.getDeviceById(deviceId).subscribe({
      next: (device: Device) => {
        this.device = device;
        this.breadcrumbs = [
          {
            title: 'Devices',
            iconClass: 'fa fa-mobile',
            route: ['../']
          },
          { title: device?.uid || 'Device' }
        ];

        this.currentUserDisplayName = device?.user?.displayName || null;
        this.selectedUserDisplayName = null;

        this.resetEditForm();
      },
      error: () => {
        this.error = 'Failed to load device';
      }
    });
  }

  toggleEditDetails(): void {
    this.editingDetails ? this.cancelEditDetails() : this.startEdit();
  }

  private startEdit(): void {
    this.editingDetails = true;
    this.resetEditForm();
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

    const deviceId = this.device.id;

    this.saving = true;
    this.error = null;

    const payload: Partial<Device> = {
      uid: this.deviceEditForm.uid,
      description: this.deviceEditForm.description,
      user: this.deviceEditForm.userId
        ? ({ id: this.deviceEditForm.userId } as any)
        : null
    };

    this.deviceService.updateDevice(this.device.id, payload).subscribe({
      next: () => {
        this.editingDetails = false;
        this.saving = false;

        this.deviceService.getDeviceById(deviceId).subscribe({
          next: (d) => {
            this.device = d;
            this.currentUserDisplayName = d?.user?.displayName || null;
            this.resetEditForm();
          },
          error: () => {
            this.error = 'Failed to reload device';
          }
        });
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to update device';
        this.saving = false;
      }
    });
  }

  registerDevice(device: Device): void {
    if (!device.id) return;

    this.deviceService
      .updateDevice(device.id, { registered: true })
      .subscribe();
  }

  unregisterDevice(device: Device): void {
    if (!device.id) return;

    this.deviceService
      .updateDevice(device.id, { registered: false })
      .subscribe();
  }

  confirmDeleteDevice(): void {
    if (!this.device) return;

    const dialogRef = this.dialog.open(DeleteDeviceComponent, {
      data: { device: this.device }
    });

    dialogRef.afterClosed().subscribe((result?: { confirmed?: boolean }) => {
      if (result?.confirmed) {
        this.deleteDevice();
      }
    });
  }

  private deleteDevice(): void {
    if (!this.device?.id) return;

    this.deviceService.deleteDevice(this.device.id).subscribe({
      next: () => this.router.navigate(['/../../devices'], { relativeTo: this.route }),
      error: () => {
        this.error = 'Failed to delete device';
      }
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
