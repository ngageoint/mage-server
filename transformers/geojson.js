var util = require('util');

var transformAttachment = function(attachment) {
  attachment.id = attachment._id;
  delete attachment._id;

  return attachment;
}

// TODO switch to use Terraformer to create a geojson FeatureCollection
var transformFeature = function(feature) {
  if (!feature) return null;

  feature = feature.toObject();
  feature.id = feature._id;
  delete feature._id;

  if (feature.attachments) {
    feature.attachments = feature.attachments.map(function(attachment) {
      return transformAttachment(attachment);
    });
  }

  return feature;
}

var transformFeatures = function(features) {
  features = features.map(function(feature) {
    return transformFeature(feature);
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