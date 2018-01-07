var turfCenter = require('@turf/center');

module.exports = GeometryFilter;

function GeometryFilter() {
  function filter(input, format) {
    if (!input) return null;

    var feature = {
      type: 'Feature',
      properties: {},
      geometry: input
    };

    var center = turfCenter(feature);
    return center.geometry.coordinates[0].toFixed(format) + ', ' + center.geometry.coordinates[1].toFixed(format);
  }

  filter.$stateful = true;
  return filter;
}
