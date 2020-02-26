var util = require('util');

// TODO switch to use Terraformer to create a geojson FeatureCollection
function transformFeature(feature, options) {
  if (!feature) return null;

  feature = feature.toObject ? feature.toObject() : feature;
  feature.id = feature._id;
  var path = options.path ? options.path : "";
  feature.url = [path, feature.id].join("/");
  delete feature._id;

  return feature;
}

function transformFeatures(features, options) {
  features = features.map(function(feature) {
    return transformFeature(feature, options);
  });

  return features;
}

exports.transform = function(features, options) {
  options = options || {};

  return util.isArray(features) ? transformFeatures(features, options) : transformFeature(features, options);
};
