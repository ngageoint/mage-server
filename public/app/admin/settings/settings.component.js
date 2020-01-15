import _ from 'underscore';

class AdminSettingsController {
  constructor($timeout, Api, Settings, LocalStorageService) {
    this.$timeout = $timeout;
    this.Api = Api;
    this.Settings = Settings;

    this.token = LocalStorageService.getToken();
    this.pill = 'security';

    this.autoApproveUser = {};
    this.autoApproveUserChoices = [{
      title: 'Off',
      description: 'Do not auto-approve MAGE user accounts.',
      value: false
    },{
      title: 'On',
      description: 'Auto-approve MAGE user accounts.',
      value: true
    }];

    this.autoApproveDevice = {};
    this.autoApproveDeviceChoices = [{
      title: 'Off',
      description: 'Do not auto-approve MAGE user devices.',
      value: false
    },{
      title: 'On',
      description: 'Auto-approve MAGE user devices.',
      value: true
    }];
  
    this.accountLock = {};
    this.accountLockChoices = [{
      title: 'Off',
      description: 'Do not lock MAGE user accounts.',
      value: false
    },{
      title: 'On',
      description: 'Lock MAGE user accounts for defined time \n after defined number of invalid login attempts.',
      value: true
    }];
  
    this.maxLock = {};
    this.maxLockChoices = [{
      title: 'Off',
      description: 'Do not disable MAGE user accounts.',
      value: false
    },{
      title: 'On',
      description: 'Disable MAGE user accounts after account has been locked defined number of times.',
      value: true
    }];
  
    this.minicolorSettings = {
      position: 'bottom right',
      control: 'wheel'
    };

    this.setting = "banner";
    this.settings = {};
    this.banner = {
      headerTextColor: '#000000',
      headerBackgroundColor: 'FFFFFF',
      footerTextColor: '#000000',
      footerBackgroundColor: 'FFFFFF'
    };
  }

  $onInit() {
    this.Api.get(api => {
      var authenticationStrategies = api.authenticationStrategies || {};
      this.local = authenticationStrategies.local;
      this.pill = authenticationStrategies.local ? 'security' : 'banner';
    });

    this.Settings.query(settings => {
      this.settings = _.indexBy(settings, 'type');
  
      this.banner = this.settings.banner ? this.settings.banner.settings : {};
      this.disclaimer = this.settings.disclaimer ? this.settings.disclaimer.settings : {};
      this.security = this.settings.security ? this.settings.security.settings : {};
  
      if (!this.security.accountLock) {
        this.security.accountLock = {
          enabled: false
        };
      }

      if (!this.security.autoApproveUser) {
        this.security.autoApproveUser = {
          enabled: false
        };
      }

      if (!this.security.autoApproveDevice) {
        this.security.autoApproveDevice = {
          enabled: false
        };
      }
  
      this.maxLock.enabled = this.security.accountLock && this.security.accountLock.max !== undefined;
    });
  }

  saveBanner() {
    this.Settings.update({type: 'banner'}, this.banner, () => {
      this.saved = true;
      this.saving = false;
      this.saveStatus = 'Banner successfully saved';
      this.debounceHideSave();
    }, () => {
      this.saving = false;
      this.saveStatus = 'Failed to save banner';
    });
  }

  saveDisclaimer() {
    this.Settings.update({type: 'disclaimer'}, this.disclaimer, () => {
      this.saved = true;
      this.saving = false;
      this.saveStatus = 'Disclaimer successfully saved';
      this.debounceHideSave();
    }, () => {
      this.saving = false;
      this.saveStatus = 'Failed to save diclaimer';
    });
  }

  saveSecurity() {
    if (!this.maxLock.enabled) {
      delete this.security.accountLock.max;
    }

    this.Settings.update({type: 'security'}, this.security, () => {
      this.saved = true;
      this.saving = false;
      this.saveStatus = 'Security settings successfully saved.';
      this.debounceHideSave();
    }, () => {
      this.saving = false;
      this.saveStatus = 'Failed to save security settings.';
    });
  }

  debounceHideSave() {
    _.debounce(() => {
      this.$timeout(() => {
        this.saved = false;
      });
    }, 3000)();
  }
}

AdminSettingsController.$inject = ['$timeout', 'Api', 'Settings', 'LocalStorageService'];

export default {
  template: require('./settings.html'),
  controller: AdminSettingsController
};
