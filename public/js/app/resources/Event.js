angular.module('mage').factory('Event', ['$rootScope', '$resource', '$http', 'mageLib', 'Observation', function($rootScope, $resource, $http, mageLib, Observation) {

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
    }
  });

  function defaultForm() {
    return {
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
          if (this.hasOwnProperty(key) && key != 'formArchiveFile' ) {
            if (_.isObject(this[key]) || _.isArray(this[key])) {
              var blob = new Blob([angular.toJson(this[key])], {type: 'application/json'});
              formData.append(key, blob);
            } else {
              formData.append(key, this[key]);
            }
          }
        }

        var self = this;
        $.ajax({
          url: '/api/events',
          type: 'POST',
          headers: {
            authorization: 'Bearer ' + mageLib.getLocalItem('token')
          },
          success: function(response) {
            delete self.formArchiveFile;
            _.extend(self, response);
            $rootScope.$apply(function() {
              success(self);
            });
          },
          error: error,
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

}]);
