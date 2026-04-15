import {
  Component,
  Input,
  SimpleChanges,
  EventEmitter,
  Output,
  OnInit,
  OnDestroy,
  OnChanges
} from '@angular/core';
import { Router } from '@angular/router';
import { AdminUserService } from '../services/admin-user.service';
import { Subject, takeUntil } from 'rxjs';

interface PluginTab {
  id: string;
  state: string;
  title: string;
  icon?: { path?: string; className?: string };
}

@Component({
  selector: 'app-admin-side-nav',
  templateUrl: './admin-nav.html',
  styleUrls: ['./admin-nav.scss'],
  host: {
    '[class.has-header-banner]': 'hasHeaderBanner'
  }
})
export class AdminNavComponent implements OnInit, OnDestroy, OnChanges {
  @Input() hasHeaderBanner = false;
  @Input() stateName: string = '';
  @Input() inactiveUsers: any[] = [];
  @Input() unregisteredDevices: any[] = [];
  @Input() pluginTabs: PluginTab[] = [];
  @Input() token: string = '';
  @Output() pluginActiveChange = new EventEmitter<boolean>();

  drawerOpen = false;

  navItems = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'fa fa-dashboard',
      count: 0
    },
    { label: 'Users', route: '/users', icon: 'fa fa-user', count: 0 },
    { label: 'Teams', route: '/teams', icon: 'fa fa-users' },
    { label: 'Events', route: '/events', icon: 'fa fa-calendar' },
    {
      label: 'Devices',
      route: '/devices',
      icon: 'fa fa-mobile-phone icon-fix',
      count: 0
    },
    { label: 'Layers', route: '/layers', icon: 'fa fa-map' },
    { label: 'Feeds', route: '/feeds', icon: 'fa fa-rss' },
    { label: 'Map', route: '/map', icon: 'fa fa-globe' },
    {
      label: 'Security',
      route: '/security',
      icon: 'fa fa-shield',
      permission: 'UPDATE_SETTINGS'
    },
    {
      label: 'Settings',
      route: '/settings',
      icon: 'fa fa-wrench',
      permission: 'UPDATE_SETTINGS'
    }
  ];

  private destroy$ = new Subject<void>();
  private permissions: string[] = [];

  constructor(
    private adminUserService: AdminUserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.adminUserService
      .checkLoggedInUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.adminUserService.myself$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.permissions = user?.role?.permissions ?? [];
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private parseInput<T>(input: T | string): T {
    if (typeof input === 'string') {
      try {
        return JSON.parse(input);
      } catch {
        return [] as unknown as T;
      }
    }
    return input;
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.pluginTabs = this.parseInput(this.pluginTabs);
    this.unregisteredDevices = this.parseInput(this.unregisteredDevices);
    this.inactiveUsers = this.parseInput(this.inactiveUsers);

    const dashboardItem = this.navItems.find((i) => i.route === '/dashboard');
    const usersItem = this.navItems.find((i) => i.route === '/users');
    const devicesItem = this.navItems.find((i) => i.route === '/devices');

    if (dashboardItem) {
      dashboardItem.count =
        (this.unregisteredDevices?.length ?? 0) +
        (this.inactiveUsers?.length ?? 0);
    }
    if (usersItem) {
      usersItem.count = this.inactiveUsers?.length ?? 0;
    }
    if (devicesItem) {
      devicesItem.count = this.unregisteredDevices?.length ?? 0;
    }

    const isPluginActive =
      Array.isArray(this.pluginTabs) &&
      this.pluginTabs.some((p) => this.router.url.includes(p.state));

    this.pluginActiveChange.emit(isPluginActive);
  }

  hasPermission(permission: string): boolean {
    return this.adminUserService.hasPermission(permission);
  }

  pluginRouterLink(plugin: PluginTab): any[] {
    return ['/plugins', plugin.id];
  }

  toggleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
  }

  get pluginActive(): boolean {
    return (
      Array.isArray(this.pluginTabs) &&
      this.pluginTabs.some((p) => this.router.url.includes(p.state))
    );
  }

  get pluginBreadcrumbs() {
    if (!this.pluginActive) return [];
    const plugin = this.pluginTabs.find((p) =>
      this.router.url.includes(p.state)
    );

    return [
      {
        title: plugin?.title ?? 'Plugin',
        iconClass: plugin?.icon?.className || 'fa fa-plug'
      }
    ];
  }
}
