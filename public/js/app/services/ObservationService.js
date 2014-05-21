'use strict';

angular.module('mage').factory('ObservationService', ['$q', 'appConstants', 'Feature', 'UserService', 'Layer', 'Form', 'FormService',
  function ($q, appConstants, Feature, UserService, Layer, Form, FormService) {
    var ***REMOVED*** = {};

    var form = $q.defer();
    var formPromise = form.promise;
    var layers = Layer.query(function(){
      angular.forEach(layers, function (layer) {
        if (layer.type == 'Feature') {
          Form.query(function(forms) {
            angular.forEach(forms, function(returnedForm) {
              if (returnedForm.id == layer.formId) {
                form.resolve(returnedForm);
                appConstants.formId = layer.formId;
              }
            });
          });
        }
      });
    });

    ***REMOVED***.newForm = null;
    ***REMOVED***.createNewForm = function(observation) {
      var promise = formPromise.then(function(form) {
        var newForm = angular.copy(form);
        newForm.observationId = observation.id;
        newForm.getField("timestamp").value  = observation.properties.timestamp;
        newForm.getField("geometry").value = {
          x: observation.geometry.coordinates[0],
          y: observation.geometry.coordinates[1]
        }

        _.each(observation.properties, function(value, key) {
          var field = newForm.getField(key);
          if (field) {
            field.value = value;
          }
        });

        return newForm;
      });

      return promise;
    }

    ***REMOVED***.cancelNewForm = function() {
      ***REMOVED***.newForm = null;
    }

    return ***REMOVED***;
  }
]);
