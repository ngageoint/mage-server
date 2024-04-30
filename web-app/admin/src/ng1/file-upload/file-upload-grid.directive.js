module.exports = function fileUploadGrid() {
  var directive = {
    restrict: "A",
    template: require('./file-upload-grid.directive.html'),
    scope: {
      type: '@',
      url: '@',
      icon: '@',
      placeholder: '@',
      allowUpload: '=',
      preview: '=',
      uploadId: '=',
      uploadFileFormName: '=',
      defaultImageUrl: '=',
      onAdd: '&',
      onRemove: '&',
      onUpload: '&',
      onError: '&'
    },
    controller: FileUploadController
  };

  return directive;
};


FileUploadController.$inject = ['$scope', '$element'];

function FileUploadController($scope, $element) {
  $scope.files = {};
  $scope.attachmentsToUpload = 0;
  $scope.firstFile;

  var id = 0;
  if (!$scope.type) $scope.type = 'detail';
  if (!$scope.placeholder) $scope.placeholder = 'Choose a file...';

  $scope.uploadImageMissing = true;
  var img = $element.find('img');
  img.on('load', function() {
    $scope.uploadImageMissing = false;
  });
  img.on('error', function() {
    $scope.uploadImageMissing = true;
    $scope.$apply();
    if (!$scope.defaultImageUrl) return;
    $(this).attr('src', $scope.defaultImageUrl);
  });

  $element.find(':file').bind('change', function() {
    var files = Array.from(this.files);
    files.reduce(function(sequence, file) {
      return sequence.then(function() {
        var newId = id++;
        $scope.files[newId] = {
          file: file,
          id: newId,
          preview: ''
        };
        $scope.attachmentsToUpload = Object.keys($scope.files).length;
        if ($scope.attachmentsToUpload === 1) {
          $scope.firstFile = $scope.files[newId];
        }

        $scope.$apply(function() {
          $scope.onAdd({
            $event: { id: newId }
          });
        });

        if (file.type.match('image')) {
          return previewImage($scope.files[newId]);
        } else if (file.type.match('video')) {
          return previewVideo($scope.files[newId]);
        }
      });
    }, Promise.resolve());
  });

  $scope.removeAttachment = function(id) {
    delete $scope.files[id];
    $scope.attachmentsToUpload = Object.keys($scope.files).length;
    if ($scope.attachmentsToUpload > 0) {
      $scope.firstFile = $scope.files[Object.keys($scope.files)[0]];
    } else {
      $scope.firstFile = undefined;
    }

    $scope.onRemove({
      $event: { id: id }
    });
  };

  $scope.$watch('url', function(url) {
    if (!url) return;

    $scope.uploadImageMissing = false;
    $element.find('.preview').html(['<img class="preview-image" src="', $scope.icon || $scope.url, '"/>'].join(''));
  });

  var previewVideo = function(fileInfo) {
    return new Promise(function(resolve) {
      if (window.FileReader) {
        var reader = new FileReader();
  
        reader.onload = (function() {
          return function() {
            $scope.uploadImageMissing = false;
            var blob = new Blob([reader.result], {type: fileInfo.file.type});
            var url = URL.createObjectURL(blob);

            var video = document.createElement('video');
            var timeupdate = function() {
              if (snapImage()) {
                video.removeEventListener('timeupdate', timeupdate);
                video.pause();
              }
            };
            video.addEventListener('loadeddata', function() {
              if (snapImage()) {
                video.removeEventListener('timeupdate', timeupdate);
              }
            });
            var snapImage = function() {
              var canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
              var image = canvas.toDataURL();
              fileInfo.preview = image;
              URL.revokeObjectURL(url);
              $scope.$apply();
              resolve();
              return true;
            };
            video.addEventListener('timeupdate', timeupdate);
            video.preload = 'metadata';
            video.src = url;
            video.muted = true;
            video.playsInline = true;
            video.play();
          };
        })(fileInfo.file);
  
        reader.readAsArrayBuffer(fileInfo.file);
      }
    });
  };

  var previewImage = function(fileInfo) {
    return new Promise(function(resolve) {
      if (window.FileReader) {
        var reader = new FileReader();
  
        reader.onload = (function() {
          return function(e) {
            $scope.uploadImageMissing = false;
            fileInfo.preview = e.target.result;
            $scope.$apply();
            resolve();
          };
        })(fileInfo.file);
  
        reader.readAsDataURL(fileInfo.file);
      }
    });
    
  };

  var uploadProgress = function(e) {
    var theFile = this;
    if(e.lengthComputable){
      $scope.$apply(function() {
        $scope.files[theFile.fileId].uploading = true;
        $scope.files[theFile.fileId].uploadProgress = (e.loaded/e.total) * 100;
      });
    }
  };

  var uploadComplete = function(response) {
    var theFile = this;
    $scope.$apply(function() {
      $scope.files[theFile.fileId].uploading = false;
      $scope.onUpload({
        $event: { id: theFile.fileId, response: response }
      });
    });
  };

  var uploadFailed = function(response) {
    var theFile = this;
    $scope.$apply(function() {
      $scope.files[theFile.fileId].uploading = false;
      $scope.onError({
        $event: { id: theFile.fileId }
      });
    });
  };

  var upload = function() {
    if (!$scope.url || !$scope.allowUpload || !Object.keys($scope.files).length) return;

    Object.keys($scope.files).reduce(function(sequence, fileId) {
      return sequence.then(function() {
        var formData = new FormData();
        var file = $scope.files[fileId];
        formData.append($scope.uploadFileFormName, file.file);
    
        jQuery.ajax({
          url: $scope.url,
          type: 'POST',
          xhr: function() {
            var myXhr = jQuery.ajaxSettings.xhr();
            if (myXhr.upload) {
              myXhr.upload.addEventListener('progress', uploadProgress.bind({fileId: file.id}), false);
            }
            return myXhr;
          },
          success: uploadComplete.bind({fileId: file.id}),
          error: uploadFailed.bind({fileId: file.id}),
          data: formData,
          cache: false,
          contentType: false,
          processData: false
        });
      });
    }, Promise.resolve());
    
  };

  $scope.$watch('allowUpload', function(newValue, old) {
    if (newValue && old !== newValue) {
      upload();
    }
  });
}