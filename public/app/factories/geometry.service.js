var turfKinks= require('@turf/kinks')
  , turf = require('@turf/helpers');

module.exports = GeometryService;

GeometryService.$inject = [];

function GeometryService() {

  var service = {
    featureHasIntersections: featureHasIntersections
  };

  return service;

  function featureHasIntersections(feature) {
    if (!Array.isArray(feature.geometry.coordinates[0]) || feature.geometry.coordinates[0].length < 4) {
      return false;
    }

    var polygon = turf.polygon(feature.geometry.coordinates);

    var kinks = turfKinks(polygon);


    return kinks.features.length !== 0;
  }
}
