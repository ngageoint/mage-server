module.exports = function(jsol) {

  var formatPoint = function(geometry) {
    return {
      x: geometry.coordinates[0],
      y: geometry.coordinates[1]
    }
  }

  var parsePoint = function(text) {
    geometry = null;
    try {
      // See if its vaild json
      geometry = jsol.parseJSOL(text);
    } catch(e) {

      // see if its comma separated bouding box
      var xy = text.split(",");
      if (xy.length != 2) {
        throw new Error("Invalid geometry: " + text);
      }

      geometry = {x: parseFloat(xy[0]), y: parseFloat(xy[1])};
    }

    return geometry;
  };

  var parseEnvelope = function(text) {
    geometry = null;
    try {
      // See if its vaild json
      geometry = JSON.parse(text);

      geometry = jsol.parseJSOL(text);
    } catch(e) {

      // see if its comma separated bouding box
      var bbox = text.split(",");
      if (bbox.length != 4) {
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

      geometry = {xmin: xmin, ymin: ymin, xmax: xmax, ymax: ymax };
    }

    return geometry;
  };

  var parsePolygon = function(text) {
    try {
      // See if its vaild json
      polygon = jsol.parseJSOL(text);

      return {
        geometry: {
          type: 'Polygon',
          coordinates: polygon.rings
        }
      };
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

  var formatPoint = function(geometry) {
    return {
      x: geometry.coordinates[0],
      y: geometry.coordinates[1]
    };
  }

  var formatGeometry = function(geometry) {
    switch (geometry.type) {
      case 'Point':
        return formatPoint(geometry);
      default:
        throw("Unsupported geometry type: " + type);
    }
  }

  return {
    parseGeometry: parseGeometry,
    formatGeometry: formatGeometry
  }
}