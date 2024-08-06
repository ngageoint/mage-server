function parseEnvelope(text) {
  const coords = JSON.parse(text);
  if (coords.length !== 4) {
    throw new Error("Invalid geometry: " + text);
  }

  let xmin = parseFloat(coords[0]);
  let ymin = parseFloat(coords[1]);
  let xmax = parseFloat(coords[2]);
  let ymax = parseFloat(coords[3]);

  // TODO: is this the right thing to do?
  xmin = xmin < -180 ? -180 : xmin;
  ymin = ymin < -90 ? -90 : ymin;
  xmax = xmax > 180 ? 180 : xmax;
  ymax = ymax > 90 ? 90 : ymax;

  const bbox = { xmin, ymin, xmax, ymax };

  // TODO: hack until mongo fixes queries for more than
  // 180 degrees longitude.  Create 2 geometries if we cross
  // the prime meridian
  if (bbox.xmax > 0 && bbox.xmin < 0) {
    return [
      {
        type: 'Polygon',
        coordinates: [ [
          [bbox.xmin, bbox.ymin],
          [0, bbox.ymin],
          [0, bbox.ymax],
          [bbox.xmin, bbox.ymax],
          [bbox.xmin, bbox.ymin]
        ] ]
      },
      {
        type: 'Polygon',
        coordinates: [ [
          [0, bbox.ymin],
          [bbox.xmax, bbox.ymin],
          [bbox.xmax, bbox.ymax],
          [0, bbox.ymax],
          [0, bbox.ymin]
        ] ]
      }
    ]
  }
  return [
    {
      type: 'Polygon',
      coordinates: [ [
        [bbox.xmin, bbox.ymin],
        [bbox.xmax, bbox.ymin],
        [bbox.xmax, bbox.ymax],
        [bbox.xmin, bbox.ymax],
        [bbox.xmin, bbox.ymin]
      ] ]
    }
  ]
}

function parseGeometry(type, text) {
  switch (type) {
  case 'bbox':
    return parseEnvelope(text);
  default:
    return [ JSON.parse(text) ];
  }
}

exports.parse = parseGeometry;
