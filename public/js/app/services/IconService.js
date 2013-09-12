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

      ***REMOVED***.icon = function (feature, o) {
        var type = _.find(o.types, function(type) { 
          return type.name == feature.properties.TYPE; 
        });
        var icon = type ? type.icon : 'circle';

        var level = _.find(o.levels, function(level) {
          return level.name === feature.properties.EVENTLEVEL;
        });
        var color = level ? level.color : 'blue';

        var icon = L.AwesomeMarkers.icon({
          icon: icon,
          color: color
        });

        return icon;
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