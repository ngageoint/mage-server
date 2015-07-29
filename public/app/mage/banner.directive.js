angular
  .module('mage')
  .directive('banner', banner);

function banner() {
  var directive = {
    restrict: "A",
    scope: {
      type: '@banner',
    },
    templateUrl: '/app/mage/banner.directive.html',
    controller: BannerController
  };

  return directive;
}

BannerController.$inject = ['$scope', '$element', 'Settings'];

function BannerController($scope, $element, Settings) {
  Settings.get({type: 'banner'}, function(banner) {
    $scope.banner = banner.settings || {};

    if ($scope.type == 'header' && $scope.banner.showHeader) {
      if ($scope.banner.headerBackgroundColor) {
        $element.css('background-color', $scope.banner.headerBackgroundColor);
      }

      if ($scope.banner.headerTextColor) {
        $element.css('color', $scope.banner.headerTextColor);
      }
    }

    if ($scope.type == 'footer' && $scope.banner.showFooter) {
      if ($scope.banner.footerBackgroundColor) {
        $element.css('background-color', $scope.banner.footerBackgroundColor);
      }

      if ($scope.banner.footerTextColor) {
        $element.css('color', $scope.banner.footerTextColor);
      }
    }
  });
}
