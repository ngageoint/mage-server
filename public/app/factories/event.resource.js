angular
  .module('mage')
  .factory('Event', Event)
  .factory('EventAccess', EventAccess);

Event.$inject = ['$rootScope', '$resource', '$http', 'LocalStorageService'];

function Event($rootScope, $resource, $http, LocalStorageService) {
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

  function defaultForm() {
    return {
      userFields: [],
      fields: [{
        id: 1,
        title: 'Date',
        type: 'date',
        required: true,
        name: "timestamp"
      },{
        id: 2,
        title: 'Location',
        type: 'geometry',
        required: true,
        name: 'geometry'
      },{
        id: 3,
        title: 'Type',
        type: 'dropdown',
        required: true,
        name: "type",
        choices: []
      }]
    };
  }

  Event.prototype.$save = function(success, error) {
    if (this.id) {
      this.$update(success, error);
    } else {
      // TODO default form???  this is probably dropped on server side
      this.form = defaultForm();
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
