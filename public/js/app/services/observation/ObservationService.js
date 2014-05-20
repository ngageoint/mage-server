'use strict';

angular.module('mage')
  .factory('ObservationService', ['$q', 'appConstants', 'Feature', 'UserService', 'Layer', 'Form', 'FormService',
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
            var timestampField = _.find(newForm.fields, function(field) {return field.name == 'timestamp'});
            timestampField.value = observation.properties.timestamp;

            var geometryField = _.find(newForm.fields, function(field) {return field.name == 'geometry'});
            geometryField.value = observation.geometry.coordinates;

            ***REMOVED***.newForm = newForm;
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
