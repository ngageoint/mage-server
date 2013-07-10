'use strict';

/*
  Handle communication between the server and the map.
  Load observations, allow users to view them, and allow them to add new ones themselves.
*/
function MapController($scope, $log, $http, $location, $injector, appConstants, teams, levels, observationTypes, mageLib, FeatureService, LocationService) {
  /* Some map defaults */
  $scope.center = { lat: 39.8282, lng: -98.5795 };
  $scope.marker = { lat: 39.8282, lng: -98.5795 };
  $scope.zoom = 4;
  $scope.points = [];
  $scope.multiMarkers = {};
  $scope.externalLayer = "";
  $scope.observation = {};
  $scope.newFeature = null;
  $scope.token = mageLib.getLocalItem('token');

  /* Data models for the settings */
  $scope.layers = [];
  $scope.baseLayers = [{name: "Open Street Map"}];
  $scope.featureLayers = [];
  $scope.imageryLayers = [];

  /* Booleans for the ng-show attribues on the panels, toggling these will show and hide the map panels (i.e. layers, observation, export). */
  $scope.showSettings = false;
  $scope.showGoToAddress = false;
  $scope.showRefresh = false;
  $scope.showLocations = false;
  $scope.showExport = false;
  $scope.showObservation = false;

  /* Observation related variables and enums */
  $scope.observationTab = 1;
  $scope.teams = teams; //the next few fill in the selects on the observation form
  $scope.levels = levels;
  $scope.observationTypes = observationTypes;
  $scope.files = []; // pre upload
  $scope.attachments = []; // images loaded from the server
  $scope.progressVisible = false; // progress bar stuff
  $scope.progressVisible = 0;

  $scope.observation.attributes = {};
  $scope.observation.attributes.TEAM = $scope.teams[0];
  $scope.observation.attributes.EVENTLEVEL = $scope.levels[0];
  $scope.observation.attributes.TYPE = $scope.observationTypes[0];
  $scope.observation.attributes.UNIT = "";
  $scope.observation.attributes.DESCRIPTION = "";


  /* Uncomment the following block to enable the Tomnod layers */
  /*$scope.imageryLayers = [{
    id: 1,
    name: "Digital Globe St Louis Map", 
    enabled: false, 
    external: true,
    type: "imagery",
    url: "http://sip.tomnod.com/sip/c6754f6173d059ac82729b6243148a08/256/{z}/{x}/{y}.png",
    tms: false
  },{
    id: 2,
    name: "Digital Globe Oklahoma Map", 
    enabled: false, 
    external: true,
    type: "imagery",
    url: "http://s3.amazonaws.com/explorationlab/oktornado1/{z}/{x}/{y}.png",
    tms: true
  }];
  $scope.featureLayers = [{
    id: 3,
    name: "St Louis Crowd Rank", 
    enabled: false, 
    external: true,
    url: "https://mapperdev.tomnod.com/nod/api/stlouistornado/sage"
  },{
    id: 4,
    name: "Oklahoma Crowd Rank", 
    enabled: false, 
    external: true,
    url: "https://mapperdev.tomnod.com/nod/api/oktornado2/sage"
  }];*/

  $scope.currentLayerId = 0;
  $scope.baseLayer = $scope.baseLayers[0];

  // Should move the call to navigator out to mageLib, hand back the location then $scope.apply the results
  $scope.geolocate = function () {
    console.log("in geolocate");
    if ($window.navigator.geolocation) {
      $window.navigator.geolocation.getCurrentPosition(function(position) {
        console.log("lat " + position.coords.latitude + " lon " + position.coords.longitude);
        $scope.$apply(function() {
          $scope.zoom = 12;
          $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
        });
      });
    }
  }

  // call back for the geolocation ***REMOVED***
  $scope.setCurrentLocation = function (position) {
    $scope.zoom = 12;
    $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
    $scope.$apply();
  }

  $scope.getGeolocation = function () {
    mageLib.geolocate($scope.setCurrentLocation, mageLib.geoError, {});
  }

  /* this watch handles opening observations when a placemark on the map has been clicked. */
  $scope.$watch("observation", function (oldValue, newValue) {
    console.log("Observation changed " + JSON.stringify($scope.observation));
    if ($scope.observation.feature && $scope.observation.feature.properties.OBJECTID > 0) { //open existing observation
      FeatureService.getFeature($scope.observation.layer.id, $scope.observation.feature.properties.OBJECTID).
        success(function (data) {
          $scope.observation = data;
          $scope.attachments = [];
          $scope.files = [];
          /* Since the angular select directive works off of reference, set the TEAM, LEVEL, and TYPE attributes to theie
              corresponsing values from their respective arrays */
          $scope.observation.attributes.TEAM = _.find($scope.teams, function (t) {
                if(t.name == $scope.observation.attributes.TEAM) {
                  return t;
                }
              });
          $scope.observation.attributes.EVENTLEVEL = _.find($scope.levels, function (l) {
                if (l.color == $scope.observation.attributes.EVENTLEVEL){
                  return l;
                }
              });
          $scope.observation.attributes.TYPE = _.find($scope.observationTypes, function (o) {
                if (o.title == $scope.observation.attributes.TYPE){
                  return o;
                }
              });
          $scope.showObservation = true;

          FeatureService.getAttachments($scope.observation.attributes.LAYER, $scope.observation.attributes.OBJECTID).
            success(function (data, status, headers, config) {
              $scope.attachments = data.attachmentInfos;
              $scope.attachmentUrl = appConstants.rootUrl + '/FeatureServer/'+ $scope.observation.attributes.LAYER
                + '/' + $scope.observation.attributes.OBJECTID + '/attachments/';
            }).
            error(function (data, status, headers, config) {

            });
        }).
        error(function (data, status, headers, config) {
          // if the user does not have permissions to get layers, re-route them to the signin page
          if (status == 401) {
            $location.path('/');
          }
        });
    } else {

    }
  }, true);

  $scope.getFeatureLayers = function () {
    $http.get(appConstants.rootUrl + '/FeatureServer/', {params: mageLib.getTokenParams()}).
      success(function (data, status, headers, config) {
          console.log('got layers');
          $scope.layers = data.layers;

          _.each(data.layers, function(layer) {
            $scope.featureLayers.unshift({
              id: layer.id,
              name: layer.name,
              url: appConstants.rootUrl + "/FeatureServer/" + layer.id + "/features/?properties=OBJECTID&access_token=" + mageLib.getLocalItem('token'),
              enabled: false
            });
          });

          $scope.showSettings = true;
      }).
      error(function (data, status, headers, config) {
          $log.log("Error getting layers: " + status);
          if (status == 401) {
            $location.path('/');
          }
      });
  }

  $scope.onFeatureLayer = function(layer) {
    if (!layer.checked) {
      $scope.layer = layer;
      return;
    };

    var options = {
      method: "GET",
      url: layer.url,
      headers: {
        "Accepts": "application/json", 
        "Content-Type": "application/json"
      }
    }

    if (layer.external) {
      options.method = "JSONP",
      options.params = {
         "callback": "JSON_CALLBACK"
      }
    } 

    $http(options)
      .success(function(data, status, headers, config) {
        console.log('got points');
        layer.featureCollection = data;
        $scope.layer = layer;
      })
      .error(function(data, status, headers, config) {
        console.log("Error getting features for layer 'layer.name' : " + status);
      });
  }

  $scope.onImageryLayer = function(layer) {
    $scope.layer = layer;
  }


  /* Settings aka layer panel funcitons */
  $scope.openSettings = function () {
    console.log("in open settings");
    $scope.showSettings = true;
  }

  $scope.closeSettings = function () {
    console.log("closing settings");
    $scope.showSettings = false;
  }

  $scope.saveSettings = function () {
    console.log("saving settings");
    $scope.showSettings = false;
  }


  /* 
    The observation functions are a mix of copy pasta from the observation directive, hopefully cleaned up a bit
    and using the FeatureService. May need to be cleaned up after PDC.
  */
  $scope.newObservation = function () {
    console.log("in new observation");
    $scope.showObservation = true;
    $scope.observation = {feature: { properties: {OBJECTID: -1}}};
    $scope.attachments = [];
    $scope.files = [];
  }

  $scope.cancelObservation = function () {
    $scope.showObservation = false;
    $scope.observation = {feature: { properties: {OBJECTID: -1}}}; 
  }

  $scope.saveObservation = function () {
    // Build the observation object
    var operation = "";

    $scope.observation.attributes.EVENTDATE = new Date().getTime();

    // Convert the models for the angular selects back to strings so that the server and the app are happy
    $scope.observation.attributes.TYPE = $scope.observation.attributes.TYPE.title;
    $scope.observation.attributes.EVENTLEVEL = $scope.observation.attributes.EVENTLEVEL.color;
    $scope.observation.attributes.TEAM = $scope.observation.attributes.TEAM.name;
    $scope.observation.attributes.LAYER = $scope.currentLayerId;

    $scope.observation.geometry = {
        "x": $scope.marker.lng, 
        "y": $scope.marker.lat
      };

    /* check to see if this is this an update or a new observation, if its an update, set the location and ID */
    if ($scope.observation.feature.properties.OBJECTID > 0) {
      operation = "updateFeatures";
      obs.attributes.OBJECTID = $scope.observation.feature.properties.OBJECTID;
      // may not need to do this
      obs.geometry.x = $scope.observation.geometry.coordinates[0];
      obs.geometry.x = $scope.observation.geometry.coordinates[1];
    } else {
      operation = "addFeatures";
      delete $scope.observation.attributes.OBJECTID;
    }

    // make a call to the FeatureService
    FeatureService.saveFeature($scope.currentLayerId, $scope.observation, operation)
      .success(function (data) {
        console.log('observation created');
        var objectId = data.addResults ? data.addResults[0].objectId : data.updateResults[0].objectId;
        $scope.showObservation = false;

        if (operation == "addFeatures") {
          $scope.newFeature = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [$scope.marker.lng, $scope.marker.lat]
            },
            properties: {
              OBJECTID: objectId
            }
          } 
        }

        if ($scope.files.length > 0) {
            $scope.fileUploadUrl = appConstants.rootUrl + '/FeatureServer/' + $scope.observation.attributes.LAYER + '/' + objectId + '/addAttachment?access_token=' + mageLib.getLocalItem('token');
            $scope.uploadFile();
          }
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
  },

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

  /* Goto address, need to implement some geocoding like the android app does, otherwise pull it out for PDC. */
  $scope.openGotoAddress = function () {
    console.log("in goto address");
    $scope.showGoToAddress = true;
  }

  $scope.dismissGotoAddress = function () {
    console.log("in goto address");
    $scope.showGoToAddress = false;
  }


  /* Need to sort out how this works with the GeoJSON layers... */
  $scope.refreshPoints = function () {
    // TODO refresh point for selected layers
  //   console.log("in refresh points");
  //   $('#refresh-panel').removeCl***REMOVED***('hide');
  //   $scope.multiMarkers = {};

  //   $http.get(appConstants.rootUrl + '/FeatureServer/' + $scope.currentLayerId + '/query?outFields=OBJECTID').
  //       success(function (data, status, headers, config) {
  //           console.log('got points');
  //           $scope.points = data.features;
  //           var markers = {};
  //           for (var i = 0; i <  $scope.points.length; i++) {
  //             console.log($scope.points[i].geometry.x + ", " + $scope.points[i].geometry.y);
  //             markers[$scope.points[i].attributes.OBJECTID] = {lat: $scope.points[i].geometry.y, lng: $scope.points[i].geometry.x,draggable: false, id: $scope.points[i].attributes.OBJECTID};
  //           }
  //           $scope.multiMarkers = markers;
  //       }).
  //       error(function (data, status, headers, config) {
  //           $log.log("Error getting layers: " + status);
  //       });

  //   $('#refresh-panel').addCl***REMOVED***('hide');
  }

  $scope.dismissRefresh = function () {
    console.log("in refresh points");
    $scope.showRefresh = false;
  }


  /* Locations == FFT */
  $scope.openLocations = function() {
    console.log("in showLocations");
    $scope.showLocations = true;
  }

  $scope.dismissLocations = function() {
    console.log("in dismissLocations");
    $scope.showLocations = false;
  }


  /* Open and close the export dialog, and handle making the call to get the KML file. */
  $scope.openExport = function () {
    console.log("opening export");
    $scope.showExport = true;
  }

  $scope.closeExport = function () {
    console.log("closing export panel");
    $scope.showExport = false;
  }

  /* Export existing points to  */
  $scope.export = function () {
    console.log("exporting features to KML");
    window.location.href = appConstants.rootUrl + "/api/locations/export" + 
      "?access_token=" + mageLib.getLocalItem('token') +
      "&time_filter=" + $scope.time_filter;
    $scope.closeExport();
  }

  // Calls to make when the page is loaded
  $scope.getFeatureLayers();
  //$scope.geolocate(); // this makes angular upset because there are 2 scope.applys running at the same time...

}
