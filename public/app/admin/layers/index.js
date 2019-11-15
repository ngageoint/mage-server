import angular from 'angular';
import wms from './wms.component';

angular.module('mage')
  .component('wmsLayer',wms)
  .component('layerPreview', require('./layer-preview.component'))
  .component('layerEdit', require('./layer-edit.component'))
  .controller('AdminLayerController', require('./layer.controller'))
  .controller('AdminLayerEditController', require('./layer.edit.controller'))
  .controller('AdminLayersController', require('./layers.controller'));
