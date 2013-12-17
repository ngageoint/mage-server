'use strict';

function FeatureController($scope, $location, $timeout, Feature, FeatureService, FeatureAttachment, MapService, UserService, IconService, mageLib, appConstants) {
  var isEditing = false;
  $scope.amAdmin = UserService.amAdmin;
  $scope.token = mageLib.getLocalItem('token');

  $scope.cancelObservation = function (observation) {
    $scope.newObservationEnabled = false;
    $scope.activeFeature = null;
    isEditing = false;
  }

  $scope.saveObservation = function (observation) {
    // Build the observation object
    var operation = "";

    // TODO this should be UTC time
    observation.properties.EVENTDATE = new Date().getTime();
    var create = observation.id == null;
    var layerId = observation.layerId;
    observation.$save({}, function(value, responseHeaders) {
      create ? $scope.newFeature = value : $scope.updatedFeature = value;
      $scope.newObservationEnabled = false;
      $scope.activeFeature = null;
      observation.layerId = layerId;
      isEditing = false;
      if ($scope.files && $scope.files.length > 0) {
        $scope.fileUploadUrl = appConstants.rootUrl + '/FeatureServer/' + observation.layerId + '/features/' + observation.id + '/attachments';
        $scope.uploadFile(observation);
      }
      $scope.editMode = false;
      $scope.$emit('newObservationSaved', observation);
    });
  }

  $scope.deleteObservation = function (observation) {
    console.log('making call to delete observation');
    observation.$delete({}, function(success) {
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
    var fd = new FormData()
    for (var i in $scope.files) {
      fd.append("attachment", $scope.files[i])
    }
    var xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", uploadProgress, false);
    xhr.addEventListener("load", function(event) {
      uploadComplete(event, observation);
    }, false);
    xhr.addEventListener("error", uploadFailed, false);
    xhr.addEventListener("abort", uploadCanceled, false);
    xhr.open("POST", $scope.fileUploadUrl + "?access_token=" + mageLib.getToken());
    // xhr.setRequestHeader('Authorization', 'Bearer ' + mageLib.getToken());
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

  function uploadComplete(event, observation) {
    $scope.files = [];
    $scope.progressVisible = false;
    console.info('event is ', event);
    var response = angular.fromJson(event.target.responseText);
    console.info('response is', response);
    console.info('observation.layerId ' + observation.layerId);
    console.info('observation', observation);
    observation.attachments.push(response);
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

  $scope.deleteAttachment = function (observation, attachmentId) {
    FeatureAttachment.delete({id: attachmentId, layerId: observation.layerId, featureId: observation.id}, function(success) {
      console.info('success');
      console.log("attachment deleted");
      for (var i = 0; i < observation.attachments.length; i++) {
        if (observation.attachments[i].id == attachmentId) {
          observation.attachments.splice(i, 1);
        }
      }
    }, function(failure) {
      console.info('failure');
    });
  }
}