angular.module('mage').factory('Observation', ['$resource', function($resource) {

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
.factory('ObservationFavorite', ['$resource', function($resource) {

  var ObservationFavorite = $resource('/api/events/:eventId/observations/:observationId/favorite', {
    id: '@id',
    observationId: '@observationId',
    eventId: '@eventId'
  },{
    save: {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });

  return ObservationFavorite;
}])
.factory('ObservationImportant', ['$resource', function($resource) {

  var ObservationImportant = $resource('/api/events/:eventId/observations/:observationId/important', {
    id: '@id',
    observationId: '@observationId',
    eventId: '@eventId'
  },{
    save: {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });

  return ObservationImportant;
}])
.factory('ObservationState', ['$resource', function($resource) {

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
.factory('ObservationAttachment', ['$resource', function($resource) {
  var ObservationAttachment = $resource('/api/events/:eventId/observations/:observationId/attachments/:id', {

  }, {
    get: {
      method: 'GET'
    }
  });


  return ObservationAttachment;
}]);
