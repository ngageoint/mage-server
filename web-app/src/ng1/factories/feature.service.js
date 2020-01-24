var _ = require('underscore');

module.exports = FeatureService;

FeatureService.$inject = ['$q', '$http'];

function FeatureService($q, $http) {
  var featureCollectionsByLayer = {};

  var service = {
    getFeatureCollection: getFeatureCollection
  };

  return service;

  function getFeatureCollection(event, layer) {
    var deferred = $q.defer();

    if (featureCollectionsByLayer[layer.name]) {
      deferred.resolve(featureCollectionsByLayer[layer.name]);
    }

    $http.get('/api/events/' + event.id + '/layers/' + layer.id + '/features', {
      headers: {"Content-Type": "application/json"}
    }).success(function(featureCollection) {
      featureCollectionsByLayer[layer.name] = featureCollection;

      _.each(featureCollection.features, function(feature) {
        var style = feature.properties.style;
        if (!style) return;

        feature.style = {};
        if (style.iconStyle && style.iconStyle.icon) {
          feature.style.iconUrl = style.iconStyle.icon.href;
        }

        if (style.lineStyle && style.lineStyle.color) {
          feature.style.color = style.lineStyle.color.rgb;
        }

        if (style.polyStyle && style.polyStyle.color) {
          feature.style.fillColor = style.polyStyle.color.rgb;
          feature.style.fillOpacity = style.polyStyle.color.opacity / 255;
        }
      });

      deferred.resolve(featureCollection);
    });

    return deferred.promise;
  }
}
