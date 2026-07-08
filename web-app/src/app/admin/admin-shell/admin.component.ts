import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';

import { PluginService } from '../plugin/plugin.service';
import { UserPagingService } from '../services/user-paging.service';
import { DeviceService } from '../admin-devices/device.service';
import { SidenavService } from './sidenav.service';

@Component({
    selector: 'admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
    standalone: false
})
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('adminMainContent')
  adminMainContent?: ElementRef<HTMLElement>;

  @ViewChild(MatSidenav)
  sidenav?: MatSidenav;

  isMobile = false;

  stateName = '';

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

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private plugins: PluginService,
    private userPaging: UserPagingService,
    private deviceService: DeviceService,
    private breakpointObserver: BreakpointObserver,
    private sidenavService: SidenavService
  ) {}

  ngOnInit(): void {
    this.stateName = this.router.url;
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => {
        this.stateName = e.urlAfterRedirects;

        if (this.isMobile) {
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
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.isMobile = result.matches;
        if (result.matches) {
          this.sidenav?.close();
        } else {
          this.sidenav?.open();
        }
      });

    this.sidenavService.toggle$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.sidenav?.toggle());
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
    this.deviceService
      .refresh(this.deviceStateAndData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.unregisteredDevices = this.deviceService.devices(
            this.deviceStateAndData[this.deviceState]
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

        this.pluginTabs = tabs;
      })
      .catch((err) => {
        console.error('Error loading plugins', err);
      });
  }
}

function cleanNameOfPlugin(pluginId: string): string {
  return pluginId.replace(/(^[^\w+])|([^\w+]$)/, '').replace(/[^\w-_]/g, '-');
}
