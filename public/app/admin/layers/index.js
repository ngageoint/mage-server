var angular = require('angular');

angular.module('mage')
  .component('wmsLayer', require('./wms.component'))
  .component('layerPreview', require('./layer-preview.component'))
  .component('layerEdit', require('./layer-edit.component'))
  .controller('AdminLayerController', require('./layer.controller'))
  .controller('AdminLayerEditController', require('./layer.edit.controller'))
  .controller('AdminLayersController', require('./layers.controller'));
