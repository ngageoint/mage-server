/**
 * A simple cl***REMOVED*** that adds a vertical separator bar between toolbar items (css cl***REMOVED***: 'x-toolbar-separator').
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Toolbar Separator Example',
 *         width: 300,
 *         height: 200,
 *         tbar : [
 *             'Item 1',
 *             { xtype: 'tbseparator' },
 *             'Item 2'
 *         ],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.toolbar.Separator', {
    extend: 'Ext.toolbar.Item',
    alias: 'widget.tbseparator',
    alternateCl***REMOVED***Name: 'Ext.Toolbar.Separator',
    baseCls: Ext.baseCSSPrefix + 'toolbar-separator',
    focusable: false,
    // Force border: true so container border is not set on this
    border: true
});