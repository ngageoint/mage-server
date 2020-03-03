const _ = require('underscore');

module.exports = FeatureService;

FeatureService.$inject = ['$q', '$http'];

function FeatureService($q, $http) {
  const featureCollectionsByLayer = {};

  const service = {
    getFeatureCollection,
    loadFeatureUrl,
  };

  return service;

  function loadFeatureUrl(url, deferred, layerName) {
    if (!deferred) {
      deferred = $q.defer();
    }
    $http
      .get(url, {
        headers: { 'Content-Type': 'application/json' },
      })
      .success(function(featureCollection) {
        if (layerName) {
          featureCollectionsByLayer[layerName] = featureCollection;
        }

        _.each(featureCollection.features, function(feature) {
          const style = feature.properties.style;
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

  function getFeatureCollection(event, layer) {
    const deferred = $q.defer();

    if (featureCollectionsByLayer[layer.name]) {
      deferred.resolve(featureCollectionsByLayer[layer.name]);
    }

    let url = '/api';

    if (event) {
      url += '/events/' + event.id + '/layers/' + layer.id + '/features';
    } else if (layer) {
      url += '/layers/' + layer.id + '/features';
    }

    return loadFeatureUrl(url, deferred, layer.name);
  }
}
