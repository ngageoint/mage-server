module.exports = function(geometryFormat) {
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
  };

  var fieldNames = function() {
    var fieldNames = [];
    for (var field in fields) {
      fieldNames.push(fields[field].name);
    }

    return fieldNames;
  }();

  var include = function(property, fields) {
    return fields.indexOf(property) != -1;
  }

  var transformFeature = function(feature, ret, options) {
    var returnGeometry = options.properties.returnGeometry ? options.properties.returnGeometry : true;
    var outFields = options.properties.outFields ? options.properties.outFields : fieldNames;

    var xform = {};

    // handle geometry
    if (returnGeometry) {
      xform.geometry = geometryFormat.format(feature.geometry);
    }

    var attributes = {};
    outFields.forEach(function(outField) {
      var field = feature.properties[outField];
      attributes[outField] = field ? field : null;
    });

    xform.attributes = attributes;
    
    return xform;
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
        if (properties.returnGeometry) {
          response.geometryType = 'esriGeometryPoint';
          response.spatialReference = { 'wkid' : 4326 };
        }

        if (properties.outFields) {
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