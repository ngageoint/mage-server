/**
 * File: Test.AnotherWay.geom_eq.js
 * Adds a geom_eq method to AnotherWay test objects.
 *
 */

(function() {
    
    /**
     * Function ***REMOVED***ertEqual
     * Test two objects for equivalence (based on ==).  Throw an exception
     *     if not equivalent.
     * 
     * Parameters:
     * got - {Object}
     * expected - {Object}
     * msg - {String} The message to be thrown.  This message will be appended
     *     with ": got {got} but expected {expected}" where got and expected are
     *     replaced with string representations of the above arguments.
     */
    function ***REMOVED***ertEqual(got, expected, msg) {
        if(got === undefined) {
            got = "undefined";
        } else if (got === null) {
            got = "null";
        }
        if(expected === undefined) {
            expected = "undefined";
        } else if (expected === null) {
            expected = "null";
        }
        if(got != expected) {
            throw msg + ": got '" + got + "' but expected '" + expected + "'";
        }
    }
    
    /**
     * Function ***REMOVED***ertFloatEqual
     * Test two objects for floating point equivalence.  Throw an exception
     *     if not equivalent.
     * 
     * Parameters:
     * got - {Object}
     * expected - {Object}
     * msg - {String} The message to be thrown.  This message will be appended
     *     with ": got {got} but expected {expected}" where got and expected are
     *     replaced with string representations of the above arguments.
     */
    function ***REMOVED***ertFloatEqual(got, expected, msg) {
        var OpenLayers = Test.AnotherWay._g_test_iframe.OpenLayers;
        if(got === undefined) {
            got = "undefined";
        } else if (got === null) {
            got = "null";
        }
        if(expected === undefined) {
            expected = "undefined";
        } else if (expected === null) {
            expected = "null";
        }
        if(Math.abs(got - expected) > Math.pow(10, -OpenLayers.Util.DEFAULT_PRECISION)) {
            throw msg + ": got '" + got + "' but expected '" + expected + "'";
        }
    }
    
    /**
     * Function ***REMOVED***ertGeometryEqual
     * Test two geometries for equivalence.  Geometries are considered
     *     equivalent if they are of the same cl***REMOVED***, and given component
     *     geometries, if all components are equivalent. Throws a message as
     *     exception if not equivalent.
     * 
     * Parameters:
     * got - {OpenLayers.Geometry}
     * expected - {OpenLayers.Geometry}
     * options - {Object} Optional object for configuring test options.
     */
    function ***REMOVED***ertGeometryEqual(got, expected, options) {
        
        var OpenLayers = Test.AnotherWay._g_test_iframe.OpenLayers;

        // compare types
        ***REMOVED***ertEqual(typeof got, typeof expected, "Object types mismatch");
        
        // compare cl***REMOVED***es
        ***REMOVED***ertEqual(got.CLASS_NAME, expected.CLASS_NAME, "Object cl***REMOVED*** mismatch");
        
        if(got instanceof OpenLayers.Geometry.Point) {
            // compare points
            ***REMOVED***ertFloatEqual(got.x, expected.x, "x mismatch");
            ***REMOVED***ertFloatEqual(got.y, expected.y, "y mismatch");
            ***REMOVED***ertFloatEqual(got.z, expected.z, "z mismatch");
        } else {
            // compare components
            ***REMOVED***ertEqual(
                got.components.length, expected.components.length,
                "Component length mismatch for " + got.CLASS_NAME
            );
            for(var i=0; i<got.components.length; ++i) {
                try {
                    ***REMOVED***ertGeometryEqual(
                        got.components[i], expected.components[i], options
                    );
                } catch(err) {
                    throw "Bad component " + i + " for " + got.CLASS_NAME + ": " + err;
                }
            }
        }
        return true;
    }
    
    /**
     * Function: Test.AnotherWay._test_object_t.geom_eq
     * Test if two geometry objects are equivalent.  Tests for same geometry
     *     cl***REMOVED***, same number of components (if any), equivalent component
     *     geometries, and same coordinates.
     *
     * (code)
     * t.geom_eq(got, expected, message);
     * (end)
     * 
     * Parameters:
     * got - {OpenLayers.Geometry} Any geometry instance.
     * expected - {OpenLayers.Geometry} The expected geometry.
     * msg - {String} A message to print with test output.
     * options - {Object} Optional object for configuring test options.
     */
    var proto = Test.AnotherWay._test_object_t.prototype;
    proto.geom_eq = function(got, expected, msg, options) {        
        // test geometries for equivalence
        try {
            ***REMOVED***ertGeometryEqual(got, expected, options);
            this.ok(true, msg);
        } catch(err) {
            this.fail(msg + ": " + err);
        }
    }
    
})();
