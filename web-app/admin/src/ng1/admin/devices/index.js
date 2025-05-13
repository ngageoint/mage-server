import angular from 'angular';
import adminDevice from './device.component';
import adminDevices from './devices.component';
import adminDeviceEdit from './device.edit.component';
import adminDeviceDelete from './device.delete.component';

angular.module('mage')
  .component('adminDevice', adminDevice)
  .component('adminDevices', adminDevices)
  .component('adminDeviceEdit', adminDeviceEdit)
  .component('adminDeviceDelete', adminDeviceDelete);
