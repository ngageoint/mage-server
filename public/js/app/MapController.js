'use strict';

angular.module("sage", ["ui", "leaflet-directive", "sage.***REMOVED***s"]);

/*
  Handle communication between the server and the map.
  Load observations, allow users to view them, and allow them to add new ones themselves.
*/
function MapController($scope, $log, $http, $injector, appConstants) {
	/* Some map defaults */
  $scope.center = { lat: 39.8282, lng: -98.5795 };
  $scope.marker = { lat: 39.8282, lng: -98.5795 };
  $scope.zoom = 4;
  $scope.points = [];
  $scope.multimarkers = {};

  /* Data models for the settings */
  $scope.baseMaps = [{type: "Open Street Map"}];
  $scope.layers = [];
  $scope.currentLayerId = 0;

  $(document).ready(function() {
    // handle desktop browsers so that they play nice with the bootstrap navbar.
    if($(window).width() > 767) {
      $('#map').css('height', ($(window).height() - 40));
    }

    $http.get(appConstants.rootUrl + '/FeatureServer/').
        success(function (data, status, headers, config) {
            console.log('got layers');
            $scope.layers = data.layers;
            $('#layer-select-panel').removeCl***REMOVED***('hide');
        }).
        error(function (data, status, headers, config) {
            $log.log("Error getting layers: " + status);
        });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        console.log("lat " + position.coords.latitude + " lon " + position.coords.longitude);
        $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
        $scope.zoom = 12;
      });
    }
  });

  $(window).resize(function () {
    if($(window).width() > 767) {
      $('#map').css('height', ($(window).height() - 40));
    }
  }).resize();

  /* Data models for the observation form comboboxes */
  $scope.teams = [{name: "AZ-TF1"},
                  {name: "CA-TF1"},
                  {name: "CA-TF2"},
                  {name: "CA-TF3"},
                  {name: "CA-TF4"},
                  {name: "CA-TF5"},
                  {name: "CA-TF6"},
                  {name: "CA-TF7"},
                  {name: "IN-TF8"},
                  {name: "MA-TF1"},
                  {name: "MD-TF1"},
                  {name: "MO-TF1"},
                  {name: "NE-TF1"},
                  {name: "NM-TF1"},
                  {name: "NV-TF1"},
                  {name: "NY-TF1"},
                  {name: "OH-TF1"},
                  {name: "PA-TF1"},
                  {name: "TN-TF1"},
                  {name: "TX-TF1"},
                  {name: "UT-TF1"},
                  {name: "VA-TF1"},
                  {name: "VA-TF2"},
                  {name: "WA-TF1"},
                  {name: "Other"}];

  $scope.levels = [ {color: "Normal"}, 
                    {color: "Yellow"}, 
                    {color: "Red"}];

  $scope.observationTypes = [{title: "Animal issue"},
                             {title: "Chemical hazard"},
                             {title: "Command post"},
                             {title: "Confirmed victim"},
                             {title: "Confirmed Victim removed"},
                             {title: "Emergency collection point"},
                             {title: "Fire"},
                             {title: "Helicopter landing site"},
                             {title: "Human remains"},
                             {title: "Possible criminal activity"},
                             {title: "Shelter in place"},
                             {title: "Special needs"},
                             {title: "Staging area"},
                             {title: "Start search"},
                             {title: "Stop search"},
                             {title: "Structure damaged but safe"},
                             {title: "Structure major damage no entry"},
                             {title: "Structure no damage"},
                             {title: "Victim detected"},
                             {title: "Water level"}];

  /* Observation parameters. These are what get sent back to the server when a new observation is created. */
  $scope.team = $scope.teams[0];
  $scope.level = $scope.levels[0];
  $scope.observationType = $scope.observationTypes[0];
  $scope.unit;
  $scope.description;
  $scope.baseMap = $scope.baseMaps[0];

  $scope.geolocate = function () {
    console.log("in geolocate");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        console.log("lat " + position.coords.latitude + " lon " + position.coords.longitude);
        $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
        $scope.zoom = 12;

      });
    }
  }


  $scope.openSettings = function () {
    console.log("in open settings");
    $('#settings-panel').removeCl***REMOVED***('hide');
  }

  $scope.selectLayer = function () {
    console.log("layer selected");
    $('#layer-select-panel').addCl***REMOVED***('hide');
  }

  $scope.closeSettings = function () {
    console.log("in new observation");
    $('#settings-panel').addCl***REMOVED***('hide');
  }

  $scope.saveSettings = function () {
    console.log("in new observation");
    // add code to send the observation to the server here
    $('#settings-panel').addCl***REMOVED***('hide');
  }

  $scope.newObservation = function () {
    console.log("in new observation");
    $('#observation-panel').removeCl***REMOVED***('hide');
  }

  /* Hide the observation panel, and reset the fields for next time. */
  $scope.cancelObservation = function () {
    console.log("in new observation");
    // add code to send the observation to the server here
    $('#observation-panel').addCl***REMOVED***('hide');
  }

  /* Send the observation to the server */
  $scope.saveObservation = function () {
    console.log("in new observation");
    // add code to send the observation to the server here

    console.log("Team: " + $scope.team.name + ", Level: " + $scope.level.color + ", Observation Type: " + $scope.observationType.title + ", Unit: " + $scope.unit + ", Description: " + $scope.description);
    
    var ob = [{"geometry":{"x": $scope.center.lat, "y":$scope.center.lng},"attributes":{"EVENTDATE":new Date().getTime(),"TYPE":$scope.observationType.title,"EVENTLEVEL":$scope.level.color,"TEAM":$scope.team.name,"DESCRIPTION":$scope.description,"EVENTCLEAR":0,"UNIT":$scope.unit}}]

    $http.post(appConstants.rootUrl + '/FeatureServer/'+ $scope.currentLayerId +'/addFeatures', "features=" + JSON.stringify(ob), {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
      success(function (data, status, headers, config) {
          $scope.points = data;
          for(var i = 0; i < data.length; i++){
              console.log("Data: "+i+"= "+angular.toJson(data[i]));
          }
      }).
      error(function (data, status, headers, config) {
          $log.log("Error adding feature: " + status);
      });

    $('#observation-panel').addCl***REMOVED***('hide');
  }
  
  $scope.openGotoAddress = function () {
    console.log("in goto address");
    $('#goto-address-panel').removeCl***REMOVED***('hide');
  }

  $scope.dismissGotoAddress = function () {
    console.log("in goto address");
    $('#goto-address-panel').addCl***REMOVED***('hide');
  }

  $scope.gotoAddress = function () {
    console.log("in goto address");
    $('#goto-address-panel').addCl***REMOVED***('hide');
  }

  $scope.$watch('points', function() {
    console.log($scope.points);
    for (var i = 0; i <  $scope.points.length; i++) {
      console.log($scope.points[i].geometry.x + ", " + $scope.points[i].geometry.y);
      $scope.multimarkers["'"+$scope.points[i].attributes.OBJECTID+"'"] = {lat: $scope.points[i].geometry.x, lng: $scope.points[i].geometry.y,draggable: false,};
    }
    console.log($scope.multimarkers);
  });

  $scope.refreshPoints = function () {
    console.log("in refresh points");
    $('#refresh-panel').removeCl***REMOVED***('hide');
    $http.get(appConstants.rootUrl + '/FeatureServer/' + $scope.currentLayerId + '/query?outFields=OBJECTID').
        success(function (data, status, headers, config) {
            console.log('got points');
            $scope.points = data.features;
        }).
        error(function (data, status, headers, config) {
            $log.log("Error getting layers: " + status);
        });

    $('#refresh-panel').addCl***REMOVED***('hide');
  }

  $scope.dismissRefresh = function () {
    console.log("in refresh points");
    $('#refresh-panel').addCl***REMOVED***('hide');
  }

  $scope.fft = function() {
    $('#fft-panel').removeCl***REMOVED***('hide'); 
    console.log("inFFT");
  }

  $scope.dismissFft = function() {
    $('#fft-panel').addCl***REMOVED***('hide'); 
    console.log("inFFT");
  }
}
