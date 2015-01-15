'use strict';

angular.module('mage').factory('ObservationService', ['$q', 'appConstants','Layer', 'Event',
  function ($q, appConstants, Layer, Event) {
    var ***REMOVED*** = {};
    ***REMOVED***.event = null;

    var eventPromise;

    ***REMOVED***.newForm = null;
    ***REMOVED***.createNewEvent = function(observation, viewMode) {
      var promise = eventPromise.then(function(event) {
        var newEvent = angular.copy(form);
        newEvent.observationId = observation.id;
        newEvent.getField("timestamp").value  = observation.properties.timestamp;
        newEvent.getField("geometry").value = {
          x: observation.geometry.coordinates[0],
          y: observation.geometry.coordinates[1]
        }

        var existingPropertyFields = [];
        _.each(observation.properties, function(value, key) {
          var field = newEvent.getField(key);
          if (field) {
            field.value = value;
            existingPropertyFields.push(field);
          }
        });

        if (viewMode) {
          newEvent.fields = _.intersection(newEvent.fields, existingPropertyFields);
        }

        return newEvent;
      });

      return promise;
    }

    ***REMOVED***.updateEvent = function() {
      console.log('update event');
      // var eventDeferred = $q.defer();
      //
      // eventPromise = eventDeferred.promise;
      // var layers = Layer.query(function(){
      //   Event.query(function(events) {
      //     angular.forEach(events, function(returnedEvent) {
      //         eventDeferred.resolve(returnedEvent);
      //         appConstants.eventId = layer.eventId;
      //         ***REMOVED***.event = returnedEvent;
      //     });
      //   });
      // });
    }

    ***REMOVED***.cancelNewEvent = function() {
      ***REMOVED***.newEvent = null;
    }

    ***REMOVED***.updateEvent();

    return ***REMOVED***;
  }
]);
