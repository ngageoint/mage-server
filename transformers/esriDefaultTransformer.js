module.exports = function(fields) {

  var transformFeature = function(feature, ret, options) {
    return {
      geometry: feature.geometry,
      attributes: feature.properties
    };
  }

  var transformFeature = function(feature, ret, options) {
    var xform = {};

    // handle geometry
    if (options.filter.returnGeometry) {
      xform.geometry = feature.geometry;
    }

    // handle attributes
    var outFields = options.filter.outFields;
    var attributes = null;
    if (outFields) {
      attributes = {};
      for (var property in feature.properties) {
        if (include(property, outFields)) {
          attributes[property] = feature.properties[property];
        }
      }

      xform.attributes = attributes;
    }

    return xform;
  }

  var transform = function(features, filter) {
    var response = {
      objectIdFieldName: 'OBJECTID',
      globalIdFieldName: '',
      features: []
    }

    // Generate features portion of response
    features.forEach(function(feature) {
      response.features.push(feature.toJSON({
        transform: transformFeature
      }));
    });

    // Generate metadata portion of response
    if (features.length > 0) {
      response.geometryType = 'esriGeometryPoint';
      response.spatialReference = { 'wkid' : 4326 };
      response.fields = [];
      for (var field in fields) {
        response.fields.push(fields[field]);
      }
    }

    return response;
  } 

  return {
    transform: transform
  }
}