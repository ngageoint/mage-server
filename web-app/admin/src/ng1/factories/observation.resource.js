module.exports = {
  Observation: Observation,
  ObservationFavorite: ObservationFavorite,
  ObservationImportant: ObservationImportant,
  ObservationState: ObservationState,
  ObservationAttachment: ObservationAttachment
};

Observation.$inject = ['$resource'];

function Observation($resource) {
  var ObservationId = $resource('/api/events/:eventId/observations/id/', {
    eventId: '@eventId'
  }, {
    createId: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });

  var Observation = $resource('/api/events/:eventId/observations/:id', {
    id: '@id',
    eventId: '@eventId'
  }, {
    update: {
      method: 'PUT',
      url: '/api/events/:eventId/observations/:id',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    get: {
      method: 'GET'
    }
  });

  Observation.prototype.$save = function(params, success, error) {
    if (this.id) {
      this.$update(params, success, error);
    } else {
      var self = this;
      var onSuccess = function(observation) {
        self.id = observation.id;
        self.$update(params, success, error);
      };

      new ObservationId({eventId: this.eventId}).$createId({}, onSuccess, error);
    }
  };

  return Observation;
}

ObservationFavorite.$inject = ['$resource'];

function ObservationFavorite($resource) {
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
}


ObservationImportant.$inject = ['$resource'];

function ObservationImportant($resource) {
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
}

ObservationState.$inject = ['$resource'];

function ObservationState($resource) {
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
}

ObservationAttachment.$inject = ['$resource'];

function ObservationAttachment($resource) {
  var ObservationAttachment = $resource('/api/events/:eventId/observations/:observationId/attachments/:id', {

  }, {
    get: {
      method: 'GET'
    }
  });

  return ObservationAttachment;
}
