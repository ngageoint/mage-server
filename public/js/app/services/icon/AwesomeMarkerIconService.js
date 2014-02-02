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
          color: 'cadetblue'
        });
      }

      ***REMOVED***.leafletIcon = function (feature, o) {
        var properties = feature.properties || feature.attributes;

        //Tomnod hack
        if (feature.properties.icon_url) {
          var myIcon = L.icon({
            iconUrl: feature.properties.icon_url,
            iconSize: [60, 60],
            iconAnchor: [5, 5],
            popupAnchor: [5, 5],
          });

          return myIcon;
        }

        return L.AwesomeMarkers.icon({
          icon: ***REMOVED***.getCl***REMOVED***(properties.TYPE, o),
          color: appConstants.featureToColor(feature)
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
        var color = appConstants.featureToColor(feature);

        return '<i cl***REMOVED***="icon-'+icon+'" style="color:'+color+'"></i>';
      };

      ***REMOVED***.setTemplateVariables = function(feature, scope) {
        if (feature && feature.properties && feature.properties.TYPE) {
          featureTypes.success(function(success) {
            scope.markerCl***REMOVED*** = "icon-" + ***REMOVED***.getCl***REMOVED***(feature.properties.TYPE, {types: success});
          })
        }
        if (feature && feature.properties && feature.properties.EVENTDATE) {
          scope.markerColor = "awesome-marker-icon-" + appConstants.featureToColor(feature);
        }
      }

      return ***REMOVED***;
    }
  ]
);