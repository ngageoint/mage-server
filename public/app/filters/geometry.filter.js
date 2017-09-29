angular
  .module('mage')
  .filter('geometry', geometryFilter);

function geometryFilter() {
  function filter(input, format) {
    if (!input) return null;

    var feature = {
      type: 'Feature',
      properties: {},
      geometry: input
    };

    var center = turf.center(feature);
    return center.geometry.coordinates[0].toFixed(format) + ', ' + center.geometry.coordinates[1].toFixed(format);
  }

  filter.$stateful = true;
  return filter;
}
