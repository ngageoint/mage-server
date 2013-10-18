'use strict';

angular.module('mage')
  .factory('AwesomeMarkerIconService', ['appConstants', 'FeatureTypeService',
    function (appConstants, FeatureTypeService) {
      var ***REMOVED*** = {};
      var featureTypes = FeatureTypeService.getTypes();

      ***REMOVED***.getCl***REMOVED*** = function(typeName, o) {
        var type = _.find(o.types, function(t) { 
          return t.name == typeName; 
        });

        return type ? type.icon : 'circle';  
      }

      // Blue = < 1 hour
      // Red = 1-5 hours
      // Yellow = 5-8 hours
      // Green = > 8 hours
      ***REMOVED***.getColor = function(timestamp) {
        var now = moment();
        var date = moment(timestamp);
        var diff = now.diff(date, 'hours', true);
        if (diff < 1) {
          return 'blue';
        } else if (diff < 5) {
          return 'red';
        } else if (diff < 8) {
          return 'yellow';
        } else {
          return 'green';
        }
      }

      ***REMOVED***.template = function(element, attributes) {
        return '<div cl***REMOVED***="awesome-marker awesome-marker-display" ng-cl***REMOVED***="markerColor">' +
                '<i cl***REMOVED***="icon-white" ng-cl***REMOVED***="markerCl***REMOVED***"></i>' + 
               '</div>';
      }

      ***REMOVED***.defaultLeafletIcon = function() {
        return L.AwesomeMarkers.icon({
          icon: 'plus',
          color: 'cadetblue'
        });
      }

      ***REMOVED***.leafletIcon = function (feature, o) {
        var properties = feature.properties || feature.attributes;

        return L.AwesomeMarkers.icon({
          icon: ***REMOVED***.getCl***REMOVED***(properties.TYPE, o),
          color: ***REMOVED***.getColor(properties.EVENTDATE)
        });
      };

      ***REMOVED***.iconHtml = function(feature, o) {
        var type = _.find(o.types, function(type) { 
          return type.name == feature.properties.TYPE; 
        });
        var icon = type ? type.icon : 'circle';

        var level = _.find(o.levels, function(level) {
          return level.name === feature.properties.EVENTLEVEL;
        });
        var color = ***REMOVED***.getColor(feature.properties.EVENTDATE);

        return '<i cl***REMOVED***="icon-'+icon+'" style="color:'+color+'"></i>';
      };

      ***REMOVED***.setTemplateVariables = function(feature, scope) {
        if (feature.properties && feature.properties.TYPE) {
          featureTypes.success(function(success) {
            scope.markerCl***REMOVED*** = "icon-" + ***REMOVED***.getCl***REMOVED***(feature.properties.TYPE, {types: success});
          })
        }
        if (feature.properties && feature.properties.EVENTDATE) {
          scope.markerColor = "awesome-marker-icon-" + ***REMOVED***.getColor(feature.properties.EVENTDATE);
        }
      }

      return ***REMOVED***;
    }
  ]
);