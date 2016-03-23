angular
  .module('mage')
  .directive('avatarUserEdit', avatarUserEdit);

function avatarUserEdit() {
  var directive = {
    restrict: "A",
    templateUrl: '/app/user/user-avatar-edit.directive.html',
    scope: {
      user: '=avatarUserEdit'
    },
    controller: AvatarUserEditController,
    bindToController: true
  };

  return directive;
}

AvatarUserEditController.$inject = ['$scope', '$element'];

function AvatarUserEditController($scope, $element) {
  $scope.fileName = 'Choose an avatar image...';

  $element.find(':file').change(function() {
    $scope.file = this.files[0];
    $scope.fileName = $scope.file.name;
    $scope.$emit('userAvatar', $scope.file);
  });
}
