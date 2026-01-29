import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';

import { PluginService } from '../../plugin/plugin.service';
import { UserPagingService } from '../../services/user-paging.service';
import { DevicePagingService } from '../../services/device-paging.service';
import { LocalStorageService } from '../../../../../../web-app/src/app/http/local-storage.service';

@Component({
  selector: 'admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {
  stateName = '';
  token = '';

  pluginActive = false;

  pluginTabs: Array<{
    id: string;
    title: string;
    state: string;
    icon?: string;
  }> = [];

  userState: 'inactive' = 'inactive';
  inactiveUsers: any[] = [];
  stateAndData: any;

  deviceState: 'unregistered' = 'unregistered';
  unregisteredDevices: any[] = [];
  deviceStateAndData: any;

  loading = true;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private plugins: PluginService,
    private userPaging: UserPagingService,
    private devicePaging: DevicePagingService,
    private localStorage: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.stateName = this.router.url;
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => (this.stateName = e.urlAfterRedirects));

    const defaultUserQueries = this.userPaging.constructDefault();
    this.stateAndData = { inactive: defaultUserQueries.inactive };

    const defaultDeviceQueries = this.devicePaging.constructDefault();
    this.deviceStateAndData = {
      unregistered: defaultDeviceQueries.unregistered
    };

    this.token = this.localStorage.getToken() ?? '';

    this.refreshInactiveUsers();
    this.refreshUnregisteredDevices();
    this.loadPluginTabs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.inactiveUsers = this.userPaging.users(
            this.stateAndData[this.userState]
          );
        },
        error: (err) => console.error('Error refreshing inactive users', err)
      });
  }

  private refreshUnregisteredDevices(): void {
    this.devicePaging
      .refresh(this.deviceStateAndData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.unregisteredDevices = this.devicePaging.devices(
            this.deviceStateAndData[this.deviceState]
          );
        },
        error: (err) =>
          console.error('Error refreshing unregistered devices', err)
      });
  }

  private loadPluginTabs(): void {
    this.loading = true;

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

        this.pluginTabs = tabs;
        this.loading = false;
      })
      .catch((err) => {
        console.error('Error loading plugins', err);
        this.loading = false;
      });
  }
}

function cleanNameOfPlugin(pluginId: string): string {
  return pluginId.replace(/(^[^\w+])|([^\w+]$)/, '').replace(/[^\w-_]/g, '-');
}
