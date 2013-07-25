mage.directive('userLocation', function(UserService, appConstants) {
  return {
    restrict: "A",
    template: "<div>" +
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
    // templateUrl:  "js/app/partials/user-location.html",
    scope: {
      userId: "="
    },
    controller: function ($scope, UserService) {
      UserService.getUser($scope.userId)
        .success(function(user) {
          $scope.user = user;
        })
        .error(function() {
          console.log('error trying to get user');
        })
    }
  };
});