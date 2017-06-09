angular
  .module('mage')
  .factory('ObservationService', ObservationService);

ObservationService.$inject = ['$q', 'Observation', 'ObservationAttachment', 'ObservationState', 'ObservationImportant', 'ObservationFavorite', 'LocalStorageService'];

function ObservationService($q, Observation, ObservationAttachment, ObservationState, ObservationImportant, ObservationFavorite, LocalStorageService) {
  var service = {
    getObservationsForEvent: getObservationsForEvent,
    saveObservationForEvent: saveObservationForEvent,
    archiveObservationForEvent: archiveObservationForEvent,
    addObservationFavorite: addObservationFavorite,
    removeObservationFavorite: removeObservationFavorite,
    markObservationAsImportantForEvent: markObservationAsImportantForEvent,
    clearObservationAsImportantForEvent: clearObservationAsImportantForEvent,
    addAttachmentToObservationForEvent: addAttachmentToObservationForEvent,
    deleteAttachmentInObservationForEvent: deleteAttachmentInObservationForEvent,
    getObservationIconUrlForEvent: getObservationIconUrlForEvent
  };

  return service;

  function getObservationsForEvent(event, options) {
    var deferred = $q.defer();

    var parameters = {eventId: event.id, states: 'active'};
    if (options.interval) {
      parameters.observationStartDate = options.interval.start;
      parameters.observationEndDate = options.interval.end;
    }
    Observation.query(parameters, function(observations) {
      transformObservations(observations, event);
      deferred.resolve(observations);
    });

    return deferred.promise;
  }

  function saveObservationForEvent(event, observation) {
    var deferred = $q.defer();

    observation.$save({}, function(updatedObservation) {
      transformObservations(updatedObservation, event);

      deferred.resolve(updatedObservation);
    });

    return deferred.promise;
  }

  function addObservationFavorite(event, observation) {
    var deferred = $q.defer();

    ObservationFavorite.save({eventId: event.id, observationId: observation.id}, function(updatedObservation) {
      observation.favoriteUserIds = updatedObservation.favoriteUserIds;

      deferred.resolve(observation);
    });

    return deferred.promise;
  }

  function removeObservationFavorite(event, observation) {
    var deferred = $q.defer();

    ObservationFavorite.delete({eventId: event.id, observationId: observation.id}, function(updatedObservation) {
      observation.favoriteUserIds = updatedObservation.favoriteUserIds;

      deferred.resolve(observation);
    });

    return deferred.promise;
  }

  function markObservationAsImportantForEvent(event, observation, important) {
    var deferred = $q.defer();

    ObservationImportant.save({eventId: event.id, observationId: observation.id}, important, function(updatedObservation) {
      observation.important = updatedObservation.important;

      deferred.resolve(observation);
    });

    return deferred.promise;
  }

  function clearObservationAsImportantForEvent(event, observation) {
    var deferred = $q.defer();

    ObservationImportant.delete({eventId: event.id, observationId: observation.id}, function(updatedObservation) {
      observation.important = updatedObservation.important;

      deferred.resolve(observation);
    });

    return deferred.promise;
  }

  function archiveObservationForEvent(event, observation) {
    var deferred = $q.defer();

    ObservationState.save({eventId: event.id, observationId: observation.id}, {name: 'archive'}, function(state) {
      transformObservations(observation, event);

      observation.state = state;
      deferred.resolve(observation);
    });

    return deferred.promise;
  }

  function addAttachmentToObservationForEvent(event, observation, attachment) {
    observation.attachments.push(attachment);
  }

  function deleteAttachmentInObservationForEvent(event, observation, attachment) {
    var deferred = $q.defer();

    ObservationAttachment.delete({eventId: event.id, observationId: observation.id, id: attachment.id}, function() {
      observation.attachments = _.reject(observation.attachments, function(a) { return attachment.id === a.id; });

      deferred.resolve(observation);
    });

    return deferred.promise;
  }

  function transformObservations(observations, event) {
    if (!_.isArray(observations)) observations = [observations];

    var eventStyle = event.form.style;

    _.each(observations, function(observation) {
      var style = getObservationStyle(eventStyle, observation.properties.type, observation.properties[event.form.variantField]);
      style.iconUrl = getObservationIconUrlForEvent(event.id, observation.properties.type, observation.properties[event.form.variantField]);

      observation.style = style;
      if (observation.geometry.type === 'Polygon') {
        minimizePolygon(observation.geometry.coordinates);
      } else if (observation.geometry.type === 'LineString') {
        minimizeLineString(observation.geometry.coordinates);
      }
    });
  }

  function minimizePolygon(polygon) {
    for (var i = 0; i < polygon.length; i++) {
      minimizeLineString(polygon[i]);
    }
  }

  function minimizeLineString(lineString) {
    var world = 360;
    var coord = lineString[0];
    for (var i = 1; i < lineString.length; i++) {
      var next = lineString[i];
      if (coord[0] < next[0]) {
        if (next[0] - coord[0] > coord[0] - next[0] + world) {
          next[0] = next[0] - world;
        }
      } else if (coord[0] > next[0]) {
        if (coord[0] - next[0] > next[0] - coord[0] + world) {
          next[0] = next[0] + world;
        }
      }
    }
  }

  function getObservationStyle(eventStyle, primary, variant) {
    if (!primary && !variant) {
      return {
        color: eventStyle.stroke,
        fillColor: eventStyle.fill,
        fillOpacity: eventStyle.fillOpacity,
        opacity: eventStyle.strokeOpacity
      };
    } else if (!variant) {
      if (eventStyle[primary]) {
        return {
          color: eventStyle[primary].stroke,
          fillColor: eventStyle[primary].fill,
          fillOpacity: eventStyle[primary].fillOpacity,
          opacity: eventStyle[primary].strokeOpacity
        };
      } else {
        return {
          color: eventStyle.stroke,
          fillColor: eventStyle.fill,
          fillOpacity: eventStyle.fillOpacity,
          opacity: eventStyle.strokeOpacity
        };
      }
    } else {
      if (eventStyle[primary] && eventStyle[primary][variant]) {
        return {
          color: eventStyle[primary][variant].stroke,
          fillColor: eventStyle[primary][variant].fill,
          fillOpacity: eventStyle[primary][variant].fillOpacity,
          opacity: eventStyle[primary][variant].strokeOpacity
        };
      } else if (eventStyle[primary]) {
        return {
          color: eventStyle[primary].stroke,
          fillColor: eventStyle[primary].fill,
          fillOpacity: eventStyle[primary].fillOpacity,
          opacity: eventStyle[primary].strokeOpacity
        };
      } else {
        return {
          color: eventStyle.stroke,
          fillColor: eventStyle.fill,
          fillOpacity: eventStyle.fillOpacity,
          opacity: eventStyle.strokeOpacity
        };
      }
    }
    var style = {
      color: eventStyle.stroke,
      fillColor: eventStyle.fill,
      fillOpacity: eventStyle.fillOpacity,
      opacity: eventStyle.strokeOpacity
    };
  }

  function getObservationIconUrlForEvent(eventId, primary, variant) {
    return "/api/events/" + eventId + "/form/icons/" + primary + "/" + variant + "?" + $.param({access_token: LocalStorageService.getToken()});
  }
}
