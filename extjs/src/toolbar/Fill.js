/**
 * A non-rendering placeholder item which instructs the Toolbar's Layout to begin using
 * the right-justified button container.
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *          title: 'Toolbar Fill Example',
 *          width: 300,
 *          height: 200,
 *          tbar : [
 *              'Item 1',
 *              { xtype: 'tbfill' },
 *              'Item 2'
 *          ],
 *          renderTo: Ext.getBody()
 *      });
 */
Ext.define('Ext.toolbar.Fill', {
    extend: 'Ext.Component',
    alias: 'widget.tbfill',
    alternateCl***REMOVED***Name: 'Ext.Toolbar.Fill',
    /**
     * @property {Boolean} isFill
     * `true` in this cl***REMOVED*** to identify an object as an instantiated Fill, or subcl***REMOVED*** thereof.
     */
    isFill : true,
    flex: 1
});