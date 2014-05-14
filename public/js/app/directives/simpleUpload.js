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
          $scope.uploadProgress = (e.loaded/e.total) * 100;
          $scope.$apply();
        }
      }

      var uploadComplete = function() {
        $scope.uploadStatus = "Upload Complete";
        $scope.uploading = false;
        $scope.$apply();
      }

      var uploadFailed = function() {
        $scope.uploadStatus = "Upload Failed";
        $scope.uploading = false;
        $scope.$apply();
      }

      var uploadStarted = function() {
        $scope.uploading = true;
        $scope.$apply();
      }

      var upload = function() {
        if (!$scope.file || !$scope.url || !$scope.allowUpload) return;
        var formData = new FormData($element[0]);
        $.ajax({
            url: $scope.url,  //Server script to process data
            type: 'POST',
            xhr: function() {  // Custom XMLHttpRequest
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){ // Check if upload property exists
                    myXhr.upload.addEventListener('progress',uploadProgress, false); // For handling the progress of the upload
                }
                return myXhr;
            },
            //Ajax events
            beforeSend: uploadStarted,
            success: uploadComplete,
            error: uploadFailed,
            // Form data
            data: formData,
            //Options to tell jQuery not to process data or worry about content-type.
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
