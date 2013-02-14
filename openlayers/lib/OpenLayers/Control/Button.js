/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OpenLayers/Control.js
 */

/**
 * Cl***REMOVED***: OpenLayers.Control.Button 
 * The Button control is a very simple push-button, for use with 
 * <OpenLayers.Control.Panel>.
 * When clicked, the function trigger() is executed.
 * 
 * Inherits from:
 *  - <OpenLayers.Control>
 *
 * Use:
 * (code)
 * var button = new OpenLayers.Control.Button({
 *     displayCl***REMOVED***: "MyButton", trigger: myFunction
 * });
 * panel.addControls([button]);
 * (end)
 * 
 * Will create a button with CSS cl***REMOVED*** MyButtonItemInactive, that
 *     will call the function MyFunction() when clicked.
 */
OpenLayers.Control.Button = OpenLayers.Cl***REMOVED***(OpenLayers.Control, {
    /**
     * Property: type
     * {Integer} OpenLayers.Control.TYPE_BUTTON.
     */
    type: OpenLayers.Control.TYPE_BUTTON,
    
    /**
     * Method: trigger
     * Called by a control panel when the button is clicked.
     */
    trigger: function() {},

    CLASS_NAME: "OpenLayers.Control.Button"
});
