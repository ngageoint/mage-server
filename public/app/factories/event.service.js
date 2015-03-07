angular
  .module('mage')
  .***REMOVED***('EventService', EventService);

EventService.$inject = ['$rootScope', '$q', '$timeout', '$http', 'Event', 'ObservationService', 'LocationService', 'LayerService', 'FilterService', 'PollingService'];

function EventService($rootScope, $q, $timeout, $http, Event, ObservationService, LocationService, LayerService, FilterService, PollingService) {
  var observationsChangedListeners = [];
  var usersChangedListeners = [];
  var layersChangedListeners = [];
  var eventsById = {};

  var filterServiceListener = {
    onEventChanged: function(event) {
      _.each(event.added, function(added) {
        fetch(added, FilterService.getTimeInterval());
        fetchLayers(added);
      });

      _.each(event.removed, function(removed) {
        observationsChanged({removed: _.values(eventsById[removed.id].observationsById)});
        usersChanged({removed: _.values(eventsById[removed.id].usersById)});
        layersChanged({removed: _.values(eventsById[removed.id].layersById)}, removed);
        delete eventsById[removed.id];
      });
    },
    onTimeIntervalChanged: function(interval) {
      var event = FilterService.getEvent();
      if (event) {
        fetch(event, interval);
      }
    }
  }
  FilterService.addListener(filterServiceListener);

  var pollingServiceListener = {
    onPollingIntervalChanged: function(interval) {
      if (pollingTimeout) {
        // cancel previous poll
        $timeout.cancel(pollingTimeout);
      }

      pollingTimeout = $timeout(function() {
        poll(interval);
      }, interval);
    }
  }
  PollingService.addListener(pollingServiceListener);

  var ***REMOVED*** = {
    addObservationsChangedListener: addObservationsChangedListener,
    removeObservationsChangedListener: removeObservationsChangedListener,
    addUsersChangedListener: addUsersChangedListener,
    removeUsersChangedListener: removeUsersChangedListener,
    addLayersChangedListener: addLayersChangedListener,
    removeLayersChangedListener: removeLayersChangedListener,
    saveObservation: saveObservation,
    archiveObservation: archiveObservation,
    addAttachmentToObservation: addAttachmentToObservation,
    deleteAttachmentForObservation: deleteAttachmentForObservation,
    getFormField: getFormField,
    createForm: createForm,
    exportForm: exportForm
  }

  return ***REMOVED***;

  function addObservationsChangedListener(listener) {
    observationsChangedListeners.push(listener);

    if (_.isFunction(listener.onObservationsChanged)) {
      _.each(_.values(eventsById), function(event) {
        listener.onObservationsChanged({added: _.values(event.observationsById)});
      });
    }
  }

  function removeObservationsChangedListener(listener) {
    observationsChangedListeners = _.reject(observationsChangedListeners, function(l) {
      return listener === l;
    });
  }

  function addUsersChangedListener(listener) {
    usersChangedListeners.push(listener);

    if (_.isFunction(listener.onUsersChanged)) {
      _.each(_.values(eventsById), function(event) {
        listener.onUsersChanged({added: _.values(event.usersById)});
      });
    }
  }

  function removeUsersChangedListener(listener) {
    usersChangedListeners = _.reject(usersChangedListeners, function(l) {
      return listener === l;
    });
  }

  function addLayersChangedListener(listener) {
    layersChangedListeners.push(listener);

    if (_.isFunction(listener.onLayersChanged)) {
      _.each(_.values(eventsById), function(event) {
        listener.onLayersChanged({added: _.values(event.layersById)}, event); // TODO this could be old layers, admin panel might have changed layers
      });
    }
  }

  function removeLayersChangedListener(listener) {
    layersChangedListeners = _.reject(layersChangedListeners, function(l) {
      return listener === l;
    });
  }

  function saveObservation(observation) {
    var event = eventsById[observation.eventId];
    var isNewObservation = observation.id == null;
    return ObservationService.saveObservationForEvent(event, observation).then(function(observation) {
      event.observationsById[observation.id] = observation;
      isNewObservation ? observationsChanged({added: [observation]}) : observationsChanged({updated: [observation]});
    });
  }

  function archiveObservation(observation) {
    var event = eventsById[observation.eventId];
    return ObservationService.archiveObservationForEvent(event, observation).then(function(archivedObservation) {
      delete event.observationsById[archivedObservation.id];
      observationsChanged({removed: [archivedObservation]});
    });
  }

  function addAttachmentToObservation(observation, attachment) {
    var event = eventsById[observation.eventId];
    ObservationService.addAttachmentToObservationForEvent(event, observation, attachment);
    observationsChanged({updated: [observation]});
  }

  function deleteAttachmentForObservation(observation, attachment) {
    var event = eventsById[observation.eventId];
    return ObservationService.deleteAttachmentInObservationForEvent(event, observation, attachment).then(function(observation) {
      observationsChanged({updated: [observation]});
    });
  }

  function getFormField(form, fieldName) {
    return _.find(form.fields, function(field) { return field.name == fieldName});
  }

  function createForm(observation, viewMode) {
    var event = eventsById[observation.eventId];

    var form = angular.copy(event.form);
    ***REMOVED***.getFormField(form, "timestamp").value  = observation.properties.timestamp;
    ***REMOVED***.getFormField(form, "geometry").value = {
      x: observation.geometry.coordinates[0],
      y: observation.geometry.coordinates[1]
    }

    var existingPropertyFields = [];
    _.each(observation.properties, function(value, key) {
      var field = ***REMOVED***.getFormField(form, key);
      if (field) {
        field.value = value;
        existingPropertyFields.push(field);
      }
    });

    if (viewMode) {
      form.fields = _.intersection(form.fields, existingPropertyFields);
    }

    return form;
  }

  function exportForm(event) {
    return $http.get('/api/events/' + event.id + '/form.zip');
  }

  function usersChanged(changed) {
    _.each(usersChangedListeners, function(listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onUsersChanged)) {
        listener.onUsersChanged(changed);
      }
    });
  }

  function observationsChanged(changed) {
    _.each(observationsChangedListeners, function(listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onObservationsChanged)) {
        listener.onObservationsChanged(changed);
      }
    });
  }

  function layersChanged(changed, event) {
    _.each(layersChangedListeners, function(listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onLayersChanged)) {
        listener.onLayersChanged(changed, event);
      }
    });
  }

  function fetch(event, interval) {
    if (!eventsById[event.id]) {
      eventsById[event.id] = event;
      eventsById[event.id].observationsById = {};
      eventsById[event.id].usersById = {};
    }

    var parameters = {};
    if (interval) {
      var time = FilterService.formatInterval(interval);
      parameters.interval = time;
    }

    return $q.all([
      fetchObservations(event, parameters),
      fetchLocations(event, parameters)
    ]);
  }

  function fetchLayers(event) {
    return LayerService.getLayersForEvent(event).then(function(layers) {
      eventsById[event.id].layersById = _.indexBy(layers, 'id');
      layersChanged({added: layers}, event);
    });
  }

  function fetchObservations(event, parameters) {
    return ObservationService.getObservationsForEvent(event, parameters).then(function(observations) {
      var added = [];
      var updated = [];
      var removed = [];

      var observationsById = eventsById[event.id].observationsById;
      _.each(observations, function(observation) {
        // Check if we already have this observation, if so update, otherwise add
        var localObservation = observationsById[observation.id];
        if (localObservation) {
          if (localObservation.lastModified !== observation.lastModified) updated.push(observation);
        } else {
          added.push(observation);
        }

        // remove from list of observations if it came back from server
        // remaining elements in this list will be removed
        delete observationsById[observation.id];
      });

      // remaining elements were not pulled from the server, hence we should remove them
      removed = _.values(observationsById);

      eventsById[event.id].observationsById = _.indexBy(observations, 'id');
      observationsChanged({added: added, updated: updated, removed: removed});
    });
  }

  function fetchLocations(event, parameters) {
    return LocationService.getUserLocationsForEvent(event, parameters).then(function(userLocations) {
      var added = [];
      var updated = [];
      var removed = [];

      var users = [];
      var usersById = eventsById[event.id].usersById;
      _.each(userLocations, function(userLocation) {
        // Track each location feature by users id,
        // so update the locations id to match the usersId
        var location = userLocation.locations[0];
        location.id = userLocation.id;
        userLocation.location = location;
        delete userLocation.locations;

        // Check if we already have this user, if so update, otherwise add
        var localUser = usersById[userLocation.id];
        if (localUser) {
          if (userLocation.location.properties.timestamp !== localUser.location.properties.timestamp) updated.push(userLocation);
        } else {
          added.push(userLocation);
        }

        // remove from list of observations if it came back from server
        // remaining elements in this list will be removed
        delete usersById[userLocation.id];
      });

      // remaining elements were not pulled from the server, hence we should remove them
      removed = _.values(usersById);

      eventsById[event.id].usersById = _.indexBy(userLocations, 'id');
      usersChanged({added: added, updated: updated, removed: removed});
    });
  }

  var pollingTimeout = null;
  function poll(interval) {
    if (interval <= 0) return;

    fetch(FilterService.getEvent(), FilterService.getTimeInterval()).then(function() {
      pollingTimeout = $timeout(function() {
        poll(interval);
      }, interval);
    });
  }

  $rootScope.$on('$destory', function() {
    if (pollingTimeout) {
      $timeout.cancel(pollingTimeout);
    }

    FilterService.removeListener(filterServiceListener);
    PollingService.removeListener(pollingServiceListener);
  });
}
