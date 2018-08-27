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
  var mgrsString = mgrs.forward(input.coordinates);

  var gzd = mgrsString.substring(0, 2);
  var hundredKmGrid  = mgrsString.substring(2, 4);
  var easting = mgrsString.substring(4, 9);
  var northing = mgrsString.substring(9, 14);

  return [gzd, hundredKmGrid, easting, northing].join(" ");
}
