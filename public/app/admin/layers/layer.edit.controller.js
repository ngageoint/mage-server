angular
  .module('mage')
  .controller('AdminLayerEditController', AdminLayerEditController);

AdminLayerEditController.$inject = ['$scope', '$injector', '$location', '$routeParams', 'LocalStorageService', 'Layer'];

function AdminLayerEditController($scope, $injector, $location, $routeParams, LocalStorageService, Layer) {
  $scope.wmsFormats = ['image/jpeg', 'image/png'];
  $scope.wmsVersions = ['1.1.1', '1.3.0'];

  $scope.fileUploadOptions = {
    acceptFileTypes: /(\.|\/)(kml)$/i,
  };

  if ($routeParams.layerId) {
    Layer.get({id: $routeParams.layerId}, function(layer) {
      $scope.layer = layer;
      $scope.fileUploadOptions.url = '/api/layers/' + layer.id + '/kml?access_token=' + LocalStorageService.getToken()
    });
  } else {
    $scope.layer = new Layer();
  }

  $scope.uploads = [{}];

  $scope.saveLayer = function (layer) {
    layer.$save({}, function(success) {
      $location.path('/admin/layers/' + layer.id);
    });
  }

  $scope.cancel = function() {
    $location.path('/admin/layers/' + $scope.layer.id);
  }

  $scope.addAnotherFile = function() {
    $scope.uploads.push({});
  }

  $scope.confirmUpload = function() {
    $scope.uploadConfirmed = true;
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
}
