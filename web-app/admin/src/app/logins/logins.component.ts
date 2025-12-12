import { Component, OnInit, Inject, Input } from '@angular/core';
import * as moment from "moment";
import * as _ from "underscore";
import {
  UserService,
  DeviceService,
  LoginService,
  UserPagingService,
  DevicePagingService,
} from "admin/src/app/upgrade/ajs-upgraded-providers";
import { User } from "core-lib-src/user";
import {
  Device,
  Login,
  LoginFilter,
  LoginPage,
  DevicesResponse,
  UsersResponse,
} from "admin/src/@types/dashboard/admin-dashboard";

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

  login = {
    startDateOpened: false,
    endDateOpened: false,
    startDate: null,
    endDate: null,
  };

  loginPage: LoginPage;
  loginResultsLimit: number = 10;
  loginSearchResults: User[] = [];
  loginDeviceSearchResults: Device[] = [];
  firstLogin: Login;
  showPrevious: boolean = false;
  showNext: boolean = false;

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
    @Inject('$injector') private $injector: any,
  ) {
    this.$state = this.$injector.get('$state');
  }

  /**
   * Initialize filters, suggestion sources, and load the initial login page.
   */
  ngOnInit(): void {
    if (this.userId) {
      this.filter.user = { id: this.userId } as any;
    }

    this.initUserSourceIfNeeded();
    this.initDeviceSourceIfNeeded();

    this.loadInitialLogins();
  }

  /** Initialize backing user list using paging service when not supplied by parent */
  private initUserSourceIfNeeded() {
    if ((this.users?.length || 0) > 0 || this.userId) return;
    this.userStateAndData = this.userPagingService.constructDefault();
    this.userPagingService.refresh(this.userStateAndData).then(() => {
      const initial = this.userPagingService.users(this.userStateAndData[this.userState]);
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
      const initial = this.devicePagingService.devices(this.deviceStateAndData[this.deviceState]);
      this.loginDeviceSearchResults = initial || [];
    });
  }

  /**
   * Load initial login data.
   */
  loadInitialLogins() {
    this.loginService
      .query({ filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage: LoginPage) => {
        this.loginPage = loginPage;
        if (loginPage.logins.length) {
          this.firstLogin = loginPage.logins[0];
          this.showNext = !!loginPage.next;
          this.showPrevious = !!loginPage.prev;
        }
      });
  }

  /**
   * Navigate to a specific login page URL.
   * @param url URL of the login page.
   */
  pageLogin(url: string) {
    if (!url) return;

    this.loginService
      .query({ url, filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage) => {
        if (loginPage) {
          this.loginPage = loginPage;
          this.showNext = !!loginPage.next;
          this.showPrevious = !!loginPage.prev;
        }
      });
  }

  /**
   * Filter logins based on selected user, device, and date range.
   */
  async filterLogins() {
    if (this.userId) {
      this.filter.user = { id: this.userId } as any;
    } else {
      this.filter.user = this.user as any;
    }

    if (this.device && this.device.length > 0) {
      this.filter.deviceIds = this.device.map((d) => d.id).join(",");
    } else {
      this.filter.deviceIds = null;
    }

    this.filter.startDate = this.login.startDate;
    if (this.login.endDate) {
      this.filter.endDate = moment(this.login.endDate).endOf("day").toDate();
    } else {
      this.filter.endDate = null;
    }

    const hasUser = !!(this.filter.user && (this.filter.user as any).id);
    const hasDevice = !!(this.filter.deviceIds && this.filter.deviceIds.length);
    const hasDate = !!(this.filter.startDate || this.filter.endDate);
    if (!hasUser && !hasDevice && !hasDate) {
      this.loadInitialLogins();
      return;
    }

    this.loginService
      .query({ filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage) => {
        this.loginPage = loginPage;
        this.showNext = !!loginPage.next;
        this.showPrevious = !!loginPage.prev;
      });
  }

  /** Input change for user search (only when userId not locked) */
  onUserInputChange(value: string | User) {
    if (this.userId) return; // ignore when locked to a user
    let searchValue: string =
      typeof value === "string" ? value : value?.displayName || "";
    this.searchLoginsAgainstUsers(searchValue);
  }

  /** Bound to user text input */
  onUserSearchChange(term: string) {
    this.userText = term;
    this.user = null;
    this.onUserInputChange(term);
    if (!term) {
      this.loginSearchResults = [];
      this.filterLogins();
    }
  }

  /** Device search input change - search suggestions only, no login query */
  async onDeviceSearchChange(term: string) {
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
      this.loginDeviceSearchResults = this.devices.filter(d =>
        String(d.uid || '').toLowerCase().includes(lower) ||
        String(d.userAgent || '').toLowerCase().includes(lower)
      ).slice(0, 20);
    }
  }

  /** Select a user from suggestions */
  selectUser(u: User) {
    this.user = u;
    this.userText = this.displayUser(u);
    this.loginSearchResults = [];
    this.filterLogins();
  }

  /** Select a device from suggestions */
  selectDevice(d: Device) {
    this.device = [d];
    this.deviceText = String(d?.uid ?? '');
    this.loginDeviceSearchResults = [];
    this.filterLogins();
  }

  /**
   * Search logins against users by a search string.
   */
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

    if (!searchString || searchString === ".*") {
      this.loginSearchResults = (this.users || []).slice(0, 10);
      return Promise.resolve(this.loginSearchResults);
    }

    const filteredUsers = (this.users || []).filter(user =>
      user.displayName && user.displayName.toLowerCase().includes(searchString.toLowerCase())
    );

    this.loginSearchResults = filteredUsers.slice(0, 10);

    return Promise.resolve(this.loginSearchResults);
  }

  /** Clear device filter and reload login data. */
  clearDeviceFilter() {
    this.device = [];
    this.deviceText = '';
    this.filterLogins();
  }

  /** Clear user filter and reload login data. */
  clearUserFilter() {
    if (this.userId) return; // no-op when locked
    this.user = null;
    this.userText = '';
    this.onUserInputChange("");
    this.filterLogins();
  }

  /** Clear the user search input and selected user */
  onClearUserInput() {
    if (this.userId) return; // locked to a user
    this.userText = '';
    this.user = null;
    this.loginSearchResults = [];
    this.filterLogins();
  }

  /** Clear the device search input and selection */
  onClearDeviceInput() {
    this.deviceText = '';
    this.device = [];
    this.loginDeviceSearchResults = [];
    this.filterLogins();
  }

  /** Display helpers */
  /**
   * Display label for a user option.
   * @param user User item
   * @returns Display name or empty string
   */
  displayUser(user: User): string {
    return user && user.displayName ? user.displayName : "";
  }

  /**
   * Display label for a device option.
   * @param device Device item
   * @returns UID or empty string
   */
  displayDevice(device: Device): string | number {
    return device && device.uid ? device.uid : "";
  }

  /** Date filter changed */
  dateFilterChanged() {
    this.filterLogins();
  }

  /** Results limit changed */
  loginResultsLimitChanged() {
    this.filterLogins();
  }

  /** Icon class helper */
  iconClass(device: Device): string {
    if (!device) return "fa fa-mobile admin-generic-icon-xs";
    if ((device as any).iconClass) return (device as any).iconClass as any;

    const userAgent = (device.userAgent || "").toLowerCase();
    if (device.appVersion === "Web Client")
      return "fa fa-desktop admin-desktop-icon-xs";
    if (userAgent.includes("android"))
      return "fa fa-android admin-android-icon-xs";
    if (userAgent.includes("ios")) return "fa fa-apple admin-apple-icon-xs";
    return "fa fa-mobile admin-generic-icon-xs";
  }

  /** Navigation helpers */
  /**
   * Navigate to the admin user details page.
   * @param user Selected user
   */
  gotoUser(user: User) {
    this.$state.go('admin.user', { userId: (user as any).id });
  }

  /**
   * Navigate to the admin device details page.
   * @param device Selected device
   */
  gotoDevice(device: Device) {
    this.$state.go('admin.device', { deviceId: (device as any).id });
  }

  /** Relative and formatted timestamp helpers */
  fromNow(timestamp: string | Date): string {
    return moment(timestamp).fromNow();
  }

  formatDate(timestamp: string | Date): string {
    return moment(timestamp).format('MMM D YYYY hh:mm:ss A');
  }

  /** Permission helper */
  hasPermission(permission: string): boolean {
    return _.contains(this.userService.myself?.role?.permissions || [], permission);
  }
}
