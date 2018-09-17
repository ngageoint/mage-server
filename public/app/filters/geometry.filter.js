var turfCenter = require('@turf/center')
  , mgrs = require('mgrs');

module.exports = GeometryFilter;

GeometryFilter.$inject = ['LocalStorageService'];

function GeometryFilter(LocalStorageService) {
  function filter(input, format) {
    if (!input) return null;

    switch(LocalStorageService.getCoordinateSystemView()) {
    case 'mgrs':
      return toMgrs(input);
    default:
      return toWgs84(input, format);
    }

  }

  filter.$stateful = true;
  return filter;
}

function toWgs84(input, format) {
  var feature = {
    type: 'Feature',
    properties: {},
    geometry: input
  };

  var center = turfCenter(feature);
  return center.geometry.coordinates[0].toFixed(format) + ', ' + center.geometry.coordinates[1].toFixed(format);
}

function toMgrs(input) {
  return mgrs.forward(input.coordinates);
}
