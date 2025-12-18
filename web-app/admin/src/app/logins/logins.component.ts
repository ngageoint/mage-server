import { Component, OnInit, Inject, Input } from '@angular/core';
import * as moment from 'moment';
import * as _ from 'underscore';
import {
  UserService,
  DeviceService,
  LoginService,
  UserPagingService,
  DevicePagingService
} from 'admin/src/app/upgrade/ajs-upgraded-providers';
import { User } from 'core-lib-src/user';
import {
  Device,
  Login,
  LoginFilter,
  LoginPage,
  DevicesResponse,
  UsersResponse
} from 'admin/src/@types/dashboard/admin-dashboard';

@Component({
  selector: 'mage-logins',
  templateUrl: './logins.component.html',
  styleUrls: ['./logins.component.scss']
})
/**
 * Admin/Dashboard component for viewing and filtering login activity by user, device, and date.
 */
export class LoginsComponent implements OnInit {
  @Input() devices: Device[] = [];
  @Input() users: User[] = [];
  @Input() userId?: string;
  @Input() deviceId?: string;

  login = {
    startDateOpened: false,
    endDateOpened: false,
    startDate: null,
    endDate: null
  };

  loginPage: LoginPage;
  loginResultsLimit: number = 10;
  loginSearchResults: User[] = [];
  loginDeviceSearchResults: Device[] = [];
  firstLogin: Login;

  filter: LoginFilter = {};
  user: User = null;
  device: Device[] = [];
  deviceText: string = '';
  userText: string = '';

  toggleFilters = false;

  private userStateAndData: UsersResponse;
  private userState: keyof UsersResponse = 'all';
  private deviceStateAndData: DevicesResponse;
  private deviceState: keyof DevicesResponse = 'all';

  private $state: any;

  constructor(
    @Inject(UserService) private userService: any,
    @Inject(DeviceService) private deviceService: any,
    @Inject(LoginService) private loginService: any,
    @Inject(UserPagingService) private userPagingService: any,
    @Inject(DevicePagingService) private devicePagingService: any,
    @Inject('$injector') private $injector: any
  ) {
    this.$state = this.$injector.get('$state');
  }

  ngOnInit(): void {
    if (this.userId) {
      this.filter.user = { id: this.userId } as any;
    }

    if (this.deviceId) {
      (this.filter as any).device = { id: this.deviceId } as any;
    }

    this.initUserSourceIfNeeded();
    this.initDeviceSourceIfNeeded();
    this.loadInitialLogins();
  }

  private isValidPageLink(link: any): link is string {
    return (
      typeof link === 'string' &&
      link.trim().length > 0 &&
      link !== 'null' &&
      link !== 'undefined'
    );
  }

  get hasPrev(): boolean {
    if (!this.isValidPageLink((this.loginPage as any)?.prev)) return false;
    if (!this.loginPage?.logins?.length) return false;
    if (!this.firstLogin?.id) return false;
    return this.loginPage.logins[0].id !== this.firstLogin.id;
  }

  get hasNext(): boolean {
    return this.isValidPageLink((this.loginPage as any)?.next);
  }

  private normalizePageLinks(page: any) {
    if (!page) return;
    page.prev = this.isValidPageLink(page.prev) ? page.prev : null;
    page.next = this.isValidPageLink(page.next) ? page.next : null;
  }

  /** Initialize backing user list using paging service when not supplied by parent */
  private initUserSourceIfNeeded() {
    if ((this.users?.length || 0) > 0 || this.userId) return;
    this.userStateAndData = this.userPagingService.constructDefault();
    this.userPagingService.refresh(this.userStateAndData).then(() => {
      const initial = this.userPagingService.users(
        this.userStateAndData[this.userState]
      );
      this.users = initial || [];
    });
  }

  /** Initialize backing device list using paging service when not supplied by parent */
  private initDeviceSourceIfNeeded() {
    if ((this.devices?.length || 0) > 0) {
      this.loginDeviceSearchResults = this.devices.slice();
      return;
    }
    this.deviceStateAndData = this.devicePagingService.constructDefault();
    this.devicePagingService.refresh(this.deviceStateAndData).then(() => {
      const initial = this.devicePagingService.devices(
        this.deviceStateAndData[this.deviceState]
      );
      this.loginDeviceSearchResults = initial || [];
    });
  }

  loadInitialLogins() {
    this.loginService
      .query({ filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage: any) => {
        this.normalizePageLinks(loginPage);
        this.loginPage = loginPage;
        this.firstLogin = loginPage?.logins?.length
          ? loginPage.logins[0]
          : null;
      });
  }

  pageLogin(url: string) {
    if (!this.isValidPageLink(url)) return;

    this.loginService
      .query({ url, filter: this.filter, limit: this.loginResultsLimit })
      .then((nextPage: any) => {
        this.normalizePageLinks(nextPage);

        // Guard: server "next" exists but leads to empty page
        if (!nextPage?.logins?.length) {
          if (this.loginPage) {
            (this.loginPage as any).next = null;
            this.normalizePageLinks(this.loginPage as any);
          }
          return;
        }

        this.loginPage = nextPage;
      });
  }

  async filterLogins() {
    if (this.userId) {
      this.filter.user = { id: this.userId } as any;
    } else {
      this.filter.user = this.user as any;
    }

    if (this.deviceId) {
      (this.filter as any).device = { id: this.deviceId } as any;
    } else if (this.device && this.device.length > 0) {
      (this.filter as any).device = { id: this.device[0].id } as any;
    } else {
      (this.filter as any).device = null;
    }

    this.filter.startDate = this.login.startDate;
    if (this.login.endDate) {
      this.filter.endDate = moment(this.login.endDate).endOf('day').toDate();
    } else {
      this.filter.endDate = null;
    }

    const hasUser = !!(this.filter.user && (this.filter.user as any).id);
    const hasDevice = !!(
      (this.filter as any).device && (this.filter as any).device.id
    );
    const hasDate = !!(this.filter.startDate || this.filter.endDate);

    if (!hasUser && !hasDevice && !hasDate) {
      this.loadInitialLogins();
      return;
    }

    this.loginService
      .query({ filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage: any) => {
        this.normalizePageLinks(loginPage);
        this.loginPage = loginPage;
      });
  }

  onUserInputChange(value: string | User) {
    if (this.userId) return;
    const searchValue: string =
      typeof value === 'string' ? value : value?.displayName || '';
    this.searchLoginsAgainstUsers(searchValue);
  }

  onUserSearchChange(term: string) {
    this.userText = term;
    this.user = null;
    this.onUserInputChange(term);
    if (!term) {
      this.loginSearchResults = [];
      this.filterLogins();
    }
  }

  async onDeviceSearchChange(term: string) {
    if (this.deviceId) return;
    this.deviceText = term;
    this.device = [];

    if (!term) {
      this.loginDeviceSearchResults = [];
      this.filterLogins();
      return;
    }

    if (this.deviceStateAndData) {
      const devices: Device[] = await this.devicePagingService.search(
        this.deviceStateAndData[this.deviceState],
        term,
        null
      );
      this.loginDeviceSearchResults = devices || [];
      return;
    }

    if (this.devices?.length) {
      const lower = term.toLowerCase();
      this.loginDeviceSearchResults = this.devices
        .filter(
          (d) =>
            String(d.uid || '')
              .toLowerCase()
              .includes(lower) ||
            String(d.userAgent || '')
              .toLowerCase()
              .includes(lower)
        )
        .slice(0, 20);
    }
  }

  selectUser(u: User) {
    this.user = u;
    this.userText = this.displayUser(u);
    this.loginSearchResults = [];
    this.filterLogins();
  }

  selectDevice(d: Device) {
    if (this.deviceId) return;
    this.device = [d];
    this.deviceText = String(d?.uid ?? '');
    this.loginDeviceSearchResults = [];
    this.filterLogins();
  }

  searchLoginsAgainstUsers(searchString: string | null) {
    if (this.userId) return Promise.resolve([]);

    if (this.userStateAndData) {
      const term = !searchString || searchString === '.*' ? '' : searchString;
      return this.userPagingService
        .search(this.userStateAndData[this.userState], term)
        .then((users: User[]) => {
          this.loginSearchResults = (users || []).slice(0, 10);
          return this.loginSearchResults;
        });
    }

    if (!searchString || searchString === '.*') {
      this.loginSearchResults = (this.users || []).slice(0, 10);
      return Promise.resolve(this.loginSearchResults);
    }

    const filteredUsers = (this.users || []).filter(
      (user) =>
        user.displayName &&
        user.displayName.toLowerCase().includes(searchString.toLowerCase())
    );

    this.loginSearchResults = filteredUsers.slice(0, 10);
    return Promise.resolve(this.loginSearchResults);
  }

  clearDeviceFilter() {
    if (this.deviceId) return;
    this.device = [];
    this.deviceText = '';
    this.filterLogins();
  }

  clearUserFilter() {
    if (this.userId) return;
    this.user = null;
    this.userText = '';
    this.onUserInputChange('');
    this.filterLogins();
  }

  onClearUserInput() {
    if (this.userId) return;
    this.userText = '';
    this.user = null;
    this.loginSearchResults = [];
    this.filterLogins();
  }

  onClearDeviceInput() {
    if (this.deviceId) return;
    this.deviceText = '';
    this.device = [];
    this.loginDeviceSearchResults = [];
    this.filterLogins();
  }

  displayUser(user: User): string {
    return user && user.displayName ? user.displayName : '';
  }

  displayDevice(device: Device): string | number {
    return device && device.uid ? device.uid : '';
  }

  dateFilterChanged() {
    this.filterLogins();
  }

  loginResultsLimitChanged() {
    this.filterLogins();
  }

  iconClass(device: Device): string {
    if (!device) return 'fa fa-mobile admin-generic-icon-xs';
    if ((device as any).iconClass) return (device as any).iconClass as any;

    const userAgent = (device.userAgent || '').toLowerCase();
    if (device.appVersion === 'Web Client')
      return 'fa fa-desktop admin-desktop-icon-xs';
    if (userAgent.includes('android'))
      return 'fa fa-android admin-android-icon-xs';
    if (userAgent.includes('ios')) return 'fa fa-apple admin-apple-icon-xs';
    return 'fa fa-mobile admin-generic-icon-xs';
  }

  gotoUser(user: User) {
    this.$state.go('admin.user', { userId: (user as any).id });
  }

  gotoDevice(device: Device) {
    this.$state.go('admin.device', { deviceId: (device as any).id });
  }

  fromNow(timestamp: string | Date): string {
    return moment(timestamp).fromNow();
  }

  formatDate(timestamp: string | Date): string {
    return moment(timestamp).format('MMM D YYYY hh:mm:ss A');
  }

  hasPermission(permission: string): boolean {
    return _.contains(
      this.userService.myself?.role?.permissions || [],
      permission
    );
  }
}
