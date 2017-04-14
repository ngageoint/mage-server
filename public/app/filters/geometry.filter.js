angular
  .module('mage')
  .filter('geometry', geometryFilter);

function geometryFilter() {
  function filter(input, format) {
    if (!input) return null;
    if (input.type === 'Point') {
      return input.coordinates[0].toFixed(3) + ', ' + input.coordinates[1].toFixed(3);
    } else if (input.type === 'LineString') {
      return 'Line';
    } else if (input.type === 'Polygon' && isRectangle(input.coordinates[0])) {
      return 'Rectangle';
    }
    return input.type;
  }

  filter.$stateful = true;
  return filter;
}

function isRectangle(coordinateArray) {
  return coordinateArray[0][0] === coordinateArray[1][0]
      && coordinateArray[1][1] === coordinateArray[2][1]
      && coordinateArray[0][1] === coordinateArray[3][1]
      && coordinateArray[2][0] === coordinateArray[3][0];
}
