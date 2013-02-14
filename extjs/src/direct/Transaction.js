/**
 * Supporting Cl***REMOVED*** for Ext.Direct (not intended to be used directly).
 */
Ext.define('Ext.direct.Tra***REMOVED***ction', {
    
    /* Begin Definitions */
   
    alias: 'direct.tra***REMOVED***ction',
    alternateCl***REMOVED***Name: 'Ext.Direct.Tra***REMOVED***ction',
   
    statics: {
        TRANSACTION_ID: 0
    },
   
    /* End Definitions */

    /**
     * Creates new Tra***REMOVED***ction.
     * @param {Object} [config] Config object.
     */
    constructor: function(config){
        var me = this;
        
        Ext.apply(me, config);
        me.id = me.tid = ++me.self.TRANSACTION_ID;
        me.retryCount = 0;
    },
   
    send: function(){
         this.provider.queueTra***REMOVED***ction(this);
    },

    retry: function(){
        this.retryCount++;
        this.send();
    },

    getProvider: function(){
        return this.provider;
    }
});
