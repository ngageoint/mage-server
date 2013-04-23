sage.directive('observation', function($http) {
	return {
		restrict: "A",
		templateUrl: "/js/app/partials/observation-template.html",
		scope: {
			observationId: "=observationid",
			marker: "=marker",
			currentLayerId: "=currentlayerid"
		},
		controller: derp = function ($scope, $element, $attrs, $http, teams, levels, observationTypes, appConstants) {
			/* Observation parameters. These are what get sent back to the server when a new observation is created. */
		  $scope.teams = teams;
		  $scope.levels = levels;
		  $scope.observationTypes = observationTypes;

		  $scope.observation = {}; // need to clean all of this up and figure out how to make it generic
		  $scope.team = teams[0];
		  $scope.level = levels[0];
		  $scope.observationType = observationTypes[0];
		  $scope.unit = "";
		  $scope.description = "";
		  $scope.attachment = "";

		  // this is a hack, need to start using the ui-bootstrap, couldnt get the yo-dawged directive's scopes to play nice 
   		$scope.selectedTab = 1;


			/*
				If the ID changes and is -1, then it is a new observation, pop open the form and let the user create a new observation.
				If it is not -1, or 0, then lookup the rest of the attributes and populate the form.
			*/
			$scope.$watch("observationId", function (newValue, oldValue) {
				console.log("id changed!!!!");
				if ($scope.observationId == 0) {					// hide the observation dialog		
					$('#observation-panel').addCl***REMOVED***('hide');
					console.log ('id = 0');
				} else if($scope.observationId == -1) {	// creating a new observation 
					$scope.team = teams[0];
				  $scope.level = levels[0];
				  $scope.observationType = observationTypes[0];
				  $scope.unit = "";
				  $scope.description = "";
					$('#observation-panel').removeCl***REMOVED***('hide');
					console.log('id = -1');
				} else if ($scope.observationId > 1) {  // look up the observation and show it in the dialog
					$('#observation-panel').removeCl***REMOVED***('hide');
					$http.get(appConstants.rootUrl + '/FeatureServer/'+ $scope.currentLayerId + '/' + $scope.observationId + "?query&outFields=*").
			      success(function (data, status, headers, config) {
			          $scope.observation = data;
			          $scope.team = _.find($scope.teams, function (t) {
								  if(t.name == $scope.observation.attributes.TEAM) {
								  	return t;
								  }
								});
								$scope.level = _.find($scope.levels, function (l) {
								  if (l.color == $scope.observation.attributes.EVENTLEVEL){
								  	return l;
								  }
								});
								$scope.observationType = _.find($scope.observationTypes, function (o) {
								  if (o.title == $scope.observation.attributes.TYPE){
								  	return o;
								  }
								});
								$scope.description = $scope.observation.attributes.DESCRIPTION;
								$scope.unit = $scope.observation.attributes.UNIT;
			      }).
			      error(function (data, status, headers, config) {
			          $log.log("Error adding feature: " + status);
			      });
					console.log('id > 0');
				} else {
					console.log("id is weird...not so sure what to do" + $scope.observationId);
				}
			}, true); // scope.$watch


			/* Hide the observation panel, and reset the fields for next time. */
		  $scope.cancelObservation = function () {
		    console.log("in new observation");
		    $scope.observationId = 0; // hide the observation panel
		  }


		  /* Send the observation to the server */
		  $scope.saveObservation = function () {
		    console.log("in new observation");
		    console.log("Team: " + $scope.team.name + ", Level: " + $scope.level.color + ", Observation Type: " + $scope.observationType.title + ", Unit: " + $scope.unit + ", Description: " + $scope.description);
		    
		    var operation = "";
		    var ob = [];
		    if ($scope.observationId > 0) {
		    	operation = "updateFeatures";
		    	ob = [{"geometry":{"x": $scope.observation.geometry.coordinates[0], "y":$scope.observation.geometry.coordinates[1]},"attributes":{"OBJECTID": $scope.observationId, "EVENTDATE":new Date().getTime(),"TYPE":$scope.observationType.title,"EVENTLEVEL":$scope.level.color,"TEAM":$scope.team.name,"DESCRIPTION":$scope.description,"EVENTCLEAR":0,"UNIT":$scope.unit}}]
		    } else {
		    	operation = "addFeatures";
		    	ob = [{"geometry":{"x": $scope.marker.lng, "y":$scope.marker.lat},"attributes":{"EVENTDATE":new Date().getTime(),"TYPE":$scope.observationType.title,"EVENTLEVEL":$scope.level.color,"TEAM":$scope.team.name,"DESCRIPTION":$scope.description,"EVENTCLEAR":0,"UNIT":$scope.unit}}]
		    }

	    	$http.post(appConstants.rootUrl + '/FeatureServer/'+ $scope.currentLayerId + '/' + operation, "features=" + JSON.stringify(ob), {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
	      success(function (data, status, headers, config) {
	          if ($scope.attachment != "") {
	          	var objectId = data.addResults[0].objectId;
	          	
	          	$http.post(appConstants.rootUrl + '/FeatureServer/'+ $scope.currentLayerId + "/" + objectId + "/addAttachment", "attachment=" + $scope.attachment, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
	          	success(function (data, status, headers, config) {
	          		console.log("added attachment!");	
	          	}).error(function (data, status, headers, config) {
	          		console.log("unable to add attachment! " + status);	
	          	});
	          }
	      }).
	      error(function (data, status, headers, config) {
	          $log.log("Error adding feature: " + status);
	      });	
		    
		    $scope.observationId = 0; // hide the observation panel
		  } // end of saveObservation

		  $scope.setFile = function (element) {
		  	 $scope.$apply(function($scope) {
            $scope.attachment = element.files[0];
        });
		  }

		} // directive controller
	}; // return
});
