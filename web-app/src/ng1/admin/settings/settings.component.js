"use strict";

import _ from 'underscore';

class AdminSettingsController {
  constructor($q, $timeout, Api, Settings, LocalStorageService, Event, Team) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.Api = Api;
    this.Settings = Settings;
    this.Event = Event;
    this.Team = Team;

    this.token = LocalStorageService.getToken();
    this.pill = 'security';

    this.events = [{
      name: 'foo',
      description: 'bar'
    }];

    this.teams = [];
    this.strategies = [];
    this.authConfig = {};

    this.usersReqAdminChoices = [{
      title: 'Enabled',
      description: 'New user accounts require admin approval.',
      value: true
    }, {
      title: 'Disabled',
      description: 'New user accounts do not require admin approval.',
      value: false
    }];
    this.devicesReqAdminChoices = [{
      title: 'Enabled',
      description: 'New devices require admin approval.',
      value: true
    }, {
      title: 'Disabled',
      description: 'New devices do not require admin approval.',
      value: false
    }];

    this.accountLock = {};
    this.accountLockChoices = [{
      title: 'Off',
      description: 'Do not lock MAGE user accounts.',
      value: false
    }, {
      title: 'On',
      description: 'Lock MAGE user accounts for defined time \n after defined number of invalid login attempts.',
      value: true
    }];

    this.maxLock = {};
    this.maxLockChoices = [{
      title: 'Off',
      description: 'Do not disable MAGE user accounts.',
      value: false
    }, {
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

    this.defaultPasswordPolicySettings = {
      minCharsEnabled: false,
      minChars: 0,
      maxConCharsEnabled: false,
      maxConChars: 0,
      lowLettersEnabled: false,
      lowLetters: 0,
      highLettersEnabled: false,
      highLetters: 0,
      numbersEnabled: false,
      numbers: 0,
      specialCharsEnabled: false,
      specialChars: 0,
      restrictSpecialCharsEnabled: false,
      restrictSpecialChars: "",
      lastNumPassEnabled: false,
      lastNumPass: 0,
      helpText: null,
      helpTextTemplate: {
        minChars: 'at least # characters',
        maxConChars: 'a maximum of # consecutive characters',
        lowLetters: 'a minimum of # lowercase characters',
        highLetters: 'a minimum of # uppercase characters',
        numbers: 'at least # numbers',
        specialChars: 'at least # special characters'
      }
    }
  }

  $onInit() {
    this.$q.all({
      api: this.Api.get().$promise,
      settings: this.Settings.query().$promise,
      teams: this.Team.query({ state: 'all', populate: false, projection: JSON.stringify(this.projection) }).$promise,
      events: this.Event.query({ state: 'all', populate: false, projection: JSON.stringify(this.projection) }).$promise
    })
      .then(result => {
        const api = result.api;
        this.teams = _.reject(result.teams, team => { return team.teamEventId; });
        this.events = result.events;

        this.authConfig = api.authenticationStrategies || {};
        this.pill = this.authConfig.local ? 'security' : 'banner';

        let strategy = {};
        for (strategy in this.authConfig) {
          this.strategies.push(strategy);
        }

        this.settings = _.indexBy(result.settings, 'type');

        this.banner = this.settings.banner ? this.settings.banner.settings : {};
        this.disclaimer = this.settings.disclaimer ? this.settings.disclaimer.settings : {};
        this.security = this.settings.security ? this.settings.security.settings : {};

        if (!this.security.accountLock) {
          this.security.accountLock = {
            enabled: false
          };
        }

        this.strategies.forEach(strategy => {
          if (!this.security[strategy]) {
            this.security[strategy] = {
              devicesReqAdmin: { enabled: true },
              usersReqAdmin: { enabled: true },
              newUserEvents: [],
              newUserTeams: []
            }
          } else {
            if (this.security[strategy].newUserTeams) {
              // Remove any teams and events that no longer exist
              this.security[strategy].newUserTeams = this.security[strategy].newUserTeams.filter(id => {
                return this.teams.some(team => team.id === id)
              });
            } else {
              this.security[strategy].newUserTeams = [];
            }

            if (this.security[strategy].newUserEvents) {
              this.security[strategy].newUserEvents = this.security[strategy].newUserEvents.filter(id => {
                return this.events.some(event => event.id === id)
              });
            } else {
              this.security[strategy].newUserEvents = [];
            }
          }

          if (!this.security[strategy].passwordPolicy) {
            this.security[strategy].passwordPolicy = this.defaultPasswordPolicySettings;
          }

          this.security[strategy].passwordPolicy.helpTextTemplate = this.defaultPasswordPolicySettings.helpTextTemplate;

          this.buildPasswordHelp(strategy);
        });

        this.maxLock.enabled = this.security.accountLock && this.security.accountLock.max !== undefined;
      });
  }

  buildPasswordHelp(strategy) {
    if (this.security[strategy].passwordPolicy.customizeHelpText) {
      return;
    }

    this.security[strategy].passwordPolicy.helpText = 'Your password is invalid and must contain '

    const originalKeys = Object.keys(this.security[strategy].passwordPolicy);
    const filtered = originalKeys.filter(function (value, index, arr) {
      if (value == 'helpText' || value == 'helpTextTemplate' || value == 'customizeHelpText'
        || value == 'lastNumPass' || value == 'restrictSpecialChars' || value.endsWith('Enabled')) {
        return false;
      }
      return true;
    });

    let passwordText = "";
    for (let i = 0; i < filtered.length; i++) {
      const key = filtered[i];

      const enabled = this.security[strategy].passwordPolicy[key + 'Enabled'];

      if (enabled) {
        const value = this.security[strategy].passwordPolicy[key];
        const msg = this.security[strategy].passwordPolicy.helpTextTemplate[key];
        if (msg) {
          const subbedMsg = msg.replace('#', value);

          passwordText += subbedMsg;
          passwordText += ', ';
        }
      }
    }

    //Remove the last comma.  Tricky to do in the loop since we don't know ahead 
    //of time if things are enabled.
    passwordText = passwordText.substring(0, passwordText.length - 2);
    this.security[strategy].passwordPolicy.helpText += passwordText;
  }

  saveBanner() {
    this.Settings.update({ type: 'banner' }, this.banner, () => {
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
    this.Settings.update({ type: 'disclaimer' }, this.disclaimer, () => {
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

    this.strategies.forEach(strategy => {
      if (this.security[strategy].usersReqAdmin.enabled) {
        delete this.security[strategy].newUserEvents;
        delete this.security[strategy].newUserTeams;
      }
    });

    this.Settings.update({ type: 'security' }, this.security, () => {
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

AdminSettingsController.$inject = ['$q', '$timeout', 'Api', 'Settings', 'LocalStorageService', 'Event', 'Team'];

export default {
  template: require('./settings.html'),
  controller: AdminSettingsController
};
