var ArcGIS = require('terraformer-arcgis-parser')

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
  EVENTCLEAR: { name: 'EVENTCLEAR', alias: 'EVENTCLEAR', type: 'esriFieldTypeDate', length: 36 },
  UNIT: { name: 'UNIT', alias: 'UNIT', type: 'esriFieldTypeString', length: 100 }
};

var fieldNames = function() {
  var fieldNames = [];
  for (var field in fields) {
    fieldNames.push(fields[field].name);
  }

  return fieldNames;
}();

var transformFeatures = function(features, properties) {
  var response = {
    objectIdFieldName: 'OBJECTID',
    globalIdFieldName: '',
  }

  // Generate features portion of response
  response.features = ArcGIS.convert({
    type: 'FeatureCollection',
    features: features
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

exports.transform = function(features) {
  return transformFeatures(features);
}