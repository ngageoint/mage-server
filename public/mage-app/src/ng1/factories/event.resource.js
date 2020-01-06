module.exports = {
  Event: Event,
  EventAccess: EventAccess
};

Event.$inject = ['$rootScope', '$resource'];

function Event($rootScope, $resource) {
  var Event = $resource('/api/events/:id', {
    id: '@id'
  },{
    get: {
      method: 'GET',
      responseType: 'json'
    },
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
    query: {
      isArray: true,
      responseType: 'json'
    },
    count: {
      method: 'GET',
      url: '/api/events/count',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    addTeam: {
      method: 'POST',
      url: '/api/events/:id/teams',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    removeTeam: {
      method: 'DELETE',
      url: '/api/events/:id/teams/:teamId',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    addLayer: {
      method: 'POST',
      url: '/api/events/:id/layers',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    removeLayer: {
      method: 'DELETE',
      url: '/api/events/:id/layers/:layerId',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });

  Event.prototype.$save = function(success, error) {
    if (this.id) {
      this.$update(success, error);
    } else {
      this.$create(success, error);
    }
  };

  return Event;
}

EventAccess.$inject = ['$resource'];

function EventAccess($resource) {
  var EventAccess = $resource('/api/events/:eventId/acl', {
    eventId: '@eventId',
    userId: '@userId'
  },{
    update: {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      url: '/api/events/:eventId/acl/:userId',
      isArray: false
    },
    delete: {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      isArray: false,
      url: '/api/events/:eventId/acl/:userId'
    }
  });

  return EventAccess;
}
