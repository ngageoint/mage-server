var Shapefile = require('./shapefile')
  , Kml = require('./kml')
  , Csv = require('./csv')
  , GeoJson = require('./geojson');
  
function ExporterFactory() {}

ExporterFactory.prototype.createExporter = function(type, options) {
  switch (type) {
  case 'shapefile':
    return new Shapefile(options);
  case 'kml':
    return new Kml(options);
  case 'geojson':
    return new GeoJson(options);
  case 'csv':
    return new Csv(options);
  }
};

module.exports = new ExporterFactory();
