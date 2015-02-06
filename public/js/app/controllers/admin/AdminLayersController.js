'use strict';

angular.module('mage').controller('AdminLayersCtrl', ['$scope', '$injector', 'mageLib', 'Layer',
function ($scope, $injector, mageLib, Layer) {

  $scope.layerName = "";
  $scope.showLayerForm = false;
  $scope.wmsFormats = ['image/jpeg', 'image/png'];
  $scope.wmsVersions = ['1.1.1', '1.3.0'];

  $scope.fileUploadOptions = {
    acceptFileTypes: /(\.|\/)(kml)$/i,
  };
  $scope.uploads = [{}];

  $scope.layers = Layer.query();

  $scope.newLayer = function () {
    $scope.layer = new Layer({
      type: 'Feature',
      format: 'XYZ',
      base: false,
      wms: {
        format: 'image/png',
        version: '1.1.1',
        transparent: false
      }
    });

    $scope.showLayerForm = true;
    $scope.layers.push($scope.layer);
  }

  $scope.saveLayer = function () {
    var layer = $scope.layer;
    $scope.layer.$save({}, function(success) {
      $scope.fileUploadOptions = {
        url: '/FeatureServer/' + $scope.layer.id + '/import?access_token=' + mageLib.getLocalItem('token'),
        acceptFileTypes: /(\.|\/)(kml)$/i,
      };
    });
  }

  $scope.addAnotherFile = function() {
    $scope.uploads.push({});
    // var uploadDiv = angular.element('.kml-upload-div');
    //
    // <form enctype="multipart/form-data" simple-upload url="{{fileUploadOptions.url}}" allow-upload="uploadConfirmed">
    // </form>
  }

  $scope.viewLayer = function (layer) {
    $scope.layer = layer;
    $scope.showLayerForm = true;
    //$scope.fileUploadOptions.url = '/FeatureServer/'+layer.id+'/import';
    console.info('changing the file upload options');
    $scope.fileUploadOptions = {
      url: '/FeatureServer/ '+ layer.id + '/import?access_token=' + mageLib.getLocalItem('token'),
      acceptFileTypes: /(\.|\/)(kml)$/i,
    };
  }

  $scope.confirmUpload = function() {
    $scope.uploadConfirmed = true;
  }

  $scope.deleteLayer = function(layer) {
    var modalInstance = $injector.get('$modal').open({
      templateUrl: 'deleteLayer.html',
      resolve: {
        layer: function () {
          return $scope.layer;
        }
      },
      controller: function ($scope, $modalInstance, layer) {
        $scope.layer = layer;

        $scope.deleteLayer = function(layer, force) {
          console.info('delete layer');
          layer.$delete(function(success) {
            console.info('layer delete success');
            $modalInstance.close(layer);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }
    });
    modalInstance.result.then(function (layer) {
      console.info('success');
      $scope.layers = _.without($scope.layers, layer);
      $scope.layer = undefined;
      $scope.showLayerForm = false;
    }, function () {
      console.info('failure');
    });
    return;
  }

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
}])
