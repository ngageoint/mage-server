import _ from 'underscore';

class AdminSettingsController {
  constructor($timeout, Api, Settings, LocalStorageService, Event, Team) {
    this.$timeout = $timeout;
    this.Api = Api;
    this.Settings = Settings;
    this.Event = Event;
    this.Team = Team;

    this.token = LocalStorageService.getToken();
    this.pill = 'security';

    this.events = [];
    this.teams = [];
    this.strategies = [];
    this.authConfig = {};
    
    this.usersReqAdminChoices = [{
      title: 'No',
      description: 'New users do not require admin approval.',
      value: false
    },{
      title: 'Yes',
      description: 'New users require admin approval.',
      value: true
    }];
    this.devicesReqAdminChoices = [{
      title: 'No',
      description: 'New devices do not require admin approval.',
      value: false
    },{
      title: 'Yes',
      description: 'New devices require admin approval.',
      value: true
    }];

    this.local = {
      devicesReqAdmin: {enabled: true},
      usersReqAdmin: {enabled: true},
      newUserEvents: [],
      newUserTeams: []
    };

    this.ldap = {
      devicesReqAdmin: {enabled: true},
      usersReqAdmin: {enabled: true},
      newUserEvents: [],
      newUserTeams: []
    };

    this.google = {
      devicesReqAdmin: {enabled: true},
      usersReqAdmin: {enabled: true},
      newUserEvents: [],
      newUserTeams: []
    };
  
    this.geoaxis = {
      devicesReqAdmin: {enabled: true},
      usersReqAdmin: {enabled: true},
      newUserEvents: [],
      newUserTeams: []
    };

    //TODO cant have a dash for login-gov
    this.logingov = {
      devicesReqAdmin: {enabled: true},
      usersReqAdmin: {enabled: true},
      newUserEvents: [],
      newUserTeams: []
    };

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
      this.authConfig = api.authenticationStrategies || {};
      this.pill = this.authConfig.local ? 'security' : 'banner';
      //TODO for sure there is a less dumb way to do this
      if(this.authConfig.local){
        this.strategies.push('local');
      }
      if (this.authConfig.ldap) {
        this.strategies.push('ldap');
      }
      if(this.authConfig.google) {
        this.strategies.push('google');
      }
      if(this.authConfig.geoaxis) { 
        this.strategies.push('geoaxis');
      } 
      //TODO figure out how to handle this case
      //if(this.authConfig.login-gov) { 
        //this.strategies.push('login-gov');
      //} 
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

      for (var i =0 ; i < this.strategies.length; i++) {
        let strategy = this.strategies[i];
        if(!this.security[strategy]) {
          this.security[strategy] = {
            devicesReqAdmin: {enabled: true},
            usersReqAdmin: {enabled: true},
            newUserEvents: [],
            newUserTeams: []
          }
        }
      }
  
      this.maxLock.enabled = this.security.accountLock && this.security.accountLock.max !== undefined;
    });

    
    this.Event.query({state: 'all',  populate: false, projection: JSON.stringify(this.projection)}, events => {
      this.events = events;
    });

    this.Team.query({state: 'all',  populate: false, projection: JSON.stringify(this.projection)}, teams => {
      this.teams = _.reject(teams, team => { return team.teamEventId; });
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

    for (var i =0 ; i < this.strategies.length; i++) {
      var strategy = this.strategies[i];
      if (this.security[strategy].usersReqAdmin.enabled) {
        delete this.security.newUserEvents[strategy];
        delete this.security.newUserTeams[strategy];
      }
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

AdminSettingsController.$inject = ['$timeout', 'Api', 'Settings', 'LocalStorageService', 'Event', 'Team'];

export default {
  template: require('./settings.html'),
  controller: AdminSettingsController
};
