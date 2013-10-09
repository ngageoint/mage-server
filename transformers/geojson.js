var util = require('util');

// TODO switch to use Terraformer to create a geojson FeatureCollection
var transformFeature = function(feature) {
  feature.id = feature._id;
  delete feature._id;

  return feature;
}

var transformFeatures = function(features) {
  features.forEach(function(feature) {
    transformFeature(feature);
  });

  return { 
    type: "FeatureCollection",
    bbox: [-180, -90, 180, 90.0],
    features: features
  };
}

exports.transform = function(features) {
  return util.isArray(features) ? transformFeatures(features) : transformFeature(features);
}