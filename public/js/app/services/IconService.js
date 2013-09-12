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

      ***REMOVED***.color = function(level, o) {
        var level = _.find(o.levels, function(l) {
          return l.name === level;
        });
        return level ? level.color : 'blue';
      }
 
      ***REMOVED***.icon = function (feature, o) {
        var properties = feature.properties || feature.attributes;

        return L.AwesomeMarkers.icon({
          icon: ***REMOVED***.cl***REMOVED***(properties.TYPE, o),
          color: ***REMOVED***.color(properties.EVENTLEVEL, o)
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