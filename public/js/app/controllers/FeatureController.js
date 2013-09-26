'use strict';

function FeatureController($scope, $location, $timeout, FeatureService, MapService, UserService, IconService, mageLib, appConstants) {
  var isEditing = false;
  $scope.amAdmin = UserService.amAdmin;
  $scope.token = mageLib.getLocalItem('token');

  /* 
    The observation functions are a mix of copy pasta from the observation directive, hopefully cleaned up a bit
    and using the FeatureService. May need to be cleaned up after PDC.
  */
  $scope.checkCurrentMapPanel = function (mapPanel) {
    return MapService.getCurrentMapPanel() == mapPanel;
  }

  $scope.newObservation = function () {
    $scope.observationTab = 1;
    $scope.observationCloseText = "Cancel";
    MapService.setCurrentMapPanel('observation');
    $scope.observation = $scope.createNewObservation();
    $scope.featureLocation = $scope.markerLocation;
    $scope.attachments = [];
    $scope.files = [];
  }

  $scope.cancelObservation = function () {
    MapService.setCurrentMapPanel('none');
    $scope.activeFeature = null;
    isEditing = false;
  }

  $scope.saveObservation = function () {
    // Build the observation object
    var operation = "";

    // TODO this should be UTC time
    $scope.observation.attributes.EVENTDATE = new Date().getTime();

    /* check to see if this is this an update or a new observation, if its an update, set the location and ID */
    if ($scope.observation.attributes.OBJECTID > 0) {
      $scope.observation.geometry = {
        "x": $scope.observation.geometry.coordinates[0], 
        "y": $scope.observation.geometry.coordinates[1]
      };

      // make a call to the FeatureService
      FeatureService.updateFeature($scope.currentLayerId, $scope.observation)
        .success(function (data) {
          var objectId = data.addResults ? data.addResults[0].objectId : data.updateResults[0].objectId;
          MapService.setCurrentMapPanel('none');
          $scope.activeFeature = null;
          isEditing = false;
          $scope.updatedFeature = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [$scope.observation.geometry.x, $scope.observation.geometry.y]
            },
            properties: {
              OBJECTID: objectId,
              TYPE: $scope.observation.attributes.TYPE,
              EVENTLEVEL: $scope.observation.attributes.EVENTLEVEL
            }
          } 

          if ($scope.files.length > 0) {
            $scope.fileUploadUrl = appConstants.rootUrl + '/FeatureServer/' + $scope.currentLayerId + '/' + objectId + '/addAttachment?access_token=' + mageLib.getLocalItem('token');
            $scope.uploadFile();
          }
        });
    } else {
      $scope.observation.geometry = {
        "x": $scope.markerLocation.lng, 
        "y": $scope.markerLocation.lat
      };

      // var feature = new FeatureService.feature({
      //   layerId: $scope.currentLayerId,
      //   features: $scope.observation
      // });
      // feature.$createFeature();
      // make a call to the FeatureService
      FeatureService.createFeature($scope.currentLayerId, $scope.observation)
        .success(function (data) {
          var objectId = data.addResults ? data.addResults[0].objectId : data.updateResults[0].objectId;
          MapService.setCurrentMapPanel('none');
          $scope.activeFeature = null;
          isEditing = false;

          $scope.newFeature = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [$scope.observation.geometry.x, $scope.observation.geometry.y]
            },
            properties: {
              OBJECTID: objectId,
              TYPE: $scope.observation.attributes.TYPE,
              EVENTLEVEL: $scope.observation.attributes.EVENTLEVEL
            }
          } 

          if ($scope.files.length > 0) {
              $scope.fileUploadUrl = appConstants.rootUrl + '/FeatureServer/' + $scope.currentLayerId + '/' + objectId + '/addAttachment?access_token=' + mageLib.getLocalItem('token');
              $scope.uploadFile();
            }
        });
    }
  }

  $scope.deleteObservation = function () {
    console.log('making call to delete observation');
    FeatureService.deleteObservation($scope.activeFeature.layerId, $scope.activeFeature.featureId)
      .success(function (data) {
        console.log('observation deleted, attempting to remove marker from map');
        MapService.setCurrentMapPanel('none');
        $scope.deletedFeature = $scope.activeFeature;
        isEditing = false;
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

    FeatureService.getFeature(value.layerId, value.featureId).
      success(function (data) {
        $scope.currentLayerId = value.layerId;
        $scope.observation = data;
        $scope.featureLocation = {lat: data.geometry.coordinates[1], lng: data.geometry.coordinates[0]};
        $scope.attachments = [];
        $scope.files = [];
        MapService.setCurrentMapPanel('observation');
        isEditing = true;
        
      FeatureService.getAttachments(value.layerId, value.featureId).
        success(function (data, status, headers, config) {
          $scope.attachments = data.attachmentInfos;
          $scope.attachmentUrl = appConstants.rootUrl + '/FeatureServer/'+ value.layerId
            + '/' + value.featureId + '/attachments/';
        });
      });
  }, true);

  $scope.$watch("externalFeatureClick", function (value) {
    if (!value) return;

    FeatureService.getFeature(value.layerId, value.featureId).
      success(function (data) {
        $scope.externalFeature = data;
      });
  }, true);

  $scope.deleteAttachment = function (attachmentId) {
    FeatureService.deleteAttachment($scope.activeFeature.layerId, $scope.activeFeature.featureId, attachmentId)
      .success(function(data) {
        console.log("attachment deleted");
      });
  }

  $scope.$watch("markerLocation", function(location) {
    if (!isEditing && MapService.getCurrentMapPanel() =='observation') {
      $scope.featureLocation = location;
      $scope.observation.attributes.EVENTDATE = new Date().getTime();
    }
  }, true);
}