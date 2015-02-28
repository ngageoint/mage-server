angular
  .module('mage')
  .directive('fileBrowser', fileBrowser);

function fileBrowser() {
  var directive = {
    restrict: "A",
    scope: {},
    template:'<label cl***REMOVED***="file"><input type="file" name="form"><span cl***REMOVED***="file-custom" data-filename="{{file.name}}"></span></label>',
    controller: FileBrowserController,
    bindToController: true
  }

  return directive;
}

FileBrowserController.$inject = ['$scope', '$element'];

function FileBrowserController($scope, $element) {
  $element.find(':file').bind('change', function() {
    var file = this.files[0];
    $scope.$apply(function() {
      $scope.file = file;
      $scope.$emit('uploadFile', file);
    });
  });
}
