/**
 * @cl***REMOVED*** Ext.data.***REMOVED***ociation.HasOne
 * 
 * Represents a one to one ***REMOVED***ociation with another model. The owner model is expected to have
 * a foreign key which references the primary key of the ***REMOVED***ociated model:
 *
 *     Ext.define('Address', {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             { name: 'id',          type: 'int' },
 *             { name: 'number', type: 'string' },
 *             { name: 'street', type: 'string' },
 *             { name: 'city', type: 'string' },
 *             { name: 'zip', type: 'string' },
 *         ]
 *     });
 *
 *     Ext.define('Person', {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             { name: 'id',   type: 'int' },
 *             { name: 'name', type: 'string' },
 *             { name: 'address_id', type: 'int'}
 *         ],
 *         // we can use the hasOne shortcut on the model to create a hasOne ***REMOVED***ociation
 *         ***REMOVED***ociations: [{ type: 'hasOne', model: 'Address' }]
 *     });
 *
 * In the example above we have created models for People and Addresses, and linked them together
 * by saying that each Person has a single Address. This automatically links each Person to an Address
 * based on the Persons address_id, and provides new functions on the Person model:
 *
 * ## Generated getter function
 *
 * The first function that is added to the owner model is a getter function:
 *
 *     var person = new Person({
 *         id: 100,
 *         address_id: 20,
 *         name: 'John Smith'
 *     });
 *
 *     person.getAddress(function(address, operation) {
 *         // do something with the address object
 *         alert(address.get('id')); // alerts 20
 *     }, this);
 *
 * The getAddress function was created on the Person model when we defined the ***REMOVED***ociation. This uses the
 * Persons configured {@link Ext.data.proxy.Proxy proxy} to load the Address asynchronously, calling the provided
 * callback when it has loaded.
 *
 * The new getAddress function will also accept an object containing success, failure and callback properties
 * - callback will always be called, success will only be called if the ***REMOVED***ociated model was loaded successfully
 * and failure will only be called if the ***REMOVED***ociatied model could not be loaded:
 *
 *     person.getAddress({
 *         reload: true, // force a reload if the owner model is already cached
 *         callback: function(address, operation) {}, // a function that will always be called
 *         success : function(address, operation) {}, // a function that will only be called if the load succeeded
 *         failure : function(address, operation) {}, // a function that will only be called if the load did not succeed
 *         scope   : this // optionally p***REMOVED*** in a scope object to execute the callbacks in
 *     });
 *
 * In each case above the callbacks are called with two arguments - the ***REMOVED***ociated model instance and the
 * {@link Ext.data.Operation operation} object that was executed to load that instance. The Operation object is
 * useful when the instance could not be loaded.
 * 
 * Once the getter has been called on the model, it will be cached if the getter is called a second time. To
 * force the model to reload, specify reload: true in the options object.
 *
 * ## Generated setter function
 *
 * The second generated function sets the ***REMOVED***ociated model instance - if only a single argument is p***REMOVED***ed to
 * the setter then the following two calls are identical:
 *
 *     // this call...
 *     person.setAddress(10);
 *
 *     // is equivalent to this call:
 *     person.set('address_id', 10);
 *     
 * An instance of the owner model can also be p***REMOVED***ed as a parameter.
 *
 * If we p***REMOVED*** in a second argument, the model will be automatically saved and the second argument p***REMOVED***ed to
 * the owner model's {@link Ext.data.Model#save save} method:
 *
 *     person.setAddress(10, function(address, operation) {
 *         // the address has been saved
 *         alert(address.get('address_id')); //now alerts 10
 *     });
 *
 *     //alternative syntax:
 *     person.setAddress(10, {
 *         callback: function(address, operation), // a function that will always be called
 *         success : function(address, operation), // a function that will only be called if the load succeeded
 *         failure : function(address, operation), // a function that will only be called if the load did not succeed
 *         scope   : this //optionally p***REMOVED*** in a scope object to execute the callbacks in
 *     })
 *
 * ## Customisation
 *
 * Associations reflect on the models they are linking to automatically set up properties such as the
 * {@link #primaryKey} and {@link #foreignKey}. These can alternatively be specified:
 *
 *     Ext.define('Person', {
 *         fields: [...],
 *
 *         ***REMOVED***ociations: [
 *             { type: 'hasOne', model: 'Address', primaryKey: 'unique_id', foreignKey: 'addr_id' }
 *         ]
 *     });
 *
 * Here we replaced the default primary key (defaults to 'id') and foreign key (calculated as 'address_id')
 * with our own settings. Usually this will not be needed.
 */
Ext.define('Ext.data.***REMOVED***ociation.HasOne', {
    extend: 'Ext.data.***REMOVED***ociation.Association',
    alternateCl***REMOVED***Name: 'Ext.data.HasOneAssociation',

    alias: '***REMOVED***ociation.hasone',
    
    /**
     * @cfg {String} foreignKey The name of the foreign key on the owner model that links it to the ***REMOVED***ociated
     * model. Defaults to the lowercased name of the ***REMOVED***ociated model plus "_id", e.g. an ***REMOVED***ociation with a
     * model called Person would set up a address_id foreign key.
     *
     *     Ext.define('Person', {
     *         extend: 'Ext.data.Model',
     *         fields: ['id', 'name', 'address_id'], // refers to the id of the address object
     *         hasOne: 'Address'
     *     });
     *
     *     Ext.define('Address', {
     *         extend: 'Ext.data.Model',
     *         fields: ['id', 'number', 'street', 'city', 'zip'], 
     *         belongsTo: 'Person'
     *     });
     *     var Person = new Person({
     *         id: 1,
     *         name: 'John Smith',
     *         address_id: 13
     *     }, 1);
     *     person.getAddress(); // Will make a call to the server asking for address_id 13
     *
     */

    /**
     * @cfg {String} getterName The name of the getter function that will be added to the local model's prototype.
     * Defaults to 'get' + the name of the foreign model, e.g. getAddress
     */

    /**
     * @cfg {String} setterName The name of the setter function that will be added to the local model's prototype.
     * Defaults to 'set' + the name of the foreign model, e.g. setAddress
     */

    /**
     * @cfg {String} type The type configuration can be used when creating ***REMOVED***ociations using a configuration object.
     * Use 'hasOne' to create a HasOne ***REMOVED***ociation.
     *
     *     ***REMOVED***ociations: [{
     *         type: 'hasOne',
     *         model: 'Address'
     *     }]
     */
    
    constructor: function(config) {
        this.callParent(arguments);

        var me             = this,
            ownerProto     = me.ownerModel.prototype,
            ***REMOVED***ociatedName = me.***REMOVED***ociatedName,
            getterName     = me.getterName || 'get' + ***REMOVED***ociatedName,
            setterName     = me.setterName || 'set' + ***REMOVED***ociatedName;

        Ext.applyIf(me, {
            name        : ***REMOVED***ociatedName,
            foreignKey  : ***REMOVED***ociatedName.toLowerCase() + "_id",
            instanceName: ***REMOVED***ociatedName + 'HasOneInstance',
            ***REMOVED***ociationKey: ***REMOVED***ociatedName.toLowerCase()
        });

        ownerProto[getterName] = me.createGetter();
        ownerProto[setterName] = me.createSetter();
    },
    
    /**
     * @private
     * Returns a setter function to be placed on the owner model's prototype
     * @return {Function} The setter function
     */
    createSetter: function() {
        var me              = this,
            ownerModel      = me.ownerModel,
            foreignKey      = me.foreignKey;

        //'this' refers to the Model instance inside this function
        return function(value, options, scope) {
            if (value && value.isModel) {
                value = value.getId();
            }
            
            this.set(foreignKey, value);

            if (Ext.isFunction(options)) {
                options = {
                    callback: options,
                    scope: scope || this
                };
            }

            if (Ext.isObject(options)) {
                return this.save(options);
            }
        };
    },

    /**
     * @private
     * Returns a getter function to be placed on the owner model's prototype. We cache the loaded instance
     * the first time it is loaded so that subsequent calls to the getter always receive the same reference.
     * @return {Function} The getter function
     */
    createGetter: function() {
        var me              = this,
            ownerModel      = me.ownerModel,
            ***REMOVED***ociatedName  = me.***REMOVED***ociatedName,
            ***REMOVED***ociatedModel = me.***REMOVED***ociatedModel,
            foreignKey      = me.foreignKey,
            primaryKey      = me.primaryKey,
            instanceName    = me.instanceName;

        //'this' refers to the Model instance inside this function
        return function(options, scope) {
            options = options || {};

            var model = this,
                foreignKeyId = model.get(foreignKey),
                success,
                instance,
                args;

            if (options.reload === true || model[instanceName] === undefined) {
                instance = Ext.ModelManager.create({}, ***REMOVED***ociatedName);
                instance.set(primaryKey, foreignKeyId);

                if (typeof options == 'function') {
                    options = {
                        callback: options,
                        scope: scope || model
                    };
                }
                
                // Overwrite the success handler so we can ***REMOVED***ign the current instance
                success = options.success;
                options.success = function(rec){
                    model[instanceName] = rec;
                    if (success) {
                        success.apply(this, arguments);
                    }
                };

                ***REMOVED***ociatedModel.load(foreignKeyId, options);
                // ***REMOVED***ign temporarily while we wait for data to return
                model[instanceName] = instance;
                return instance;
            } else {
                instance = model[instanceName];
                args = [instance];
                scope = scope || options.scope || model;

                //TODO: We're duplicating the callback invokation code that the instance.load() call above
                //makes here - ought to be able to normalize this - perhaps by caching at the Model.load layer
                //instead of the ***REMOVED***ociation layer.
                Ext.callback(options, scope, args);
                Ext.callback(options.success, scope, args);
                Ext.callback(options.failure, scope, args);
                Ext.callback(options.callback, scope, args);

                return instance;
            }
        };
    },
    
    /**
     * Read ***REMOVED***ociated data
     * @private
     * @param {Ext.data.Model} record The record we're writing to
     * @param {Ext.data.reader.Reader} reader The reader for the ***REMOVED***ociated model
     * @param {Object} ***REMOVED***ociationData The raw ***REMOVED***ociated data
     */
    read: function(record, reader, ***REMOVED***ociationData){
        var inverse = this.***REMOVED***ociatedModel.prototype.***REMOVED***ociations.findBy(function(***REMOVED***oc){
            return ***REMOVED***oc.type === 'belongsTo' && ***REMOVED***oc.***REMOVED***ociatedName === record.$cl***REMOVED***Name;
        }), newRecord = reader.read([***REMOVED***ociationData]).records[0];
        
        record[this.instanceName] = newRecord;
    
        //if the inverse ***REMOVED***ociation was found, set it now on each record we've just created
        if (inverse) {
            newRecord[inverse.instanceName] = record;
        }
    }
});