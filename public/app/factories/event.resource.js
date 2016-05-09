angular
  .module('mage')
  .factory('Event', Event);

Event.$inject = ['$rootScope', '$resource', '$http', 'LocalStorageService'];

function Event($rootScope, $resource, $http, LocalStorageService) {
  var Event = $resource('/api/events/:id', {
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
    query: {
      isArray: true
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
      if (this.formArchiveFile) {
        var formData = new FormData();
        formData.append('form', this.formArchiveFile);
        for (var key in this) {
          if (this.hasOwnProperty(key) && key !== 'formArchiveFile' ) {
            formData.append(key, this[key]);
          }
        }

        var self = this;
        $.ajax({
          url: '/api/events',
          type: 'POST',
          headers: {
            authorization: 'Bearer ' + LocalStorageService.getToken()
          },
          success: function(response) {
            delete self.formArchiveFile;
            _.extend(self, response);
            $rootScope.$apply(function() {
              success(self);
            });
          },
          error: function(response) {
            if (!_.isFunction(error)) return;

            var contentType = response.getResponseHeader("content-type") || "";
            if (contentType.indexOf('json') > -1) {
              response.responseJSON = JSON.parse(response.responseText);
            }

            $rootScope.$apply(function() {
              error(response);
            });
          },
          data: formData,
          cache: false,
          contentType: false,
          processData: false
        });
      } else {
        this.form = defaultForm();
        this.$create(success, error);
      }
    }
  };

  return Event;
}
