var util = require('util');

var transformAttachment = function(feature, attachment) {
  attachment.id = attachment._id;
  delete attachment._id;

  attachment.url = [feature.url, "attachments", attachment.id].join("/");
  return attachment;
}

var transformState = function(feature, state) {
  state.id = state._id;
  delete state._id;

  state.url = [feature.url, "states", state.id].join("/");
  return state;
}

// TODO switch to use Terraformer to create a geojson FeatureCollection
var transformFeature = function(feature, options) {
  if (!feature) return null;

  feature = feature.toObject ? feature.toObject() : feature;
  feature.id = feature._id;
  var path = options.path ? options.path : "";
  feature.url = [path, feature.id].join("/");
  delete feature._id;

  if (feature.attachments) {
    feature.attachments = feature.attachments.map(function(attachment) {
      return transformAttachment(feature, attachment);
    });
  }

  if (feature.states && feature.states.length > 0) {
    feature.state = transformState(feature, feature.states[0]);
    delete feature.states;
  }

  return feature;
}

var transformFeatures = function(features, options) {
  features = features.map(function(feature) {
    return transformFeature(feature, options);
  });

  return features;
}

exports.transform = function(features, options) {
  options = options || {};

  return util.isArray(features) ? transformFeatures(features, options) : transformFeature(features, options);
}
