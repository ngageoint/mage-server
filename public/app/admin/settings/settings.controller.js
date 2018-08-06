var _ = require('underscore');

module.exports = AdminSettingsController;

AdminSettingsController.$inject = ['$scope', 'Api', 'Settings', 'LocalStorageService'];

function AdminSettingsController($scope, Api, Settings, LocalStorageService) {
  $scope.token = LocalStorageService.getToken();
  $scope.pill = 'security';

  $scope.accountLock = {};
  $scope.accountLockChoices = [{
    title: 'Off',
    description: 'Do not lock MAGE user accounts.',
    value: false
  },{
    title: 'On',
    description: 'Lock MAGE user accounts for defined time \n after defined number of invalid login attempts.',
    value: true
  }];

  $scope.maxLock = {};
  $scope.maxLockChoices = [{
    title: 'Off',
    description: 'Do not disable MAGE user accounts.',
    value: false
  },{
    title: 'On',
    description: 'Disable MAGE user accounts after account has been locked defined number of times.',
    value: true
  }];

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

  Api.get(function(api) {
    var authenticationStrategies = api.authenticationStrategies || {};
    $scope.local = authenticationStrategies.local;
    $scope.pill = authenticationStrategies.local ? 'security' : 'banner';
  });

  Settings.query(function(settings) {
    $scope.settings = _.indexBy(settings, 'type');

    $scope.banner = $scope.settings.banner ? $scope.settings.banner.settings : {};
    $scope.disclaimer = $scope.settings.disclaimer ? $scope.settings.disclaimer.settings : {};
    $scope.security = $scope.settings.security ? $scope.settings.security.settings : {};

    if (!$scope.security.accountLock) {
      $scope.security.accountLock = {
        enabled: false
      };
    }

    $scope.maxLock.enabled = $scope.security.accountLock && $scope.security.accountLock.max !== undefined;
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

  $scope.saveSecurity = function() {
    if (!$scope.maxLock.enabled) {
      delete $scope.security.accountLock.max;
    }

    Settings.update({type: 'security'}, $scope.security, function() {
      $scope.saved = true;
      $scope.saving = false;
      $scope.saveStatus = 'Security settings successfully saved.';
      debounceHideSave();
    }, function() {
      $scope.saving = false;
      $scope.saveStatus = 'Failed to save security settings.';
    });
  };

  var debounceHideSave = _.debounce(function() {
    $scope.$apply(function() {
      $scope.saved = false;
    });
  }, 3000);
}
