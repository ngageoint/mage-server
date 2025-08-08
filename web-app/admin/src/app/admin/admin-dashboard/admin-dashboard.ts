import { Component, Inject, OnInit, EventEmitter, Output } from "@angular/core";
import * as angular from 'angular';
import { Router } from "@angular/router";
import * as _ from "underscore";
import * as moment from "moment";
import {
  UserService,
  DeviceService,
  DevicePagingService,
  LoginService,
  EventService,
  LayerService,
  UserPagingService,
} from "admin/src/app/upgrade/ajs-upgraded-providers";
import { User } from "core-lib-src/user";
import {
  Device,
  DevicesResponse,
  Login,
  LoginFilter,
  LoginPage,
  LoginSearchResults,
  UsersResponse,
} from "admin/src/@types/dashboard/admin-dashboard";

/**
 * Admin dashboard component for managing users, devices, and logins.
 */
@Component({
  selector: "admin-dashboard",
  templateUrl: "./admin-dashboard.html",
  styleUrls: ["./admin-dashboard.scss"],
})
export class AdminDashboardComponent implements OnInit {
  @Output() onUserActivated = new EventEmitter<any>();
  @Output() onDeviceEnabled = new EventEmitter<any>();

  users: User[] = [];
  userSearch: string = "";
  userState: string = "inactive";
  inactiveUsers: User[] = [];
  stateAndData: UsersResponse;

  devices: Device[] = [];
  deviceSearch = "";
  deviceState = "unregistered";
  unregisteredDevices: Device[] = [];
  deviceStateAndData: DevicesResponse;

  login = {
    startDateOpened: false,
    endDateOpened: false,
    startDate: null,
    endDate: null,
  };

  loginPage: LoginPage;
  loginResultsLimit: number = 25;
  loginSearchResults: LoginSearchResults[] = [];
  loginDeviceSearchResults: Device[] = [];
  firstLogin: Login;
  showPrevious: boolean = false;
  showNext: boolean = false;

  filter: LoginFilter = {};
  user: User = null;
  device: Device[] = [];

  toggleFilters = false;

  private $state: any;

  constructor(
    private router: Router,
    @Inject(UserService) private userService: any,
    @Inject(DeviceService) private deviceService: any,
    @Inject(DevicePagingService) private devicePagingService: any,
    @Inject(LoginService) private loginService: any,
    @Inject(EventService) private eventService: any,
    @Inject(LayerService) private layerService: any,
    @Inject(UserPagingService) private userPagingService: any,
    @Inject('$injector') private $injector: any,
  ) {
    this.$state = this.$injector.get('$state');
  }

  /**
   * Initialize the component, loading users, devices, and login data.
   */
  ngOnInit(): void {
    this.stateAndData = this.userPagingService.constructDefault();
    this.deviceStateAndData = this.devicePagingService.constructDefault();

    this.devicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.unregisteredDevices = this.devicePagingService.devices(
        this.deviceStateAndData[this.deviceState],
      );
    });

    this.loginService
      .query({ limit: this.loginResultsLimit })
      .then((loginPage: LoginPage) => {
        this.loginPage = loginPage;
        if (loginPage.logins.length) {
          this.firstLogin = loginPage.logins[0];
        }
        loginPage.logins.forEach((login) => {
          this.users.push(login.user);
          this.devices.push(login.device);
        });
      });

    this.userPagingService.refresh(this.stateAndData).then(() => {
      this.inactiveUsers = this.userPagingService.users(
        this.stateAndData[this.userState],
      );
    });

    this.loadDevicesForDropdown();
  }

  /**
   * Check the total count of users for the current state.
   */
  count() {
    return this.userPagingService.count(this.stateAndData[this.userState]);
  }

  /**
   * Check if there is a next page of users.
   */
  hasNext() {
    return this.userPagingService.hasNext(this.stateAndData[this.userState]);
  }

  /**
   * Load the next page of users.
   */
  next() {
    this.userPagingService
      .next(this.stateAndData[this.userState])
      .then((users) => {
        this.inactiveUsers = users;
      });
  }

  /**
   * Check if there is a previous page of users.
   */
  hasPrevious() {
    return this.userPagingService.hasPrevious(
      this.stateAndData[this.userState],
    );
  }

  /**
   * Load the previous page of users.
   */
  previous() {
    this.userPagingService
      .previous(this.stateAndData[this.userState])
      .then((users) => {
        this.inactiveUsers = users;
      });
  }

  /**
   * Check the total count of devices for the current state.
   */
  deviceCount() {
    return this.devicePagingService.count(
      this.deviceStateAndData[this.deviceState],
    );
  }

  /**
   * Check if there is a next page of devices.
   */
  hasNextDevice() {
    return this.devicePagingService.hasNext(
      this.deviceStateAndData[this.deviceState],
    );
  }

  /**
   * Load the next page of devices.
   */
  nextDevice() {
    this.devicePagingService
      .next(this.deviceStateAndData[this.deviceState])
      .then((devices) => {
        this.unregisteredDevices = devices;
      });
  }

  /**
   * Check if there is a previous page of devices.
   */
  hasPreviousDevice() {
    return this.devicePagingService.hasPrevious(
      this.deviceStateAndData[this.deviceState],
    );
  }

  /**
   * Load the previous page of devices.
   */
  previousDevice() {
    this.devicePagingService
      .previous(this.deviceStateAndData[this.deviceState])
      .then((devices) => {
        this.unregisteredDevices = devices;
      });
  }

  /**
   * Search users based on the `userSearch` string.
   */
  search() {
    this.userPagingService
      .search(this.stateAndData[this.userState], this.userSearch)
      .then((users) => {
        this.inactiveUsers = users;
      });
  }

  /**
   * Search devices based on the `deviceSearch` string.
   */
  searchDevices() {
    this.devicePagingService
      .search(this.deviceStateAndData[this.deviceState], this.deviceSearch)
      .then((devices) => {
        if (devices.length > 0) {
          this.unregisteredDevices = devices;
        } else {
          this.devicePagingService
            .search(
              this.deviceStateAndData[this.deviceState],
              this.deviceSearch,
              this.deviceSearch,
            )
            .then((devices) => {
              this.unregisteredDevices = devices;
            });
        }
      });
  }

  /**
   * Search logins against users by a search string.
   * @param searchString The string to search users by.
   */
  searchLoginsAgainstUsers(searchString: string | null) {
    if (!searchString) searchString = ".*";
    return this.userPagingService
      .search(this.stateAndData["all"], searchString)
      .then((users) => {
        this.loginSearchResults = users.length
          ? users
          : [{ displayName: "No Results Found" }];
        return this.loginSearchResults;
      });
  }

  /**
   * Load all devices for the dropdown filter.
   */
  loadDevicesForDropdown() {
    this.devicePagingService.refresh(this.deviceStateAndData).then(() => {
      this.loginDeviceSearchResults = this.devicePagingService.devices(
        this.deviceStateAndData["all"],
      );
    });
  }

  /**
   * Determine the icon class for a device based on its type or user agent.
   * @param device The device to determine the icon for.
   */
  iconClass(device: Device): string {
    if (!device) return "";
    if (device.iconClass) return device.iconClass;

    const userAgent = (device.userAgent || "").toLowerCase();
    if (device.appVersion === "Web Client")
      return "fa fa-desktop admin-desktop-icon-xs";
    if (userAgent.includes("android"))
      return "fa fa-android admin-android-icon-xs";
    if (userAgent.includes("ios")) return "fa fa-apple admin-apple-icon-xs";
    return "fa fa-mobile admin-generic-icon-xs";
  }

  /**
   * Navigate to the user details page.
   * @param user The user to view.
   */
  gotoUser(user: User) {
    this.$state.go('admin.user', { userId: user.id });
  }

  /**
   * Navigate to the device details page.
   * @param device The device to view.
   */
  gotoDevice(device: Device) {
    this.$state.go('admin.device', { deviceId: device.id });
  }

  /**
   * Check if the current user has a specific permission.
   * @param permission The permission string to check.
   */
  hasPermission(permission: string): boolean {
    return _.contains(this.userService.myself.role.permissions, permission);
  }

  /**
   * Activate a user.
   * @param event Mouse event to stop propagation.
   * @param user The user to activate.
   */
  activateUser(event: MouseEvent, user: User) {
    event.stopPropagation();
    user.active = true;
    this.userService.updateUser(user.id, user, () => {
      this.userPagingService.refresh(this.stateAndData).then(() => {
        this.inactiveUsers = this.userPagingService.users(
          this.stateAndData[this.userState],
        );
      });
      this.onUserActivated.emit({ user });
    });
  }

  /**
   * Register a device.
   * @param event Mouse event to stop propagation.
   * @param device The device to register.
   */
  registerDevice(event: MouseEvent, device: Device) {
    event.stopPropagation();
    device.registered = true;

    this.deviceService.updateDevice(device).then((updated: User) => {
      this.devicePagingService.refresh(this.deviceStateAndData).then(() => {
        this.unregisteredDevices = this.devicePagingService.devices(
          this.deviceStateAndData[this.deviceState],
        );
      });
      this.onDeviceEnabled.emit({ user: updated });
    });
  }

  /**
   * Navigate to a specific login page URL.
   * @param url URL of the login page.
   */
  pageLogin(url: string) {
    this.loginService
      .query({ url, filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage) => {
        if (loginPage.logins.length) {
          this.loginPage = loginPage;
          this.showNext = loginPage.logins.length !== 0;
          this.showPrevious = loginPage.logins[0].id !== this.firstLogin.id;
        }
      });
  }

  /**
   * Filter logins based on selected user, device, and date range.
   */
  filterLogins() {
    this.filter.user = this.user;

    if (this.device && this.device.length > 0) {
      this.filter.deviceIds = this.device.map((d) => d.id).join(",");
    } else {
      this.filter.deviceIds = null;
    }

    this.filter.startDate = this.login.startDate;

    if (this.login.endDate) {
      this.filter.endDate = moment(this.login.endDate).endOf("day").toDate();
    }

    this.loginService
      .query({ filter: this.filter, limit: this.loginResultsLimit })
      .then((loginPage) => {
        this.loginPage = loginPage;
        this.showNext = loginPage.logins.length !== 0;
        this.showPrevious = false;
      });
  }

  /**
   * Handle input change for user search.
   * @param value Search string or User object.
   */
  onUserInputChange(value: string | User) {
    let searchValue: string =
      typeof value === "string" ? value : value?.displayName || "";
    this.searchLoginsAgainstUsers(searchValue);
  }

  /**
   * Clear device filter and reload login data.
   */
  clearDeviceFilter() {
    this.device = [];
    this.filterLogins();
  }

  /**
   * Clear user filter and reload login data.
   */
  clearUserFilter() {
    this.user = null;
    this.onUserInputChange("");
    this.filterLogins();
  }

  /**
   * Get display string for a user.
   * @param user The user to display.
   */
  displayUser(user: User): string {
    return user && user.displayName ? user.displayName : "";
  }

  /**
   * Get display string for a device.
   * @param user The device to display.
   */
  displayDevice(user: Device): string | number {
    return user && user.uid ? user.uid : "";
  }

  /**
   * Handle changes in date filter.
   */
  dateFilterChanged() {
    this.filterLogins();
  }

  /**
   * Handle changes in login results limit.
   */
  loginResultsLimitChanged() {
    this.filterLogins();
  }

  /**
   * Open the start date picker.
   * @param event DOM event.
   */
  openLoginStart(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.login.startDateOpened = true;
  }

  /**
   * Open the end date picker.
   * @param event DOM event.
   */
  openLoginEnd(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.login.endDateOpened = true;
  }
}
