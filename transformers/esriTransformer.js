module.exports = function() {
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

  var feature = require('./esriFeatureTransformer')(fields);
  var featureFilter = require('./esriFeatureFilterTransformer')(fields);

  var transform = function(features, filter) {
    return filter ? featureFilter.transform(features, filter) : feature.transform(features);
  } 

  return {
    transform: transform
  }
}