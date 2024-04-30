function Team($resource) {
  const Team = $resource('/api/teams/:id', {
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
    },
    getMembers: {
      method: 'GET',
      url: '/api/teams/:id/members',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    getNonMembers: {
      method: 'GET',
      url: '/api/teams/:id/nonMembers',
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
}

function TeamAccess($resource) {
  const TeamAccess = $resource('/api/teams/:teamId/acl', {
    teamId: '@teamId',
    userId: '@userId'
  },{
    update: {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      url: '/api/teams/:teamId/acl/:userId',
      isArray: false
    },
    delete: {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      isArray: false,
      url: '/api/teams/:teamId/acl/:userId'
    }
  });

  return TeamAccess;
}

Team.$inject = ['$resource'];
TeamAccess.$inject = ['$resource'];

module.exports = {
  Team: Team,
  TeamAccess: TeamAccess
};
