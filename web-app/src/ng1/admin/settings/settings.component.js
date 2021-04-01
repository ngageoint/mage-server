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

    this.maxLock = {
      enabled: false
    };
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

      this.strategies = result.configs || [];
      this.pill = Object.keys(this.strategies).length ? 'security' : 'banner';

      const settings = _.indexBy(result.settings, 'type');

      this.banner = settings.banner ? settings.banner.settings : {};
      this.disclaimer = settings.disclaimer ? settings.disclaimer.settings : {};

      this.strategies.forEach(strategy => {
        if (strategy.settings.newUserEvents) {
          strategy.settings.newUserEvents = strategy.settings.newUserEvents.filter(id => {
            return this.events.some(event => event.id === id)
          });
        }
        if (strategy.settings.newUserTeams) {
          // Remove any teams and events that no longer exist
          strategy.settings.newUserTeams = strategy.settings.newUserTeams.filter(id => {
            return this.teams.some(team => team.id === id)
          });
        }
        if (strategy.settings.passwordPolicy) {
          if (strategy.type === 'local') {
            this.maxLock.enabled = strategy.settings.accountLock && strategy.settings.accountLock.max !== undefined;
            this.buildPasswordHelp(strategy);
          }
        }
      });
    });
  }

  buildPasswordHelp(strategy) {
    if (strategy.settings.passwordPolicy) {
      if (!strategy.settings.passwordPolicy.customizeHelpText) {
        const policy = strategy.settings.passwordPolicy
        const templates = Object.entries(policy.helpTextTemplate)
          .filter(([key]) => policy[`${key}Enabled`] === true)
          .map(([key, value]) => {
            return value.replace('#', policy[key])
          });

        strategy.settings.passwordPolicy.helpText = `Password is invalid, must ${templates.join(' and ')}.`;
      }
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
    let chain = Promise.resolve();

    this.strategies.forEach(strategy => {
      if (strategy.settings.usersReqAdmin.enabled) {
        strategy.newUserEvents = [];
        strategy.newUserTeams = [];
      }
      if (strategy.type === 'local') {
        if (!this.maxLock.enabled) {
          delete strategy.settings.accountLock.max;
        }
      }
      chain = chain.then(this.AuthenticationConfigurationService.updateConfiguration(strategy));
    });

    this.saved = true;
    this.saving = false;
    this.saveStatus = 'Security settings successfully saved.';
    this.debounceHideSave();

    //this.saving = false;
    //this.saveStatus = 'Failed to save security settings.';
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
