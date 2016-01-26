var shp = require('./write');

var point = justType('Point', 'POINT');
var line = justType('LineString', 'POLYLINE');
var polygon = justType('Polygon', 'POLYGON');

function justType(type, TYPE) {
  return function(gj) {
    var oftype = gj.features.filter(isType(type));
    return {
      geometries: oftype.map(justCoords),
      properties: oftype.map(justProps),
      type: TYPE
    };
  };
}

function justCoords(t) {
  if (t.geometry.coordinates[0] !== undefined &&
    t.geometry.coordinates[0][0] !== undefined &&
    t.geometry.coordinates[0][0][0] !== undefined) {
    return t.geometry.coordinates[0];
  } else {
    return t.geometry.coordinates;
  }
}

function justProps(t) {
  return t.properties;
}

function isType(t) {
  return function(f) { return f.geometry.type === t; };
}

function writeGeoJson(streams, gj, callback) {
  var result = {};

  var i = 0;
  var all = [point(gj), line(gj), polygon(gj)];

  all.forEach(function(l) {
    if (l.geometries.length) {
      shp.write(streams, l.properties, l.type,l.geometries, function(err, files) {
        i++;
        if (err) return callback(err);
        result[l.type] = files;

        if (i == all.length) {
          callback(null, result);
        }
      });
    } else {
      i++;
      if (i == all.length) {
        callback(null, result);
      }
    }
  });
}

module.exports.point = point;
module.exports.line = line;
module.exports.polygon = polygon;
module.exports.write = writeGeoJson;
