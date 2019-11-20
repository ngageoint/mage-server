class AdminDeviceDeleteController {
  constructor(DeviceService) {
    this.DeviceService = DeviceService;
  }

  $onInit() {
    this.device = this.resolve.device;
  }

  deleteDevice(device) {
    this.DeviceService.deleteDevice(device).then(() => {
      this.modalInstance.close(device);
    });
  }

  cancel() {
    this.modalInstance.dismiss('cancel');
  }
}

AdminDeviceDeleteController.$inject = ['DeviceService'];

export default {
  template: require('./device.delete.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: AdminDeviceDeleteController
};