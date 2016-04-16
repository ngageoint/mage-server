var shpwrite = require('shp-write');

function justPoints(geojson) {
  return {
    type: 'POINT',
    geometries: geojson.map(justCoords),
    properties: geojson.map(justProps)
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

function justProps(geojson) {
  return geojson.properties;
}

function write(geojson, callback) {
  var points = justPoints(geojson);
  shpwrite.write(points.properties, 'POINT', points.geometries, function(err, files) {
    if (err) return callback(err);

    callback(err, {
      shp: new Buffer(new Uint8Array(files.shp.buffer)),
      shx: new Buffer(new Uint8Array(files.shx.buffer)),
      dbf: new Buffer(new Uint8Array(files.dbf.buffer)),
      prj: files.prj
    });
  });
}

exports.write = write;
