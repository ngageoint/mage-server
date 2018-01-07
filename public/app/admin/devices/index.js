var angular = require('angular');

angular.module('mage')
  .controller('AdminDeviceController', require('./device.controller'))
  .controller('AdminDeviceEditController', require('./device.edit.controller'))
  .controller('AdminDevicesController', require('./devices.controller'));
