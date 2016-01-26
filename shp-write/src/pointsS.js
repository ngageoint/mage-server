var ext = require('./extent');

module.exports.write = function writePoints(coordinates, extent, shpStream, shxStream) {

  var contentLength = 28, // 8 header, 20 content
    fileLength = 100;

  coordinates.forEach(function writePoint(coords, i) {
    var shpBuffer = new Buffer(new Array(28));
    var shxBuffer = new Buffer(new Array(8));

    // HEADER
    // 4 record number
    // 4 content length in 16-bit words (20/2)
    shpBuffer.writeInt32BE(i, 0);
    shpBuffer.writeInt32BE(10, 4);

    // record
    // (8 + 8) + 4 = 20 content length
    shpBuffer.writeInt32LE(1, 8);
    shpBuffer.writeDoubleLE(coords[0], 12);
    shpBuffer.writeDoubleLE(coords[1], 20);

    // index
    shxBuffer.writeInt32BE(fileLength / 2, 0);
    shxBuffer.writeInt32BE(10, 4);

    // shxI += 8;
    // shpI += contentLength;
    fileLength += contentLength;

    shpStream.write(shpBuffer);
    shxStream.write(shxBuffer);
  });
};

module.exports.extent = function(coordinates) {
  return coordinates.reduce(function(extent, coords) {
    return ext.enlarge(extent, coords);
  }, ext.blank());
};

module.exports.shxLength = function(coordinates) {
  return coordinates.length * 8;
};

module.exports.shpLength = function(coordinates) {
  return coordinates.length * 28;
};
