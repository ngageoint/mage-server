angular
  .module('mage')
  .***REMOVED***('EventService', EventService);

EventService.$inject = ['$rootScope', '$q', '$timeout', 'Event', 'ObservationService', 'LocationService', 'FilterService', 'PollingService'];

function EventService($rootScope, $q, $timeout, Event, ObservationService, LocationService, FilterService, PollingService) {
  var observationsChangedListeners = [];
  var usersChangedListeners = [];
  var eventsById = {};

  var ***REMOVED*** = {};

  FilterService.addListener({
    onEventChanged: function(event) {
      _.each(event.added, function(added) {
        fetch(added, FilterService.getTimeInterval());
      });

      _.each(event.removed, function(removed) {
        observationsChanged({removed: _.values(eventsById[removed.id].observationsById)});
        delete eventsById[removed.id];

        // TODO remove locations for event that was removed
      });
    },
    onTimeIntervalChanged: function(interval) {
      var event = FilterService.getEvent();
      if (event) {
        fetch(event, interval);
      }
    }
  });

  PollingService.addListener({
    onPollingIntervalChanged: function(interval) {
      if (pollingTimeout) {
        // cancel previous poll
        $timeout.cancel(pollingTimeout);
      }

      poll(interval);
    }
  });

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
        user = {
          id: userLocation.id,
          location: userLocation.locations[0]
        }
        users.push(user);

        // Check if we already have this user, if so update, otherwise add
        var localUser = usersById[user.id];
        if (localUser) {
          if (user.location.properties.timestamp !== localUser.location.properties.timestamp) updated.push(user);
        } else {
          added.push(user);
        }

        // remove from list of observations if it came back from server
        // remaining elements in this list will be removed
        delete usersById[user.id];
      });

      // remaining elements were not pulled from the server, hence we should remove them
      removed = _.values(usersById);

      eventsById[event.id].usersById = _.indexBy(users, 'id');
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
  });

  ***REMOVED***.addObservationsChangedListener = function(listener) {
    observationsChangedListeners.push(listener);

    if (_.isFunction(listener.onObservationsChanged)) {
      _.each(_.values(eventsById), function(event) {
        listener.onObservationsChanged({added: _.values(event.observationsById)});
      });
    }
  }

  ***REMOVED***.removeObservationsChangedListener = function(listener) {
    observationsChangedListeners = _.reject(observationsChangedListeners, function(l) {
      return listener === l;
    });
  }

  ***REMOVED***.addUsersChangedListener = function(listener) {
    usersChangedListeners.push(listener);

    if (_.isFunction(listener.onUsersChanged)) {
      _.each(_.values(eventsById), function(event) {
        listener.onUsersChanged({added: _.values(event.usersById)});
      });
    }
  }

  ***REMOVED***.removeUsersChangedListener = function(listener) {
    usersChangedListeners = _.reject(usersChangedListeners, function(l) {
      return listener === l;
    });
  }

  ***REMOVED***.saveObservation = function(observation) {
    var event = eventsById[observation.eventId];
    var isNewObservation = observation.id == null;
    return ObservationService.saveObservationForEvent(event, observation).then(function(observation) {
      event.observationsById[observation.id] = observation;
      isNewObservation ? observationsChanged({added: [observation]}) : observationsChanged({updated: [observation]});
    });
  }

  ***REMOVED***.archiveObservation = function(observation) {
    var event = eventsById[observation.eventId];
    return ObservationService.archiveObservationForEvent(event, observation).then(function(archivedObservation) {
      delete event.observationsById[archivedObservation.id];
      observationsChanged({removed: [archivedObservation]});
    });
  }

  ***REMOVED***.addAttachmentToObservation = function(observation, attachment) {
    var event = eventsById[observation.eventId];
    ObservationService.addAttachmentToObservationForEvent(event, observation, attachment);
    observationsChanged({updated: [observation]});
  }

  ***REMOVED***.deleteAttachmentForObservation = function(observation, attachment) {
    var event = eventsById[observation.eventId];
    return ObservationService.deleteAttachmentInObservationForEvent(event, observation, attachment).then(function(observation) {
      observationsChanged({updated: [observation]});
    });
  }

  ***REMOVED***.getFormField = function(form, fieldName) {
    return _.find(form.fields, function(field) { return field.name == fieldName});
  }

  ***REMOVED***.createForm = function(observation, viewMode) {
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

  return ***REMOVED***;
}
