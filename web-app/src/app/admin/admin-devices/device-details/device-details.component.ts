import { Component, DestroyRef, OnInit, OnDestroy, TemplateRef, ViewChild, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { DeleteDeviceComponent } from '../delete-device/delete-device.component';
import { CreateDeviceDialogComponent } from '../create-device/create-device.component';
import { Device } from '../../../entities/device/device';
import { AdminDeviceService } from '../../services/admin-device.service';
import { deviceIconName } from '../../../entities/device/device';
import { SessionService } from 'mage-web-app/http/session.service';
import { NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoginsComponent } from '../../admin-logins/admin-logins.component';

@Component({
    selector: 'mage-device-details',
    templateUrl: './device-details.component.html',
    styleUrls: ['./device-details.component.scss'],
    imports: [
        NgClass,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatDividerModule,
        MatTooltipModule,
        LoginsComponent
    ]
})
export class DeviceDetailsComponent implements OnInit, OnDestroy {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly deviceService: AdminDeviceService = inject(AdminDeviceService);
  private readonly sessionService: SessionService = inject(SessionService);
  private readonly breadcrumbService: AdminBreadcrumbService = inject(AdminBreadcrumbService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly deviceId: string = this.route.snapshot.paramMap.get('deviceId');

  readonly device = signal<Device | null>(null);
  readonly currentUserDisplayName = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  hasUpdatePermission = false;
  hasDeletePermission = false;

  #breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Devices',
    icon: 'devices',
    route: ['/admin/devices']
  }];
  set breadcrumbs(value: AdminBreadcrumb[]) {
    this.#breadcrumbs = value;
    this.breadcrumbService.setBreadcrumbs(value);
  }
  get breadcrumbs(): AdminBreadcrumb[] {
    return this.#breadcrumbs;
  }

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.hasUpdatePermission =
      this.sessionService.hasPermission('UPDATE_DEVICE');

    this.hasDeletePermission =
      this.sessionService.hasPermission('DELETE_DEVICE');

    this.loadDevice(this.deviceId);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  private loadDevice(deviceId: string): void {
    this.deviceService.getDeviceById(deviceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (device: Device) => {
          this.applyDevice(device);
        },
        error: () => {
          this.error.set('Failed to load device');
        }
      });
  }

  private applyDevice(device: Device): void {
    this.device.set(device);
    this.breadcrumbs = [{
      title: 'Devices',
      icon: 'devices',
      route: ['/admin/devices']
    },{
      title: device?.uid || 'Device'
    }];

    this.currentUserDisplayName.set(device?.user?.displayName || null);
  }

  private reloadDevice(): void {
    const deviceId = this.device()?.id;
    if (!deviceId) return;

    this.deviceService.getDeviceById(deviceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d: Device) => {
          this.applyDevice(d);
        },
        error: () => {
          this.error.set('Failed to reload device');
        }
      });
  }

  editDeviceDetails(): void {
    const device = this.device();
    if (!device) return;

    const dialogRef = this.dialog.open(CreateDeviceDialogComponent, {
      width: '600px',
      data: { device }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updatedDevice?: Device) => {
        if (!updatedDevice) return;
        this.applyDevice(updatedDevice);
      });
  }

  get registerToggleLabel(): string {
    const device = this.device();
    if (!device) return '';
    return device.registered ? 'Deactivate Device' : 'Activate Device';
  }

  get registerToggleIcon(): string {
    const device = this.device();
    if (!device) return '';
    return device.registered ? 'block' : 'check_circle';
  }

  get registerToggleHelpText(): string {
    const device = this.device();
    if (!device) return '';
    return device.registered
      ? 'Deactivating will deny device from accessing MAGE data. All device information will be retained.'
      : 'Activating will allow device to access MAGE data. The device can be deactivated at any time.';
  }

  toggleRegistration(): void {
    const device = this.device();
    if (!device) return;

    device.registered
      ? this.unregisterDevice(device)
      : this.registerDevice(device);
  }

  registerDevice(device: Device): void {
    if (!device?.id || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);

    this.deviceService.updateDevice(device.id, { registered: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          if (updated) this.applyDevice(updated);

          this.saving.set(false);
          this.reloadDevice();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to register device');
          this.saving.set(false);
        }
      });
  }

  unregisterDevice(device: Device): void {
    if (!device?.id || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);

    this.deviceService.updateDevice(device.id, { registered: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          if (updated) this.applyDevice(updated);

          this.saving.set(false);
          this.reloadDevice();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to unregister device');
          this.saving.set(false);
        }
      });
  }

  confirmDeleteDevice(): void {
    const device = this.device();
    if (!device) return;

    const dialogRef = this.dialog.open(DeleteDeviceComponent, {
      width: '600px',
      data: { device }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result?: { confirmed?: boolean }) => {
        if (result?.confirmed) {
          this.deleteDevice();
        }
      });
  }

  private deleteDevice(): void {
    const deviceId = this.device()?.id;
    if (!deviceId || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);

    this.deviceService.deleteDevice(deviceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/admin/devices']);
        },
        error: () => {
          this.error.set('Failed to delete device');
          this.saving.set(false);
        }
      });
  }

  iconClass(device: Device): string {
    return deviceIconName(device);
  }
}
