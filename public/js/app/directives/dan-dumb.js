mage.directive('simpleUpload', function() {
  return {
    restrict: "A",
    templateUrl: '/js/app/partials/simple-upload.html',
    scope: {
      url: '@',
      allowUpload: '=',
      allowMultiple: '=',
      preview: '='
    },
    controller: function ($scope, $element) {

      $scope.filesToUpload = [{}];

      //$scope.file = {name: 'pee'};

      //$element.find('.file-custom').attr('data-filename', 'Choose a file...');

      $element.find(':file').change(function() {
        if ($scope.allowMultiple) {
          for (var i = 0; i < this.files; i++) {
            $scope.filesToUpload.push(this.files[i]);
          }
        } else {
          $scope.filesToUpload[0] = this.files[0];
        }

        var element = $($element.find('.upload-file')[0]);
        if ($scope.preview) {
          previewFile($scope.filesToUpload[0], element);
        }
        upload();
      });

      var previewFile = function(file, element) {
        if (window.FileReader) {
          var reader = new FileReader();

          reader.onload = (function(theFile) {
            return function(e) {
              element.find('.preview').html(['<img src="', e.target.result,'" title="', theFile.name, '"/>'].join(''));
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
