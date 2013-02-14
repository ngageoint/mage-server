/**
 * @author Ed Spencer
 *
 * Associations enable you to express relationships between different {@link Ext.data.Model Models}. Let's say we're
 * writing an ecommerce system where Users can make Orders - there's a relationship between these Models that we can
 * express like this:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'name', 'email'],
 *
 *         hasMany: {model: 'Order', name: 'orders'}
 *     });
 *
 *     Ext.define('Order', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'user_id', 'status', 'price'],
 *
 *         belongsTo: 'User'
 *     });
 *
 * We've set up two models - User and Order - and told them about each other. You can set up as many ***REMOVED***ociations on
 * each Model as you need using the two default types - {@link Ext.data.HasManyAssociation hasMany} and {@link
 * Ext.data.BelongsToAssociation belongsTo}. There's much more detail on the usage of each of those inside their
 * documentation pages. If you're not familiar with Models already, {@link Ext.data.Model there is plenty on those too}.
 *
 * **Further Reading**
 *
 *   - {@link Ext.data.***REMOVED***ociation.HasMany hasMany ***REMOVED***ociations}
 *   - {@link Ext.data.***REMOVED***ociation.BelongsTo belongsTo ***REMOVED***ociations}
 *   - {@link Ext.data.***REMOVED***ociation.HasOne hasOne ***REMOVED***ociations}
 *   - {@link Ext.data.Model using Models}
 *
 * # Self ***REMOVED***ociation models
 *
 * We can also have models that create parent/child ***REMOVED***ociations between the same type. Below is an example, where
 * groups can be nested inside other groups:
 *
 *     // Server Data
 *     {
 *         "groups": {
 *             "id": 10,
 *             "parent_id": 100,
 *             "name": "Main Group",
 *             "parent_group": {
 *                 "id": 100,
 *                 "parent_id": null,
 *                 "name": "Parent Group"
 *             },
 *             "child_groups": [{
 *                 "id": 2,
 *                 "parent_id": 10,
 *                 "name": "Child Group 1"
 *             },{
 *                 "id": 3,
 *                 "parent_id": 10,
 *                 "name": "Child Group 2"
 *             },{
 *                 "id": 4,
 *                 "parent_id": 10,
 *                 "name": "Child Group 3"
 *             }]
 *         }
 *     }
 *
 *     // Client code
 *     Ext.define('Group', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'parent_id', 'name'],
 *         proxy: {
 *             type: 'ajax',
 *             url: 'data.json',
 *             reader: {
 *                 type: 'json',
 *                 root: 'groups'
 *             }
 *         },
 *         ***REMOVED***ociations: [{
 *             type: 'hasMany',
 *             model: 'Group',
 *             primaryKey: 'id',
 *             foreignKey: 'parent_id',
 *             autoLoad: true,
 *             ***REMOVED***ociationKey: 'child_groups' // read child data from child_groups
 *         }, {
 *             type: 'belongsTo',
 *             model: 'Group',
 *             primaryKey: 'id',
 *             foreignKey: 'parent_id',
 *             ***REMOVED***ociationKey: 'parent_group' // read parent data from parent_group
 *         }]
 *     });
 *
 *     Ext.onReady(function(){
 *
 *         Group.load(10, {
 *             success: function(group){
 *                 console.log(group.getGroup().get('name'));
 *
 *                 group.groups().each(function(rec){
 *                     console.log(rec.get('name'));
 *                 });
 *             }
 *         });
 *
 *     });
 *
 */
Ext.define('Ext.data.***REMOVED***ociation.Association', {
    alternateCl***REMOVED***Name: 'Ext.data.Association',
    /**
     * @cfg {String} ownerModel
     * The string name of the model that owns the ***REMOVED***ociation.
     *
     * **NB!** This config is required when instantiating the Association directly.
     * However, it cannot be used at all when defining the ***REMOVED***ociation as a config
     * object inside Model, because the name of the model itself will be supplied
     * automatically as the value of this config.
     */

    /**
     * @cfg {String} ***REMOVED***ociatedModel
     * The string name of the model that is being ***REMOVED***ociated with.
     *
     * **NB!** This config is required when instantiating the Association directly.
     * When defining the ***REMOVED***ociation as a config object inside Model, the #model
     * configuration will shadow this config.
     */

    /**
     * @cfg {String} model
     * The string name of the model that is being ***REMOVED***ociated with.
     *
     * This config option is to be used when defining the ***REMOVED***ociation as a config
     * object within Model.  The value is then mapped to #***REMOVED***ociatedModel when
     * Association is instantiated inside Model.
     */

    /**
     * @cfg {String} primaryKey
     * The name of the primary key on the ***REMOVED***ociated model. In general this will be the
     * {@link Ext.data.Model#idProperty} of the Model.
     */
    primaryKey: 'id',

    /**
     * @cfg {Ext.data.reader.Reader} reader
     * A special reader to read ***REMOVED***ociated data
     */
    
    /**
     * @cfg {String} ***REMOVED***ociationKey
     * The name of the property in the data to read the ***REMOVED***ociation from. Defaults to the name of the ***REMOVED***ociated model.
     */

    defaultReaderType: 'json',

    isAssociation: true,

    initialConfig: null,

    statics: {
        AUTO_ID: 1000,
        
        create: function(***REMOVED***ociation){
            if (Ext.isString(***REMOVED***ociation)) {
                ***REMOVED***ociation = {
                    type: ***REMOVED***ociation
                };
            }

            switch (***REMOVED***ociation.type) {
                case 'belongsTo':
                    return new Ext.data.***REMOVED***ociation.BelongsTo(***REMOVED***ociation);
                case 'hasMany':
                    return new Ext.data.***REMOVED***ociation.HasMany(***REMOVED***ociation);
                case 'hasOne':
                    return new Ext.data.***REMOVED***ociation.HasOne(***REMOVED***ociation);
                //TODO Add this back when it's fixed
//                    case 'polymorphic':
//                        return Ext.create('Ext.data.PolymorphicAssociation', ***REMOVED***ociation);
                default:
                    //<debug>
                    Ext.Error.raise('Unknown Association type: "' + ***REMOVED***ociation.type + '"');
                    //</debug>
            }
            return ***REMOVED***ociation;
        }
    },

    /**
     * Creates the Association object.
     * @param {Object} [config] Config object.
     */
    constructor: function(config) {
        Ext.apply(this, config);

        var me = this,
            types           = Ext.ModelManager.types,
            ownerName       = config.ownerModel,
            ***REMOVED***ociatedName  = config.***REMOVED***ociatedModel,
            ownerModel      = types[ownerName],
            ***REMOVED***ociatedModel = types[***REMOVED***ociatedName];

        me.initialConfig = config;

        //<debug>
        if (ownerModel === undefined) {
            Ext.Error.raise("The configured ownerModel was not valid (you tried " + ownerName + ")");
        }
        if (***REMOVED***ociatedModel === undefined) {
            Ext.Error.raise("The configured ***REMOVED***ociatedModel was not valid (you tried " + ***REMOVED***ociatedName + ")");
        }
        //</debug>

        me.ownerModel = ownerModel;
        me.***REMOVED***ociatedModel = ***REMOVED***ociatedModel;

        /**
         * @property {String} ownerName
         * The name of the model that 'owns' the ***REMOVED***ociation
         */

        /**
         * @property {String} ***REMOVED***ociatedName
         * The name of the model is on the other end of the ***REMOVED***ociation (e.g. if a User model hasMany Orders, this is
         * 'Order')
         */

        Ext.applyIf(me, {
            ownerName : ownerName,
            ***REMOVED***ociatedName: ***REMOVED***ociatedName
        });
        
        me.***REMOVED***ociationId = '***REMOVED***ociation' + (++me.statics().AUTO_ID);
    },

    /**
     * Get a specialized reader for reading ***REMOVED***ociated data
     * @return {Ext.data.reader.Reader} The reader, null if not supplied
     */
    getReader: function(){
        var me = this,
            reader = me.reader,
            model = me.***REMOVED***ociatedModel;

        if (reader) {
            if (Ext.isString(reader)) {
                reader = {
                    type: reader
                };
            }
            if (reader.isReader) {
                reader.setModel(model);
            } else {
                Ext.applyIf(reader, {
                    model: model,
                    type : me.defaultReaderType
                });
            }
            me.reader = Ext.createByAlias('reader.' + reader.type, reader);
        }
        return me.reader || null;
    }
});
