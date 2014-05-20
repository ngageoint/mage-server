angular.module('mage').factory('Form', ['$resource', '$http', 'appConstants', 'Feature', function($resource, $http, appConstants, Feature) {
  var Form = $resource('/api/forms/:id', {
    id: '@id'
  }, {
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
      cache: true,
      isArray: true
    }
  });

  Form.prototype.$save = function(params, success, error) {
    if (this.id) {
      this.$update(params, success, error);
    } else {
      this.$create(params, success, error);
    }
  };

  Form.prototype.getField = function(fieldName) {
    return _.find(this.fields, function(field) { return field.name == fieldName});
  };

  Form.prototype.getObservation = function() {
    var observation = new Feature({
      type: 'Feature',
      layerId: appConstants.featureLayerId,
      properties: {
      }
    });

    _.each(this.fields, function(field) {
      switch (field.name) {
      case 'id':
        observation.id = field.value;
        break;
      case 'geometry':
        observation.geometry = {
          type: 'Point',
          coordinates: field.value
        }
        break;
      default:
        observation.properties[field.name] = field.value;
      }
    });

    return observation;
  }

  return Form;

}]);
