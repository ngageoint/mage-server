mage.directive('filterNavbar', function() {
  return {
    restrict: "A",
    templateUrl:  "js/app/partials/filter-navbar.html",
    controller: function ($scope, MapService) {
      $scope.ms = MapService;
    }
  };
});