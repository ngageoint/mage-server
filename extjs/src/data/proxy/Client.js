/**
 * @author Ed Spencer
 *
 * Base cl***REMOVED*** for any client-side storage. Used as a supercl***REMOVED*** for {@link Ext.data.proxy.Memory Memory} and
 * {@link Ext.data.proxy.WebStorage Web Storage} proxies. Do not use directly, use one of the subcl***REMOVED***es instead.
 * @private
 */
Ext.define('Ext.data.proxy.Client', {
    extend: 'Ext.data.proxy.Proxy',
    alternateCl***REMOVED***Name: 'Ext.data.ClientProxy',
    
    /**
     * @property {Boolean} isSynchronous
     * `true` in this cl***REMOVED*** to identify that requests made on this proxy are
     * performed synchronously
     */
    isSynchronous: true,

    /**
     * Abstract function that must be implemented by each ClientProxy subcl***REMOVED***. This should purge all record data
     * from the client side storage, as well as removing any supporting data (such as lists of record IDs)
     */
    clear: function() {
        //<debug>
        Ext.Error.raise("The Ext.data.proxy.Client subcl***REMOVED*** that you are using has not defined a 'clear' function. See src/data/ClientProxy.js for details.");
        //</debug>
    }
});