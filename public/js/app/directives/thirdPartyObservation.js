// mage.directive('external', function($http, $scope, appConstants) {
//   return {
//     restrict: "A",
//     templateUrl: appConstants.rootUrl + "/js/app/partials/third-party-observation-template.html",
//     scope: {
//       layers: "=layers",
//       observationId: "=observationid",
//       currentLayerId: "=currentlayerid",
//     },
//     controller: thirdPartyCtrl = function ($scope, $element, $attrs, $http, teams, levels, observationTypes, appConstants) {
//       console.log('thirsd party controller');
//       $scope.observation = {}; // need to clean all of this up and figure out how to make it generic
//       $scope.icon = "";
//       $scope.observationName = "";
//       $scope.imageChip = "";
//       $scope.agreement = 0;
//       $scope.score = 0;

//       /*
//         If the ID changes and is -1, then it is a new observation, pop open the form and let the user create a new observation.
//         If it is not -1, or 0, then lookup the rest of the attributes and populate the form.
//       */
//       $scope.$watch("observationId", function (newValue, oldValue) {
//         var observation = $scope.observationId;
//         if (!observation) return;

//         var observationId = $scope.observationId.feature.properties.OBJECTID;


//         // check to see if it is a Tomnod observation
//         if (observation.feature.properties.tag_id) {
//           console.log("I has a Tomnod point");
//           $scope.icon = observation.feature.properties.icon_url;
//           $scope.observationName = observation.feature.properties.name;
//           $scope.imageChip = observation.feature.properties.chip_url;
//           $scope.agreement = observation.feature.properties.agreement;
//           $scope.score = observation.feature.properties.score;


//           $('#third-party-observation-panel').removeCl***REMOVED***('hide');
//         }
//       });

//       $scope.closeObservation = function () {
//         $('#third-party-observation-panel').addCl***REMOVED***('hide');
//       };
//     } // end of controller
//   }; //return
// });

//     