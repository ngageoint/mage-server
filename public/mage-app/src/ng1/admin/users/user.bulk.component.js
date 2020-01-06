import _ from 'underscore';
import Papa from 'papaparse';

class AdminUserBulkController {
  constructor($q, $timeout, $element, LocalStorageService, UserService, Team, UserIconService) {
    this.$q = $q;
    this.$element = $element;
    this.$timeout = $timeout;
    this.UserService = UserService;
    this.UserIconService = UserIconService;
    this.Team = Team;

    this.token = LocalStorageService.getToken();

    this.requiredFields = ['username', 'displayname', 'password'];

    this.columnOptions = [{
      value: 'username',
      title: 'Username'
    },{
      value: 'displayname',
      title: 'Display Name'
    },{
      value: 'email',
      title: 'Email'
    },{
      value: 'phone',
      title: 'Phone Number'
    },{
      value: 'password',
      title: 'Password'
    },{
      value: 'iconInitials',
      title: 'Icon Initials'
    },{
      value: 'iconolor',
      title: 'Icon Color'
    }];

    this.team = { selected: null };
    this.role = { selected: null };
  
    this.edit = {};
    this.columnMap = {};
    this.unmappedFields = [];
    this.someError = {};
  }

  $postLink() {
    this.$element.find(':file').bind('change', function() {
      this.importFile();
    }.bind(this));
  }

  $onInit() {
    this.UserService.getRoles().success(roles => {
      this.roles = roles;
    });
  
    this.Team.query(teams => {
      this.teams = _.reject(teams, team => { return team.teamEventId; });
    });
  }

  teamSelected(team) {
    this.team.selected = team;
  }

  roleSelected(role) {
    this.role.selected = role;
  }

  teamSelectedForUser(team, user) {
    user.team.selected = team;
  }

  roleSelectedForUser(role, user) {
    user.role.selected = role;
  }

  importFile() {
    Papa.parse(event.target.files[0], {
      complete: results => {
        this.$timeout(() => {
          this.columns = results.data[0];
          this.users = results.data.slice(1);
          _.each(this.users, user => {
            user.team = {
              selected: this.team.selected
            };
            user.role = {
              selected: this.role.selected
            };
          });

          this.mapColumns(this.columns);
        });
      }
    });
  }

  onStatusClosed() {
    this.importStatus = null;
  }

  onColumnOption($event, $index) {
    this.mapColumn($event.option.value, $index);
    this.validateMapping();
  }

  selected($index) {
    for (let [key, value] of Object.entries(this.columnMap)) {
      if (value === $index) return key;
    }
  }

  import() {
    this.imported = true;
    this.importUsers(this.users);
  }

  importUsers(users) {
    this.importing = true;
    this.edit.row = null;
    this.asyncSeries(users).then(() => {
      this.importing = false;

      this.users = this.users.filter(user => {
        return user.result.status !== 200;
      });

      if (this.users.length) {
        this.importStatus = {
          message: `${this.users.length} users failed to import, please fix errors and try again.`,
          dismiss: true
        };
      } else {
        this.importStatus = {
          message: `All users successfully imported.`,
          dismiss: true
        };

        this.columns = null;
        this.team = { selected: null };
        this.role = { selected: null };
      }
    });
  }

  importUser(row) {
    var deferred = this.$q.defer();

    var user = {
      username: row[this.columnMap.username],
      displayName: row[this.columnMap.displayname],
      email: row[this.columnMap.email],
      phone: row[this.columnMap.phone],
      password: row[this.columnMap.password],
      passwordconfirm: row[this.columnMap.password],
      iconInitials: row[this.columnMap.iconInitials],
      iconColor: row[this.columnMap.iconColor],
      roleId: row.role.selected.id
    };

    var canvas = document.createElement("canvas");
    canvas.height = 44;
    canvas.width = 44;

    if (user.iconInitials && user.iconColor && canvas.getContext) {
      var iconColor = user.iconColor;
      var iconInitials = user.iconInitials.substring(0, 2);
      this.UserIconService.drawMarker(canvas, iconColor, iconInitials);
      user.icon = this.UserIconService.canvasToPng(canvas);
      user.iconMetadata = JSON.stringify({
        type: 'create',
        text: iconInitials,
        color: iconColor
      });
    }

    this.UserService.createUser(user, newUser => {
      this.Team.addUser({id: row.team.selected.id}, newUser, () => {
        row.result = {
          status: 200
        };

        deferred.resolve();
      }, response => {
        row.result = {
          status: response.status,
          message: `Could not create user, ${response.responseText}`
        };

        deferred.resolve();
      });
    }, result => {
      row.result = {
        status: result.status,
        message: `Could not create user, ${result.responseText}`
      };
      deferred.resolve();
    });

    return deferred.promise;
  }

  asyncSeries(users) {
    return users.reduce((promise, user) => {
      return promise.then(() => {
        return this.importUser(user);
      });
    }, this.$q.when());
  }

  mapColumn(column, index) {
    var mappedKey = _.findKey(this.columnMap, i => {
      return index === i;
    });

    if (mappedKey) {
      delete this.columnMap[mappedKey];
    }

    this.columnMap[column] = index;
  }

  mapColumns(columnNames) {
    var usernameIndex = _.indexOf(columnNames, 'username');
    if (usernameIndex !== -1) this.mapColumn('username', usernameIndex);

    var displayNameIndex = _.indexOf(columnNames, 'displayname');
    if (displayNameIndex !== -1) this.mapColumn('displayname', displayNameIndex);

    var emailIndex = _.indexOf(columnNames, 'email');
    if (emailIndex !== -1) this.mapColumn('email', emailIndex);

    var phoneIndex = _.indexOf(columnNames, 'phone');
    if (phoneIndex !== -1) this.mapColumn('phone', phoneIndex);

    var passwordIndex = _.indexOf(columnNames, 'password');
    if (passwordIndex !== -1) this.mapColumn('password', passwordIndex);

    var iconInitialsIndex = _.indexOf(columnNames, 'iconInitials');
    if (iconInitialsIndex !== -1) this.mapColumn('iconInitials', iconInitialsIndex);

    var iconColorIndex = _.indexOf(columnNames, 'iconColor');
    if (iconColorIndex !== -1) this.mapColumn('iconColor', iconColorIndex);

    this.validateMapping();
  }

  validateMapping () {
    var fields = _.difference(this.requiredFields, _.intersection(_.allKeys(this.columnMap), this.requiredFields));
    this.unmappedFields = _.filter(this.columnOptions, field => { return fields.includes(field.value); });
  }
}

AdminUserBulkController.$inject = ['$q', '$timeout', '$element', 'LocalStorageService', 'UserService', 'Team', 'UserIconService'];

export default {
  template: require('./user.bulk.html'),
  controller: AdminUserBulkController
};