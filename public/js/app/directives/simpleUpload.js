mage.directive('simpleUpload', function() {
  return {
    restrict: "A",
    templateUrl: '/js/app/partials/simple-upload.html',
    scope: {
      url: '@',
      allowUpload: '=',
      allowMultiple: '=',
      preview: '=',
      uploadFileFormName: '='
    },
    controller: function ($scope, $element) {

      $element.find('.file-custom').attr('data-filename', 'Choose a file...');

      $element.find(':file').change(function() {
        $scope.file = this.files[0];
        var name = $scope.file.name;

        var element = $($element.find('.upload-file')[0]);
        //element.find('.file-custom').attr('data-filename', name);
        if ($scope.preview) {
          previewFile($scope.file, element);
        }
        $scope.$apply();
        upload();
      });

      var previewFile = function(file, element) {
        if (window.FileReader) {
          var reader = new FileReader();

          reader.onload = (function(theFile) {
            return function(e) {
              element.find('.preview').html(['<img cl***REMOVED***="preview-image" src="', e.target.result,'" title="', theFile.name, '"/>'].join(''));
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
          $scope.$emit('uploadComplete', $scope.url);
        });
      }

      var uploadFailed = function() {
        $scope.$apply(function() {
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

      $scope.$watch('allowUpload', upload);
    }
  };
});
