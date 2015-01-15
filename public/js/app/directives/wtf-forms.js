mage.directive('wtfFormsFile', function() {
  return {
    restrict: "A",
    scope: {
    },
    template:'<label cl***REMOVED***="file"><input type="file" name="form"><span cl***REMOVED***="file-custom" data-filename="{{file.name}}"></span></label>',
    controller: function ($scope, $element) {
      $element.find(':file').bind('change', function() {
        var file = this.files[0];
        $scope.$apply(function() {
          $scope.file = file;
          $scope.$emit('uploadFile', file);
        });
      });
    }
  };
});
