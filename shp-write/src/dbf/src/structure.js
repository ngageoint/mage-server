var lib = require('./lib'),
  fields = require('./fields');

module.exports = function structure(data, stream) {

  var fieldMeta = fields.multi(data),
    fieldDescLength = (32 * fieldMeta.length) + 1,
    bytesPerRecord = fields.bytesPer(fieldMeta), // deleted flag
    buffer = new Buffer(new Array(
      // field header
      fieldDescLength +
      // header
      32)
    ),
    now = new Date();

  // version number
  buffer.writeUInt8(3, 0);

  // date of last update
  buffer.writeUInt8(now.getFullYear() - 1900, 1);
  buffer.writeUInt8(now.getMonth(), 2);
  buffer.writeUInt8(now.getDate(), 3);

  // number of records
  buffer.writeUInt32LE(data.length, 4);

  // length of header
  var headerLength = fieldDescLength + 32;
  buffer.writeUInt16LE(headerLength, 8);

  // length of each record
  buffer.writeUInt16LE(bytesPerRecord, 10);

  buffer.writeUInt8(13, fieldDescLength - 1);

  fieldMeta.forEach(function(f, i) {
    // field name
    f.name.split('').slice(0, 8).forEach(function(c, x) {
      buffer.writeUInt8(c.charCodeAt(0), 32 + i * 32 + x);
    });

    // field type
    buffer.writeUInt8(f.type.charCodeAt(0), 32 + i * 32 + 11);

    // field length
    buffer.writeUInt8(f.size, 32 + i * 32 + 16);

    if (f.type == 'N') buffer.writeUInt8(0, 32 + i * 32 + 17);
  });


  stream.write(buffer);

  data.forEach(function(row) {
    var offset = 0;
    var buffer = new Buffer(new Array(bytesPerRecord));

    // delete flag: this is not deleted
    buffer.writeUInt8(32, offset);
    offset++;

    fieldMeta.forEach(function(f) {
      var val = row[f.name] || 0;

      switch (f.type) {
      // boolean
      case 'L':
        buffer.writeUInt8(val ? 84 : 70, offset);
        offset++;
        break;

      // decimal
      case 'D':
        offset = lib.writeField(buffer, 8, lib.lpad(val.toString(), 8, ' '), offset);
        break;

      // number
      case 'N':
        offset = lib.writeField(buffer, f.size, lib.lpad(val.toString(), f.size, ' ').substr(0, 18), offset);
        break;

      // string
      case 'C':
        offset = lib.writeField(buffer, f.size, lib.rpad(val.toString(), f.size, ' '), offset);
        break;

      default:
        throw new Error('Unknown field type');
      }
    });

    stream.write(buffer);
  });

  // EOF flag
  buffer = new Buffer(new Array(1));
  buffer.writeUInt8(26, 0);
  stream.write(buffer);

  return stream;
};
