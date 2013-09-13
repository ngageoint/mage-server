'use strict';

angular.module('mage.iconService', ['mage.***REMOVED***s', 'mage.lib'])
  .factory('IconService', ['$http', 'appConstants',
    function ($http, appConstants) {
      var ***REMOVED*** = {};

      ***REMOVED***.defaultIcon = function() {
        return L.AwesomeMarkers.icon({
          icon: 'plus',
          color: 'cadetblue'
        });
      }

      ***REMOVED***.cl***REMOVED*** = function(type, o) {
        var type = _.find(o.types, function(t) { 
          return t.name == type; 
        });

        return type ? type.icon : 'circle';  
      }

      // Blue = < 1 hour
      // Red = 1-5 hours
      // Yellow = 5-8 hours
      // Green = > 8 hours
      ***REMOVED***.color = function(timestamp) {
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
 
      ***REMOVED***.icon = function (feature, o) {
        var properties = feature.properties || feature.attributes;

        return L.AwesomeMarkers.icon({
          icon: ***REMOVED***.cl***REMOVED***(properties.TYPE, o),
          color: ***REMOVED***.color(properties.EVENTDATE)
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
        var color = level ? level.color : 'blue';

        return '<i cl***REMOVED***="icon-'+icon+'" style="color:'+color+'"></i>';
      };

      return ***REMOVED***;
    }
  ]
);