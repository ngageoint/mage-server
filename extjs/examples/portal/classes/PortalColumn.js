/**
 * @cl***REMOVED*** Ext.app.PortalColumn
 * @extends Ext.container.Container
 * A layout column cl***REMOVED*** used internally be {@link Ext.app.PortalPanel}.
 */
Ext.define('Ext.app.PortalColumn', {
    extend: 'Ext.container.Container',
    alias: 'widget.portalcolumn',

    requires: [
        'Ext.layout.container.Anchor',
        'Ext.app.Portlet'
    ],

    layout: 'anchor',
    defaultType: 'portlet',
    cls: 'x-portal-column'

    // This is a cl***REMOVED*** so that it could be easily extended
    // if necessary to provide additional behavior.
});