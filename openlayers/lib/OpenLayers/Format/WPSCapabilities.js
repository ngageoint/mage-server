/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OpenLayers/Format/XML/VersionedOGC.js
 */
 
/**
 * Cl***REMOVED***: OpenLayers.Format.WPSCapabilities
 * Read WPS Capabilities.
 * 
 * Inherits from:
 *  - <OpenLayers.Format.XML.VersionedOGC>
 */
OpenLayers.Format.WPSCapabilities = OpenLayers.Cl***REMOVED***(OpenLayers.Format.XML.VersionedOGC, {
    
    /**
     * APIProperty: defaultVersion
     * {String} Version number to ***REMOVED***ume if none found.  Default is "1.0.0".
     */
    defaultVersion: "1.0.0",
    
    /**
     * Constructor: OpenLayers.Format.WPSCapabilities
     * Create a new parser for WPS Capabilities.
     *
     * Parameters:
     * options - {Object} An optional object whose properties will be set on
     *     this instance.
     */

    /**
     * APIMethod: read
     * Read capabilities data from a string, and return information about
     * the ***REMOVED***.
     * 
     * Parameters: 
     * data - {String} or {DOMElement} data to read/parse.
     *
     * Returns:
     * {Object} Info about the WPS
     */
    
    CLASS_NAME: "OpenLayers.Format.WPSCapabilities" 

});
