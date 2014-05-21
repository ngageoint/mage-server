'use strict';

angular.module('mage').factory('IconService', ['appConstants',
  function (appConstants) {
    var ***REMOVED*** = {};

    ***REMOVED***.getCl***REMOVED*** = function(typeName, o) {
      var type = _.find(o.types, function(t) {
        return t.name == typeName;
      });

      return type ? type.icon : 'circle';
    }

    ***REMOVED***.markerTemplate = function() {
      return '<div cl***REMOVED***="awesome-marker awesome-marker-display" ng-cl***REMOVED***="markerColor">' +
              '<i cl***REMOVED***="icon-white" ng-cl***REMOVED***="markerCl***REMOVED***"></i>' +
             '</div>';
    }

    ***REMOVED***.iconTemplate = function() {
      return '<i cl***REMOVED***="icon-white" ng-cl***REMOVED***="markerCl***REMOVED***"></i>';
    }

    ***REMOVED***.defaultLeafletIcon = function() {
      return L.AwesomeMarkers.icon({
        icon: 'plus',
        markerColor: 'cadetblue'
      });
    }

    ***REMOVED***.leafletIcon = function (feature, o) {
      var properties = feature.properties || feature.attributes;

      //Tomnod hack
      if (feature.properties.icon_url) {
        var root = 'http://tomnod.com';
        var iconUrl = iconUrl.startsWith(root) ? iconUrl : root + iconUrl;
        var myIcon = L.icon({
          iconUrl: iconUrl,
          iconSize: [60, 60],
          iconAnchor: [5, 5],
          popupAnchor: [5, 5],
        });

        return myIcon;
      }

      return L.AwesomeMarkers.icon({
        icon: ***REMOVED***.getCl***REMOVED***(properties.type, o),
        markerColor: 'blue' // TODO DYNAMIC fix this
      });
    };

    ***REMOVED***.iconHtml = function(feature, o) {
      var type = _.find(o.types, function(type) {
        return type.name == feature.properties.type;
      });
      var icon = type ? type.icon : 'circle';

      var level = _.find(o.levels, function(level) {
        return level.name === feature.properties.EVENTLEVEL;
      });
      var color = 'blue'; // TODO DYNAMIC FIX THIS

      return '<i cl***REMOVED***="icon-'+icon+'" style="color:'+color+'"></i>';
    };

    ***REMOVED***.setTemplateVariables = function(feature, scope) {
      // if (feature && feature.properties && feature.properties.type) {
      //   featureTypes.success(function(success) {
      //     scope.markerCl***REMOVED*** = "icon-" + ***REMOVED***.getCl***REMOVED***(feature.properties.type, {types: success});
      //   })
      // }
      if (feature && feature.properties && feature.properties.timestamp) {
        scope.markerColor = "awesome-marker-icon-" + appConstants.featureToColor(feature);
      }
    }

    return ***REMOVED***;
  }
]);
