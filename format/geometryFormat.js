module.exports = function() {

  var jsol = require('./jsol');

  function parsePoint(text) {
    var point = jsol.parseJSOL(text);
    if (!point.x && !point.y) {
      // see if its comma separated bouding box
      var xy = text.split(",");
      if (xy.length !== 2) {
        throw new Error("Invalid geometry: " + text);
      }

      point = {x: xy[0], y: xy[1]};
    }

    return [{
      type: 'Point',
      coordinates: [point.x, point.y]
    }];
  }

  function parseEnvelope(text) {
    var envelope = jsol.parseJSOL(text);

    if (!envelope.xmin && !envelope.xmax && !envelope.ymin && !envelope.ymax) {
      // Check if it a comma seperated bbox
      var bbox = text.split(",");
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

      envelope = {xmin: xmin, ymin: ymin, xmax: xmax, ymax: ymax };
    }

    var geometries = [];

    // TODO hack until mongo fixes queries for more than
    // 180 degrees longitude.  Create 2 geometries if we cross
    // the prime meridian
    if (envelope.xmax > 0 && envelope.xmin < 0) {
      geometries.push({
        type: 'Polygon',
        coordinates: [ [
          [envelope.xmin, envelope.ymin],
          [0, envelope.ymin],
          [0, envelope.ymax],
          [envelope.xmin, envelope.ymax],
          [envelope.xmin, envelope.ymin]
        ] ]
      });

      geometries.push({
        type: 'Polygon',
        coordinates: [ [
          [0, envelope.ymin],
          [envelope.xmax, envelope.ymin],
          [envelope.xmax, envelope.ymax],
          [0, envelope.ymax],
          [0, envelope.ymin]
        ] ]
      });
    } else {
      geometries.push({
        type: 'Polygon',
        coordinates: [ [
          [envelope.xmin, envelope.ymin],
          [envelope.xmax, envelope.ymin],
          [envelope.xmax, envelope.ymax],
          [envelope.xmin, envelope.ymax],
          [envelope.xmin, envelope.ymin]
        ] ]
      });
    }

    return geometries;
  }

  function parsePolygon(text) {
    try {
      // See if its vaild json
      var polygon = jsol.parseJSOL(text);

      return [{
        type: 'Polygon',
        coordinates: polygon.rings
      }];
    } catch(e) {
      throw new Error("Invalid geometry: " + text);
    }
  }

  var parseGeometry = function(type, text) {
    switch (type) {
    case 'esriGeometryPoint':
      return parsePoint(text);
    case 'esriGeometryEnvelope':
      return parseEnvelope(text);
    case 'esriGeometryPolygon':
      return parsePolygon(text);
    default:
      throw("Unsupported geometry type: " + type);
    }
  };

  function formatPoint(geometry) {
    return {
      x: geometry.coordinates[0],
      y: geometry.coordinates[1]
    };
  }

  function formatGeometry(geometry) {
    switch (geometry.type) {
    case 'Point':
      return formatPoint(geometry);
    default:
      throw("Unsupported geometry type: " + geometry.type);
    }
  }

  return {
    parse: parseGeometry,
    format: formatGeometry
  };
}();
