const Kml = require('./kml')
  , Csv = require('./csv')
  , GeoJson = require('./geojson')
  , GeoPackage = require('./geopackage');

function ExporterFactory() { }

ExporterFactory.prototype.createExporter = function (type, options) {
  switch (type) {
    case 'kml':
      return new Kml(options);
    case 'geojson':
      return new GeoJson(options);
    case 'csv':
      return new Csv(options);
    case 'geopackage':
      return new GeoPackage(options);
  }
};

module.exports = new ExporterFactory();
