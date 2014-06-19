'use strict';

function FeatureController($scope, $location, $timeout, Feature, FeatureService, FeatureState, MapService, UserService, mageLib, appConstants) {
  var isEditing = false;
  $scope.token = mageLib.getLocalItem('token');

  $scope.cancelObservation = function (observation) {
    $scope.newObservationEnabled = false;
    $scope.activeFeature = null;
    isEditing = false;
  }

  $scope.deleteObservation = function (observation) {
    console.log('making call to archive observation');
    FeatureState.save(
      {layerId: observation.layerId, featureId: observation.id},
      {name: 'archive'},
      function(success) {
        $scope.deletedFeature = $scope.activeFeature;
        isEditing = false;
        $scope.$emit('observationDeleted', observation);
    });
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

  $scope.uploadFile = function(observation) {
    var fileUploadUrl ='/FeatureServer/' + appConstants.featureLayer.id + '/features/' + observation.id + '/attachments';

    var fd = new FormData()
    for (var i in $scope.files) {
      fd.append("attachment", $scope.files[i])
    }
    var xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", uploadProgress, false);
    xhr.addEventListener("load", function(event) {
      uploadComplete(event);
    }, false);
    xhr.addEventListener("error", uploadFailed, false);
    xhr.addEventListener("abort", uploadCanceled, false);
    xhr.open("POST", fileUploadUrl + "?access_token=" + mageLib.getToken());
    $scope.progressVisible = true;
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

  function uploadComplete(event) {
    $scope.files = [];
    $scope.progressVisible = false;
    var response = angular.fromJson(event.target.responseText);
    $scope.observation.attachments.push(response);
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

  $scope.formatUser = function(userId) {
    if (!userId) return;

    UserService.getUser(userId)
      .then(function(user) {
        return $q.when(user);
      });
  }

  $scope.formatFeatureDate = function(value) {
    return moment(value).utc().format("YYYY-MM-DD HH:mm:ss");
  }

  /* this watch handles opening observations when a placemark on the map has been clicked. */
  $scope.$watch("activeFeature", function (value) {
    if (!value) return;

    $scope.observationCloseText = "Close";

    $scope.observation = Feature.get({layerId: value.layerId, id: value.feature.id}, function(success) {
        $scope.currentLayerId = value.layerId;
        $scope.attachments = [];
        $scope.files = [];
        $scope.newObservationEnabled = false;
        isEditing = true;
        $scope.observation.layerId = value.layerId;
        $scope.attachmentUrl = '/FeatureServer/'+ value.layerId
            + '/features/' + $scope.observation.id + '/attachments/';
    });

    //$('.news-items').animate({scrollTop: $('#'+value.feature.id).position().top},500);

   }, true);

  $scope.$watch("externalFeatureClick", function (value) {
    if (!value) return;

    FeatureService.getFeature(value.layerId, value.featureId).
      success(function (data) {
        $scope.externalFeature = data;
      });
  }, true);
}
