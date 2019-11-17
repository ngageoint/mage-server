import angular from 'angular';
import adminLayer from './layer.component';
import adminLayers from './layers.component';
import adminLayerEdit from './layer-edit.component';
import adminLayerDelete from './layer.delete.component';
import wms from './wms.component';
import adminLayerPreview from './layer-preview.component';

angular.module('mage')
  .component('wmsLayer',wms)
  .component('adminLayerPreview', adminLayerPreview)
  .component('adminLayer', adminLayer)
  .component('adminLayers', adminLayers)
  .component('adminLayerEdit', adminLayerEdit)
  .component('adminLayerDelete', adminLayerDelete);
