'use strict';

angular.module('mage')
  .factory('USARMarkerIconService', ['appConstants', 'FeatureTypeService',
    function (appConstants, FeatureTypeService) {
      var ***REMOVED*** = {};
      var featureTypes = FeatureTypeService.getTypes();

      ***REMOVED***.getIconUrl = function(typeName, o) {
        var type = _.find(o.types, function(t) { 
          return t.name == typeName; 
        });

        if (!type) {
          var type = _.find(o.types, function(t) { 
            return t.name == 'UNDEFINED'; 
          });
        }

        return type.icon;
      }

      ***REMOVED***.getCl***REMOVED*** = function(typeName, o) {
        return;
      }

      // Blue = < 1 hour
      // Red = 1-5 hours
      // Yellow = 5-8 hours
      // Green = > 8 hours
      ***REMOVED***.getColor = function(timestamp) {
        return;
      }

      ***REMOVED***.markerTemplate = function(element, attributes) {
        return '<div>' +
                 '<img ng-src="{{iconSrc}}"/>' +
               '</div>';
      }

      ***REMOVED***.iconTemplate = function() {
        return '<img ng-src="{{iconSrc}}"/>';
      }

      ***REMOVED***.defaultLeafletIcon = function() {
        return L.AwesomeMarkers.icon({
          icon: 'plus',
          color: 'cadetblue'
        });
      }

      ***REMOVED***.leafletIcon = function (feature, o) {
        var properties = feature.properties || feature.attributes;

        return L.icon({
          iconUrl: ***REMOVED***.getIconUrl(properties.TYPE, o),
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
      };

      ***REMOVED***.iconHtml = function() {
        return ***REMOVED***.iconTemplate();
      }

      ***REMOVED***.setTemplateVariables = function(feature, scope) {
        if (feature && feature.properties && feature.properties.TYPE) {
          featureTypes.success(function(success) {
            scope.iconSrc = ***REMOVED***.getIconUrl(feature.properties.TYPE, {types: success});
          });
        }
      }

      return ***REMOVED***;
    }
  ]
);