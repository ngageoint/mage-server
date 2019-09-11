module.exports = function fileBrowser() {
  var directive = {
    restrict: "A",
    scope: {
      'onFileChosen': '&'
    },
    template: require('./file-browser.directive.html'),
    controller: FileBrowserController
  };

  return directive;
};

FileBrowserController.$inject = ['$scope', '$timeout', '$element'];

function FileBrowserController($scope, $timeout, $element) {
  console.log('$scope.onFileChosen', $scope.onFileChosen);
  $element.find(':file').bind('change', function() {
    var file = this.files[0];
    $timeout(function() {
      $scope.file = file;
      $scope.$emit('uploadFile', file);
      console.log('gonna send it');
      if ($scope.onFileChosen) {
        console.log('sent it');
        $scope.onFileChosen({file:file});
      }
    });
  });
}
