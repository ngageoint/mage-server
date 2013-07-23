'use strict';

function LayerController($scope, $log, $http, $injector, appConstants, mageLib, LayerService) {


  $scope.layers = 
  $scope.layerName = "";
  $scope.showLayerForm = false;
  $scope.wmsFormats = ['image/jpeg', 'image/png'];
  $scope.wmsVersions = ['1.1.1', '1.3.0'];

  LayerService.getAllLayers().
    success(function (layers, status, headers, config) {
      $scope.layers = layers;
    }).
    error(function (data, status, headers, config) {
      $log.log("Error getting layers: " + status);
    });

  $scope.newLayer = function () {
    $scope.layer = {
      type: 'Feature',
      format: 'XYZ',
      wms: {
        format: 'image/png',
        version: '1.1.1',
        transparent: false
      }
    };

    $scope.showLayerForm = true;
  }

  $scope.saveLayer = function () {
    var layer = $scope.layer;

    if (layer.type == 'Feature') {
      delete layer.base;
      delete layer.format;
      delete layer.wms;
    } else if (layer.type == 'Imagery') {
      if (layer.format != 'WMS') {
        delete layer.wms;
      }
    }

    if (layer.id) {
      LayerService.updateLayer(layer).
        success(function (layer, status, headers, config) {
          console.log("success updating layer")
        }).
        error(function (data, status, headers, config) {
            $log.log("Error adding layer: " + status);
        });
    } else {
      LayerService.createLayer(layer).
        success(function (layer, status, headers, config) {
          $scope.layers.push(layer);
          $scope.layer.id = layer.id;
          console.log("success creating layer")
        }).
        error(function (data, status, headers, config) {
            $log.log("Error adding layer: " + status);
        });
    }
  }

  $scope.viewLayer = function (layer) {
    $scope.layer = layer;
    $scope.showLayerForm = true;
  }
}
