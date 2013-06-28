mage.directive('useradmin', function($http, appConstants) {
  return {
    restrict: "A",
    templateUrl: appConstants.rootUrl + "/js/app/partials/user-admin.html",
    scope: {
      currentAdminActivity: "=currentadminactivity"
    },
    controller: userAdminController = function ($scope, $element, $attrs, $http, appConstants) {
      //$scope.currentAdminActivity = currentAdminActivity;
      console.log("useradmincontroller works");
      /*
        This currentAdminActivity is managed in the admin controller, when a user clicks on a link on the right
        hand side of the admin page, the current activity is set and the directives are listening. If they are 
        the cureent activity, then their partial will become visible.
      */
      $scope.watch("currentAdminActivity", function (newValue, oldValue) {
        console.log("currentAdminActivity changed " + newValue);

      }, true); //  end of currentAdminActivity watch
    } // end of controller
  }; // return
});