module.exports = function iconUser() {
  const directive = {
    restrict: "A",
    scope: {
      user: '=iconUser',
      iconWidth: '=?',
      iconHeight: '=?'
    },
    controller: IconUserController
  };

  return directive;
};

IconUserController.$inject = ['$scope', '$element', 'LocalStorageService'];

function IconUserController($scope, $element, LocalStorageService) {
  if (!$scope.iconWidth) $scope.iconWidth = 42;
  if (!$scope.iconHeight) $scope.iconHeight = 42;

  const image = new Image();
  const imageElement = $(image);
  imageElement.classList = $element[0].classList;
  for (let i = 0; i < $element[0].classList.length; i++) {
    imageElement.addClass($element[0].classList[i]);
  }
  imageElement.addClass('center-crop');
  imageElement.attr('width', $scope.iconWidth);
  imageElement.attr('height', $scope.iconHeight);
  imageElement.addClass('circle-avatar');
  $element.replaceWith(image);

  if ($scope.user && $scope.user.icon && $scope.user.iconUrl) {
    image.src = getIconUrl($scope.user.iconUrl);
  } else {
    image.src = "/assets/images/person_pin_circle-24px.svg";
    imageElement.addClass('circle-avatar-no-border');
  }

  $scope.$watch('user.iconUrl', function(iconUrl) {
    if (!iconUrl) return;

    image.src = getIconUrl(iconUrl);
  }, true);

  function getIconUrl(iconUrl) {
    return iconUrl + "?access_token=" + LocalStorageService.getToken() + '&_dc' + $scope.user.lastUpdated;
  }

  function getIcon(url) {
    $http.get(url, { responseType: 'arraybuffer' }).then(function (response) {
      const blob = new Blob([response.data], { type: 'image/jpeg' });
      EXIF.getData(blob, function () {
        const orientation = EXIF.getTag(this, 'Orientation');
        imageElement.css('transform', orientationMap[orientation] || "");

        const urlCreator = window.URL || window.webkitURL;
        image.src = urlCreator.createObjectURL(blob);
      });
    });
  }
}
