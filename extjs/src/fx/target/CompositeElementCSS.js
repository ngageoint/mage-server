/**
 * @cl***REMOVED*** Ext.fx.target.CompositeElementCSS
 * 
 * This cl***REMOVED*** represents a animation target for a {@link Ext.CompositeElement}, where the
 * constituent elements support CSS based animation. It allows each {@link Ext.Element} in 
 * the group to be animated as a whole. In general this cl***REMOVED*** will not be created directly, 
 * the {@link Ext.CompositeElement} will be p***REMOVED***ed to the animation and the appropriate target 
 * will be created.
 */
Ext.define('Ext.fx.target.CompositeElementCSS', {

    /* Begin Definitions */

    extend: 'Ext.fx.target.CompositeElement',

    requires: ['Ext.fx.target.ElementCSS'],

    /* End Definitions */
    setAttr: function() {
        return Ext.fx.target.ElementCSS.prototype.setAttr.apply(this, arguments);
    }
});