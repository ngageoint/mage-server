/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

/**
 * @requires OpenLayers/Util.js
 * @requires OpenLayers/BaseTypes.js
 */

/**
 * Namespace: OpenLayers.Element
 */
OpenLayers.Element = {

    /**
     * APIFunction: visible
     * 
     * Parameters: 
     * element - {DOMElement}
     * 
     * Returns:
     * {Boolean} Is the element visible?
     */
    visible: function(element) {
        return OpenLayers.Util.getElement(element).style.display != 'none';
    },

    /**
     * APIFunction: toggle
     * Toggle the visibility of element(s) p***REMOVED***ed in
     * 
     * Parameters:
     * element - {DOMElement} Actually user can p***REMOVED*** any number of elements
     */
    toggle: function() {
        for (var i=0, len=arguments.length; i<len; i++) {
            var element = OpenLayers.Util.getElement(arguments[i]);
            var display = OpenLayers.Element.visible(element) ? 'none' 
                                                              : '';
            element.style.display = display;
        }
    },

    /**
     * APIFunction: remove
     * Remove the specified element from the DOM.
     * 
     * Parameters:
     * element - {DOMElement}
     */
    remove: function(element) {
        element = OpenLayers.Util.getElement(element);
        element.parentNode.removeChild(element);
    },

    /**
     * APIFunction: getHeight
     *  
     * Parameters:
     * element - {DOMElement}
     * 
     * Returns:
     * {Integer} The offset height of the element p***REMOVED***ed in
     */
    getHeight: function(element) {
        element = OpenLayers.Util.getElement(element);
        return element.offsetHeight;
    },

    /**
     * Function: hasCl***REMOVED***
     * Tests if an element has the given CSS cl***REMOVED*** name.
     *
     * Parameters:
     * element - {DOMElement} A DOM element node.
     * name - {String} The CSS cl***REMOVED*** name to search for.
     *
     * Returns:
     * {Boolean} The element has the given cl***REMOVED*** name.
     */
    hasCl***REMOVED***: function(element, name) {
        var names = element.cl***REMOVED***Name;
        return (!!names && new RegExp("(^|\\s)" + name + "(\\s|$)").test(names));
    },
    
    /**
     * Function: addCl***REMOVED***
     * Add a CSS cl***REMOVED*** name to an element.  Safe where element already has
     *     the cl***REMOVED*** name.
     *
     * Parameters:
     * element - {DOMElement} A DOM element node.
     * name - {String} The CSS cl***REMOVED*** name to add.
     *
     * Returns:
     * {DOMElement} The element.
     */
    addCl***REMOVED***: function(element, name) {
        if(!OpenLayers.Element.hasCl***REMOVED***(element, name)) {
            element.cl***REMOVED***Name += (element.cl***REMOVED***Name ? " " : "") + name;
        }
        return element;
    },

    /**
     * Function: removeCl***REMOVED***
     * Remove a CSS cl***REMOVED*** name from an element.  Safe where element does not
     *     have the cl***REMOVED*** name.
     *
     * Parameters:
     * element - {DOMElement} A DOM element node.
     * name - {String} The CSS cl***REMOVED*** name to remove.
     *
     * Returns:
     * {DOMElement} The element.
     */
    removeCl***REMOVED***: function(element, name) {
        var names = element.cl***REMOVED***Name;
        if(names) {
            element.cl***REMOVED***Name = OpenLayers.String.trim(
                names.replace(
                    new RegExp("(^|\\s+)" + name + "(\\s+|$)"), " "
                )
            );
        }
        return element;
    },

    /**
     * Function: toggleCl***REMOVED***
     * Remove a CSS cl***REMOVED*** name from an element if it exists.  Add the cl***REMOVED*** name
     *     if it doesn't exist.
     *
     * Parameters:
     * element - {DOMElement} A DOM element node.
     * name - {String} The CSS cl***REMOVED*** name to toggle.
     *
     * Returns:
     * {DOMElement} The element.
     */
    toggleCl***REMOVED***: function(element, name) {
        if(OpenLayers.Element.hasCl***REMOVED***(element, name)) {
            OpenLayers.Element.removeCl***REMOVED***(element, name);
        } else {
            OpenLayers.Element.addCl***REMOVED***(element, name);
        }
        return element;
    },

    /**
     * APIFunction: getStyle
     * 
     * Parameters:
     * element - {DOMElement}
     * style - {?}
     * 
     * Returns:
     * {?}
     */
    getStyle: function(element, style) {
        element = OpenLayers.Util.getElement(element);

        var value = null;
        if (element && element.style) {
            value = element.style[OpenLayers.String.camelize(style)];
            if (!value) {
                if (document.defaultView && 
                    document.defaultView.getComputedStyle) {
                    
                    var css = document.defaultView.getComputedStyle(element, null);
                    value = css ? css.getPropertyValue(style) : null;
                } else if (element.currentStyle) {
                    value = element.currentStyle[OpenLayers.String.camelize(style)];
                }
            }
        
            var positions = ['left', 'top', 'right', 'bottom'];
            if (window.opera &&
                (OpenLayers.Util.indexOf(positions,style) != -1) &&
                (OpenLayers.Element.getStyle(element, 'position') == 'static')) { 
                value = 'auto';
            }
        }
    
        return value == 'auto' ? null : value;
    }

};
