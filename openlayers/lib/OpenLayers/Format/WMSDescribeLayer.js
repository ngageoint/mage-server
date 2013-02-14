/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OpenLayers/Format/XML/VersionedOGC.js
 */

/**
 * Cl***REMOVED***: OpenLayers.Format.WMSDescribeLayer
 * Read SLD WMS DescribeLayer response
 * DescribeLayer is meant to couple WMS to WFS and WCS
 * 
 * Inherits from:
 *  - <OpenLayers.Format.XML.VersionedOGC>
 */
OpenLayers.Format.WMSDescribeLayer = OpenLayers.Cl***REMOVED***(OpenLayers.Format.XML.VersionedOGC, {

    /**
     * APIProperty: defaultVersion
     * {String} Version number to ***REMOVED***ume if none found.  Default is "1.1.1".
     */
    defaultVersion: "1.1.1",
   
    /**
     * Constructor: OpenLayers.Format.WMSDescribeLayer
     * Create a new parser for WMS DescribeLayer responses.
     *
     * Parameters:
     * options - {Object} An optional object whose properties will be set on
     *     this instance.
     */

    /**
     * APIMethod: read
     * Read DescribeLayer data from a string, and return the response. 
     * The OGC currently defines 2 formats which are allowed for output,
     * so we need to parse these 2 types
     * 
     * Parameters: 
     * data - {String} or {DOMElement} data to read/parse.
     *
     * Returns:
     * {Array} Array of {<LayerDescription>} objects which have:
     * - {String} owsType: WFS/WCS
     * - {String} owsURL: the online resource
     * - {String} typeName: the name of the typename on the ***REMOVED***
     */
    
    CLASS_NAME: "OpenLayers.Format.WMSDescribeLayer" 

});
