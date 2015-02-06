'use strict';

angular.module('mage').***REMOVED***('EventService', function EventService($rootScope, $http, $q, Event, Observation, ObservationAttachment, ObservationState, FilterService) {
  var ***REMOVED*** = {};

  ***REMOVED***.currentEvent = null;
  ***REMOVED***.editEvent = null;

  ***REMOVED***.form = {
    fields:[{
      name : 'textfield',
      value : 'Textfield'
    },{
      name : 'email',
      value : 'E-mail'
    },{
      name : 'p***REMOVED***word',
      value : 'P***REMOVED***word'
    },{
      name : 'radio',
      value : 'Radio Buttons'
    },{
      name : 'dropdown',
      value : 'Dropdown List'
    },{
      name : 'date',
      value : 'Date'
    },{
      name : 'geometry',
      value : 'Geometry'
    },{
      name : 'textarea',
      value : 'Text Area'
    },{
      name : 'checkbox',
      value : 'Checkbox'
    },{
      name : 'hidden',
      value : 'Hidden'
    }]
  };

  var eventsById = {};
  function fetchObservations(event, options) {
    var deferred = $q.defer();

// TODO when polling make sure not to filter on active, as we will need to grab archived events
// and remove them
    Observation.query({eventId: event.id, states: 'active'}, function(observations) {
      _.each(observations, function(observation) {
        observation.eventId = event.id;
      });

      deferred.resolve(observations);
    });

    return deferred.promise;
  }

  // function getObservations(event) {
  //   var event = eventsById[event.id];
  //   return event ? event.observations : [];
  // }

  // $rootScope.$on('filter:event', function(e, event) {
  //   fetchObservations(event).then(function(observations) {
  //     eventsById[event.id] = event;
  //
  //     var updated = [];
  //     var created = [];
  //     var observationsById = eventsById[event.id].observationsById || {};
  //     _.each(observations, function(observation) {
  //       observationsById[observation.id] ? updated.push(observation) : created.push(observation);
  //       observationsById[observation.id] = observation;
  //     });
  //
  //     eventsById[event.id].observationsById = observationsById;
  //     if (created.length) $rootScope.$broadcast('observations:new', created, event);
  //     if (updated.length) $rootScope.$broadcast('observations:update', updated, event);
  //   });
  // });

  $rootScope.$on('filter:event', function(e, event) {
    fetchObservations(event).then(function(observations) {
      eventsById[event.id] = event;
      eventsById[event.id].observationsById = _.indexBy(observations, 'id');

      var archived =

      $rootScope.$broadcast('observations:refresh', observations, event);
    });
  });

  var time = FilterService.getTimeInterval();
  $rootScope.$on('filter:time', function(e, time) {
    console.log('filter:time changed', time);
  });

  ***REMOVED***.saveObservation = function(observation) {
    var deferred = $q.defer();

    var observationId = observation.id;
    var eventId = observation.eventId;
    observation.$save({}, function(observation) {
      observation.eventId = eventId;

      var event = eventsById[eventId];
      eventsById[eventId].observationsById[observation.id] = observation;
      if (observationId) {
        $rootScope.$broadcast('observations:update', [observation], event);
      } else {
        $rootScope.$broadcast('observations:new', [observation], event);
      }

      deferred.resolve(observation);
    });

    return deferred.promise;
  }

  ***REMOVED***.archiveObservation = function(observation) {
    var deferred = $q.defer();

    var eventId = observation.eventId;
    var observationId = observation.id;
    ObservationState.save({eventId: eventId, observationId: observationId}, {name: 'archive'}, function(state) {
      var event = eventsById[eventId];
      var observation = eventsById[eventId].observationsById[observationId];
      observation.state = state;

      $rootScope.$broadcast('observations:archive', [observation], event);
    });

    return deferred.promise;
  }

  ***REMOVED***.addAttachmentToObservation = function(observation, attachment) {
    var event = eventsById[observation.eventId];
    var observation = event.observationsById[observation.id];
    observation.attachments.push(attachment);

    $rootScope.$broadcast('observations:update', [observation], event);
  }

  ***REMOVED***.deleteAttachmentForObservation = function(observation, attachment) {
    var eventId = observation.eventId;
    var observationId = observation.id;
    return ObservationAttachment.delete({eventId: eventId, observationId: observationId, id: attachment.id}, function(success) {
      var event = eventsById[eventId];
      var observation = event.observationsById[observationId];

      observation.attachments = _.reject(observation.attachments, function(a) { return attachment.id === a.id});
      $rootScope.$broadcast('observations:update', [observation], event);
    });
  }

  ***REMOVED***.getFormField = function(form, fieldName) {
    return _.find(form.fields, function(field) { return field.name == fieldName});
  }

  ***REMOVED***.newEvent = function() {
    var event = new Event();
    event.teams = [];
    this.editEvent = event;
    return event;
  }

  ***REMOVED***.setCurrentEditEvent = function(event) {
    this.editEvent = event;
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


  //
  // ***REMOVED***.getFormForObservation = function(observation) {
  //   // TODO will need to get all events and grab the form for this setObservations
  //   // eventId
  //
  //   var event = FilterService.getEvent();
  //   return ***REMOVED***.form(event, observation)
  // }

  return ***REMOVED***;
});
