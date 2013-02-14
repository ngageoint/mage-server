/**
 * The base cl***REMOVED*** that other non-interacting Toolbar Item cl***REMOVED***es should extend in order to
 * get some basic common toolbar item functionality.
 */
Ext.define('Ext.toolbar.Item', {
    extend: 'Ext.Component',
    alias: 'widget.tbitem',
    alternateCl***REMOVED***Name: 'Ext.Toolbar.Item',
    enable:Ext.emptyFn,
    disable:Ext.emptyFn,
    focus:Ext.emptyFn
    /**
     * @cfg {String} overflowText
     * Text to be used for the menu if the item is overflowed.
     */
});