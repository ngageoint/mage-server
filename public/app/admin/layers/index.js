var angular = require('angular');

angular.module('mage')
  .controller('AdminLayerController', require('./layer.controller'))
  .controller('AdminLayerEditController', require('./layer.edit.controller'))
  .controller('AdminLayersController', require('./layers.controller'));
