angular
  .module('mage')
  .directive('avatarUser', avatarUser);

function avatarUser() {
  var directive = {
    restrict: "A",
    replace: true,
    scope: {
      user: '=avatarUser',
      avatarWidth: '=?',
      avatarHeight: '=?'
    },
    controller: AvatarUserController
  };

  return directive;
}

AvatarUserController.$inject = ['$scope', '$element', '$http', 'LocalStorageService'];

function AvatarUserController($scope, $element, $http, LocalStorageService) {
  if (!$scope.avatarWidth) $scope.avatarWidth = 60;
  if (!$scope.avatarHeight) $scope.avatarHeight = 60;

  var image = new Image();
  var imageElement = $(image);
  imageElement.addClass('center-crop');
  imageElement.attr('width', $scope.avatarWidth);
  imageElement.attr('height', $scope.avatarHeight);
  $element.replaceWith(image);

  if ($scope.user && $scope.user.avatarUrl) {
    var url = $scope.user.avatarUrl + '?_dc=' + $scope.user.lastUpdated;
    getAvatar(url);
  } else {
    image.src = "img/missing_photo.png";
  }

  $scope.$watch('user.avatarUrl', function(newUrl, oldUrl) {
    if (!newUrl || $scope.user.avatarData || newUrl === oldUrl) return;

    getAvatar(avatarUrl($scope.user, LocalStorageService.getToken()));
  });

  $scope.$watch('user.avatarData', function(avatarData) {
    if (!avatarData) return;
    var mimeType = avatarData.split(',')[0].split(':')[1].split(';')[0];
    var byteString = atob(avatarData.split(',')[1]);
    var u8arr = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
      u8arr[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([u8arr], {type: mimeType});

    EXIF.getData(blob, function() {
      var orientation = EXIF.getTag(this, 'Orientation');
      imageElement.css('transform', orientationMap[orientation] || "");
      image.src = avatarData;
    });
  });

  function getAvatar(url) {
    $http.get(url, {responseType: 'arraybuffer'}).then(function(response) {
      var blob = new Blob([response.data], {type: 'image/jpeg'});
      EXIF.getData(blob, function() {
        var orientation = EXIF.getTag(this, 'Orientation');
        imageElement.css('transform', orientationMap[orientation] || "");

        var urlCreator = window.URL || window.webkitURL;
        image.src = urlCreator.createObjectURL(blob);
      });
    });
  }
}

var orientationMap = {
  3: 'rotate(180deg)',
  6: 'rotate(90deg)',
  8: 'rotate(270deg)'
};

function avatarUrl(user) {
  if (user && user.avatarUrl) {
    return user.avatarUrl + '?_dc=' + user.lastUpdated;
  } else {
    return "img/missing_photo.png";
  }
}
