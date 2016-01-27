angular.module('mage').factory('Team', ['$resource', function($resource) {

  var Team = $resource('/api/teams/:id', {
    id: '@id'
  },{
    create: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    update: {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    count: {
      method: 'GET',
      url: '/api/teams/count',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    addUser: {
      method: 'POST',
      url: '/api/teams/:id/users',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    removeUser: {
      method: 'DELETE',
      url: '/api/teams/:id/users/:userId',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });

  Team.prototype.$save = function(params, success, error) {
    if (this.id) {
      this.$update(params, success, error);
    } else {
      this.$create(params, success, error);
    }
  };

  return Team;
}]);
