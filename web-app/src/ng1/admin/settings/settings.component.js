import _ from 'underscore';

class AdminSettingsController {
  constructor($q, $timeout, Settings, LocalStorageService, Event, Team, AuthenticationConfigurationService) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.Settings = Settings;
    this.Event = Event;
    this.Team = Team;
    this.AuthenticationConfigurationService = AuthenticationConfigurationService;

    this.token = LocalStorageService.getToken();
    this.pill = 'security';

    this.teams = [];
    this.strategies = [];
    this.authenticationStrategies = {};

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
  }

  $onInit() {
    this.$q.all({
      configs: this.AuthenticationConfigurationService.getAllConfigurations(),
      settings: this.Settings.query().$promise,
      teams: this.Team.query({ state: 'all', populate: false, projection: JSON.stringify(this.projection) }).$promise,
      events: this.Event.query({ state: 'all', populate: false, projection: JSON.stringify(this.projection) }).$promise
    }).then(result => {
      this.teams = _.reject(result.teams, team => { return team.teamEventId; });
      this.events = result.events;

      this.authenticationStrategies = result.configs || {};
      this.pill = Object.keys(this.authenticationStrategies).length ? 'security' : 'banner';

      let strategy = {};
        for (strategy in this.authenticationStrategies) {
        this.strategies.push(strategy);
      }

      this.settings = _.indexBy(result.settings, 'type');

      this.banner = this.settings.banner ? this.settings.banner.settings : {};
      this.disclaimer = this.settings.disclaimer ? this.settings.disclaimer.settings : {};
      this.security = this.settings.security ? this.settings.security.settings : {};

      if (!this.security.local.accountLock) {
        this.security.local.accountLock = {
          enabled: false
        };
      }
      
      this.buildPasswordHelp();

      this.strategies.forEach(strategy => {
        if (!this.security[strategy]) {
          this.security[strategy] = {
            devicesReqAdmin: { enabled: true },
            usersReqAdmin: { enabled: true },
            newUserEvents: [],
            newUserTeams: []
          }
        } else {
          if (this.security[strategy].devicesReqAdmin === undefined) {
            this.security[strategy].devicesReqAdmin = { enabled: true };
          }
          if (this.security[strategy].usersReqAdmin === undefined) {
            this.security[strategy].usersReqAdmin = { enabled: true };
          }

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
      });

      this.maxLock.enabled = this.security.local.accountLock && this.security.local.accountLock.max !== undefined;
    });
  }

  buildPasswordHelp() {
    if (!this.security.local.passwordPolicy.customizeHelpText) {
      const policy = this.security.local.passwordPolicy
      const templates = Object.entries(policy.helpTextTemplate)
        .filter(([key]) => policy[`${key}Enabled`] === true)
        .map(([key, value]) => {
          return value.replace('#', policy[key])
        });

      this.security.local.passwordPolicy.helpText = `Password is invalid, must ${templates.join(' and ')}.`;
    }
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
      delete this.security.local.accountLock.max;
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

AdminSettingsController.$inject = ['$q', '$timeout', 'Settings', 'LocalStorageService', 'Event', 'Team', 'AuthenticationConfigurationService'];

export default {
  template: require('./settings.html'),
  controller: AdminSettingsController
};
