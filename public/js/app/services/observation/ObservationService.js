'use strict';

angular.module('mage')
  .factory('ObservationService', ['appConstants', 'FeatureTypeService', 'Feature', 'UserService', 'Layer', 'FormService',
    function (appConstants, FeatureTypeService, Feature, UserService, Layer, FormService) {
      var ***REMOVED*** = {};

      ***REMOVED***.form = {};
      var layers = Layer.query(function(){
          angular.forEach(layers, function (layer) {
            if (layer.type == 'Feature') {
              console.log('Form to use is: ' + layer.formId);
              FormService.forms().then(function(returnedForms) {
                  angular.forEach(returnedForms, function(form) {
                    if (form.id == layer.formId) {
                      form.inUse = true;
                      ***REMOVED***.form = form;
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
