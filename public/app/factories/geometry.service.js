angular
  .module('mage')
  .factory('GeometryService', GeometryService);

GeometryService.$inject = [];

function GeometryService() {

  var service = {
    featureHasIntersections: featureHasIntersections
  };

  return service;

  function featureHasIntersections(feature) {
    var polygon = turf.polygon(feature.geometry.coordinates);
    var kinks = turf.kinks(polygon);
    return kinks.intersections.features.length !== 0;
  }
}
