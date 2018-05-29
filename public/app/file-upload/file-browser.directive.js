module.exports = function fileBrowser() {
  var directive = {
    restrict: "A",
    scope: {},
    template: require('./file-browser.directive.html'),
    controller: FileBrowserController
  };

  return directive;
};

FileBrowserController.$inject = ['$scope', '$timeout', '$element'];

function FileBrowserController($scope, $timeout, $element) {
  $element.find(':file').bind('change', function() {
    var file = this.files[0];
    $timeout(function() {
      $scope.file = file;
      $scope.$emit('uploadFile', file);
    });
  });
}
