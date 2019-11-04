import angular from 'angular';
import adminLayer from './layer.component';
import adminLayers from './layers.component';
import adminLayerEdit from './layer.edit.component';
import adminLayerDelete from './layer.delete.component';

angular.module('mage')
  .component('adminLayer', adminLayer)
  .component('adminLayers', adminLayers)
  .component('adminLayerEdit', adminLayerEdit)
  .component('adminLayerDelete', adminLayerDelete);
