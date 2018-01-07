module.exports = function iconUserEdit() {
  var directive = {
    restrict: "A",
    template: require('./user-icon-edit.directive.html'),
    scope: {
      user: '=iconUserEdit'
    },
    controller: IconUserEditController
  };

  return directive;
};

IconUserEditController.$inject = ['$scope', '$element'];

function IconUserEditController($scope, $element) {
  $scope.fileName = 'Choose a map icon...';

  $element.find(':file').change(function() {
    $scope.file = this.files[0];
    $scope.fileName = $scope.file.name;
    $scope.$emit('userIcon', $scope.file);
  });
}
