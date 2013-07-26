mage.directive('userLocation', function(UserService, appConstants) {
  return {
    restrict: "A",
    template: "<div ng-show='user'>" +
                "<span>" +
                  "<strong>{{user.firstname}} {{user.lastname}} </strong>" +
                  "<span cl***REMOVED***='muted'>({{user.username}})</span>" +
                "</span>" +
                "<div>" +
                  "{{user.email}}" +
                "</div>" +
                "<div>" +
                  "{{user.phones[0].number}}" +
                "</div>" +
              "<div>",
    // TODO cannot use templateUrl, does not play well with leaflet popup
    // templateUrl:  "js/app/partials/user-location.html",
    scope: {
    },
    controller: function ($scope, UserService) {
      $scope.getUser = function(userId) {
        UserService.getUser(userId)
          .success(function(user) {
            $scope.user = user;
          })
          .error(function() {
            console.log('error trying to get user');
          });
      }
    }
  };
});