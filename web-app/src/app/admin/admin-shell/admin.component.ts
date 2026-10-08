import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';

import { PluginService } from '../plugin/plugin.service';
import { UserPagingService } from '../services/user-paging.service';
import { DeviceService } from '../admin-devices/device.service';
import { SidenavService } from './sidenav.service';
import { AdminBreadcrumbService } from '../admin-breadcrumb/admin-breadcrumb.service';
import { AdminBreadcrumbComponent } from '../admin-breadcrumb/admin-breadcrumb.component';
import { NgTemplateOutlet } from '@angular/common';
import { AdminNavbarComponent } from './admin-navbar/admin-navbar.component';
import { AdminNavigationComponent } from '../admin-navigation/admin-navigation.component';

@Component({
    selector: 'admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
    imports: [
      MatSidenavModule,
      RouterModule,
      NgTemplateOutlet,
      AdminNavbarComponent,
      AdminNavigationComponent,
      AdminBreadcrumbComponent
    ]
})
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly plugins = inject(PluginService);
  private readonly userPaging = inject(UserPagingService);
  private readonly deviceService = inject(DeviceService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly sidenavService = inject(SidenavService);
  private readonly destroyRef = inject(DestroyRef);
  readonly breadcrumbService = inject(AdminBreadcrumbService);

  @ViewChild('adminMainContent')
  adminMainContent?: ElementRef<HTMLElement>;

  @ViewChild(MatSidenav)
  sidenav?: MatSidenav;

  readonly isMobile = signal(false);

  readonly stateName = signal('');

  pluginActive = false;

  readonly pluginTabs = signal<
    Array<{ id: string; title: string; state: string; icon?: string }>
  >([]);

  userState: 'inactive' = 'inactive';
  readonly inactiveUsers = signal<any[]>([]);
  stateAndData: any;

  deviceState: 'unregistered' = 'unregistered';
  readonly unregisteredDevices = signal<any[]>([]);
  deviceStateAndData: any;

  ngOnInit(): void {
    this.stateName.set(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        this.stateName.set(e.urlAfterRedirects);

        if (this.isMobile()) {
          this.sidenav?.close();
        }

        requestAnimationFrame(() => {
          this.adminMainContent?.nativeElement.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto'
          });
        });
      });

    const defaultUserQueries = this.userPaging.constructDefault();
    this.stateAndData = { inactive: defaultUserQueries.inactive };

    const defaultDeviceQueries = this.deviceService.constructDefault();
    this.deviceStateAndData = {
      unregistered: defaultDeviceQueries.unregistered
    };

    this.refreshInactiveUsers();
    this.refreshUnregisteredDevices();
    this.loadPluginTabs();
  }

  ngAfterViewInit(): void {
    this.breakpointObserver
      .observe('(max-width: 768px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.isMobile.set(result.matches);
        if (result.matches) {
          this.sidenav?.close();
        } else {
          this.sidenav?.open();
        }
      });

    this.sidenavService.toggle$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sidenav?.toggle());
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setBreadcrumbs([]);
    this.breadcrumbService.setActions(null);
  }

  pluginActiveChanged(active: any): void {
    this.pluginActive = !!active;
  }

  userActivated(_: any): void {
    this.refreshInactiveUsers();
  }

  deviceRegistered(_: any): void {
    this.refreshUnregisteredDevices();
  }

  deviceUnregistered(_: any): void {
    this.refreshUnregisteredDevices();
  }

  private refreshInactiveUsers(): void {
    this.userPaging
      .refresh(this.stateAndData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.inactiveUsers.set(
            this.userPaging.users(this.stateAndData[this.userState])
          );
        },
        error: (err) => console.error('Error refreshing inactive users', err)
      });
  }

  private refreshUnregisteredDevices(): void {
    this.deviceService
      .refresh(this.deviceStateAndData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.unregisteredDevices.set(
            this.deviceService.devices(this.deviceStateAndData[this.deviceState])
          );
        },
        error: (err) =>
          console.error('Error refreshing unregistered devices', err)
      });
  }

  private loadPluginTabs(): void {
    this.plugins
      .availablePlugins()
      .then((pluginsObj) => {
        const tabs = Object.entries(pluginsObj).reduce(
          (acc: any[], [pluginId, plugin]: any) => {
            const adminTab = plugin?.MAGE_WEB_HOOKS?.adminTab;
            if (!adminTab) return acc;

            const suffix = cleanNameOfPlugin(pluginId);

            acc.push({
              id: pluginId,
              title: adminTab.title,
              state: `../${suffix}`,
              icon: adminTab.icon
            });

            return acc;
          },
          []
        );

        this.pluginTabs.set(tabs);
      })
      .catch((err) => {
        console.error('Error loading plugins', err);
      });
  }
}

function cleanNameOfPlugin(pluginId: string): string {
  return pluginId.replace(/(^[^\w+])|([^\w+]$)/, '').replace(/[^\w-_]/g, '-');
}
