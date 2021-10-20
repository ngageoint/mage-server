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
  default:
    return [JSON.parse(text)];
  }
};

exports.parse = parseGeometry;
