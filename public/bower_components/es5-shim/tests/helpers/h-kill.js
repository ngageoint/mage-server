// This methods allows the killing of built-in functions,
// so the shim can take over with that implementation
var HLP = (function() {
    "use strict";
    var kill;
    
    kill = function(_cl***REMOVED***, methods) {
        /*if(!Array.isArray(methods))
            return;*/
        if(!_cl***REMOVED***.originals)
            _cl***REMOVED***.originals = {};

        for (var i = 0, len = methods.length; i < len; i++) {
            var obj = methods[i];
            _cl***REMOVED***.originals[obj] = _cl***REMOVED***[obj];
            delete _cl***REMOVED***[obj];
            if (obj in _cl***REMOVED***) {
                // try something more aggressive since V8 at least
                // appears to ignore the delete.
                _cl***REMOVED***[obj] = null;
                if (_cl***REMOVED***[obj]) {
                    console.log("Couln't overwrite", obj, "of", _cl***REMOVED***);
                }
            }
        }
    };
    return { kill: kill };
}());

HLP.kill(Function.prototype, [
    'bind'
]);

HLP.kill(Array, [
    'isArray'
]);

HLP.kill(String.prototype, [
    "trim"
]);

HLP.kill(Object, [
    'keys'
]);

HLP.kill(Number.prototype, [
    'toFixed'
]);

HLP.kill(Date, [
    'now', 'parse'
]);

HLP.kill(Date.prototype, [
    "toJSON", "toISOString"
]);

HLP.kill(Array.prototype, [
    'forEach', 'some', 'every', 
    'indexOf', 'lastIndexOf', 
    'map', 'filter', 
    'reduce', 'reduceRight'
]);
