mage.directive('simpleUpload', function() {
  return {
    restrict: "A",
    scope: {
      url: '@',
      allowUpload: '='
    },
    controller: function ($scope, $element) {

      $element.find('.file-custom').attr('data-filename', 'Choose a file...');

      $element.find(':file').change(function() {
        $scope.file = this.files[0];
        var name = $scope.file.name;

        $element.find('.file-custom').attr('data-filename', name);

        previewFile($scope.file);
        upload();
      });

      var previewFile = function(file) {
        if (window.FileReader) {
          var reader = new FileReader();

          reader.onload = (function(theFile) {
            return function(e) {
              $element.find('.preview').html(['<img src="', e.target.result,'" title="', theFile.name, '"/>'].join(''));
            };
          })(file);

          reader.readAsDataURL(file);
        }
      }

      var uploadProgress = function(e) {
        if(e.lengthComputable){
          $scope.$apply(function() {
            $scope.uploading = true;
            $scope.uploadProgress = (e.loaded/e.total) * 100;
          });
        }
      }

      var uploadComplete = function() {
        $scope.$apply(function() {
          $scope.uploadStatus = "Upload Complete";
          $scope.uploading = false;
        })
      }

      var uploadFailed = function() {
        $scope.apply(function() {
          $scope.uploadStatus = "Upload Failed";
          $scope.uploading = false;
        });
      }

      var upload = function() {
        if (!$scope.file || !$scope.url || !$scope.allowUpload) return;
        var formData = new FormData($element[0]);
        $.ajax({
            url: $scope.url,
            type: 'POST',
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){
                    myXhr.upload.addEventListener('progress',uploadProgress, false);
                }
                return myXhr;
            },
            success: uploadComplete,
            error: uploadFailed,
            data: formData,
            cache: false,
            contentType: false,
            processData: false
        });
      }

      $scope.$watch('url', upload);
      $scope.$watch('allowUpload', upload);
    }
  };
});
