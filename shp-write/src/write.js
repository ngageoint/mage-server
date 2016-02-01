var types = require('./types'),
  dbf = require('./dbf'),
  prj = require('./prj');

module.exports.write = write;

// Low-level writing interface
function write(streams, rows, geometryType, geometries, callback) {
  if (!streams.shp || !streams.shx || !streams.dbf) {
    callback(new Error('must include streams for shp, shx, and dbf'));
  }

  // TODO needs to be based on TYPE, only point for now
  var writer = require('./pointsS.js');

  var counter = 0;
  var complete = 3;
  var finish = function() {
    counter++;
    if (counter === complete) {
      return callback(null);
    }
  };

  var shpStream = streams.shp;
  var shxStream = streams.shx;
  var dbfStream = streams.dbf;
  var prjStream = streams.prj;
  if (prjStream) {
    complete++;
    prjStream.on('finish', finish);
    prjStream.end(prj);
  }

  shpStream.on('finish', finish);
  shxStream.on('finish', finish);
  dbfStream.on('finish', finish);

  var TYPE = types.geometries[geometryType],
    shpLength = 100 + writer.shpLength(geometries),
    extent = writer.extent(geometries);

  writeHeader(shpLength / 2, TYPE, shpStream);
  writeHeader((50 + geometries.length * 4), TYPE, shxStream);
  writeExtent(extent, shpStream);
  writeExtent(extent, shxStream);

  writer.write(geometries, extent, shpStream, shxStream, TYPE);
  shpStream.end();
  shxStream.end();

  dbf.structure(rows, dbfStream);
  dbfStream.end();
}

function writeHeader(length, TYPE, stream) {
  var buffer = new Buffer(new Array(36));

  buffer.writeInt32BE(9994, 0);
  buffer.writeInt32BE(length, 24);
  buffer.writeInt32LE(1000, 28);
  buffer.writeInt32LE(TYPE, 32);

  stream.write(buffer);
}

function writeExtent(extent, stream) {
  var buffer = new Buffer(new Array(64));

  buffer.writeDoubleLE(extent.xmin, 0);
  buffer.writeDoubleLE(extent.ymin, 8);
  buffer.writeDoubleLE(extent.xmax, 16);
  buffer.writeDoubleLE(extent.ymax, 24);

  stream.write(buffer);
}
