"use strict";

import angular from 'angular';

class AdminDeviceEditController {
  constructor($state, $stateParams, LocalStorageService, DeviceService, UserPagingService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.DeviceService = DeviceService;
    this.UserPagingService = UserPagingService;

    this.token = LocalStorageService.getToken();

    this.userState = 'all';
    this.isSearching = false;
    this.stateAndData = this.UserPagingService.constructDefault();
    this.pocs = [];
    this.poc = null;
  }

  $onInit() {
    if (this.$stateParams.deviceId) {
      this.DeviceService.getDevice(this.$stateParams.deviceId).then(device => {
        this.device = angular.copy(device);
        this.poc = this.device.user;
      });
    } else {
      this.device = {};
    }

    this.stateAndData.delete('active');
    this.stateAndData.delete('inactive');
    this.stateAndData.delete('disabled');

    this.UserPagingService.refresh(this.stateAndData).then(() => {
      this.pocs = this.UserPagingService.users(this.stateAndData[this.userState]);
    });
  }

  searchPocs(searchString) {
    this.isSearching = true;

    if (searchString == null) {
      searchString = '.*';
    }

    return this.UserPagingService.search(this.stateAndData[this.userState], searchString).then(users => {
      this.pocs = users;
      this.isSearching = false;

      return this.pocs;
    });
  }

  iconClass(device) {
    if (device.iconClass) return device.iconClass;

    var userAgent = device.userAgent || "";

    if (device.appVersion === 'Web Client') {
      device.iconClass = 'fa-desktop admin-desktop-icon';
    } else if (userAgent.toLowerCase().indexOf("android") !== -1) {
      device.iconClass = 'fa-android admin-android-icon';
    } else if (userAgent.toLowerCase().indexOf("ios") !== -1) {
      device.iconClass = 'fa-apple admin-apple-icon';
    } else {
      device.iconClass = 'fa-mobile admin-generic-icon';
    }

    return device.iconClass;
  }

  cancel() {
    if (this.device.id) {
      this.$state.go('admin.device', { deviceId: this.device.id })
    } else {
      this.$state.go('admin.devices');
    }
  }

  saveDevice() {
    this.saving = true;
    this.error = false;

    var device = this.device;
    if (this.poc != null) {
      device.userId = this.poc.id;
    }

    if (device.id) {
      this.DeviceService.updateDevice(device).then(() => {
        this.$state.go('admin.device', { deviceId: device.id });
      }, response => {
        this.saving = false;
        this.error = response.responseText;
        this.poc = null;
      });
    } else {
      this.DeviceService.createDevice(device).then(newDevice => {
        this.$state.go('admin.device', { deviceId: newDevice.id });
      }, response => {
        this.saving = false;
        this.error = response.responseText;
        this.poc = null;
      });
    }
  }
}

AdminDeviceEditController.$inject = ['$state', '$stateParams', 'LocalStorageService', 'DeviceService', 'UserPagingService'];

export default {
  template: require('./device.edit.html'),
  controller: AdminDeviceEditController
};

