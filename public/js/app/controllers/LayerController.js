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
      base: false,
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

  /* Attachment upload functions, some of these make more sense in the FeatureService...more copy pasta */
  $scope.setFiles = function (element) {
    $scope.$apply(function(scope) {
      console.log('files:', element.files);
      // Turn the FileList object into an Array
      $scope.files = []
      for (var i = 0; i < element.files.length; i++) {
        $scope.files.push(element.files[i])
      }
      $scope.progressVisible = false
    });
  }

  $scope.uploadFile = function() {
    var fd = new FormData()
    for (var i in $scope.files) {
      fd.append("attachment", $scope.files[i])
    }
    var xhr = new XMLHttpRequest()
    xhr.upload.addEventListener("progress", uploadProgress, false)
    xhr.addEventListener("load", uploadComplete, false)
    xhr.addEventListener("error", uploadFailed, false)
    xhr.addEventListener("abort", uploadCanceled, false)
    xhr.open("POST", $scope.fileUploadUrl)
    $scope.progressVisible = true
    xhr.send(fd)
  }

  function uploadProgress(evt) {
    $scope.$apply(function(){
      if (evt.lengthComputable) {
        $scope.progress = Math.round(evt.loaded * 100 / evt.total)
      } else {
        $scope.progress = 'unable to compute'
      }
    });
  }

  function uploadComplete(evt) {
    $scope.files = [];
    $scope.progressVisible = false
  }

  function uploadFailed(evt) {
    alert("There was an error attempting to upload the file.")
  }

  function uploadCanceled(evt) {
    $scope.$apply(function(){
      $scope.progressVisible = false
    })
    alert("The upload has been canceled by the user or the browser dropped the connection.")
  }
}
