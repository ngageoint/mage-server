'use strict';

angular.module('mage').***REMOVED***('EventService', function EventService($rootScope, Event, ObservationService, FilterService) {
  var ***REMOVED*** = {};

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

  function fetchObservations(event, options) {
    ObservationService.getObservationsForEvent(event, options).then(function(observations) {
      eventsById[event.id] = event;
      eventsById[event.id].observationsById = _.indexBy(observations, 'id');

      observationsChanged({added: observations});
    });
  }

  FilterService.addListener({
    onEventChanged: function(event) {
      fetchObservations(event);
    },
    onTimeIntervalChanged: function(interval) {
      // TODO add time filter
    }
  });

  // TODO add polling

  ***REMOVED***.addObservationsChangedListener = function(listener) {
    observationsChangedListeners.push(listener);
  }

  ***REMOVED***.getObservations = function() {
    var events = _.values(eventsById);
    var observations = [];
    _.each(_.values(eventsById), function(event) {
      observations.concat(_.values(event.observationsById));
    });

    return observations;
  }

  ***REMOVED***.saveObservation = function(observation) {
    var event = eventsById[observation.eventId];
    var observationId = observation.id;
    return ObservationService.saveObservationForEvent(event, observation).then(function(observation) {
      event.observationsById[observationId] = observation;
      observationId ? observationsChanged({updated: [observation]}) : observationsChanged({added: [observation]});
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
});
