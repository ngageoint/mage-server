var _ = require('underscore')
  , angular = require('angular')
  , moment = require('moment');
const { Observation } = require('./observation.resource');

module.exports = EventService;

EventService.$inject = ['$rootScope', '$q', '$timeout', '$http', '$httpParamSerializer', 'Observation', 'ObservationService', 'LocationService', 'LayerService', 'FilterService', 'PollingService', 'LocalStorageService'];

function EventService($rootScope, $q, $timeout, $http, $httpParamSerializer, Observation, ObservationService, LocationService, LayerService, FilterService, PollingService, LocalStorageService) {
  var observationsChangedListeners = [];
  var usersChangedListeners = [];
  var layersChangedListeners = [];
  var pollListeners = [];
  var eventsById = {};
  var pollingTimeout = null;

  var filterServiceListener = {
    onFilterChanged: function(filter) {
      if (filter.event) {
        onEventChanged(filter.event);
      }

      if (filter.event || filter.timeInterval) { // requery server
        fetch();
      } else if (filter.teams) { // filter in memory
        onTeamsChanged(filter.teams);
      }

      if (filter.actionFilter) {
        onActionFilterChanged(filter.actionFilter);
      }
    }
  };
  FilterService.addListener(filterServiceListener);

  function onEventChanged(event) {
    _.each(event.added, function(added) {
      fetchLayers(added);
    });

    _.each(event.removed, function(removed) {
      observationsChanged({removed: _.values(eventsById[removed.id].filteredObservationsById)});
      usersChanged({removed: _.values(eventsById[removed.id].filteredUsersById)});
      layersChanged({removed: _.values(eventsById[removed.id].layersById)}, removed);
      delete eventsById[removed.id];
    });
  }

  function onTeamsChanged() {
    var event = FilterService.getEvent();
    if (!event) return;

    var teamsEvent = eventsById[event.id];
    if (!teamsEvent) return;

    // remove observations that are not part of filtered teams
    var observationsRemoved = [];
    _.each(teamsEvent.filteredObservationsById, function(observation) {
      if (!FilterService.isUserInTeamFilter(observation.userId)) {
        delete teamsEvent.filteredObservationsById[observation.id];
        observationsRemoved.push(observation);
      }
    });

    // remove users that are not part of filtered teams
    var usersRemoved = [];
    _.each(teamsEvent.filteredUsersById, function(user) {
      if (!FilterService.isUserInTeamFilter(user.id)) {
        delete teamsEvent.filteredUsersById[user.id];
        usersRemoved.push(user);
      }
    });

    // add any observations that are part of the filtered teams
    var observationsAdded = [];
    _.each(teamsEvent.observationsById, function(observation) {
      if (FilterService.isUserInTeamFilter(observation.userId) && !teamsEvent.filteredObservationsById[observation.id]) {
        observationsAdded.push(observation);
        teamsEvent.filteredObservationsById[observation.id] = observation;
      }
    });

    // add any users that are part of the filtered teams
    var usersAdded = [];
    _.each(teamsEvent.usersById, function(user) {
      if (FilterService.isUserInTeamFilter(user.id) && !teamsEvent.filteredUsersById[user.id]) {
        usersAdded.push(user);
        teamsEvent.filteredUsersById[user.id] = user;
      }
    });

    observationsChanged({added: observationsAdded, removed: observationsRemoved});
    usersChanged({added: usersAdded, removed: usersRemoved});
  }

  function onActionFilterChanged() {
    var event = FilterService.getEvent();
    if (!event) return;

    var actionEvent = eventsById[event.id];

    var observationsRemoved = [];
    _.each(actionEvent.filteredObservationsById, function(observation) {
      if (!FilterService.observationInFilter(observation)) {
        delete actionEvent.filteredObservationsById[observation.id];
        observationsRemoved.push(observation);
      }
    });

    var observationsAdded = [];
    // add any observations that are part of the filtered actions
    _.each(actionEvent.observationsById, function(observation) {
      if (!actionEvent.filteredObservationsById[observation.id] && FilterService.observationInFilter(observation)) {
        observationsAdded.push(observation);
        actionEvent.filteredObservationsById[observation.id] = observation;
      }
    });

    observationsChanged({added: observationsAdded, removed: observationsRemoved});
  }

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
  };
  PollingService.addListener(pollingServiceListener);

  $rootScope.$on('$destory', function() {
    if (pollingTimeout) {
      $timeout.cancel(pollingTimeout);
    }

    FilterService.removeListener(filterServiceListener);
    PollingService.removeListener(pollingServiceListener);
  });

  const service = {
    addObservationsChangedListener: addObservationsChangedListener,
    removeObservationsChangedListener: removeObservationsChangedListener,
    addUsersChangedListener: addUsersChangedListener,
    removeUsersChangedListener: removeUsersChangedListener,
    addLayersChangedListener: addLayersChangedListener,
    addPollListener: addPollListener,
    removePollListener: removePollListener,
    removeLayersChangedListener: removeLayersChangedListener,
    getEventById: getEventById,
    saveObservation: saveObservation,
    addObservationFavorite: addObservationFavorite,
    removeObservationFavorite: removeObservationFavorite,
    markObservationAsImportant: markObservationAsImportant,
    clearObservationAsImportant: clearObservationAsImportant,
    archiveObservation: archiveObservation,
    addAttachmentToObservation: addAttachmentToObservation,
    deleteAttachmentForObservation: deleteAttachmentForObservation,
    getFormField: getFormField,
    getForms: getForms,
    getFormsForEvent: getFormsForEvent,
    createForm: createForm,
    exportForm: exportForm,
    isUserInEvent: isUserInEvent
  };

  return service;

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

  function addPollListener(listener) {
    pollListeners.push(listener);
  }

  function removePollListener(listener) {
    pollListeners = _.reject(pollListeners, function(l) {
      return listener === l;
    });
  }

  function removeLayersChangedListener(listener) {
    layersChangedListeners = _.reject(layersChangedListeners, function(l) {
      return listener === l;
    });
  }

  function getEventById(eventId) {
    return eventsById[eventId];
  }

  function saveObservation(observation) {
    const resource = new Observation(observation)

    const event = eventsById[resource.eventId];
    const isNewObservation = !resource.id;
    const promise = ObservationService.saveObservationForEvent(event, resource)
    
    promise.then(function(observation) {
      event.observationsById[observation.id] = observation;

      // Check if this new observation passes the current filter
      if (FilterService.observationInFilter(observation)) {
        event.filteredObservationsById[observation.id] = observation;
        isNewObservation ? observationsChanged({added: [observation]}) : observationsChanged({updated: [observation]});
      }
    });

    return promise;
  }

  function addObservationFavorite(observation) {
    var event = eventsById[observation.eventId];

    var promise = ObservationService.addObservationFavorite(event, observation);

    promise.then(function(updatedObservation) {
      event.observationsById[updatedObservation.id] = updatedObservation;
      observationsChanged({updated: [updatedObservation]});
    });

    return promise;
  }

  function removeObservationFavorite(observation) {
    var event = eventsById[observation.eventId];

    var promise = ObservationService.removeObservationFavorite(event, observation);
    promise.then(function(updatedObservation) {
      event.observationsById[updatedObservation.id] = updatedObservation;
      observationsChanged({updated: [updatedObservation]});
    });

    return promise;
  }

  function markObservationAsImportant(observation, important) {
    var event = eventsById[observation.eventId];
    return ObservationService.markObservationAsImportantForEvent(event, observation, important).then(function(updatedObservation) {
      event.observationsById[updatedObservation.id] = updatedObservation;
      observationsChanged({updated: [updatedObservation]});
    });
  }

  function clearObservationAsImportant(observation) {
    var event = eventsById[observation.eventId];
    return ObservationService.clearObservationAsImportantForEvent(event, observation).then(function(updatedObservation) {
      event.observationsById[updatedObservation.id] = updatedObservation;
      observationsChanged({updated: [updatedObservation]});
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
    const event = eventsById[observation.eventId];
    ObservationService.addAttachmentToObservationForEvent(event, observation, attachment);
    observationsChanged({updated: [observation]});
  }

  function deleteAttachmentForObservation(observation, attachment) {
    const event = eventsById[observation.eventId];
    return ObservationService.deleteAttachmentInObservationForEvent(event, observation, attachment).then(function(observation) {
      observationsChanged({updated: [observation]});
    });
  }

  function getFormField(form, fieldName) {
    return _.find(form.fields, function(field) { return field.name === fieldName; });
  }

  function getForms(observation, options) {
    var event = eventsById[observation.eventId];
    return getFormsForEvent(event, options);
  }

  function getFormsForEvent(event, options) {
    options = options || {};
    var forms = event.forms;
    if (options.archived === false) {
      forms = _.filter(forms, function(form) {
        return !form.archived;
      });
    }

    return forms;
  }

  function createForm(observationForm, formDefinition, viewMode) {
    const form = angular.copy(formDefinition);
    form.remoteId = observationForm.id;

    const existingPropertyFields = [];

    _.each(observationForm, function(value, key) {
      const field = service.getFormField(form, key);
      if (field) {
        if (field.type === 'date' && field.value) {
          field.value = moment(value).toDate();
        } else {
          field.value = value;
        }
        existingPropertyFields.push(field);
      }
    });

    if (viewMode) {
      observationForm.fields = _.intersection(observationForm.fields, existingPropertyFields);
    }

    return form;
  }

  function exportForm(event) {
    return $http.get('/api/events/' + event.id + '/form.zip');
  }

  function isUserInEvent(user, event) {
    if (!event) return false;

    return _.some(event.teams, function(team) {
      return _.contains(team.userIds, user.id);
    });
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

  function fetch() {
    var event = FilterService.getEvent();
    if (!event) return;

    if (!eventsById[event.id]) {
      eventsById[event.id] = angular.copy(event);
      eventsById[event.id].filteredObservationsById = {};
      eventsById[event.id].observationsById = {};
      eventsById[event.id].usersById = {};
      eventsById[event.id].filteredUsersById = {};
    }

    var parameters = {};
    var interval = FilterService.getInterval();
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
      var added = _.filter(layers, function(l) {
        return !_.some(eventsById[event.id].layersById, function(layer, layerId) {
          return l.id === layerId;
        });
      });

      var removed = _.filter(eventsById[event.id].layersById, function(layer, layerId) {
        return !_.some(layers, function(l) {
          return l.id === layerId;
        });
      });

      eventsById[event.id].layersById = _.indexBy(layers, 'id');
      layersChanged({added: added, removed: removed}, event);
    });
  }

  function fetchObservations(event, parameters) {
    return ObservationService.getObservationsForEvent(event, parameters).then(function(observations) {
      var added = [];
      var updated = [];
      var removed = [];

      var observationsById = {};
      var filteredObservationsById = eventsById[event.id].filteredObservationsById;
      _.each(observations, function(observation) {
        // Check if this observation passes the current filter
        if (FilterService.observationInFilter(observation)) {
          // Check if we already have this observation, if so update, otherwise add
          var localObservation = filteredObservationsById[observation.id];
          if (localObservation) {
            if (localObservation.lastModified !== observation.lastModified) {
              updated.push(observation);
            } else if (observation.attachments) {
              var some = _.some(observation.attachments, function(attachment) {
                var localAttachment = _.find(localObservation.attachments, function(a) { return a.id === attachment.id; });
                return !localAttachment || localAttachment.lastModified !== attachment.lastModified;
              });

              if (some) updated.push(observation);
            }
          } else {
            added.push(observation);
          }

          // remove from list of observations if it came back from server
          // remaining elements in this list will be removed
          delete filteredObservationsById[observation.id];

          observationsById[observation.id] = observation;
        }
      });

      // remaining elements were not pulled from the server, hence we should remove them
      removed = _.values(filteredObservationsById);

      eventsById[event.id].observationsById = _.indexBy(observations, 'id');
      eventsById[event.id].filteredObservationsById = observationsById;

      observationsChanged({added: added, updated: updated, removed: removed});
    });
  }

  function fetchLocations(event, parameters) {
    return LocationService.getUserLocationsForEvent(event, parameters).then(function(userLocations) {
      const added = [];
      const updated = [];

      const usersById = {};
      const filteredUsersById = eventsById[event.id].filteredUsersById;
      _.each(userLocations, function(userLocation) {
        // Track each location feature by users id,
        // so update the locations id to match the usersId
        const location = userLocation.locations[0];
        location.id = userLocation.id;

        userLocation.location = location;
        delete userLocation.locations;

        if (userLocation.user.iconUrl) {
          location.style = {
            iconUrl: `${userLocation.user.iconUrl}?${$httpParamSerializer({ access_token: LocalStorageService.getToken(), _dc: userLocation.user.lastUpdated })}`
          }
        }

        if (FilterService.isUserInTeamFilter(userLocation.id)) {
          // Check if we already have this user, if so update, otherwise add
          const localUser = filteredUsersById[userLocation.id];
          if (localUser) {

            if (userLocation.location.properties.timestamp !== localUser.location.properties.timestamp) {
              updated.push(userLocation);
            }
          } else {
            added.push(userLocation);
          }

          // remove from list of observations if it came back from server
          // remaining elements in this list will be removed
          delete filteredUsersById[userLocation.id];

          usersById[userLocation.id] = userLocation;
        }
      });

      // remaining elements were not pulled from the server, hence we should remove them
      const removed = _.values(filteredUsersById);

      eventsById[event.id].usersById = _.indexBy(userLocations, 'id');
      eventsById[event.id].filteredUsersById = usersById;

      usersChanged({added: added, updated: updated, removed: removed});
    });
  }

  function poll(interval) {
    if (interval <= 0) return;

    fetch().then(function() {
      _.each(pollListeners, function(listener) {
        if (_.isFunction(listener.onPoll)) {
          listener.onPoll();
        }
      });

      pollingTimeout = $timeout(function() {
        poll(interval);
      }, interval);
    });
  }
}
