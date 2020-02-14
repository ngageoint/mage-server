import _ from 'underscore';

class AdminTeamDeleteController {
  constructor($q, UserService) {
    this.$q = $q;
    this.UserService = UserService;

    this.confirm = {};
  }

  $onInit() {
    this.team = this.resolve.team;
  }

  deleteTeam(team) {
    this.deleting = true;

    var users = team.users;
    team.$delete(() => {
      if (this.deleteAllUsers && (this.confirm.text === team.name)) {
        this.deleteUsers(users);
      } else {
        this.modalInstance.close(team);
      }
    });
  }

  cancel() {
    this.modalInstance.dismiss('cancel');
  }

  deleteUsers(users) {
    var promises = [];
    _.each(users, user => {
      promises.push(this.deleteUser(user));
    });

    this.$q.all(promises).then(() => {
      this.modalInstance.close(this.team);
    });
  }

  deleteUser(user) {
    var deferred = this.$q.defer();

    this.UserService.deleteUser(user).then(() => {
      deferred.resolve();
    }, function() {
      deferred.resolve();
    });

    return deferred.promise;
  }
}

AdminTeamDeleteController.$inject = ['$q', 'UserService'];

export default {
  template: require('./team.delete.html'),
  bindings: {
    resolve: '<',
    modalInstance: '<'
  },
  controller: AdminTeamDeleteController
};
