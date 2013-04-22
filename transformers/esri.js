module.exports = function(geometry) {
  // TODO this needs to come from the DB, either default or per layer
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

  var include = function(property, fields) {
    return fields.indexOf(property) != -1;
  }

  var transformFeature = function(feature, ret, options) {
    if (!options.properties) {
      // include all properties
      return {
        geometry: geometry.formatGeometry(feature.geometry),
        attributes: feature.properties
      }; 
    } else {
      var xform = {};

      // handle geometry
      if (options.properties.returnGeometry) {
        xform.geometry = geometry.formatGeometry(feature.geometry);
      }

      // handle attributes
      var outFields = options.properties.outFields;
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

    return options.propertyNames ? propertyNameTransform : defaultTransform;
  }

  var transform = function(features, properties) {
    var response = {
      objectIdFieldName: 'OBJECTID',
      globalIdFieldName: '',
      features: []
    }

    // Generate features portion of response
    features.forEach(function(feature) {
      response.features.push(feature.toJSON({
        transform: transformFeature,
        properties: properties
      }));
    });

    // Generate metadata portion of response
    if (features.length > 0) {
      if (!properties) {
        // include metadata for all properties
        response.geometryType = 'esriGeometryPoint';
        response.spatialReference = { 'wkid' : 4326 };
        response.fields = [];
        for (var field in fields) {
          response.fields.push(fields[field]);
        }
      } else {
        if (filter.returnGeometry) {
          response.geometryType = 'esriGeometryPoint';
          response.spatialReference = { 'wkid' : 4326 };
        }

        if (filter.outFields) {
          response.fields = [];
          for (var field in fields) {
            if (include(field, properties.outFields)) {
              response.fields.push(fields[field]);
            }
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