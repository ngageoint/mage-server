var include = function(property, properties) {
  return properties[property];
}

var transformFeature = function(feature, ret, options) {
  delete ret._id;
  delete ret.__v;

  // handle attributes
  var properties = options.properties;
  if (properties) {
    for (var property in feature.properties) {
      if (!include(property, properties)) {
        delete ret.properties[property];
      }
    }
  }
}

exports.transformFeature = transformFeature;

exports.transform = function(features, properties) {
  var response = { 
    type: "FeatureCollection",
    bbox: [-180, -90, 180, 90.0],
    features: []
  };

  // Generate features portion of response
  features.forEach(function(feature) {
    response.features.push(feature.toJSON({
      transform: transformFeature,
      properties: properties
    }));
  });

  return response;
}