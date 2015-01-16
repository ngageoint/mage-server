angular.module('mage').factory('Event', ['$rootScope', '$resource', '$http', 'appConstants', 'mageLib', 'Feature', function($rootScope, $resource, $http, appConstants, mageLib, Feature) {
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
            formData.append(key, this[key]);
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

  Event.prototype.getField = function(fieldName) {
    return _.find(this.form.fields, function(field) { return field.name == fieldName});
  };

  Event.prototype.getObservation = function() {
    var observation = new Feature({
      type: 'Feature',
      layerId: appConstants.featureLayer.id,
      properties: {
      }
    });

    observation.id = this.observationId;
    _.each(this.fields, function(field) {
      switch (field.name) {
      case 'geometry':
        observation.geometry = {
          type: 'Point',
          coordinates: [field.value.x, field.value.y]
        }
        break;
      default:
        observation.properties[field.name] = field.value;
      }
    });

    return observation;
  }

  return Event;

}]);
