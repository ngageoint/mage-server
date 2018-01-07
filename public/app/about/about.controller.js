module.exports = AboutController;

AboutController.$inject = ['$scope', 'Api'];

function AboutController ($scope, Api) {

  Api.get(function(api) {
    $scope.name = api.name;
    $scope.serverVersion = api.version;
    $scope.apk = api.apk;
  });
}
