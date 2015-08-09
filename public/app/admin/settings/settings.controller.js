angular
  .module('mage')
  .controller('AdminSettingsController', AdminSettingsController);

  AdminSettingsController.$inject = ['$scope', 'Settings', 'LocalStorageService'];

function AdminSettingsController($scope, Settings, LocalStorageService) {
  $scope.token = LocalStorageService.getToken();

  $scope.minicolorSettings = {
    position: 'bottom right',
    control: 'wheel'
  }

  $scope.setting = "banner";
  $scope.settings = {};
  $scope.banner = {
    headerTextColor: '#000000',
    headerBackgroundColor: 'FFFFFF',
    footerTextColor: '#000000',
    footerBackgroundColor: 'FFFFFF'
  };

  Settings.query(function(settings) {
    $scope.settings = _.indexBy(settings, 'type');

    if ($scope.settings.banner) {
      $scope.banner = $scope.settings.banner.settings;
    }
  });

  $scope.onBannerClick = function() {
    $scope.banner = 'banner';
    if ($scope.settings.banner) {
      $scope.banner = $scope.settings.banner.settings;
    }
  }

  $scope.saveBanner = function () {
    console.log('scope banner is:', $scope.banner);

    Settings.updateBanner($scope.banner, function(setting) {
      $scope.saved = true;
      $scope.saving = false;
      debounceHideSave();
    }, function() {  // TODO not sure what parameters are here
      $scope.saving = false;
      $scope.error = response.responseText;
    });
  }

  var debounceHideSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.saved = false;
    });
  }, 5000);

}
