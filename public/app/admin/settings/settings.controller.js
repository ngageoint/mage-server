var _ = require('underscore');

module.exports = AdminSettingsController;

AdminSettingsController.$inject = ['$scope', 'Settings', 'LocalStorageService'];

function AdminSettingsController($scope, Settings, LocalStorageService) {
  $scope.token = LocalStorageService.getToken();
  $scope.pill = 'banner';

  $scope.minicolorSettings = {
    position: 'bottom right',
    control: 'wheel'
  };

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
      $scope.banner = $scope.settings.banner.settings || {};
    }

    if ($scope.settings.disclaimer) {
      $scope.disclaimer = $scope.settings.disclaimer.settings || {};
    }
  });

  $scope.saveBanner = function() {
    Settings.update({type: 'banner'}, $scope.banner, function() {
      $scope.saved = true;
      $scope.saving = false;
      $scope.saveStatus = 'Banner successfully saved';
      debounceHideSave();
    }, function() {
      $scope.saving = false;
      $scope.saveStatus = 'Failed to save banner';
    });
  };

  $scope.saveDisclaimer = function() {
    Settings.update({type: 'disclaimer'}, $scope.disclaimer, function() {
      $scope.saved = true;
      $scope.saving = false;
      $scope.saveStatus = 'Disclaimer successfully saved';
      debounceHideSave();
    }, function() {
      $scope.saving = false;
      $scope.saveStatus = 'Failed to save diclaimer';
    });
  };

  var debounceHideSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.saved = false;
    });
  }, 3000);
}
