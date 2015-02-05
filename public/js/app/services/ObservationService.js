'use strict';

angular.module('mage').factory('ObservationService', ['$rootScope', '$q', 'appConstants','Layer', 'Event', 'Observation', 'EventService', 'FilterService',
  function ($rootScope, $q, appConstants, Layer, Event, Observation, EventService, FilterService) {
    var eventsById = {};
    Event.query(function(events) {
      eventsById = _.indexBy(events, 'id');
    });

    var observations = [];

    var ***REMOVED*** = {};
    ***REMOVED***.event = null;

    ***REMOVED***.newForm = null;


    var observations = [];






    return ***REMOVED***;
  }
]);
