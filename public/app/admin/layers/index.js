var angular = require('angular');

angular.module('mage')
  .component('wmsLayer', require('./wms.component'))
  .controller('AdminLayerController', require('./layer.controller'))
  .controller('AdminLayerEditController', require('./layer.edit.controller'))
  .controller('AdminLayersController', require('./layers.controller'));
