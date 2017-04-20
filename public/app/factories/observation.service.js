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

    _.each(observations, function(observation) {
      observation.style = {
        iconUrl: getObservationIconUrlForEvent(event.id, observation.properties.type, observation.properties[event.form.variantField])
      };
    });
  }

  function getObservationIconUrlForEvent(eventId, primary, variant) {
    return "/api/events/" + eventId + "/form/icons/" + primary + "/" + variant + "?" + $.param({access_token: LocalStorageService.getToken()});
  }
}
