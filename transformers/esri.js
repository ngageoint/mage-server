module.exports = function() {

  var fields = {
    OBJECTID: { name: 'OBJECTID', alias: 'OBJECTID', type: 'esriFieldTypeOID' },
    ADDRESS: { name: 'ADDRESS', alias: 'ADDRESS', type: 'esriFieldTypeString', length: 255 },
    EVENTDATE: { name: 'EVENTDATE', alias: 'EVENTDATE', type: 'esriFieldTypeDate', length: 36 },
    TYPE: { name: 'TYPE', alias: 'TYPE', type: 'esriFieldTypeString', length: 50 },
    EVENTLEVEL: { name: 'EVENTLEVEL', alias: 'LEVEL', type: 'esriFieldTypeString', length: 50 },
    TEAM: { name: 'TEAM', alias: 'TEAM', type: 'esriFieldTypeString', length: 50 },
    DESCRIPTION: { name: 'DESCRIPTION', alias: 'DESCRIPTION', type: 'esriFieldTypeString', length: 1073741822 },
    USNG: { name: 'USNG', alias: 'USNG', type: 'esriFieldTypeString', length: 255 },
    EVENTCLEAR: { name: 'EVENTCLEAR', alias: 'EVENTCLEAR', type: 'esriFieldTypeDate', length: 36 },
    UNIT: { name: 'UNIT', alias: 'UNIT', type: 'esriFieldTypeString', length: 100 }
  }

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
      for (var attribute in feature.attributes) {
        if (include(attribute, outFields)) {
          attributes[attribute] = feature.attributes[attribute];
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
      if (filter) {
        response.features.push(feature.toJSON({
          transform: transformFeature,
          filter: filter
        }));
      } else {
        response.features.push({
          geometry: feature.geometry,
          attributes: feature.attributes
        });
      }
    });

    // Generate metadata portion of response
    if (features.length > 0) {
      if (filter) {
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
      } else {
        response.geometryType = 'esriGeometryPoint';
        response.spatialReference = { 'wkid' : 4326 };
        response.fields = [];
        for (var field in fields) {
          response.fields.push(fields[field]);
        }
      }
    }

    return response;
  } 

  return {
    transform: transform
  }
}