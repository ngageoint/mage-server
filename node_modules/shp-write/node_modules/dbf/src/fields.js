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
