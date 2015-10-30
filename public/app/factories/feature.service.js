angular
  .module('mage')
  .factory('FeatureService', FeatureService);

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

      // TODO add other styles
      _.each(featureCollection.features, function(feature) {
        var style = feature.properties.style;
        if (!style) return;

        feature.style = {};
        if (style.iconStyle) {
          feature.style.iconUrl = style.iconStyle.icon.href;
        }

        if (style.lineStyle) {
          feature.style.color = feature.properties.style.lineStyle.color.rgb
        }
        if (style.polyStyle) {
          feature.style.fillColor = feature.properties.style.polyStyle.color.rgb;
          feature.style.fillOpacity = feature.properties.style.polyStyle.color.opacity / 255;
        }
      });

      deferred.resolve(featureCollection);
    });

    return deferred.promise;
  }
}
