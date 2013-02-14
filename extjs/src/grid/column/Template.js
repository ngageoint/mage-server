/**
 * A Column definition cl***REMOVED*** which renders a value by processing a {@link Ext.data.Model Model}'s
 * {@link Ext.data.Model#persistenceProperty data} using a {@link #tpl configured}
 * {@link Ext.XTemplate XTemplate}.
 * 
 *     @example
 *     Ext.create('Ext.data.Store', {
 *         storeId:'employeeStore',
 *         fields:['firstname', 'lastname', 'seniority', '***REMOVED***'],
 *         groupField: '***REMOVED***',
 *         data:[
 *             { firstname: "Michael", lastname: "Scott",   seniority: 7, ***REMOVED***: "Management" },
 *             { firstname: "Dwight",  lastname: "Schrute", seniority: 2, ***REMOVED***: "Sales" },
 *             { firstname: "Jim",     lastname: "Halpert", seniority: 3, ***REMOVED***: "Sales" },
 *             { firstname: "Kevin",   lastname: "Malone",  seniority: 4, ***REMOVED***: "Accounting" },
 *             { firstname: "Angela",  lastname: "Martin",  seniority: 5, ***REMOVED***: "Accounting" }
 *         ]
 *     });
 *     
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Column Template Demo',
 *         store: Ext.data.StoreManager.lookup('employeeStore'),
 *         columns: [
 *             { text: 'Full Name',       xtype: 'templatecolumn', tpl: '{firstname} {lastname}', flex:1 },
 *             { text: 'Department (Yrs)', xtype: 'templatecolumn', tpl: '{***REMOVED***} ({seniority})' }
 *         ],
 *         height: 200,
 *         width: 300,
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.grid.column.Template', {
    extend: 'Ext.grid.column.Column',
    alias: ['widget.templatecolumn'],
    requires: ['Ext.XTemplate'],
    alternateCl***REMOVED***Name: 'Ext.grid.TemplateColumn',

    /**
     * @cfg {String/Ext.XTemplate} tpl
     * An {@link Ext.XTemplate XTemplate}, or an XTemplate *definition string* to use to process a
     * {@link Ext.data.Model Model}'s {@link Ext.data.Model#persistenceProperty data} to produce a
     * column's rendered value.
     */
    /**
     * @cfg renderer
     * @hide
     */
    /**
     * @cfg scope
     * @hide
     */

    initComponent: function(){
        var me = this;
        me.tpl = (!Ext.isPrimitive(me.tpl) && me.tpl.compile) ? me.tpl : new Ext.XTemplate(me.tpl);
        // Set this here since the template may access any record values,
        // so we must always run the update for this column
        me.hasCustomRenderer = true;
        me.callParent(arguments);
    },
    
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.data, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});
