mage.directive('export', function(UserService, appConstants) {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/export.html",
    controller: function ($scope, MapService) {
      $scope.ms = MapService;
    }
  };
});