angular.module('mage').factory('Observation', ['$resource', '$http', function($resource, $http) {

  var Observation = $resource('/api/events/:eventId/observations/:id', {
    id: '@id',
    eventId: '@eventId'
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
    get: {
      method: 'GET'
    }
  });

  Observation.prototype.$save = function(params, success, error) {
    if(this.id) {
      this.$update(params, success, error);
    } else {
      this.$create(params, success, error);
    }
  };

  return Observation;
}])
.factory('ObservationState', ['$resource', '$http', function($resource, $http) {

  var ObservationState = $resource('/api/events/:eventId/observations/:observationId/states/:id', {
    id: '@id',
    observationId: '@observationId',
    eventId: '@eventId'
  },{
    save: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    get: {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });

  return ObservationState;
}])
.factory('ObservationAttachment', ['$resource', '$http', function($resource, $http) {
  var ObservationAttachment = $resource('/api/events/:eventId/observations/:observationId/attachments/:id', {

  }, {
    get: {
      method: 'GET'
    }
  });


  return ObservationAttachment;
}]);
