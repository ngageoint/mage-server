var fieldSize = require('./fieldsize'),
    lib = require('./lib'),
    fields = require('./fields');

module.exports = function structure(data) {

    var field_meta = fields.multi(data),
        fieldDescLength = (32 * field_meta.length) + 1,
        bytesPerRecord = fields.bytesPer(field_meta), // deleted flag
        buffer = new ArrayBuffer(
            // field header
            fieldDescLength +
            // header
            32 +
            // contents
            (bytesPerRecord * data.length)
        ),
        now = new Date(),
        view = new DataView(buffer);

    // version number
    view.setUint8(0, 3);
    // date of last update
    view.setUint8(1, now.getFullYear() - 1900);
    view.setUint8(2, now.getMonth());
    view.setUint8(3, now.getDate());
    // number of records
    view.setUint32(4, data.length, true);

    // length of header
    var headerLength = fieldDescLength + 32;
    view.setUint16(8, headerLength, true);
    // length of each record
    view.setUint16(10, bytesPerRecord, true);

    view.setInt8(fieldDescLength - 1, 13);

    field_meta.forEach(function(f, i) {
        // field name
        f.name.split('').slice(0, 8).forEach(function(c, x) {
            view.setInt8(32 + i * 32 + x, c.charCodeAt(0));
        });
        // field type
        view.setInt8(32 + i * 32 + 11, f.type.charCodeAt(0));
        // field length
        view.setInt8(32 + i * 32 + 16, f.size);
        if (f.type == 'N') view.setInt8(32 + i * 32 + 17, 0);
    });

    offset = fieldDescLength + 32;

    data.forEach(function(row, num) {
        // delete flag: this is not deleted
        view.setUint8(offset, 32);
        offset++;
        field_meta.forEach(function(f) {
            var val = row[f.name] || 0;

            switch (f.type) {
                // boolean
                case 'L':
                    view.setUint8(offset, val ? 84 : 70);
                    offset++;
                    break;

                // decimal
                case 'D':
                    offset = lib.writeField(view, 8,
                        lib.lpad(val.toString(), 8, ' '), offset);
                    break;

                // number
                case 'N':
                    offset = lib.writeField(view, f.size,
                        lib.lpad(val.toString(), f.size, ' ').substr(0, 18),
                        offset);
                    break;

                // string
                case 'C':
                    offset = lib.writeField(view, f.size,
                        lib.rpad(val.toString(), f.size, ' '), offset);
                    break;

                default:
                    throw new Error('Unknown field type');
            }
        });
    });

    // EOF flag
    view.setUint8(offset - 1, 26);

    return view;
};
