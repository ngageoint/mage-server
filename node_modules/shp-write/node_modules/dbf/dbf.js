(function(e){if("function"==typeof bootstrap)bootstrap("dbf",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeDbf=e}else"undefined"!=typeof window?window.dbf=e():global.dbf=e()})(function(){var define,ses,bootstrap,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports.structure = require('./src/structure');

},{"./src/structure":5}],2:[function(require,module,exports){
var fieldSize = require('./fieldsize');

var types = {
    string: 'C',
    number: 'N',
    boolean: 'L'
};

module.exports.multi = multi;
module.exports.bytesPer = bytesPer;
module.exports.obj = obj;

function multi(features) {
    var fields = {};
    features.forEach(collect);
    function collect(f) { inherit(fields, f); }
    return obj(fields);
}

function inherit(a, b) {
    for (var i in b) { a[i] = b[i]; }
    return a;
}

function obj(_) {
    var fields = {}, o = [];
    for (var p in _) fields[p] = typeof _[p];
    for (var n in fields) {
        var t = types[fields[n]];
        o.push({
            name: n,
            type: t,
            size: fieldSize[t]
        });
    }
    return o;
}

function bytesPer(fields) {
    // deleted flag
    return fields.reduce(function(memo, f) { return memo + f.size; }, 1);
}

},{"./fieldsize":3}],3:[function(require,module,exports){
module.exports = {
    // string
    C: 254,
    // boolean
    L: 1,
    // date
    D: 8,
    // number
    N: 18,
    // number
    M: 18,
    // number, float
    F: 18,
    // number
    B: 8,
};

},{}],4:[function(require,module,exports){
module.exports.lpad = function lpad(str, len, char) {
    while (str.length < len) { str = char + str; } return str;
};

module.exports.rpad = function rpad(str, len, char) {
    while (str.length < len) { str = str + char; } return str;
};

module.exports.writeField = function writeField(view, fieldLength, str, offset) {
    for (var i = 0; i < fieldLength; i++) {
        view.setUint8(offset, str.charCodeAt(i)); offset++;
    }
    return offset;
};

},{}],5:[function(require,module,exports){
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

},{"./fields":2,"./fieldsize":3,"./lib":4}]},{},[1])
(1)
});
;