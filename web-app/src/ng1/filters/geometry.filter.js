const turfCenter = require('@turf/center')
  , mgrs = require('mgrs');

module.exports = GeometryFilter;

GeometryFilter.$inject = ['LocalStorageService'];

function GeometryFilter(LocalStorageService) {
  function filter(input, format) {
    if (!input) return null;

    switch(LocalStorageService.getCoordinateSystemView()) {
    case 'mgrs':
      return toMgrs(input);
    case 'dms':
      return toDms(input);
    default:
      return toWgs84(input, format);
    }

  }

  filter.$stateful = true;
  return filter;
}

function toWgs84(input, format) {
  const coordinates = center(input).geometry.coordinates;
  return coordinates[1].toFixed(format) + ', ' + coordinates[0].toFixed(format);
}

function toMgrs(input) {
  const coordinates = center(input).geometry.coordinates;
  return mgrs.forward(coordinates);
}

function toDms(input) {
  const coordinates = center(input).geometry.coordinates;
  return 'dms ' + coordinates[0] + ', ' + coordinates[1]
}

function center(input) {
  const feature = {
    type: 'Feature',
    properties: {},
    geometry: input
  };

  return turfCenter(feature);
}
