angular
  .module('mage')
  .***REMOVED***('EventService', EventService);

EventService.$inject = ['$rootScope', '$timeout', 'Event', 'ObservationService', 'FilterService', 'PollingService'];

function EventService($rootScope, $timeout, Event, ObservationService, FilterService, PollingService) {
  var ***REMOVED*** = {};

  FilterService.addListener({
    onEventChanged: function(event) {
      _.each(event.added, function(added) {
        fetchObservations(added, FilterService.getTimeInterval());
      });

      _.each(event.removed, function(removed) {
        observationsChanged({removed: _.values(eventsById[removed.id].observationsById)});
        delete eventsById[removed.id];
      });
    },
    onTimeIntervalChanged: function(interval) {
      var event = FilterService.getEvent();
      if (event) {
        fetchObservations(event, interval);
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

  var selectedEvent = null;
  var eventsById = {};

  var observationsChangedListeners = [];
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

  function fetchObservations(event, interval) {
    var parameters = {};
    if (interval) {
      var time = FilterService.formatInterval(interval);
      parameters.interval = time;
    }

    return ObservationService.getObservationsForEvent(event, parameters).then(function(observations) {
      var added = [];
      var updated = [];
      var removed = [];

      if (!eventsById[event.id]) {
        eventsById[event.id] = event;
        added = observations;
      } else {
        var observationsById = eventsById[event.id].observationsById;
        _.each(observations, function(observation) {
          // Check if we already have this observation, if so update, otherwise add
          var localObservation = observationsById[observation.id];
          localObservation ? updated.push(observation) : added.push(observation);

          // remove from list of observations if it came back from server
          // remaining elements in this list will be removed
          delete observationsById[observation.id];
        });

        // remaining elements were not pulled from the server, hence we should remove them
        removed = _.values(observationsById);
      }

      eventsById[event.id].observationsById = _.indexBy(observations, 'id');
      observationsChanged({added: added, updated: updated, removed: removed});
    });
  }

  var pollingTimeout = null;
  function poll(interval) {
    if (interval <= 0) return;

    fetchObservations(FilterService.getEvent(), FilterService.getTimeInterval()).then(function() {
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
    observationsChangedListeners = _.filter(observationsChangedListeners, function(l) {
      return listener !== l;
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
