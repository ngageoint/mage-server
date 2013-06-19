'use strict';

var mage = angular.module("mage", ["mage.***REMOVED***s"]);

/*
  Handle communication between the server and the map.
  Load observations, allow users to view them, and allow them to add new ones themselves.
*/
function FormBuilderController($scope, $log, $http, $injector, appConstants, teams, levels, observationTypes) {
	$scope.selectedTab = 1;
	$scope.formFields = {};
	$scope.currentLayer = {};
	$scope.layers = appConstants.layers;

	$scope.addTextInput = function () {

	}

	$scope.addTextArea = function () {

	}

	$scope.addSelect = function () {

	}

	$scope.addCheckbox = function () {

	}
}