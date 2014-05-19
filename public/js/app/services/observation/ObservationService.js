'use strict';

angular.module('mage')
  .factory('ObservationService', ['$q', 'appConstants', 'FeatureTypeService', 'Feature', 'UserService', 'Layer', 'FormService',
    function ($q, appConstants, FeatureTypeService, Feature, UserService, Layer, FormService) {
      var ***REMOVED*** = {};

      var form = $q.defer();
      var formPromise = form.promise;
      var layers = Layer.query(function(){
          angular.forEach(layers, function (layer) {
            if (layer.type == 'Feature') {
              console.log('Form to use is: ' + layer.formId);
              FormService.forms().then(function(returnedForms) {
                  angular.forEach(returnedForms, function(returnedForm) {
                    if (returnedForm.id == layer.formId) {
                      returnedForm.inUse = true;
                      form.resolve(returnedForm);
                    }
                  });
              });
              // layer.formId = form.id;
              // layer.$save();
              // form.inUse = true;
              // FormService.forms().then(function(forms) {
              //     angular.forEach(forms, function(theForm) {
              //         if (theForm.id != form.id) {
              //             theForm.inUse = false;
              //         }
              //     });
              // });
            }
          });
      });


      ***REMOVED***.teams = [
        'Coastal Cluster',
        'Coastal Olympic Village',
        'Mountain Cluster',
        'Mountain Olympic Village',
        'Mountain Endurance',
        'ISEG JOC'
      ];
      ***REMOVED***.levels = [{
        name: 'None',
        color: 'blue'
      },{
        name: 'Low',
        color: 'green'
      },{
        name: 'Medium',
        color: 'yellow'
      },{
        name: 'High',
        color: 'red'
      }];

      FeatureTypeService.getTypes().
        success(function (types, status, headers, config) {
          ***REMOVED***.types = types;
        }).
        error(function (data, status, headers, config) {
          console.log("Error getting types: " + status);
        });

      ***REMOVED***.newForm = function() {
        var promise = formPromise.then(function(form) {
            var newForm = angular.copy(form);
            var timestampField = _.find(newForm.fields, function(field) {return field.name == 'timestamp'});
            timestampField.value = moment().format('MM/DD/YYYY hh:mm:ss');
            console.log('time is', timestampField.value);
            return newForm;
        });
        return promise;
      }

      ***REMOVED***.createNewObservation = function(location) {
        return new Feature({
          type: 'Feature',
          geometry: {
            type: 'Point'
          },
          properties: {
            // type: ***REMOVED***.types[0].name,
            // EVENTLEVEL: ***REMOVED***.levels[0].name,
            // TEAM: ***REMOVED***.teams[0],
            timestamp: new Date()
          }
        });
      };
      ***REMOVED***.observationTemplate = '/js/app/partials/dynamic/observation.html';

      return ***REMOVED***;
    }
  ]);
