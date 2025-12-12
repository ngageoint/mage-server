import { Component, Inject, Input, SimpleChanges, EventEmitter, Output } from '@angular/core';
import { UserService } from '../../upgrade/ajs-upgraded-providers';

interface PluginTab {
  id: string;
  state: string;
  title: string;
  icon?: { path?: string; className?: string };
}

@Component({
  selector: 'app-admin-nav',
  templateUrl: './admin-nav.html',
  styleUrls: ['./admin-nav.scss']
})
export class AdminNavComponent {
  @Input() stateName!: string;
  @Input() inactiveUsers: any[] = [];
  @Input() unregisteredDevices: any[] = [];
  @Input() pluginTabs: PluginTab[] = [];
  @Input() token: string = '';
  @Output() pluginActiveChange = new EventEmitter<boolean>();

  private $state: any;
  drawerOpen = false;

  navItems = [
    { label: 'Dashboard', state: 'admin.dashboard', icon: 'fa fa-dashboard', count: 0},
    { label: 'Users', state: 'admin.users', icon: 'fa fa-user', count: 0 },
    { label: 'Teams', state: 'admin.teams', icon: 'fa fa-users' },
    { label: 'Events', state: 'admin.events', icon: 'fa fa-calendar' },
    { label: 'Devices', state: 'admin.devices', icon: 'fa fa-mobile-phone icon-fix', count: 0 },
    { label: 'Layers', state: 'admin.layers', icon: 'fa fa-map' },
    { label: 'Feeds', state: 'admin.feeds', icon: 'fa fa-rss' },
    { label: 'Map', state: 'admin.map', icon: 'fa fa-globe' },
    { label: 'Security', state: 'admin.security', icon: 'fa fa-shield', permission: 'UPDATE_SETTINGS' },
    { label: 'Settings', state: 'admin.settings', icon: 'fa fa-wrench', permission: 'UPDATE_SETTINGS' },
  ];

  constructor(
    @Inject(UserService) private userService: any,
    @Inject('$injector') private $injector: any
  ) {
    this.$state = this.$injector.get('$state');
  }

  private parseInput<T>(input: T | string, name: string): T {
    if (typeof input === 'string') {
      try { return JSON.parse(input); }
      catch { return [] as unknown as T; }
    }
    return input;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.pluginTabs = this.parseInput(this.pluginTabs, 'pluginTabs');
    this.unregisteredDevices = this.parseInput(this.unregisteredDevices, 'unregisteredDevices');
    this.inactiveUsers = this.parseInput(this.inactiveUsers, 'inactiveUsers');

    const dashboardItem = this.navItems.find(i => i.state === 'admin.dashboard');
    const usersItem = this.navItems.find(i => i.state === 'admin.users');
    const devicesItem = this.navItems.find(i => i.state === 'admin.devices');

    dashboardItem.count = (this.unregisteredDevices.length + this.inactiveUsers.length);
    usersItem.count = this.inactiveUsers.length;
    devicesItem.count = this.unregisteredDevices.length;

    const isPluginActive =
      Array.isArray(this.pluginTabs) &&
      this.pluginTabs.some((p) => p.state === this.stateName);

    this.pluginActiveChange.emit(isPluginActive);
  }

  hasPermission(permission: string): boolean {
    return this.userService.myself?.role?.permissions?.includes(permission);
  }

  onClick(route: string): void {
    if (this.stateName !== route) {
      this.$state.go(route);
      this.closeDrawer();
    }
  }

  toggleDrawer(): void { this.drawerOpen = !this.drawerOpen; }
  closeDrawer(): void { this.drawerOpen = false; }

  get pluginActive(): boolean {
    return Array.isArray(this.pluginTabs) && this.pluginTabs.some(p => p.state === this.stateName);
  }
  
  get pluginBreadcrumbs() {
    if (!this.pluginActive) return [];
    const plugin = this.pluginTabs.find(p => p.state === this.stateName);
    
    return [
      { title: plugin.title, iconClass: plugin?.icon?.className || "fa fa-plug"}
    ];
  }
  
}
