var geojsonValidation = require('geojson-validation');
var kinks = require('@turf/kinks').default;
var rewind = require('@turf/rewind').default;

function validateCoordinateBounds(coords) {
  if (typeof coords[0] === 'number') {
    if (coords[0] < -180 || coords[0] > 180) throw new Error('Longitude out of range: ' + coords[0]);
    if (coords[1] < -90  || coords[1] > 90)  throw new Error('Latitude out of range: ' + coords[1]);
    return;
  }
  coords.forEach(validateCoordinateBounds);
}

var parseEnvelope = function(text) {
  var bbox = JSON.parse(text);
  if (bbox.length !== 4) {
    throw new Error("Invalid geometry: " + text);
  }

  var xmin = parseFloat(bbox[0]);
  var ymin = parseFloat(bbox[1]);
  var xmax = parseFloat(bbox[2]);
  var ymax = parseFloat(bbox[3]);

  xmin = xmin < -180 ? -180 : xmin;
  ymin = ymin < -90 ? -90 : ymin;
  xmax = xmax > 180 ? 180 : xmax;
  ymax = ymax > 90 ? 90 : ymax;

  bbox = {xmin: xmin, ymin: ymin, xmax: xmax, ymax: ymax };

  var geometries = [];

  // TODO hack until mongo fixes queries for more than
  // 180 degrees longitude.  Create 2 geometries if we cross
  // the prime meridian
  if (bbox.xmax > 0 && bbox.xmin < 0) {
    geometries.push({
      type: 'Polygon',
      coordinates: [ [
        [bbox.xmin, bbox.ymin],
        [0, bbox.ymin],
        [0, bbox.ymax],
        [bbox.xmin, bbox.ymax],
        [bbox.xmin, bbox.ymin]
      ] ]
    });

    geometries.push({
      type: 'Polygon',
      coordinates: [ [
        [0, bbox.ymin],
        [bbox.xmax, bbox.ymin],
        [bbox.xmax, bbox.ymax],
        [0, bbox.ymax],
        [0, bbox.ymin]
      ] ]
    });
  } else {
    geometries.push({
      type: 'Polygon',
      coordinates: [ [
        [bbox.xmin, bbox.ymin],
        [bbox.xmax, bbox.ymin],
        [bbox.xmax, bbox.ymax],
        [bbox.xmin, bbox.ymax],
        [bbox.xmin, bbox.ymin]
      ] ]
    });
  }

  return geometries;
};

var parseGeometry = function(type, text) {
  switch (type) {
  case 'bbox':
    return parseEnvelope(text);
  default: {
    let geometry = JSON.parse(text);
    if (Array.isArray(geometry.coordinates)) {
      validateCoordinateBounds(geometry.coordinates);
    }
    if (!geojsonValidation.isGeometryObject(geometry)) {
      throw new Error('Invalid GeoJSON geometry: ' + text);
    }
    if (['Polygon', 'MultiPolygon'].includes(geometry.type)) {
      if (kinks(geometry).features.length > 0) {
        throw new Error('Invalid GeoJSON geometry: self-intersecting polygon');
      }
    }
    geometry = rewind(geometry, { mutate: false });
    return [geometry];
  }
  }
};

exports.parse = parseGeometry;
