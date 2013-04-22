module.exports = function(fields) {

  var include = function(field, fields) {
    return fields.indexOf(field) != -1;
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
        transform: transformFeature,
        filter: filter
      }));
    });

    // Generate metadata portion of response
    if (features.length > 0) {
      if (filter.returnGeometry) {
        response.geometryType = 'esriGeometryPoint';
        response.spatialReference = { 'wkid' : 4326 };
      }

      if (filter.outFields) {
        response.fields = [];
        for (var field in fields) {
          if (include(field, filter.outFields)) {
            response.fields.push(fields[field]);
          }
        }
      }
    }

    return response;
  } 

  return {
    transform: transform
  }
}