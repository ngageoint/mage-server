var Shapefile = require('./shapefile')
  , Kml = require('./kml')
  , Csv = require('./csv')
  , GeoJson = require('./geojson');

console.log('got geojson class', GeoJson);
console.log('got shapefile class', Shapefile);

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
