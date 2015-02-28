mage.directive('formImport', function() {
  return {
    restrict: "A",
    templateUrl: '/app/partials/form/import.html',
    scope: {
      url: '@',
      uploadFileFormName: '='
    },
    controller: function ($scope, $element) {
      $element.find(':file').change(function() {
        $scope.file = this.files[0];
        $scope.$apply();
        upload();
      });

      var uploadComplete = function(form) {
        $scope.$apply(function() {
          $scope.uploadStatus = "Upload Complete";
          $scope.uploading = false;
          $scope.$emit('formImportComplete', form);
        });
      }

      var uploadFailed = function() {
        $scope.$apply(function() {
          $scope.uploadStatus = "Upload Failed";
          $scope.uploading = false;
        });
      }

      var upload = function() {
        if (!$scope.file || !$scope.url) return;

        var formData = new FormData();
        formData.append('form', $scope.file);
        $.ajax({
            url: $scope.url,
            type: 'POST',
            success: uploadComplete,
            error: uploadFailed,
            data: formData,
            cache: false,
            contentType: false,
            processData: false
        });
      }
    }
  };
});
